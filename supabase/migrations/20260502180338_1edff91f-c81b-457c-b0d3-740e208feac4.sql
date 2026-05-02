
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_agendamentos_overview(date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_consulta_forcar_confirmacao(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_consulta_cancelar(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_consulta_marcar_realizada(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.forcar_status_consulta(uuid, consulta_status, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_consulta_reenviar_link(uuid) FROM anon;
