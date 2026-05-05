
REVOKE EXECUTE ON FUNCTION public.create_conversation_for_consulta(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_conversation_for_consulta(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_conversation_for_consulta(uuid) TO authenticated;
