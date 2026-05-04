CREATE OR REPLACE FUNCTION public.fn_pa_reservar_slot(_slot_inicio timestamp with time zone, _paciente_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pa_servico_id uuid;
  _real_paciente_id uuid;
  _slot record;
  _medico_nome text;
  _transferido boolean := false;
BEGIN
  -- Correct key format (matching fn_pa_slots_disponiveis)
  SELECT (value #>> '{}')::uuid INTO _pa_servico_id
  FROM public.app_settings WHERE key = 'atendimento_imediato.servico_id';
  
  IF _pa_servico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'PA não configurado');
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Autenticação necessária');
  END IF;

  SELECT id INTO _real_paciente_id FROM public.pacientes WHERE user_id = auth.uid();
  IF _real_paciente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil de paciente não encontrado. Complete seu cadastro primeiro.');
  END IF;

  -- Try exact time (best doctor by ranking)
  SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
  INTO _slot
  FROM public.agenda_slots s
  JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _pa_servico_id AND ms.ativo = true
  LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
  WHERE s.status = 'disponivel'
    AND s.servico_id = _pa_servico_id
    AND s.inicio = _slot_inicio
    AND s.inicio > now()
  ORDER BY COALESCE(mr.ranking_score, 0) DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Fallback: closest available same day
  IF _slot IS NULL THEN
    SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
    INTO _slot
    FROM public.agenda_slots s
    JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _pa_servico_id AND ms.ativo = true
    LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
    WHERE s.status = 'disponivel'
      AND s.servico_id = _pa_servico_id
      AND s.inicio > now()
      AND s.inicio::date = _slot_inicio::date
    ORDER BY ABS(EXTRACT(EPOCH FROM s.inicio - _slot_inicio)), COALESCE(mr.ranking_score, 0) DESC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF _slot IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Nenhum horário disponível');
    END IF;
    _transferido := true;
  END IF;

  -- Reserve the slot
  UPDATE public.agenda_slots
  SET status = 'reservado',
      reservado_por = _real_paciente_id,
      reserva_expira_em = now() + interval '90 seconds'
  WHERE id = _slot.id;

  SELECT nome INTO _medico_nome FROM public.medicos WHERE id = _slot.medico_id;

  RETURN jsonb_build_object(
    'ok', true,
    'slot_id', _slot.id,
    'medico_id', _slot.medico_id,
    'medico_nome', COALESCE(_medico_nome, ''),
    'inicio', _slot.inicio,
    'fim', _slot.fim,
    'transferido', _transferido
  );
END;
$function$;