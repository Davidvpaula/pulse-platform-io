
-- 1. Remove broad public policies exposing PII / financial fields
DROP POLICY IF EXISTS "Médicos aprovados visíveis publicamente" ON public.medicos;
DROP POLICY IF EXISTS "Leitura publica servicos ativos" ON public.servicos_financeiros;

-- 2. Restrict app_settings public reads to keys with prefix 'public.'
DROP POLICY IF EXISTS "App settings públicos leitura" ON public.app_settings;
CREATE POLICY "App settings publicos leitura"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (key LIKE 'public.%');

-- 3. Set security_invoker on all public views
ALTER VIEW public.servicos_publicos SET (security_invoker = true);
ALTER VIEW public.medicos_publicos SET (security_invoker = true);
ALTER VIEW public.audit_eventos_unificado SET (security_invoker = true);
ALTER VIEW public.vw_noc_atrasos_ativos SET (security_invoker = true);
ALTER VIEW public.vw_noc_consultas_em_andamento SET (security_invoker = true);
ALTER VIEW public.vw_noc_fila_paciente SET (security_invoker = true);
ALTER VIEW public.vw_noc_medicos_online SET (security_invoker = true);

-- 4. Drop overly permissive public storage SELECT policies (files still reachable via public URL)
DROP POLICY IF EXISTS "Message attachments are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read medico avatars" ON storage.objects;
DROP POLICY IF EXISTS "servico_imagens_public_read" ON storage.objects;

-- 5. Tighten RLS policies that used USING/CHECK true on write
DROP POLICY IF EXISTS "service_role_manage_google_tokens" ON public.medico_google_tokens;
-- service_role bypasses RLS; no replacement policy needed.

DROP POLICY IF EXISTS "insere_clique" ON public.impulsionamento_cliques;
CREATE POLICY "insere_clique"
  ON public.impulsionamento_cliques FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Sistema insere notificações" ON public.notificacoes;
CREATE POLICY "Usuario recebe propria notificacao"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Set search_path on remaining mutable functions
ALTER FUNCTION public._get_audit_motivo() SET search_path = public;
ALTER FUNCTION public.fn_finmov_block_mutations() SET search_path = public;
ALTER FUNCTION public.tg_operacao_alertas_touch() SET search_path = public;

-- 7. Revoke EXECUTE from anon on every SECURITY DEFINER function in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;
