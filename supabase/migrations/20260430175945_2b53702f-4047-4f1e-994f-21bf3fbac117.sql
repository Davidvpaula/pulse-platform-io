REVOKE EXECUTE ON FUNCTION public.is_medico_da_conversa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_view_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_medico_da_conversa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_conversation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_conversation_on_message() FROM PUBLIC, anon;