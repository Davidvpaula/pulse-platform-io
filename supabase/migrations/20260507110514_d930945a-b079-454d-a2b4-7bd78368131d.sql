
-- 1. Update is_paciente_da_consulta to include dependentes
CREATE OR REPLACE FUNCTION public.is_paciente_da_consulta(_consulta_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultas c
    JOIN public.pacientes p ON p.id = c.paciente_id
    WHERE c.id = _consulta_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.consultas c
    JOIN public.pacientes dep ON dep.id = c.paciente_atendido_id
    JOIN public.pacientes tit ON tit.id = dep.responsavel_id
    WHERE c.id = _consulta_id
      AND tit.user_id = auth.uid()
  )
$$;

-- 2. Helper: check if auth.uid() is titular of a given paciente_id
CREATE OR REPLACE FUNCTION public.is_titular_do_paciente(_paciente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id = _paciente_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.pacientes dep
    JOIN public.pacientes tit ON tit.id = dep.responsavel_id
    WHERE dep.id = _paciente_id AND tit.user_id = auth.uid()
  )
$$;

-- 3. Update documentos_paciente RLS
DROP POLICY IF EXISTS "Paciente vê próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente vê próprios documentos"
  ON public.documentos_paciente FOR SELECT TO authenticated
  USING (public.is_titular_do_paciente(paciente_id));

DROP POLICY IF EXISTS "Paciente cria próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente cria próprios documentos"
  ON public.documentos_paciente FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_titular_do_paciente(paciente_id)
  );

DROP POLICY IF EXISTS "Paciente atualiza próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente atualiza próprios documentos"
  ON public.documentos_paciente FOR UPDATE TO authenticated
  USING (public.is_titular_do_paciente(paciente_id));

DROP POLICY IF EXISTS "Paciente apaga próprios documentos" ON public.documentos_paciente;
CREATE POLICY "Paciente apaga próprios documentos"
  ON public.documentos_paciente FOR DELETE TO authenticated
  USING (public.is_titular_do_paciente(paciente_id));

-- Médico: also needs to see docs of the paciente_atendido
DROP POLICY IF EXISTS "Médico vê docs paciente das consultas" ON public.documentos_paciente;
CREATE POLICY "Médico vê docs paciente das consultas"
  ON public.documentos_paciente FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.consultas c
      JOIN public.medicos m ON m.id = c.medico_id
      WHERE m.user_id = auth.uid()
        AND (
          c.paciente_id = documentos_paciente.paciente_id
          OR c.paciente_atendido_id = documentos_paciente.paciente_id
        )
    )
  );

-- 4. Storage policies: allow titular to manage dep-{id}/ folders
DROP POLICY IF EXISTS "paciente lê próprios arquivos" ON storage.objects;
CREATE POLICY "paciente lê próprios arquivos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'paciente-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_titular_do_paciente(
        NULLIF(replace((storage.foldername(name))[1], 'dep-', ''), (storage.foldername(name))[1])::uuid
      )
    )
  );

DROP POLICY IF EXISTS "paciente envia próprios arquivos" ON storage.objects;
CREATE POLICY "paciente envia próprios arquivos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'paciente-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] LIKE 'dep-%'
        AND public.is_titular_do_paciente(
          replace((storage.foldername(name))[1], 'dep-', '')::uuid
        )
      )
    )
  );

DROP POLICY IF EXISTS "paciente apaga próprios arquivos" ON storage.objects;
CREATE POLICY "paciente apaga próprios arquivos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'paciente-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR (
        (storage.foldername(name))[1] LIKE 'dep-%'
        AND public.is_titular_do_paciente(
          replace((storage.foldername(name))[1], 'dep-', '')::uuid
        )
      )
    )
  );
