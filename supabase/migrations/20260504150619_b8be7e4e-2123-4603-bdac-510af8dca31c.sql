-- Helper function to check if a plano belongs to the current médico (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.plano_pertence_medico(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.planos
    WHERE id = _plano_id
      AND medico_id = auth.uid()
      AND nivel = 'medico'
  );
$$;

-- Médico can view benefits of their own plans
CREATE POLICY "Médico vê benefícios dos seus planos"
ON public.plano_beneficios
FOR SELECT
TO authenticated
USING (public.plano_pertence_medico(plano_id));

-- Médico can insert benefits on their own plans
CREATE POLICY "Médico insere benefícios nos seus planos"
ON public.plano_beneficios
FOR INSERT
TO authenticated
WITH CHECK (public.plano_pertence_medico(plano_id));

-- Médico can delete benefits from their own plans
CREATE POLICY "Médico deleta benefícios dos seus planos"
ON public.plano_beneficios
FOR DELETE
TO authenticated
USING (public.plano_pertence_medico(plano_id));