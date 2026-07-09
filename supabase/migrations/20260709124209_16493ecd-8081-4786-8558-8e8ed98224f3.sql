GRANT SELECT ON public.especialidades TO anon, authenticated;
GRANT SELECT ON public.medico_especialidades TO anon, authenticated;
GRANT ALL ON public.especialidades TO service_role;
GRANT ALL ON public.medico_especialidades TO service_role;