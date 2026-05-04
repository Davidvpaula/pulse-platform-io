
CREATE OR REPLACE FUNCTION public.criar_consulta_com_reserva(
  _slot_id uuid,
  _especialidade_id uuid,
  _motivo text DEFAULT NULL,
  _nome_completo text DEFAULT NULL,
  _cpf text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _data_nascimento text DEFAULT NULL,
  _sexo text DEFAULT 'nao_informado',
  _cep text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _paciente_id uuid;
  _slot record;
  _vinculo record;
  _consulta_id uuid;
  _preco int;
  _duracao int;
  _expira timestamptz;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  -- Garante paciente
  SELECT id INTO _paciente_id FROM public.pacientes WHERE user_id = _uid;
  IF _paciente_id IS NULL THEN
    INSERT INTO public.pacientes (user_id) VALUES (_uid) RETURNING id INTO _paciente_id;
  END IF;

  -- Atualiza dados do paciente
  UPDATE public.pacientes SET
    nome_completo = COALESCE(NULLIF(_nome_completo, ''), nome_completo),
    cpf = COALESCE(NULLIF(regexp_replace(_cpf, '[^0-9]', '', 'g'), ''), cpf),
    telefone = COALESCE(NULLIF(regexp_replace(_telefone, '[^0-9]', '', 'g'), ''), telefone),
    data_nascimento = CASE
      WHEN _data_nascimento IS NOT NULL AND _data_nascimento != '' THEN _data_nascimento::date
      ELSE data_nascimento
    END,
    sexo = CASE
      WHEN _sexo IS NOT NULL AND _sexo != '' AND _sexo != 'nao_informado' THEN _sexo::public.sexo_biologico
      ELSE sexo
    END,
    cep = COALESCE(NULLIF(regexp_replace(_cep, '[^0-9]', '', 'g'), ''), cep),
    updated_at = now()
  WHERE id = _paciente_id;

  -- Busca e trava o slot
  SELECT * INTO _slot FROM public.agenda_slots
  WHERE id = _slot_id AND status = 'disponivel'
  FOR UPDATE;

  IF _slot IS NULL THEN
    RAISE EXCEPTION 'Horário indisponível ou já reservado.';
  END IF;

  -- Busca vínculo médico/especialidade para preço
  SELECT preco_centavos, duracao_minutos INTO _vinculo
  FROM public.medico_especialidades
  WHERE medico_id = _slot.medico_id AND especialidade_id = _especialidade_id AND ativo = true
  LIMIT 1;

  IF _vinculo IS NULL THEN
    RAISE EXCEPTION 'Médico não atende esta especialidade.';
  END IF;

  _preco := COALESCE(_vinculo.preco_centavos, 0);
  _expira := now() + interval '15 minutes';

  -- Reserva o slot
  UPDATE public.agenda_slots
  SET status = 'reservado',
      reservado_por = _paciente_id,
      reserva_expira_em = _expira,
      updated_at = now()
  WHERE id = _slot_id;

  -- Cria a consulta
  INSERT INTO public.consultas (
    paciente_id, medico_id, especialidade_id, slot_id,
    inicio, fim, modalidade, status, valor_centavos,
    motivo, canal_origem
  ) VALUES (
    _paciente_id, _slot.medico_id, _especialidade_id, _slot_id,
    _slot.inicio, _slot.fim, _slot.modalidade, 'aguardando_pagamento',
    _preco, _motivo, 'app'
  )
  RETURNING id INTO _consulta_id;

  -- Vincula slot à consulta
  UPDATE public.agenda_slots
  SET reservado_por_consulta_id = _consulta_id
  WHERE id = _slot_id;

  RETURN jsonb_build_object(
    'consulta_id', _consulta_id,
    'paciente_id', _paciente_id,
    'valor_centavos', _preco,
    'reserva_expira_em', _expira
  );
END;
$$;
