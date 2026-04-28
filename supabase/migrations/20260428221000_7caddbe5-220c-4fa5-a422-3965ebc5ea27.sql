REVOKE ALL ON FUNCTION public.is_medico_da_consulta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_paciente_da_consulta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_consulta_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_medico_da_consulta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_paciente_da_consulta(uuid) TO authenticated;