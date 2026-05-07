
-- Helper: retorna o paciente_id do titular logado sem triggerar RLS de pacientes
CREATE OR REPLACE FUNCTION public.get_titular_paciente_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.pacientes WHERE user_id = auth.uid() AND tipo_paciente = 'titular' LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_titular_paciente_id() FROM anon;

-- Fix SELECT policy (causa da recursão)
DROP POLICY IF EXISTS "titular_view_dependentes" ON public.pacientes;
CREATE POLICY "titular_view_dependentes"
  ON public.pacientes FOR SELECT TO authenticated
  USING (responsavel_id = public.get_titular_paciente_id());

-- Fix INSERT policy
DROP POLICY IF EXISTS "titular_insert_dependentes" ON public.pacientes;
CREATE POLICY "titular_insert_dependentes"
  ON public.pacientes FOR INSERT TO authenticated
  WITH CHECK (
    tipo_paciente = 'dependente'
    AND user_id IS NULL
    AND responsavel_id = public.get_titular_paciente_id()
  );

-- Fix UPDATE policy
DROP POLICY IF EXISTS "titular_update_dependentes" ON public.pacientes;
CREATE POLICY "titular_update_dependentes"
  ON public.pacientes FOR UPDATE TO authenticated
  USING (
    tipo_paciente = 'dependente'
    AND responsavel_id = public.get_titular_paciente_id()
  );
