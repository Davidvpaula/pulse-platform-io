
-- Tabela já criada parcialmente na migration anterior que falhou? Garantir idempotência
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_handoff_level') THEN
    CREATE TYPE public.ai_handoff_level AS ENUM ('urgente', 'moderado', 'baixo');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_handoff_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_settings_id UUID REFERENCES public.ai_settings(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  intent TEXT,
  level public.ai_handoff_level NOT NULL DEFAULT 'moderado',
  action TEXT NOT NULL DEFAULT 'transferir',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_handoff_rules ENABLE ROW LEVEL SECURITY;

-- RLS handoff_rules
DROP POLICY IF EXISTS "Admin gerencia handoff_rules" ON public.ai_handoff_rules;
CREATE POLICY "Admin gerencia handoff_rules"
ON public.ai_handoff_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff ve handoff_rules" ON public.ai_handoff_rules;
CREATE POLICY "Staff ve handoff_rules"
ON public.ai_handoff_rules FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'secretaria')
  OR public.has_role(auth.uid(), 'supervisor')
);

-- Colunas sugestão médicos
ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS sugestao_medicos_ativa BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sugestao_prioridade JSONB NOT NULL DEFAULT '{"avaliacao": 0.5, "disponibilidade": 0.3, "custo": 0.2}'::jsonb;

-- Corrigir RLS ai_settings
DROP POLICY IF EXISTS "Admin gerencia ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Staff configura ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Staff ve ai_settings" ON public.ai_settings;

CREATE POLICY "Admin le ai_settings"
ON public.ai_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insere ai_settings"
ON public.ai_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin atualiza ai_settings"
ON public.ai_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff le ai_settings"
ON public.ai_settings FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'secretaria')
  OR public.has_role(auth.uid(), 'supervisor')
);
