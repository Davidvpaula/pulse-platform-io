CREATE OR REPLACE FUNCTION public.agendar_retorno_gratuito(_slot_id uuid, _voucher_id uuid, _motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_paciente_id uuid;
  v_voucher record;
  v_slot record;
  v_consulta_id uuid;
  v_especialidade_id uuid;
  v_atendido uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT id INTO v_paciente_id FROM public.pacientes WHERE user_id = v_uid AND status_conta = 'ativo' LIMIT 1;
  IF v_paciente_id IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;

  -- Bloqueia o voucher
  SELECT * INTO v_voucher
    FROM public.retornos_gratuitos
   WHERE id = _voucher_id
   FOR UPDATE;

  IF v_voucher IS NULL THEN
    RAISE EXCEPTION 'Voucher de retorno não encontrado';
  END IF;
  IF v_voucher.paciente_id <> v_paciente_id THEN
    RAISE EXCEPTION 'Voucher não pertence a este paciente';
  END IF;
  IF v_voucher.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Voucher não está disponível (status: %)', v_voucher.status;
  END IF;
  IF v_voucher.valido_ate < now() THEN
    UPDATE public.retornos_gratuitos SET status = 'expirado' WHERE id = v_voucher.id;
    RAISE EXCEPTION 'Voucher expirado em %', to_char(v_voucher.valido_ate, 'DD/MM/YYYY');
  END IF;

  -- Bloqueia o slot
  SELECT * INTO v_slot FROM public.agenda_slots WHERE id = _slot_id FOR UPDATE;
  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Horário não encontrado';
  END IF;
  IF v_slot.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Este horário não está mais disponível';
  END IF;
  IF v_slot.medico_id <> v_voucher.medico_id THEN
    RAISE EXCEPTION 'O retorno gratuito é válido apenas com o mesmo médico';
  END IF;

  IF v_slot.inicio <= now() OR NOT EXISTS (SELECT 1 FROM medicos WHERE id = v_slot.medico_id AND status = 'aprovado') THEN RAISE EXCEPTION 'Horario indisponivel'; END IF;
  SELECT paciente_atendido_id INTO v_atendido FROM consultas WHERE id = v_voucher.consulta_origem_id AND paciente_id = v_paciente_id;
  IF v_atendido IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pacientes WHERE id = v_atendido AND (id = v_paciente_id OR responsavel_id = v_paciente_id) AND status_conta = 'ativo') THEN RAISE EXCEPTION 'Paciente atendido indisponivel'; END IF;
  v_especialidade_id := COALESCE(v_voucher.especialidade_id, (
    SELECT especialidade_id FROM public.medico_especialidades
     WHERE medico_id = v_slot.medico_id AND ativo = true
     ORDER BY created_at ASC LIMIT 1
  ));

  INSERT INTO public.consultas (
    paciente_id, paciente_atendido_id, medico_id, especialidade_id, slot_id,
    inicio, fim, modalidade, status, motivo, valor_centavos
  ) VALUES (
    v_paciente_id, v_atendido, v_slot.medico_id, v_especialidade_id, v_slot.id,
    v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'confirmada', NULLIF(trim(coalesce(_motivo, 'Retorno gratuito')), ''), 0
  ) RETURNING id INTO v_consulta_id;

  UPDATE public.agenda_slots
     SET status = 'bloqueado',
         reservado_por_consulta_id = v_consulta_id,
         updated_at = now()
   WHERE id = v_slot.id;

  UPDATE public.retornos_gratuitos
     SET status = 'usado',
         consulta_uso_id = v_consulta_id,
         updated_at = now()
   WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'consulta_id', v_consulta_id,
    'voucher_id', v_voucher.id
  );
END;
$function$

;
REVOKE EXECUTE ON FUNCTION public.dispensar_avaliacao_consulta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispensar_avaliacao_consulta(uuid) TO authenticated;
