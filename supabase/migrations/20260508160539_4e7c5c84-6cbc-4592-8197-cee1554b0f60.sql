CREATE OR REPLACE FUNCTION public.inbox_increment_unread(
  p_conversation_id uuid,
  p_preview text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET unread_count = COALESCE(unread_count, 0) + 1,
         last_message_at = now(),
         last_message_preview = p_preview
   WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.inbox_increment_unread(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inbox_increment_unread(uuid, text) TO service_role;