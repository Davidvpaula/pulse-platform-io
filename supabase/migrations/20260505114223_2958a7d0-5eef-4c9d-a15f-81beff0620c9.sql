-- Paciente pode ler slot reservado por ele
CREATE POLICY "Paciente ve slot reservado por ele"
  ON public.agenda_slots
  FOR SELECT
  TO authenticated
  USING (
    status = 'reservado'
    AND reservado_por = (
      SELECT p.id FROM public.pacientes p WHERE p.user_id = auth.uid() LIMIT 1
    )
  );
