CREATE TYPE feedback_tipo AS ENUM ('contato', 'feedback');
CREATE TYPE feedback_status AS ENUM ('novo', 'lido', 'arquivado');

CREATE TABLE public.feedbacks_site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo feedback_tipo NOT NULL,
  nome TEXT,
  sobrenome TEXT,
  telefone TEXT,
  email TEXT NOT NULL,
  mensagem TEXT,
  user_agent TEXT,
  status feedback_status NOT NULL DEFAULT 'novo',
  lido_em TIMESTAMPTZ,
  lido_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedbacks_site_created_at ON public.feedbacks_site (created_at DESC);
CREATE INDEX idx_feedbacks_site_status ON public.feedbacks_site (status);

ALTER TABLE public.feedbacks_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_feedback"
  ON public.feedbacks_site
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) <= 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND coalesce(char_length(mensagem), 0) <= 2000
    AND coalesce(char_length(nome), 0) <= 120
    AND coalesce(char_length(sobrenome), 0) <= 120
    AND coalesce(char_length(telefone), 0) <= 40
  );

CREATE POLICY "admin_select_feedback"
  ON public.feedbacks_site
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_feedback"
  ON public.feedbacks_site
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));