
-- Add read_at to messages for read receipts
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Function to mark messages as read in a conversation (for paciente)
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID) TO authenticated;
