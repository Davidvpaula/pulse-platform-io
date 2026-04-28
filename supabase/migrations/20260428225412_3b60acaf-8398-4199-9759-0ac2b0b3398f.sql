-- 1) Flag de Pronto Atendimento por vínculo médico×especialidade
ALTER TABLE public.medico_especialidades
  ADD COLUMN IF NOT EXISTS pronto_atendimento boolean NOT NULL DEFAULT false;

-- 2) Tabela de configurações globais (chave/valor) gerida pelo Admin
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública (autenticados e anon) — necessário para front exibir duração de PA
DROP POLICY IF EXISTS "App settings públicos leitura" ON public.app_settings;
CREATE POLICY "App settings públicos leitura"
  ON public.app_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Apenas admin grava
DROP POLICY IF EXISTS "Admin gerencia app_settings" ON public.app_settings;
CREATE POLICY "Admin gerencia app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: duração padrão do Pronto Atendimento (15 min)
INSERT INTO public.app_settings (key, value)
VALUES ('pronto_atendimento_duracao_min', '15'::jsonb)
ON CONFLICT (key) DO NOTHING;