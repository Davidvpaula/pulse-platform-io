-- =========================================================
-- FASE A — Endurecimento de segurança
-- =========================================================

-- 1) REVOGAR EXECUTE de PUBLIC/anon em TODAS as funções SECURITY DEFINER do schema public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon',   r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION public.%I(%s) TO service_role',  r.proname, r.args);
  END LOOP;
END$$;

-- 2) Corrigir search_path nas 2 funções utilitárias mutáveis
ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 3) ENDURECER POLICIES "always true"

-- 3.1 analytics_sessions: remover UPDATE livre de anon
DROP POLICY IF EXISTS "Anon atualiza propria sessao" ON public.analytics_sessions;

-- 3.2 analytics_events INSERT
DROP POLICY IF EXISTS "Anon insere evento" ON public.analytics_events;
CREATE POLICY "Tracking insere evento"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_token IS NOT NULL AND length(session_token) > 0);

-- 3.3 analytics_sessions INSERT
DROP POLICY IF EXISTS "Anon insere sessao" ON public.analytics_sessions;
CREATE POLICY "Tracking insere sessao"
  ON public.analytics_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_token IS NOT NULL AND length(session_token) > 0);

-- 3.4 analytics_conversions INSERT
DROP POLICY IF EXISTS "Anon insere conversao" ON public.analytics_conversions;
CREATE POLICY "Tracking insere conversao"
  ON public.analytics_conversions FOR INSERT
  TO anon, authenticated
  WITH CHECK (session_token IS NOT NULL AND length(session_token) > 0);

-- 3.5 integracoes_logs INSERT: restringir a Admin logado
DROP POLICY IF EXISTS "auth insere logs" ON public.integracoes_logs;
CREATE POLICY "Admin insere logs integracoes"
  ON public.integracoes_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
