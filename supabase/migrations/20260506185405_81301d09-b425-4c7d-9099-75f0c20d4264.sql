CREATE OR REPLACE FUNCTION public.plano_pertence_medico(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.planos p
    JOIN public.medicos m ON m.id = p.medico_id
    WHERE p.id = _plano_id
      AND m.user_id = auth.uid()
      AND p.nivel = 'medico'
  );
$$;