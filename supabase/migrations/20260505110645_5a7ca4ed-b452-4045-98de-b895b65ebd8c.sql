
CREATE OR REPLACE FUNCTION public.reservar_slot_unificado(
  _slot_id uuid,
  _tipo text,
  _referencia_id uuid,
  _motivo text DEFAULT NULL,
  _nome_completo text DEFAULT NULL,
  _cpf text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _data_nascimento text DEFAULT NULL,
  _sexo text DEFAULT NULL,
  _cep text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_paciente_id uuid;
  v_slot record;
  v_preco int := 0;
  v_expira timestamptz;
  v_medico_nome text;
  v_ref_nome text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Autenticação necessária');
  END IF;

  -- Validações básicas
  IF _nome_completo IS NULL OR length(trim(_nome_completo)) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nome completo é obrigatório');
  END IF;
  IF length(regexp_replace(coalesce(_cpf,''), '\D', '', 'g')) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF inválido');
  END IF;
  IF _telefone IS NULL OR length(regexp_replace(_telefone,'\D','','g')) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Telefone inválido');
  END IF;
  IF _data_nascimento IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Data de nascimento é obrigatória');
  END IF;
  IF _cep IS NULL OR length(regexp_replace(_cep,'\D','','g')) <> 8 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CEP inválido');
  END IF;

  -- Garante/atualiza paciente
  INSERT INTO public.pacientes (user_id, nome_completo, cpf, telefone, data_nascimento, sexo, cep)
  VALUES (
    v_uid, trim(_nome_completo),
    regexp_replace(_cpf,'\D','','g'),
    regexp_replace(_telefone,'\D','','g'),
    _data_nascimento::date,
    CASE WHEN _sexo IS NOT NULL AND _sexo != '' THEN _sexo::public.sexo_biologico ELSE 'nao_informado' END,
    regexp_replace(_cep,'\D','','g')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nome_completo   = EXCLUDED.nome_completo,
    cpf             = EXCLUDED.cpf,
    telefone        = EXCLUDED.telefone,
    data_nascimento = EXCLUDED.data_nascimento,
    sexo            = EXCLUDED.sexo,
    cep             = EXCLUDED.cep,
    updated_at      = now()
  RETURNING id INTO v_paciente_id;

  IF v_paciente_id IS NULL THEN
    SELECT id INTO v_paciente_id FROM public.pacientes WHERE user_id = v_uid LIMIT 1;
  END IF;

  -- Trava e valida slot
  SELECT * INTO v_slot FROM public.agenda_slots WHERE id = _slot_id FOR UPDATE;
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Horário não encontrado');
  END IF;

  -- Aceita: disponivel OU reservado pelo mesmo paciente (re-reserva do PA)
  IF v_slot.status = 'reservado' AND v_slot.reservado_por = v_paciente_id THEN
    -- Re-reserva permitida (PA → fluxo unificado)
    NULL;
  ELSIF v_slot.status <> 'disponivel' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este horário não está mais disponível');
  END IF;

  -- Busca preço conforme tipo
  IF _tipo = 'especialidade' THEN
    SELECT preco_centavos INTO v_preco
    FROM public.medico_especialidades
    WHERE medico_id = v_slot.medico_id AND especialidade_id = _referencia_id AND ativo = true
    LIMIT 1;
    SELECT nome INTO v_ref_nome FROM public.especialidades WHERE id = _referencia_id;
  ELSIF _tipo IN ('servico', 'pa') THEN
    SELECT valor_paciente_centavos INTO v_preco
    FROM public.servicos_financeiros WHERE id = _referencia_id;
    SELECT nome INTO v_ref_nome FROM public.servicos_financeiros WHERE id = _referencia_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'erro', 'Tipo inválido: use especialidade, servico ou pa');
  END IF;

  v_preco := COALESCE(v_preco, 0);
  v_expira := now() + interval '15 minutes';

  -- Nome do médico
  SELECT nome INTO v_medico_nome FROM public.medicos WHERE id = v_slot.medico_id;

  -- Reserva o slot (sem criar consulta)
  UPDATE public.agenda_slots
  SET status = 'reservado',
      reservado_por = v_paciente_id,
      reserva_expira_em = v_expira,
      updated_at = now()
  WHERE id = _slot_id;

  RETURN jsonb_build_object(
    'ok', true,
    'slot_id', v_slot.id,
    'medico_id', v_slot.medico_id,
    'medico_nome', COALESCE(v_medico_nome, 'Médico'),
    'inicio', v_slot.inicio,
    'fim', v_slot.fim,
    'modalidade', v_slot.modalidade,
    'valor_centavos', v_preco,
    'reserva_expira_em', v_expira,
    'tipo', _tipo,
    'referencia_id', _referencia_id,
    'referencia_nome', COALESCE(v_ref_nome, '—'),
    'motivo', _motivo,
    'paciente_id', v_paciente_id
  );
END;
$$;
