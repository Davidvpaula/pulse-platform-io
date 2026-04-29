-- Índice único parcial: 1 pagamento ATIVO (não cancelado/falho) por consulta
CREATE UNIQUE INDEX IF NOT EXISTS pagamentos_consulta_ativo_unique
  ON public.pagamentos (consulta_id)
  WHERE status NOT IN ('cancelado', 'falhou', 'reembolsado');

-- RPC: marcar pagamento como processando e gravar session id do Stripe
CREATE OR REPLACE FUNCTION public.marcar_pagamento_processando(
  _pagamento_id uuid,
  _provider_session_id text,
  _checkout_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pagamentos
     SET status = 'processando',
         provider = 'stripe',
         provider_session_id = _provider_session_id,
         checkout_url = _checkout_url,
         updated_at = now()
   WHERE id = _pagamento_id;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_pagamento_processando(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- RPC: processar pagamento confirmado (idempotente)
CREATE OR REPLACE FUNCTION public.processar_pagamento_confirmado(
  _provider_session_id text,
  _provider_payment_id text,
  _metodo pagamento_metodo,
  _payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pagamento record;
  v_consulta record;
BEGIN
  -- Localiza o pagamento pelo session id (idempotente)
  SELECT * INTO v_pagamento
    FROM public.pagamentos
   WHERE provider_session_id = _provider_session_id
   FOR UPDATE;

  IF v_pagamento IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado para sessão %', _provider_session_id;
  END IF;

  -- Idempotência: já está pago, retorna ok
  IF v_pagamento.status = 'pago' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'pagamento_id', v_pagamento.id);
  END IF;

  UPDATE public.pagamentos
     SET status = 'pago',
         metodo = COALESCE(_metodo, metodo),
         provider_payment_id = COALESCE(_provider_payment_id, provider_payment_id),
         paid_at = now(),
         metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(_payload, '{}'::jsonb),
         updated_at = now()
   WHERE id = v_pagamento.id;

  -- Atualiza consulta e slot
  SELECT * INTO v_consulta FROM public.consultas WHERE id = v_pagamento.consulta_id FOR UPDATE;
  IF v_consulta IS NOT NULL THEN
    UPDATE public.consultas
       SET status = 'agendada', updated_at = now()
     WHERE id = v_consulta.id
       AND status IN ('aguardando_pagamento');

    IF v_consulta.slot_id IS NOT NULL THEN
      UPDATE public.agenda_slots
         SET status = 'bloqueado',
             reserva_expira_em = NULL,
             updated_at = now()
       WHERE id = v_consulta.slot_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'pagamento_id', v_pagamento.id,
    'consulta_id', v_pagamento.consulta_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.processar_pagamento_confirmado(text, text, pagamento_metodo, jsonb) FROM PUBLIC, anon, authenticated;

-- RPC: marcar pagamento como falho/cancelado via webhook
CREATE OR REPLACE FUNCTION public.marcar_pagamento_falho(
  _provider_session_id text,
  _motivo text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pagamentos
     SET status = 'falhou',
         cancelled_at = now(),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('motivo_falha', _motivo),
         updated_at = now()
   WHERE provider_session_id = _provider_session_id
     AND status IN ('pendente','processando');
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_pagamento_falho(text, text) FROM PUBLIC, anon, authenticated;

-- Define o provider global como stripe
INSERT INTO public.app_settings (key, value)
VALUES ('pagamentos_provider', '"stripe"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();