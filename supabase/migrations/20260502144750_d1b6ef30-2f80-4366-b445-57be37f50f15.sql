-- 1. Campos adicionais em planos para suporte a planos empresariais
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS valor_por_vida_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coparticipacao_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_prioridade text NOT NULL DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS especialidades_liberadas uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS regras_uso_json jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.planos.valor_por_vida_centavos IS 'Valor por vida/colaborador em centavos (usado em planos empresariais)';
COMMENT ON COLUMN public.planos.coparticipacao_pct IS 'Percentual de coparticipação do funcionário (0 = empresa paga 100%)';
COMMENT ON COLUMN public.planos.sla_prioridade IS 'Nível de SLA: padrao, prioritario, vip';
COMMENT ON COLUMN public.planos.especialidades_liberadas IS 'Array de especialidade IDs liberadas; vazio = todas';
COMMENT ON COLUMN public.planos.regras_uso_json IS 'Regras de uso adicionais (limite por especialidade, etc)';

-- 2. Vincular empresa a um plano
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.empresas.plano_id IS 'Plano empresarial vinculado';

-- 3. Vincular contrato a um plano
ALTER TABLE public.empresas_contratos
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL;

-- 4. Visibilidade de documentos para empresa
ALTER TABLE public.documentos_paciente
  ADD COLUMN IF NOT EXISTS visibilidade_empresa boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.documentos_paciente.visibilidade_empresa IS 'Se true, documento pode ser visto pela empresa do paciente (nunca prontuário completo)';

-- 5. RLS: empresa só vê documentos marcados como compartilháveis
CREATE POLICY "Empresa vê docs compartilhados dos seus funcionarios"
  ON public.documentos_paciente
  FOR SELECT
  TO authenticated
  USING (
    visibilidade_empresa = true
    AND EXISTS (
      SELECT 1 FROM public.empresas_funcionarios ef
      JOIN public.empresas e ON e.id = ef.empresa_id
      WHERE ef.paciente_id = documentos_paciente.paciente_id
        AND ef.status = 'ativo'
        AND public.is_empresa_owner(e.id)
    )
  );