
CREATE POLICY "Paciente ve proprio vinculo empresarial"
  ON public.empresas_funcionarios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.id = empresas_funcionarios.paciente_id
        AND p.user_id = auth.uid()
    )
  );
