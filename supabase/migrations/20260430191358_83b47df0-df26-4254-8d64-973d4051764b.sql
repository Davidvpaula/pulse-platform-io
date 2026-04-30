REVOKE EXECUTE ON FUNCTION public.set_force_status_transition(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_force_status_transition(TEXT) TO authenticated;