
-- 1. Tabela de logs de template
CREATE TABLE IF NOT EXISTS public.whatsapp_template_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  telefone text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  provider_response jsonb,
  wa_message_id text,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  erro text,
  enviado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_tpl_logs_conv ON public.whatsapp_template_logs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_tpl_logs_status ON public.whatsapp_template_logs(status, created_at DESC);

ALTER TABLE public.whatsapp_template_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/colab veem logs template" ON public.whatsapp_template_logs;
CREATE POLICY "Admin/colab veem logs template"
  ON public.whatsapp_template_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.medicos m WHERE m.user_id = auth.uid())
  );

-- 2. Campos extras em message_templates (compat futura Cloud API oficial)
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS header_type text CHECK (header_type IN ('text','image','video','document','none')),
  ADD COLUMN IF NOT EXISTS footer text,
  ADD COLUMN IF NOT EXISTS buttons jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meta_template_id text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

-- 3. Função: estado da janela 24h
CREATE OR REPLACE FUNCTION public.get_meta_window_state(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'open', COALESCE(w.window_expires_at > now(), false),
    'expires_at', w.window_expires_at,
    'last_inbound_at', w.last_inbound_at,
    'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (w.window_expires_at - now()))::int)
  )
  FROM public.conversation_meta_window w
  WHERE w.conversation_id = p_conversation_id
  UNION ALL
  SELECT jsonb_build_object('open', false, 'expires_at', null, 'last_inbound_at', null, 'remaining_seconds', 0)
  WHERE NOT EXISTS (SELECT 1 FROM public.conversation_meta_window WHERE conversation_id = p_conversation_id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_meta_window_state(uuid) TO authenticated;
