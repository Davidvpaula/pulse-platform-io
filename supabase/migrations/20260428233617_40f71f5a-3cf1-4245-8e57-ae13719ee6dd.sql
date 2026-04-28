-- 1. Novos valores de enum
ALTER TYPE public.consulta_status ADD VALUE IF NOT EXISTS 'aguardando_pagamento';
ALTER TYPE public.slot_status ADD VALUE IF NOT EXISTS 'reservado';

-- 2. Campo de expiração da reserva no slot
ALTER TABLE public.agenda_slots
  ADD COLUMN IF NOT EXISTS reserva_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS reservado_por_consulta_id uuid;

CREATE INDEX IF NOT EXISTS idx_agenda_slots_reserva_expira
  ON public.agenda_slots(reserva_expira_em)
  WHERE status = 'reservado';

-- 3. Campos pessoais do paciente usados no agendamento
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS nome_completo text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS cep text;

-- Validação leve de CPF (somente formato — 11 dígitos)
CREATE OR REPLACE FUNCTION public.cpf_valido(_cpf text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _cpf IS NULL OR length(regexp_replace(_cpf, '\D', '', 'g')) = 11
$$;

ALTER TABLE public.pacientes
  DROP CONSTRAINT IF EXISTS pacientes_cpf_formato;
ALTER TABLE public.pacientes
  ADD CONSTRAINT pacientes_cpf_formato CHECK (public.cpf_valido(cpf));

-- 4. RPC: cria consulta + reserva slot + atualiza dados do paciente, em transação
CREATE OR REPLACE FUNCTION public.criar_consulta_com_reserva(
  _slot_id uuid,
  _especialidade_id uuid,
  _motivo text,
  _nome_completo text,
  _cpf text,
  _telefone text,
  _data_nascimento date,
  _sexo public.sexo_biologico,
  _cep text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_paciente_id uuid;
  v_slot record;
  v_preco int := 0;
  v_consulta_id uuid;
  v_reserva_min int := 15;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  -- Validação mínima
  IF _nome_completo IS NULL OR length(trim(_nome_completo)) < 3 THEN
    RAISE EXCEPTION 'Nome completo é obrigatório.';
  END IF;
  IF length(regexp_replace(coalesce(_cpf,''), '\D', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.';
  END IF;
  IF _telefone IS NULL OR length(regexp_replace(_telefone,'\D','','g')) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido.';
  END IF;
  IF _data_nascimento IS NULL THEN
    RAISE EXCEPTION 'Data de nascimento é obrigatória.';
  END IF;
  IF _cep IS NULL OR length(regexp_replace(_cep,'\D','','g')) <> 8 THEN
    RAISE EXCEPTION 'CEP inválido.';
  END IF;

  -- 1) Garante registro em pacientes e atualiza dados
  INSERT INTO public.pacientes (user_id, nome_completo, cpf, telefone, data_nascimento, sexo, cep)
  VALUES (v_uid, trim(_nome_completo), regexp_replace(_cpf,'\D','','g'), _telefone, _data_nascimento, _sexo, regexp_replace(_cep,'\D','','g'))
  ON CONFLICT (user_id) DO UPDATE SET
    nome_completo    = EXCLUDED.nome_completo,
    cpf              = EXCLUDED.cpf,
    telefone         = EXCLUDED.telefone,
    data_nascimento  = EXCLUDED.data_nascimento,
    sexo             = EXCLUDED.sexo,
    cep              = EXCLUDED.cep,
    updated_at       = now()
  RETURNING id INTO v_paciente_id;

  -- pacientes.user_id pode não ser unique — fallback
  IF v_paciente_id IS NULL THEN
    SELECT id INTO v_paciente_id FROM public.pacientes WHERE user_id = v_uid LIMIT 1;
  END IF;

  -- 2) Trava o slot e valida disponibilidade
  SELECT * INTO v_slot FROM public.agenda_slots WHERE id = _slot_id FOR UPDATE;
  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Horário não encontrado.';
  END IF;
  IF v_slot.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Este horário não está mais disponível.';
  END IF;

  -- 3) Preço da consulta (medico_especialidades)
  SELECT preco_centavos INTO v_preco
    FROM public.medico_especialidades
   WHERE medico_id = v_slot.medico_id
     AND especialidade_id = _especialidade_id
     AND ativo = true
   LIMIT 1;
  v_preco := COALESCE(v_preco, 0);

  -- 4) Cria consulta aguardando pagamento
  INSERT INTO public.consultas (
    paciente_id, medico_id, especialidade_id, slot_id,
    inicio, fim, modalidade, status, motivo, valor_centavos
  ) VALUES (
    v_paciente_id, v_slot.medico_id, _especialidade_id, v_slot.id,
    v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'aguardando_pagamento', NULLIF(trim(coalesce(_motivo,'')),''), v_preco
  ) RETURNING id INTO v_consulta_id;

  -- 5) Reserva o slot
  UPDATE public.agenda_slots
     SET status = 'reservado',
         reserva_expira_em = now() + make_interval(mins => v_reserva_min),
         reservado_por_consulta_id = v_consulta_id,
         updated_at = now()
   WHERE id = v_slot.id;

  RETURN jsonb_build_object(
    'consulta_id', v_consulta_id,
    'paciente_id', v_paciente_id,
    'valor_centavos', v_preco,
    'reserva_expira_em', (now() + make_interval(mins => v_reserva_min))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.criar_consulta_com_reserva(uuid,uuid,text,text,text,text,date,public.sexo_biologico,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_consulta_com_reserva(uuid,uuid,text,text,text,text,date,public.sexo_biologico,text) TO authenticated;

-- 5. RPC: libera reservas expiradas
CREATE OR REPLACE FUNCTION public.liberar_reservas_expiradas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  WITH expirados AS (
    SELECT id, reservado_por_consulta_id
      FROM public.agenda_slots
     WHERE status = 'reservado'
       AND reserva_expira_em IS NOT NULL
       AND reserva_expira_em < now()
  ),
  consultas_canc AS (
    UPDATE public.consultas c
       SET status = 'cancelada', updated_at = now()
      FROM expirados e
     WHERE c.id = e.reservado_por_consulta_id
       AND c.status = 'aguardando_pagamento'
    RETURNING c.id
  ),
  slots_libres AS (
    UPDATE public.agenda_slots s
       SET status = 'disponivel',
           reserva_expira_em = NULL,
           reservado_por_consulta_id = NULL,
           updated_at = now()
      FROM expirados e
     WHERE s.id = e.id
    RETURNING s.id
  )
  SELECT count(*) INTO v_count FROM slots_libres;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.liberar_reservas_expiradas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liberar_reservas_expiradas() TO authenticated, anon;