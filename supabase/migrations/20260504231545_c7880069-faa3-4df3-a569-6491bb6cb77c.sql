
-- 1) Função unificada de reserva (sem criar consulta)
CREATE OR REPLACE FUNCTION public.reservar_slot_unificado(
  _slot_id uuid,
  _tipo text,              -- 'especialidade' ou 'servico'
  _referencia_id uuid,     -- especialidade_id ou servico_id
  _motivo text DEFAULT NULL,
  _nome_completo text DEFAULT NULL,
  _cpf text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _data_nascimento text DEFAULT NULL,
  _sexo text DEFAULT NULL,
  _cep text DEFAULT NULL
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
  IF v_slot.status <> 'disponivel' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Este horário não está mais disponível');
  END IF;

  -- Busca preço conforme tipo
  IF _tipo = 'especialidade' THEN
    SELECT preco_centavos INTO v_preco
    FROM public.medico_especialidades
    WHERE medico_id = v_slot.medico_id AND especialidade_id = _referencia_id AND ativo = true
    LIMIT 1;
    SELECT nome INTO v_ref_nome FROM public.especialidades WHERE id = _referencia_id;
  ELSIF _tipo = 'servico' THEN
    SELECT valor_paciente_centavos INTO v_preco
    FROM public.servicos_financeiros WHERE id = _referencia_id;
    SELECT nome INTO v_ref_nome FROM public.servicos_financeiros WHERE id = _referencia_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'erro', 'Tipo inválido: use especialidade ou servico');
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

-- 2) Função que cria a consulta SOMENTE após pagamento confirmado
CREATE OR REPLACE FUNCTION public.criar_consulta_pos_pagamento(
  _pagamento_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pag record;
  v_slot record;
  v_paciente_id uuid;
  v_consulta_id uuid;
  v_meta jsonb;
  v_tipo text;
  v_ref_id uuid;
  v_motivo text;
  v_canal public.consulta_canal;
  v_link_sala text;
BEGIN
  -- Busca pagamento
  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id;
  IF v_pag IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não encontrado');
  END IF;
  IF v_pag.status <> 'pago' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não confirmado');
  END IF;

  -- Se já tem consulta vinculada, não criar duplicata
  IF v_pag.consulta_id IS NOT NULL THEN
    -- Já existe consulta — atualiza status para agendada se aguardando
    UPDATE public.consultas
    SET status = 'agendada', updated_at = now()
    WHERE id = v_pag.consulta_id AND status = 'aguardando_pagamento';
    
    -- Bloqueia slot
    UPDATE public.agenda_slots
    SET status = 'bloqueado', reserva_expira_em = NULL, updated_at = now()
    WHERE reservado_por_consulta_id = v_pag.consulta_id AND status = 'reservado';
    
    RETURN jsonb_build_object('ok', true, 'consulta_id', v_pag.consulta_id, 'ja_existia', true);
  END IF;

  -- Extrai metadata do pagamento
  v_meta := COALESCE(v_pag.metadata, '{}'::jsonb);
  v_tipo := v_meta->>'tipo';
  v_ref_id := (v_meta->>'referencia_id')::uuid;
  v_motivo := v_meta->>'motivo';

  IF v_tipo IS NULL OR v_ref_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Metadata de reserva incompleta no pagamento');
  END IF;

  -- Busca slot
  SELECT * INTO v_slot FROM public.agenda_slots
  WHERE id = (v_meta->>'slot_id')::uuid
  FOR UPDATE;

  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Slot não encontrado');
  END IF;

  -- Busca paciente
  v_paciente_id := (v_meta->>'paciente_id')::uuid;

  -- Determina canal
  IF v_tipo = 'servico' THEN
    v_canal := 'servico_plataforma';
  ELSE
    v_canal := 'app';
  END IF;

  -- Busca link da sala do médico
  SELECT link_sala_padrao INTO v_link_sala FROM public.medicos WHERE id = v_slot.medico_id;

  -- Cria a consulta como AGENDADA (pagamento já confirmado)
  INSERT INTO public.consultas (
    paciente_id, medico_id,
    especialidade_id, servico_id,
    slot_id, inicio, fim, modalidade,
    status, valor_centavos, motivo, canal_origem,
    link_sala
  ) VALUES (
    v_paciente_id, v_slot.medico_id,
    CASE WHEN v_tipo = 'especialidade' THEN v_ref_id ELSE NULL END,
    CASE WHEN v_tipo = 'servico' THEN v_ref_id ELSE NULL END,
    v_slot.id, v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'agendada', v_pag.valor_centavos, NULLIF(trim(coalesce(v_motivo,'')), ''),
    v_canal,
    v_link_sala
  )
  RETURNING id INTO v_consulta_id;

  -- Atualiza slot → bloqueado
  UPDATE public.agenda_slots
  SET status = 'bloqueado',
      reserva_expira_em = NULL,
      reservado_por_consulta_id = v_consulta_id,
      updated_at = now()
  WHERE id = v_slot.id;

  -- Vincula consulta ao pagamento
  UPDATE public.pagamentos
  SET consulta_id = v_consulta_id
  WHERE id = _pagamento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'consulta_id', v_consulta_id,
    'link_sala', v_link_sala
  );
END;
$$;
