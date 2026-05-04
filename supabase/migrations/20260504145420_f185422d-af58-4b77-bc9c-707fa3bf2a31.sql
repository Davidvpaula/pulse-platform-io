-- Médico pode ver pacientes que têm consulta com ele
CREATE POLICY "Medico ve pacientes vinculados"
ON public.pacientes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.medicos m
    WHERE m.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM public.consultas c
    JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.paciente_id = pacientes.id
      AND m.user_id = auth.uid()
  )
);