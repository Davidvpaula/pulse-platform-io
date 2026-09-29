-- As telas médicas usam medico_transicionar_consulta, que valida identidade,
-- aprovação e transição sob lock. A política antiga liberava UPDATE de todos
-- os campos da consulta, inclusive valores financeiros e paciente.
DROP POLICY IF EXISTS "Médico atualiza próprias consultas" ON public.consultas;

-- Exige que o documento pertença à consulta informada e ao paciente atendido.
DROP POLICY IF EXISTS "Médico insere docs paciente da consulta" ON public.documentos_paciente;
CREATE POLICY "Médico insere docs paciente da consulta" ON public.documentos_paciente
FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.consultas c JOIN public.medicos m ON m.id = c.medico_id
    JOIN public.pacientes titular ON titular.id = c.paciente_id
    WHERE c.id = documentos_paciente.consulta_id AND m.user_id = auth.uid() AND m.status = 'aprovado'
      AND coalesce(c.paciente_atendido_id,c.paciente_id) = documentos_paciente.paciente_id
      AND titular.user_id = documentos_paciente.user_id
  )
);
NOTIFY pgrst, 'reload schema';
