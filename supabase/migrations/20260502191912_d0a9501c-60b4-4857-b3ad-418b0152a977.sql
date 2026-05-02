-- 1. Listar slots PA disponíveis do dia
CREATE OR REPLACE FUNCTION public.fn_pa_slots_disponiveis(
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
  WITH pa_cfg AS (
    SELECT (value->>'servico_id')::uuid AS servico_id
    FROM public.app_settings
    WHERE key = 'atendimento_imediato'
    LIMIT 1
  ),
  medicos_pa AS (
    SELECT ms.medico_id
    FROM public.medico_servicos ms
    JOIN pa_cfg ON ms.servico_id = pa_cfg.servico_id
    WHERE ms.ativo = true AND ms.status = 'ativo'
  )
  SELECT
    s.id AS slot_id,
    s.medico_id,
    s.inicio,
    s.fim,
    s.modalidade::text,
    COUNT(*) OVER (PARTITION BY s.inicio) AS total_vagas
  FROM public.agenda_slots s
  JOIN medicos_pa mp ON s.medico_id = mp.medico_id
  WHERE s.status = 'disponivel'
    AND s.inicio::date = _data
    AND s.inicio > now()
  ORDER BY s.inicio, s.medico_id;
$$;

-- 2. Reservar slot PA (atômico, escolhe melhor médico)
CREATE OR REPLACE FUNCTION public.fn_pa_reservar_slot(
  _slot_inicio timestamptz,
  _paciente_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pa_servico_id uuid;
  _slot record;
  _medico_nome text;
  _transferido boolean := false;
BEGIN
  SELECT (value->>'servico_id')::uuid INTO _pa_servico_id
  FROM public.app_settings WHERE key = 'atendimento_imediato';
  
  IF _pa_servico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'PA não configurado');
  END IF;

  -- Tentar reservar no horário solicitado (melhor médico por ranking)
  SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
  INTO _slot
  FROM public.agenda_slots s
  JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _pa_servico_id AND ms.ativo = true
  LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
  WHERE s.status = 'disponivel'
    AND s.inicio = _slot_inicio
    AND s.inicio > now()
  ORDER BY COALESCE(mr.ranking_score, 0) DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Se não encontrou, pegar o mais próximo
  IF _slot IS NULL THEN
    SELECT s.id, s.medico_id, s.inicio, s.fim, s.modalidade
    INTO _slot
    FROM public.agenda_slots s
    JOIN public.medico_servicos ms ON s.medico_id = ms.medico_id AND ms.servico_id = _pa_servico_id AND ms.ativo = true
    LEFT JOIN public.medico_ranking mr ON s.medico_id = mr.medico_id
    WHERE s.status = 'disponivel'
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

  -- Reservar
  UPDATE public.agenda_slots
  SET status = 'reservado',
      reserva_expira_em = now() + interval '90 seconds'
  WHERE id = _slot.id;

  SELECT nome INTO _medico_nome FROM public.medicos WHERE id = _slot.medico_id;

  RETURN jsonb_build_object(
    'ok', true,
    'slot_id', _slot.id,
    'medico_id', _slot.medico_id,
    'medico_nome', _medico_nome,
    'inicio', _slot.inicio,
    'fim', _slot.fim,
    'transferido', _transferido
  );
END;
$$;

-- 3. Confirmar reserva PA → cria consulta
CREATE OR REPLACE FUNCTION public.fn_pa_confirmar_reserva(
  _slot_id uuid,
  _paciente_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _slot record;
  _pa_servico_id uuid;
  _preco int;
  _consulta_id uuid;
BEGIN
  SELECT (value->>'servico_id')::uuid INTO _pa_servico_id
  FROM public.app_settings WHERE key = 'atendimento_imediato';

  SELECT * INTO _slot FROM public.agenda_slots
  WHERE id = _slot_id AND status = 'reservado' AND reserva_expira_em > now()
  FOR UPDATE;

  IF _slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Reserva expirada ou inválida');
  END IF;

  SELECT valor_paciente_centavos INTO _preco
  FROM public.servicos_financeiros WHERE id = _pa_servico_id;

  INSERT INTO public.consultas (
    paciente_id, medico_id, servico_id, slot_id, inicio, fim,
    modalidade, status, valor_centavos, canal_origem
  ) VALUES (
    _paciente_id, _slot.medico_id, _pa_servico_id, _slot.id, _slot.inicio, _slot.fim,
    _slot.modalidade, 'aguardando_pagamento', COALESCE(_preco, 0), 'pa_publico'
  )
  RETURNING id INTO _consulta_id;

  UPDATE public.agenda_slots
  SET reservado_por_consulta_id = _consulta_id, reserva_expira_em = NULL
  WHERE id = _slot_id;

  RETURN jsonb_build_object('ok', true, 'consulta_id', _consulta_id);
END;
$$;

-- Permissões
REVOKE EXECUTE ON FUNCTION public.fn_pa_reservar_slot(timestamptz, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_pa_confirmar_reserva(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_pa_slots_disponiveis(date) TO anon, authenticated;