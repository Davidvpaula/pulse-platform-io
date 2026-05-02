
-- Table for per-doctor Google OAuth tokens
CREATE TABLE public.medico_google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_medico_google_token UNIQUE (medico_id)
);

-- Add tipo_sala column to medicos
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS tipo_sala TEXT NOT NULL DEFAULT 'fixo'
  CHECK (tipo_sala IN ('fixo', 'dinamico'));

-- Enable RLS
ALTER TABLE public.medico_google_tokens ENABLE ROW LEVEL SECURITY;

-- Médico can read own token status (but tokens are handled server-side)
CREATE POLICY "medico_read_own_google_token"
  ON public.medico_google_tokens
  FOR SELECT
  TO authenticated
  USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

-- Only service_role can insert/update/delete (edge functions)
CREATE POLICY "service_role_manage_google_tokens"
  ON public.medico_google_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_medico_google_tokens_updated_at
  BEFORE UPDATE ON public.medico_google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
