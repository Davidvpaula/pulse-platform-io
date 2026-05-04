
-- 1. Fix planos INSERT: allow médico to create empresa plans from proposals
DROP POLICY IF EXISTS "Médico cria plano próprio" ON public.planos;
CREATE POLICY "Médico cria plano próprio" ON public.planos
  FOR INSERT TO authenticated
  WITH CHECK (
    medico_id = auth.uid()
    AND nivel IN ('medico', 'admin')
  );

-- 2. Fix plano_medicos INSERT: allow médico to add themselves
CREATE POLICY "Médico insere própria participação" ON public.plano_medicos
  FOR INSERT TO authenticated
  WITH CHECK (medico_id = auth.uid());

-- 3. Fix propostas UPDATE: allow setting convertida + plano_gerado_id
DROP POLICY IF EXISTS "Medico responde propostas" ON public.propostas_empresa_medico;
CREATE POLICY "Medico responde propostas" ON public.propostas_empresa_medico
  FOR UPDATE TO authenticated
  USING (
    medico_id = auth.uid()
    AND status IN ('enviada_medico', 'aceita')
  )
  WITH CHECK (
    medico_id = auth.uid()
    AND status IN ('aceita', 'recusada', 'convertida')
  );
