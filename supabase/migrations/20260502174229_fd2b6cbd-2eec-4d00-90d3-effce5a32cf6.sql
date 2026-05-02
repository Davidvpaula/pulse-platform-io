
REVOKE EXECUTE ON FUNCTION public.medico_colocar_em_analise(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.medico_aprovar(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.medico_reprovar(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.medico_suspender(uuid, text, text, timestamptz, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.medico_bloquear(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.medico_reativar(uuid, text) FROM anon;
