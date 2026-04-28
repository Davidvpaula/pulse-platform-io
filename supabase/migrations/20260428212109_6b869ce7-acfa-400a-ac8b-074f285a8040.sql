-- Revoga execução pública e concede apenas para roles necessárias
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- handle_new_user é chamada por trigger no auth.users; service_role precisa executar
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;