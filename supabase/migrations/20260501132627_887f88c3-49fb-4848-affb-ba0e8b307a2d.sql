
-- Restringir has_permissions_batch a authenticated
REVOKE EXECUTE ON FUNCTION public.has_permissions_batch(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_permissions_batch(uuid, text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.has_permissions_batch(uuid, text[]) TO authenticated;

-- Triggers não são chamados diretamente, mas vamos garantir que as funções dos triggers não sejam invocáveis
REVOKE EXECUTE ON FUNCTION public.trg_audit_permissao_colaborador() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_audit_function_permission() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.trg_audit_permissao_perfil() FROM anon, public;
