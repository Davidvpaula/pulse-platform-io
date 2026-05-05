CREATE POLICY "Paciente ve seus proprios reembolsos"
ON public.reembolsos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM consultas c
    JOIN pacientes p ON p.id = c.paciente_id
    WHERE c.id = reembolsos.consulta_id
    AND p.user_id = auth.uid()
  )
);