-- Subscriptions table for Stripe Premium
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING ((SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role');

-- Helper function
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'sandbox'
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND environment = check_env
    AND (
      (status IN ('active', 'trialing') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())
    )
  );
$$;

-- Sync Premium status when subscription changes
CREATE OR REPLACE FUNCTION public.sync_premium_from_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_medico_id uuid;
  v_plano text;
  v_is_active boolean;
BEGIN
  -- Find medico by user_id
  SELECT id INTO v_medico_id FROM public.medicos WHERE user_id = NEW.user_id LIMIT 1;
  IF v_medico_id IS NULL THEN RETURN NEW; END IF;

  -- Derive plan from price_id
  v_plano := CASE
    WHEN NEW.price_id ILIKE '%basico%' THEN 'basico'
    WHEN NEW.price_id ILIKE '%profissional%' THEN 'profissional'
    WHEN NEW.price_id ILIKE '%enterprise%' THEN 'enterprise'
    ELSE 'basico'
  END;

  v_is_active := NEW.status IN ('active', 'trialing')
    OR (NEW.status = 'canceled' AND NEW.current_period_end > now());

  -- Upsert medico_premium
  INSERT INTO public.medico_premium (medico_id, ativo, tipo, inicio, fim, auto_renovar, stripe_subscription_id)
  VALUES (v_medico_id, v_is_active, 'pago', now(), NEW.current_period_end, NOT COALESCE(NEW.cancel_at_period_end, false), NEW.stripe_subscription_id)
  ON CONFLICT (medico_id) DO UPDATE SET
    ativo = v_is_active,
    tipo = 'pago',
    fim = NEW.current_period_end,
    auto_renovar = NOT COALESCE(NEW.cancel_at_period_end, false),
    stripe_subscription_id = NEW.stripe_subscription_id,
    updated_at = now();

  -- Upsert premium_assinaturas
  INSERT INTO public.premium_assinaturas (medico_id, plano, valor_centavos, moeda, status, stripe_subscription_id, stripe_customer_id, inicio, fim_ciclo_atual, auto_renovar, environment)
  VALUES (
    v_medico_id, v_plano,
    CASE v_plano WHEN 'basico' THEN 14900 WHEN 'profissional' THEN 34900 WHEN 'enterprise' THEN 69900 ELSE 14900 END,
    'brl',
    CASE WHEN v_is_active THEN 'ativa' WHEN NEW.status = 'canceled' THEN 'cancelada' ELSE 'pausada' END,
    NEW.stripe_subscription_id, NEW.stripe_customer_id,
    COALESCE(NEW.current_period_start, now()),
    NEW.current_period_end,
    NOT COALESCE(NEW.cancel_at_period_end, false),
    NEW.environment
  )
  ON CONFLICT (medico_id) DO UPDATE SET
    plano = v_plano,
    status = CASE WHEN v_is_active THEN 'ativa' WHEN NEW.status = 'canceled' THEN 'cancelada' ELSE 'pausada' END,
    stripe_subscription_id = NEW.stripe_subscription_id,
    stripe_customer_id = NEW.stripe_customer_id,
    fim_ciclo_atual = NEW.current_period_end,
    auto_renovar = NOT COALESCE(NEW.cancel_at_period_end, false),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_premium_subscription
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_premium_from_subscription();