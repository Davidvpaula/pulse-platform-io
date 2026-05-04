
-- 1. Generic function to list available slots for any service
CREATE OR REPLACE FUNCTION public.fn_servico_slots_disponiveis(
  _servico_id uuid,
  _data date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  slot_id uuid,
  medico_id uuid,
  inicio timestamptz,
  fim timestamptz,
  modalidade text,
  total_vagas bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH medicos_servico AS (
    SELECT ms.medico_id
    FROM public.medico_servicos ms
    WHERE ms.servico_id = _servico_id
      AND ms.ativo = true
      AND ms.status = 'ativo'
  )
  SELECT
    s.id AS slot_id,
    s.medico_id,
    s.inicio,
    s.fim,
    s.modalidade::text,
    COUNT(*) OVER (PARTITION BY s.inicio) AS total_vagas
  FROM public.agenda_slots s
  JOIN medicos_servico mp ON s.medico_id = mp.medico_id
  WHERE s.servico_id = _servico_id
    AND s.status = 'disponivel'
    AND s.inicio::date = _data
    AND s.inicio > now()
  ORDER BY s.inicio, s.medico_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_servico_slots_disponiveis(uuid, date) TO anon, authenticated;

-- 2. Generic function to reserve a slot for any service (picks best doctor by ranking)
CREATE OR REPLACE FUNCTION public.fn_servico_reservar_slot(
  _slot_inicio timestamptz,
  _servico_id uuid,
  _paciente_id uuid DEFAULT auth.uid()
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
BEGIN
  -- Try to reserve at the requested time (best doctor by ranking)
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

  -- If not found, get the closest available
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

  -- Reserve the slot
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

GRANT EXECUTE ON FUNCTION public.fn_servico_reservar_slot(timestamptz, uuid, uuid) TO authenticated;

-- 3. Generic function to confirm a service reservation
CREATE OR REPLACE FUNCTION public.fn_servico_confirmar_reserva(
  _slot_id uuid,
  _servico_id uuid,
  _paciente_id uuid DEFAULT auth.uid()
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
BEGIN
  SELECT * INTO _slot FROM public.agenda_slots
  WHERE id = _slot_id AND status = 'reservado' AND reserva_expira_em > now()
  FOR UPDATE;

  IF _slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Reserva expirada ou inválida');
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

GRANT EXECUTE ON FUNCTION public.fn_servico_confirmar_reserva(uuid, uuid, uuid) TO authenticated;
