
-- Enum for refund policy scope
CREATE TYPE public.politica_reembolso_escopo AS ENUM ('global', 'medico');

-- Enum for refund situation
CREATE TYPE public.politica_reembolso_situacao AS ENUM (
  'cancelamento_antecipado',
  'cancelamento_tardio',
  'medico_no_show',
  'sem_inicio_finalizacao'
);

-- Enum for refund action
CREATE TYPE public.politica_reembolso_acao AS ENUM ('total', 'parcial', 'zero');

-- Table
CREATE TABLE public.politica_reembolso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escopo politica_reembolso_escopo NOT NULL DEFAULT 'global',
  medico_id UUID REFERENCES public.medicos(id) ON DELETE CASCADE,
  situacao politica_reembolso_situacao NOT NULL,
  horas_antecedencia_min INTEGER DEFAULT 0,
  tipo_reembolso politica_reembolso_acao NOT NULL DEFAULT 'zero',
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (percentual >= 0 AND percentual <= 100),
  ativo BOOLEAN NOT NULL DEFAULT true,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_medico_scope CHECK (
    (escopo = 'global' AND medico_id IS NULL) OR
    (escopo = 'medico' AND medico_id IS NOT NULL)
  )
);

-- Unique constraint: one rule per scope+medico+situation
CREATE UNIQUE INDEX uq_politica_reembolso_global ON public.politica_reembolso (situacao) WHERE escopo = 'global';
CREATE UNIQUE INDEX uq_politica_reembolso_medico ON public.politica_reembolso (medico_id, situacao) WHERE escopo = 'medico';

-- RLS
ALTER TABLE public.politica_reembolso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage refund policies"
  ON public.politica_reembolso
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_politica_reembolso_updated_at
  BEFORE UPDATE ON public.politica_reembolso
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add new termo_tipo enum value for cancellation/refund terms
ALTER TYPE public.termo_tipo ADD VALUE IF NOT EXISTS 'cancelamento_reembolso';
