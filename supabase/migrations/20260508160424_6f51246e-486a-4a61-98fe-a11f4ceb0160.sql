CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  signature_valid boolean,
  http_status int,
  payload jsonb NOT NULL,
  processed_count int NOT NULL DEFAULT 0,
  error text,
  wamid_processed text[] NOT NULL DEFAULT '{}'::text[]
);

CREATE INDEX IF NOT EXISTS idx_wa_webhook_log_received_at ON public.whatsapp_webhook_log (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_webhook_log_wamid ON public.whatsapp_webhook_log USING GIN (wamid_processed);

ALTER TABLE public.whatsapp_webhook_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_webhook_log" ON public.whatsapp_webhook_log;
CREATE POLICY "admin_read_webhook_log"
  ON public.whatsapp_webhook_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));