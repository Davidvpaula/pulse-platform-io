-- 1) Endereço completo do paciente
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS uf text;

-- 2) Tipo de documento do paciente
DO $$ BEGIN
  CREATE TYPE public.documento_paciente_tipo AS ENUM
    ('exame','laudo','receita','identidade','plano','vacina','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tabela de documentos pessoais do paciente
CREATE TABLE IF NOT EXISTS public.documentos_paciente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  user_id uuid NOT NULL,
  tipo public.documento_paciente_tipo NOT NULL DEFAULT 'outro',
  titulo text NOT NULL,
  descricao text,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_paciente_paciente_id
  ON public.documentos_paciente(paciente_id);

ALTER TABLE public.documentos_paciente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Paciente vê próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente vê próprios documentos"
  ON public.documentos_paciente FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Paciente cria próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente cria próprios documentos"
  ON public.documentos_paciente FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.pacientes p
             WHERE p.id = documentos_paciente.paciente_id
               AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Paciente atualiza próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente atualiza próprios documentos"
  ON public.documentos_paciente FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Paciente apaga próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente apaga próprios documentos"
  ON public.documentos_paciente FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin gerencia documentos paciente" ON public.documentos_paciente;
CREATE POLICY "Admin gerencia documentos paciente"
  ON public.documentos_paciente FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Médico vê docs paciente das consultas" ON public.documentos_paciente;
CREATE POLICY "Médico vê docs paciente das consultas"
  ON public.documentos_paciente FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consultas c
        JOIN public.medicos m ON m.id = c.medico_id
       WHERE c.paciente_id = documentos_paciente.paciente_id
         AND m.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS trg_documentos_paciente_updated ON public.documentos_paciente;
CREATE TRIGGER trg_documentos_paciente_updated
  BEFORE UPDATE ON public.documentos_paciente
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Storage bucket privado paciente-docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('paciente-docs','paciente-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas: arquivos organizados por <user_id>/<arquivo>
DROP POLICY IF EXISTS "paciente lê próprios arquivos" ON storage.objects;
CREATE POLICY "paciente lê próprios arquivos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'paciente-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "paciente envia próprios arquivos" ON storage.objects;
CREATE POLICY "paciente envia próprios arquivos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'paciente-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "paciente apaga próprios arquivos" ON storage.objects;
CREATE POLICY "paciente apaga próprios arquivos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'paciente-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "admin gerencia paciente-docs" ON storage.objects;
CREATE POLICY "admin gerencia paciente-docs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'paciente-docs' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'paciente-docs' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "medico lê paciente-docs vinculados" ON storage.objects;
CREATE POLICY "medico lê paciente-docs vinculados"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'paciente-docs'
    AND EXISTS (
      SELECT 1
        FROM public.consultas c
        JOIN public.medicos m ON m.id = c.medico_id
        JOIN public.pacientes p ON p.id = c.paciente_id
       WHERE m.user_id = auth.uid()
         AND p.user_id::text = (storage.foldername(name))[1]
    )
  );