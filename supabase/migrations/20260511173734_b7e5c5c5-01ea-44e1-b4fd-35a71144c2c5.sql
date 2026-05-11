CREATE OR REPLACE FUNCTION public.public_home_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'medicos', (SELECT COUNT(*)::int FROM public.medicos),
    'pacientes', GREATEST(3000, (SELECT COUNT(*)::int FROM public.pacientes)),
    'consultas', GREATEST(5000, (SELECT COUNT(*)::int FROM public.consultas WHERE status = 'concluida'))
  );
$$;

GRANT EXECUTE ON FUNCTION public.public_home_stats() TO anon, authenticated;