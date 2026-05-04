
-- Fix RLS: allow anon to see available slots
DROP POLICY IF EXISTS "Slots disponíveis públicos a autenticados" ON public.agenda_slots;
DROP POLICY IF EXISTS "Slots disponíveis visíveis publicamente" ON public.agenda_slots;

CREATE POLICY "Slots disponíveis visíveis publicamente"
  ON public.agenda_slots
  FOR SELECT
  TO authenticated, anon
  USING (status = 'disponivel');

-- Drop old 3-param RPCs
DROP FUNCTION IF EXISTS public.fn_servico_reservar_slot(timestamptz, uuid, uuid);
DROP FUNCTION IF EXISTS public.fn_servico_confirmar_reserva(uuid, uuid, uuid);

-- Recreate fn_servico_reservar_slot with 2 params
CREATE OR REPLACE FUNCTION public.fn_servico_reservar_slot(
  _slot_inicio timestamptz,
  _servico_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot record;
  _medico_nome text;
  _transferido boolean := false;
  _paciente_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Autenticação necessária');
  END IF;

  SELECT id INTO _paciente_id FROM public.pacientes WHERE user_id = auth.uid();
  IF _paciente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil de paciente não encontrado');
  END IF;

  SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
  INTO _slot
  FROM public.agenda_slots s
  JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _servico_id AND ms.ativo = true
  LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
  WHERE s.status = 'disponivel'
    AND s.servico_id = _servico_id
    AND s.inicio = _slot_inicio
    AND s.inicio > now()
  ORDER BY COALESCE(mr.ranking_score, 0) DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF _slot IS NULL THEN
    SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
    INTO _slot
    FROM public.agenda_slots s
    JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _servico_id AND ms.ativo = true
    LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
    WHERE s.status = 'disponivel'
      AND s.servico_id = _servico_id
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

  UPDATE public.agenda_slots
  SET status = 'reservado',
      reservado_por = _paciente_id,
      reserva_expira_em = now() + interval '10 minutes'
  WHERE id = _slot.id;

  SELECT nome INTO _medico_nome FROM public.medicos WHERE id = _slot.medico_id;

  RETURN jsonb_build_object(
    'ok', true,
    'slot_id', _slot.id,
    'medico_id', _slot.medico_id,
    'medico_nome', COALESCE(_medico_nome, ''),
    'inicio', _slot.inicio,
    'fim', _slot.fim,
    'modalidade', _slot.modalidade,
    'transferido', _transferido
  );
END;
$$;

-- Recreate fn_servico_confirmar_reserva with 2 params
CREATE OR REPLACE FUNCTION public.fn_servico_confirmar_reserva(
  _slot_id uuid,
  _servico_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot record;
  _preco int;
  _consulta_id uuid;
  _paciente_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Autenticação necessária');
  END IF;

  SELECT id INTO _paciente_id FROM public.pacientes WHERE user_id = auth.uid();
  IF _paciente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Perfil de paciente não encontrado');
  END IF;

  SELECT * INTO _slot FROM public.agenda_slots
  WHERE id = _slot_id AND status = 'reservado' AND reserva_expira_em > now()
  FOR UPDATE;

  IF _slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Reserva expirada ou inválida');
  END IF;

  IF _slot.reservado_por IS DISTINCT FROM _paciente_id THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Esta reserva pertence a outro paciente');
  END IF;

  SELECT valor_paciente_centavos INTO _preco
  FROM public.servicos_financeiros WHERE id = _servico_id;

  INSERT INTO public.consultas (
    paciente_id, medico_id, servico_id, slot_id, inicio, fim,
    modalidade, status, valor_centavos, canal_origem
  ) VALUES (
    _paciente_id, _slot.medico_id, _servico_id, _slot.id, _slot.inicio, _slot.fim,
    _slot.modalidade, 'aguardando_pagamento', COALESCE(_preco, 0), 'servico_plataforma'
  )
  RETURNING id INTO _consulta_id;

  UPDATE public.agenda_slots
  SET reservado_por_consulta_id = _consulta_id, reserva_expira_em = NULL
  WHERE id = _slot_id;

  RETURN jsonb_build_object(
    'ok', true,
    'consulta_id', _consulta_id,
    'slot_id', _slot_id,
    'medico_id', _slot.medico_id,
    'inicio', _slot.inicio,
    'fim', _slot.fim,
    'valor_centavos', COALESCE(_preco, 0)
  );
END;
$$;

-- Restrict execute to authenticated only
REVOKE EXECUTE ON FUNCTION public.fn_servico_reservar_slot(timestamptz, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_servico_confirmar_reserva(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_servico_reservar_slot(timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_servico_confirmar_reserva(uuid, uuid) TO authenticated;
