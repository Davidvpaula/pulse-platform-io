
-- Enum for proposal status
CREATE TYPE public.proposta_empresa_status AS ENUM (
  'criada', 'em_analise', 'aprovada_admin', 'enviada_medico',
  'aceita', 'recusada', 'convertida', 'cancelada'
);

-- Enum for contract type
CREATE TYPE public.proposta_tipo_contrato AS ENUM (
  'mensal', 'pacote', 'recorrente'
);

-- Add new termo types
ALTER TYPE public.termo_tipo ADD VALUE IF NOT EXISTS 'proposta_empresa';
ALTER TYPE public.termo_tipo ADD VALUE IF NOT EXISTS 'proposta_medico';

-- Main proposals table
CREATE TABLE public.propostas_empresa_medico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  especialidade_id UUID REFERENCES public.especialidades(id),
  status public.proposta_empresa_status NOT NULL DEFAULT 'criada',
  tipo_contrato public.proposta_tipo_contrato NOT NULL DEFAULT 'mensal',
  valor_mensal_centavos INTEGER NOT NULL,
  qtd_atendimentos INTEGER,
  mensagem_empresa TEXT,
  mensagem_medico TEXT,
  -- Admin fields
  taxa_plataforma_pct NUMERIC(5,2),
  valor_ajustado_centavos INTEGER,
  observacao_admin TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  aprovado_em TIMESTAMPTZ,
  -- Médico response
  respondido_em TIMESTAMPTZ,
  -- Conversion
  plano_gerado_id UUID REFERENCES public.planos(id),
  -- Terms
  termo_empresa_aceito BOOLEAN NOT NULL DEFAULT false,
  termo_empresa_versao INTEGER,
  termo_medico_aceito BOOLEAN NOT NULL DEFAULT false,
  termo_medico_versao INTEGER,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_propostas_empresa ON public.propostas_empresa_medico(empresa_id);
CREATE INDEX idx_propostas_medico ON public.propostas_empresa_medico(medico_id);
CREATE INDEX idx_propostas_status ON public.propostas_empresa_medico(status);

-- Updated_at trigger
CREATE TRIGGER update_propostas_empresa_medico_updated_at
  BEFORE UPDATE ON public.propostas_empresa_medico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.propostas_empresa_medico ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin gerencia todas propostas"
  ON public.propostas_empresa_medico
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Empresa ve suas propostas"
  ON public.propostas_empresa_medico
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'empresa') 
    AND public.is_empresa_owner(empresa_id)
  );

CREATE POLICY "Empresa cria propostas"
  ON public.propostas_empresa_medico
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'empresa') 
    AND public.is_empresa_owner(empresa_id)
  );

CREATE POLICY "Medico ve propostas enviadas"
  ON public.propostas_empresa_medico
  FOR SELECT
  TO authenticated
  USING (
    medico_id = auth.uid()
    AND status IN ('enviada_medico', 'aceita', 'recusada', 'convertida')
  );

CREATE POLICY "Medico responde propostas"
  ON public.propostas_empresa_medico
  FOR UPDATE
  TO authenticated
  USING (
    medico_id = auth.uid()
    AND status = 'enviada_medico'
  )
  WITH CHECK (
    medico_id = auth.uid()
    AND status IN ('aceita', 'recusada')
  );
