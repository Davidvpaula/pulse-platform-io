-- 1) Adicionar novos valores ao enum documento_paciente_tipo
ALTER TYPE public.documento_paciente_tipo ADD VALUE IF NOT EXISTS 'prescricao';
ALTER TYPE public.documento_paciente_tipo ADD VALUE IF NOT EXISTS 'atestado';

-- 2) Adicionar colunas em documentos_paciente
ALTER TABLE public.documentos_paciente
  ADD COLUMN IF NOT EXISTS consulta_id uuid REFERENCES public.consultas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) Índice para busca por consulta
CREATE INDEX IF NOT EXISTS idx_documentos_paciente_consulta
  ON public.documentos_paciente(consulta_id)
  WHERE consulta_id IS NOT NULL;

-- 4) RLS: Médico pode inserir documentos para pacientes das suas consultas
CREATE POLICY "Médico insere docs paciente da consulta"
  ON public.documentos_paciente
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM consultas c
      JOIN medicos m ON m.id = c.medico_id
      WHERE m.user_id = auth.uid()
        AND (c.paciente_id = documentos_paciente.paciente_id
             OR c.paciente_atendido_id = documentos_paciente.paciente_id)
    )
    AND uploaded_by = auth.uid()
  );

-- 5) Storage: Médico pode fazer upload em paciente-docs
CREATE POLICY "medico envia docs para paciente-docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'paciente-docs'
    AND EXISTS (
      SELECT 1
      FROM consultas c
      JOIN medicos m ON m.id = c.medico_id
      JOIN pacientes p ON p.id = c.paciente_id
      WHERE m.user_id = auth.uid()
        AND (p.user_id::text = (storage.foldername(name))[1])
    )
  );