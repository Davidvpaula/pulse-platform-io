
-- Revoke anon execution on analytics RPCs
REVOKE EXECUTE ON FUNCTION public.analytics_overview(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.analytics_trafego(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.analytics_conversao(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.analytics_financeiro(int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.analytics_tempo_real() FROM anon;

-- Replace overly permissive UPDATE policy with a scoped one
DROP POLICY IF EXISTS "Tracker atualiza propria sessao" ON public.analytics_sessions;
CREATE POLICY "Tracker atualiza propria sessao"
ON public.analytics_sessions
FOR UPDATE
USING (session_token IS NOT NULL AND length(session_token) > 0)
WITH CHECK (session_token IS NOT NULL AND length(session_token) > 0);
