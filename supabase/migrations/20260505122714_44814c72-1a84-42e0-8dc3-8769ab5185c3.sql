
-- 1. Criar função independente para criar conversa vinculada à consulta
CREATE OR REPLACE FUNCTION public.create_conversation_for_consulta(_consulta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consulta record;
  v_conv_id uuid;
  v_contact_name text;
  v_msg_body text;
BEGIN
  -- Busca dados da consulta
  SELECT c.id, c.paciente_id, c.medico_id, c.inicio, c.status
  INTO v_consulta
  FROM public.consultas c
  WHERE c.id = _consulta_id;

  IF v_consulta IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verifica se já existe conversa para esta consulta (idempotência)
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE consulta_id = _consulta_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id; -- já existe, retorna sem duplicar
  END IF;

  -- Busca nome do paciente
  SELECT nome_completo INTO v_contact_name
  FROM public.pacientes
  WHERE id = v_consulta.paciente_id;

  -- Mensagem de boas-vindas
  v_msg_body := 'Olá! Sua conversa referente à consulta foi criada. Por aqui você poderá acompanhar orientações, anexos e comunicações relacionadas ao atendimento.';

  -- Cria a conversa
  INSERT INTO public.conversations (
    patient_id,
    medico_id,
    consulta_id,
    contact_name,
    status,
    channel,
    origin,
    bot_active,
    ai_active,
    priority,
    tags,
    unread_count,
    last_message_at,
    last_message_preview
  ) VALUES (
    v_consulta.paciente_id,
    v_consulta.medico_id,
    _consulta_id,
    COALESCE(v_contact_name, 'Paciente'),
    'aberta',
    'interno',
    'sistema',
    false,
    false,
    'normal',
    ARRAY['consulta'],
    1,
    now(),
    v_msg_body
  )
  RETURNING id INTO v_conv_id;

  -- Insere mensagem inicial do sistema
  INSERT INTO public.messages (
    conversation_id,
    sender_type,
    sender_name,
    body,
    message_type,
    status,
    metadata
  ) VALUES (
    v_conv_id,
    'sistema',
    'Sistema',
    v_msg_body,
    'text',
    'sent',
    jsonb_build_object('auto', true, 'consulta_id', _consulta_id)
  );

  RETURN v_conv_id;
END;
$$;

-- 2. Atualizar criar_consulta_pos_pagamento para chamar create_conversation_for_consulta
CREATE OR REPLACE FUNCTION public.criar_consulta_pos_pagamento(_pagamento_id uuid)
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
  v_conv_id uuid;
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
    UPDATE public.consultas
    SET status = 'agendada', updated_at = now()
    WHERE id = v_pag.consulta_id AND status = 'aguardando_pagamento';
    
    UPDATE public.agenda_slots
    SET status = 'bloqueado', reserva_expira_em = NULL, updated_at = now()
    WHERE reservado_por_consulta_id = v_pag.consulta_id AND status = 'reservado';

    -- Garante que conversa existe mesmo para consultas legadas
    PERFORM public.create_conversation_for_consulta(v_pag.consulta_id);
    
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

  -- Cria conversa automaticamente
  v_conv_id := public.create_conversation_for_consulta(v_consulta_id);

  RETURN jsonb_build_object(
    'ok', true,
    'consulta_id', v_consulta_id,
    'link_sala', v_link_sala,
    'conversation_id', v_conv_id
  );
END;
$$;
