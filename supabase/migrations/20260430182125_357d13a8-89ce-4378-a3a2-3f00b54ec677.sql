
ALTER VIEW public.audit_eventos_unificado SET (security_invoker = on);

-- Restringe acesso direto à view; uso real é via RPCs SECURITY DEFINER que validam permissão
REVOKE ALL ON public.audit_eventos_unificado FROM PUBLIC, anon, authenticated;
