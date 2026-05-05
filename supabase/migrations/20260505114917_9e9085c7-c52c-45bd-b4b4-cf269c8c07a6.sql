-- Remover políticas antigas do paciente
DROP POLICY IF EXISTS "paciente cria pagamento próprio" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente cria pagamento proprio" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente vê seus pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente ve seus pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente atualiza pagamento próprio" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente atualiza pagamento proprio" ON public.pagamentos;

-- INSERT: paciente cria pagamento pendente (com consulta_id legado OU paciente_id direto unificado)
CREATE POLICY "paciente cria pagamento proprio"
  ON public.pagamentos FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'pendente'
    AND (
      (consulta_id IS NOT NULL AND is_paciente_da_consulta(consulta_id))
      OR
      (consulta_id IS NULL AND paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid()))
    )
  );

-- SELECT: paciente vê pagamentos dele
CREATE POLICY "paciente ve seus pagamentos"
  ON public.pagamentos FOR SELECT
  TO authenticated
  USING (
    (consulta_id IS NOT NULL AND is_paciente_da_consulta(consulta_id))
    OR
    (paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid()))
  );

-- UPDATE: paciente atualiza pagamento dele
CREATE POLICY "paciente atualiza pagamento proprio"
  ON public.pagamentos FOR UPDATE
  TO authenticated
  USING (
    (consulta_id IS NOT NULL AND is_paciente_da_consulta(consulta_id))
    OR
    (paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid()))
  )
  WITH CHECK (
    (consulta_id IS NOT NULL AND is_paciente_da_consulta(consulta_id))
    OR
    (paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid()))
  );