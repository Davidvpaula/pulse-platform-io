-- Paciente pode criar assinatura do próprio plano personalizado
CREATE POLICY "Paciente cria assinatura propria"
ON public.assinaturas
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND paciente_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pacientes p WHERE p.id = assinaturas.paciente_id AND p.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM planos pl WHERE pl.id = assinaturas.plano_id AND pl.created_by = auth.uid() AND pl.nivel = 'paciente_custom'
  )
);