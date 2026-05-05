-- Remove a policy com recursão
DROP POLICY IF EXISTS "Paciente cria assinatura propria" ON public.assinaturas;

-- Recria sem referenciar a própria tabela assinaturas (usa subqueries diretas)
CREATE POLICY "Paciente cria assinatura propria"
ON public.assinaturas
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND paciente_id IN (SELECT p.id FROM pacientes p WHERE p.user_id = auth.uid())
  AND plano_id IN (SELECT pl.id FROM planos pl WHERE pl.created_by = auth.uid() AND pl.nivel = 'paciente_custom')
);