REVOKE EXECUTE ON FUNCTION public.calcular_nivel_medico(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.calcular_nivel_medico(numeric) TO authenticated;