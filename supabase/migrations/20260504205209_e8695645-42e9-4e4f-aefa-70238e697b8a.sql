CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate caller has access to this conversation
  IF NOT public.user_can_view_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Acesso negado à conversa';
  END IF;

  -- Mark all unread messages not sent by the current user
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND read_at IS NULL
    AND sender_id IS DISTINCT FROM auth.uid();

  -- Reset unread count on the conversation
  UPDATE public.conversations
  SET unread_count = 0
  WHERE id = p_conversation_id;
END;
$function$;