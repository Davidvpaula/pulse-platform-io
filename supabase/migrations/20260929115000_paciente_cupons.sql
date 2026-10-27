CREATE OR REPLACE FUNCTION public.validar_e_aplicar_cupom(_pagamento_id uuid, _codigo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_codigo text;
  v_cupom record;
  v_pag record;
  v_consulta record;
  v_valor_original int;
  v_desconto int := 0;
  v_final int;
  v_meta jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '28000';
  END IF;

  v_codigo := upper(regexp_replace(coalesce(_codigo,''), '\s+', '', 'g'));
  IF v_codigo = '' THEN
    RAISE EXCEPTION 'Informe um código de cupom.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF v_pag IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_pag.status <> 'pendente' THEN
    RAISE EXCEPTION 'Pagamento não pode mais ser alterado (status: %).', v_pag.status USING ERRCODE = '22023';
  END IF;

  IF NOT (public.has_role(v_uid,'admin') OR public.has_permission(v_uid,'financeiro.cobrar')
    OR EXISTS (SELECT 1 FROM pacientes WHERE user_id = v_uid AND status_conta = 'ativo' AND id = v_pag.paciente_id)
    OR (v_pag.consulta_id IS NOT NULL AND public.is_paciente_da_consulta(v_pag.consulta_id))) THEN
    RAISE EXCEPTION 'Sem permissao para alterar este pagamento'; END IF;
  IF v_pag.provider <> 'mock' THEN RAISE EXCEPTION 'Desconto deve ser validado pelo provedor externo'; END IF;
  SELECT v_pag.consulta_id AS id, COALESCE(v_pag.medico_id,(SELECT medico_id FROM consultas WHERE id=v_pag.consulta_id)) AS medico_id,
    COALESCE((SELECT especialidade_id FROM consultas WHERE id=v_pag.consulta_id), CASE WHEN v_pag.metadata->>'tipo' = 'especialidade' THEN (v_pag.metadata->>'referencia_id')::uuid END) AS especialidade_id INTO v_consulta;

  IF (v_pag.metadata ? 'cupom') THEN
    RAISE EXCEPTION 'Já existe um cupom aplicado neste pagamento. Remova-o antes de aplicar outro.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cupom FROM public.cupons WHERE codigo = v_codigo FOR UPDATE;
  IF v_cupom IS NULL THEN
    RAISE EXCEPTION 'Cupom não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_cupom.ativo THEN
    RAISE EXCEPTION 'Cupom inativo.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.valido_de IS NOT NULL AND v_cupom.valido_de > now() THEN
    RAISE EXCEPTION 'Cupom ainda não está válido.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.valido_ate IS NOT NULL AND v_cupom.valido_ate < now() THEN
    RAISE EXCEPTION 'Cupom expirado.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.uso_maximo IS NOT NULL AND v_cupom.uso_atual >= v_cupom.uso_maximo THEN
    RAISE EXCEPTION 'Cupom esgotou o limite de usos.' USING ERRCODE = '22023';
  END IF;

  IF v_cupom.escopo = 'medico' THEN
    IF v_cupom.medico_id IS NULL OR v_cupom.medico_id <> v_consulta.medico_id THEN
      RAISE EXCEPTION 'Cupom não vale para este médico.' USING ERRCODE = '22023';
    END IF;
  ELSIF v_cupom.escopo = 'especialidade' THEN
    IF v_cupom.especialidade_id IS NULL
       OR v_consulta.especialidade_id IS NULL
       OR v_cupom.especialidade_id <> v_consulta.especialidade_id THEN
      RAISE EXCEPTION 'Cupom não vale para esta especialidade.' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_valor_original := v_pag.valor_centavos;
  IF v_valor_original IS NULL OR v_valor_original <= 0 THEN
    RAISE EXCEPTION 'Pagamento sem valor para aplicar desconto.' USING ERRCODE = '22023';
  END IF;

  IF v_cupom.tipo = 'percentual' THEN
    v_desconto := round((v_valor_original::numeric * v_cupom.valor) / 100)::int;
  ELSE
    v_desconto := v_cupom.valor;
  END IF;
  v_desconto := greatest(0, least(v_desconto, v_valor_original));
  v_final := greatest(0, v_valor_original - v_desconto);

  v_meta := coalesce(v_pag.metadata, '{}'::jsonb) || jsonb_build_object(
    'cupom', jsonb_build_object(
      'cupom_id', v_cupom.id,
      'codigo', v_cupom.codigo,
      'nome', v_cupom.nome,
      'tipo', v_cupom.tipo,
      'escopo', v_cupom.escopo,
      'valor_original_centavos', v_valor_original,
      'desconto_centavos', v_desconto,
      'valor_final_centavos', v_final,
      'aplicado_em', now()
    )
  );

  UPDATE public.pagamentos
     SET valor_centavos = v_final,
         metadata = v_meta,
         updated_at = now()
   WHERE id = _pagamento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cupom_id', v_cupom.id,
    'codigo', v_cupom.codigo,
    'nome', v_cupom.nome,
    'tipo', v_cupom.tipo,
    'valor_original_centavos', v_valor_original,
    'desconto_centavos', v_desconto,
    'valor_final_centavos', v_final
  );
