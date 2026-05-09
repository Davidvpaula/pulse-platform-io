CREATE TABLE public.whatsapp_cloud_test_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enviado_por UUID,
  to_number TEXT NOT NULL,
  message TEXT NOT NULL,
  http_status INT,
  wa_message_id TEXT,
  meta_request_id TEXT,
  error_code INT,
  error_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_cloud_test_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_wa_cloud_test_log"
ON public.whatsapp_cloud_test_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_insert_wa_cloud_test_log"
ON public.whatsapp_cloud_test_log
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wa_cloud_test_log_created_at ON public.whatsapp_cloud_test_log(created_at DESC);