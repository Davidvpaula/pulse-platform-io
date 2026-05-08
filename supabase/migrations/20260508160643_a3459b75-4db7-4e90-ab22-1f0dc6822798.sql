CREATE OR REPLACE FUNCTION public.inbox_set_first_response(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET first_response_at = COALESCE(first_response_at, now())
   WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.inbox_set_first_response(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inbox_set_first_response(uuid) TO service_role;