END;
$function$;
CREATE OR REPLACE FUNCTION public.remover_cupom_pagamento(_pagamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_pag record;
  v_consulta record;
  v_original int;
  v_meta jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF v_pag IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_pag.status <> 'pendente' THEN
    RAISE EXCEPTION 'Pagamento não pode mais ser alterado.' USING ERRCODE = '22023';
  END IF;

  IF NOT (public.has_role(v_uid,'admin') OR public.has_permission(v_uid,'financeiro.cobrar')
    OR EXISTS (SELECT 1 FROM pacientes WHERE user_id = v_uid AND status_conta = 'ativo' AND id = v_pag.paciente_id)
    OR (v_pag.consulta_id IS NOT NULL AND public.is_paciente_da_consulta(v_pag.consulta_id))) THEN
    RAISE EXCEPTION 'Sem permissao para alterar este pagamento'; END IF;
  IF v_pag.provider <> 'mock' THEN RAISE EXCEPTION 'Desconto deve ser validado pelo provedor externo'; END IF;
  SELECT v_pag.consulta_id AS id, COALESCE(v_pag.medico_id,(SELECT medico_id FROM consultas WHERE id=v_pag.consulta_id)) AS medico_id,
    COALESCE((SELECT especialidade_id FROM consultas WHERE id=v_pag.consulta_id), CASE WHEN v_pag.metadata->>'tipo' = 'especialidade' THEN (v_pag.metadata->>'referencia_id')::uuid END) AS especialidade_id INTO v_consulta;

  IF NOT (v_pag.metadata ? 'cupom') THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  v_original := nullif((v_pag.metadata->'cupom'->>'valor_original_centavos'), '')::int;
  v_meta := v_pag.metadata - 'cupom';

  UPDATE public.pagamentos
     SET valor_centavos = coalesce(v_original, valor_centavos),
         metadata = v_meta,
         updated_at = now()
   WHERE id = _pagamento_id;

  RETURN jsonb_build_object('ok', true, 'valor_centavos', coalesce(v_original, v_pag.valor_centavos));
END;
$function$;
CREATE OR REPLACE FUNCTION public.paciente_confirmar_pagamento_local(_pagamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p uuid; pag public.pagamentos; s public.agenda_slots; resultado jsonb; cupom public.cupons; desconto jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pulse_private.ambiente_local WHERE habilitado) THEN RAISE EXCEPTION 'Simulação indisponível'; END IF;
  SELECT id INTO p FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo';
  SELECT * INTO pag FROM pagamentos WHERE id = _pagamento_id AND paciente_id = p AND provider = 'mock' FOR UPDATE;
  IF pag.id IS NULL THEN RAISE EXCEPTION 'Pagamento indisponível'; END IF;
  IF pag.status = 'pago' AND pag.consulta_id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'consulta_id',pag.consulta_id); END IF;
  IF pag.status <> 'pendente' THEN RAISE EXCEPTION 'Pagamento não está pendente'; END IF;
  SELECT * INTO s FROM agenda_slots WHERE id = (pag.metadata->>'slot_id')::uuid FOR UPDATE;
  IF s.id IS NULL OR s.status <> 'reservado' OR s.reservado_por IS DISTINCT FROM p OR s.reserva_expira_em IS NULL OR s.reserva_expira_em <= now() OR s.inicio <= now() THEN RAISE EXCEPTION 'Reserva indisponível ou expirada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM medicos WHERE id = s.medico_id AND status = 'aprovado') THEN RAISE EXCEPTION 'Médico indisponível'; END IF;
  IF pag.metadata->>'paciente_atendido_id' IS NOT NULL AND (pag.metadata->>'paciente_atendido_id')::uuid <> p AND NOT EXISTS (SELECT 1 FROM pacientes WHERE id = (pag.metadata->>'paciente_atendido_id')::uuid AND responsavel_id = p AND status_conta = 'ativo') THEN RAISE EXCEPTION 'Dependente indisponível'; END IF;
  desconto := pag.metadata->'cupom';
  IF desconto IS NOT NULL THEN
    SELECT * INTO cupom FROM cupons WHERE id=(desconto->>'cupom_id')::uuid FOR UPDATE;
    IF cupom.id IS NULL OR NOT cupom.ativo OR cupom.valido_de > now() OR cupom.valido_ate < now() OR (cupom.uso_maximo IS NOT NULL AND cupom.uso_atual >= cupom.uso_maximo) THEN RAISE EXCEPTION 'Cupom indisponivel. Remova o desconto e tente novamente'; END IF;
  END IF;
  UPDATE pagamentos SET status = 'pago', metodo = 'simulado', paid_at = now(), provider_payment_id = 'local_' || id WHERE id = pag.id;
  resultado := public.criar_consulta_pos_pagamento(pag.id);
  IF (resultado->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Falha ao criar consulta: %', resultado->>'erro'; END IF;
  IF desconto IS NOT NULL THEN
    INSERT INTO cupons_uso (cupom_id,consulta_id,paciente_id,medico_id,codigo_snapshot,tipo_snapshot,valor_original_centavos,valor_desconto_centavos,valor_final_centavos)
    VALUES (cupom.id,(resultado->>'consulta_id')::uuid,p,s.medico_id,cupom.codigo,cupom.tipo,(desconto->>'valor_original_centavos')::int,(desconto->>'desconto_centavos')::int,pag.valor_centavos);
  END IF;
  RETURN resultado;
END; $function$;
CREATE OR REPLACE FUNCTION public.criar_consulta_pos_pagamento(_pagamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pag record;
  v_slot record;
  v_paciente_id uuid;
  v_paciente_atendido_id uuid;
  v_consulta_id uuid;
  v_meta jsonb;
  v_tipo text;
  v_ref_id uuid;
  v_motivo text;
  v_canal public.consulta_canal;
  v_link_sala text;
  v_conv_id uuid;
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF v_pag IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não encontrado');
  END IF;
  IF v_pag.status <> 'pago' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não confirmado');
  END IF;

  IF v_pag.consulta_id IS NOT NULL THEN
    UPDATE public.consultas
    SET status = 'agendada', updated_at = now()
    WHERE id = v_pag.consulta_id AND status = 'aguardando_pagamento';
    
    UPDATE public.agenda_slots
    SET status = 'bloqueado', reserva_expira_em = NULL, updated_at = now()
    WHERE reservado_por_consulta_id = v_pag.consulta_id AND status = 'reservado';

    PERFORM public.create_conversation_for_consulta(v_pag.consulta_id);
    
    RETURN jsonb_build_object('ok', true, 'consulta_id', v_pag.consulta_id, 'ja_existia', true);
  END IF;

  v_meta := COALESCE(v_pag.metadata, '{}'::jsonb);
  v_tipo := v_meta->>'tipo';
  v_ref_id := (v_meta->>'referencia_id')::uuid;
  v_motivo := v_meta->>'motivo';

  IF v_tipo IS NULL OR v_ref_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Metadata de reserva incompleta no pagamento');
  END IF;

  SELECT * INTO v_slot FROM public.agenda_slots
  WHERE id = (v_meta->>'slot_id')::uuid
  FOR UPDATE;

  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Slot não encontrado');
  END IF;

  v_paciente_id := (v_meta->>'paciente_id')::uuid;
  
  -- NEW: read paciente_atendido_id from metadata (null = titular is the patient)
  IF v_meta ? 'paciente_atendido_id' AND v_meta->>'paciente_atendido_id' IS NOT NULL THEN
    v_paciente_atendido_id := (v_meta->>'paciente_atendido_id')::uuid;
  ELSE
    v_paciente_atendido_id := NULL;
  END IF;

  IF v_tipo IN ('servico','pa') THEN
    v_canal := 'servico_plataforma';
  ELSE
    v_canal := 'app';
  END IF;

  SELECT link_sala_padrao INTO v_link_sala FROM public.medicos WHERE id = v_slot.medico_id;

  INSERT INTO public.consultas (
    paciente_id, paciente_atendido_id, medico_id,
    especialidade_id, servico_id,
    slot_id, inicio, fim, modalidade,
    status, valor_centavos, motivo, canal_origem,
    link_sala
  ) VALUES (
    v_paciente_id, v_paciente_atendido_id, v_slot.medico_id,
    CASE WHEN v_tipo = 'especialidade' THEN v_ref_id ELSE NULL END,
    CASE WHEN v_tipo IN ('servico','pa') THEN v_ref_id ELSE NULL END,
    v_slot.id, v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'agendada', v_pag.valor_centavos, NULLIF(trim(coalesce(v_motivo,'')), ''),
    v_canal,
    v_link_sala
  )
  RETURNING id INTO v_consulta_id;

  UPDATE public.agenda_slots
  SET status = 'bloqueado',
      reserva_expira_em = NULL,
      reservado_por_consulta_id = v_consulta_id,
      updated_at = now()
  WHERE id = v_slot.id;

  UPDATE public.pagamentos
  SET consulta_id = v_consulta_id
  WHERE id = _pagamento_id;

  v_conv_id := public.create_conversation_for_consulta(v_consulta_id);

  RETURN jsonb_build_object(
    'ok', true,
    'consulta_id', v_consulta_id,
    'link_sala', v_link_sala,
    'conversation_id', v_conv_id
  );
END;
$function$;
