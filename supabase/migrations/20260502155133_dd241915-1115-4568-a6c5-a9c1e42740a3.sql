
-- Tabela de vínculo médico-empresa
CREATE TABLE IF NOT EXISTS public.empresa_medicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  preco_consulta_centavos INTEGER DEFAULT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, medico_id)
);

ALTER TABLE public.empresa_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar vínculos empresa-médico"
ON public.empresa_medicos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Médicos veem próprios vínculos"
ON public.empresa_medicos FOR SELECT TO authenticated
USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE INDEX idx_empresa_medicos_empresa ON public.empresa_medicos(empresa_id);
CREATE INDEX idx_empresa_medicos_medico ON public.empresa_medicos(medico_id);
