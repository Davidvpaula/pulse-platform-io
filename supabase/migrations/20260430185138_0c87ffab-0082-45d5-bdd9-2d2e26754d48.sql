
-- =========================================================
-- MÓDULO ANÁLISES (Analytics estratégico)
-- =========================================================

-- 1) SESSIONS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  user_id uuid,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  duracao_segundos int,
  origem text,            -- direto, organico, ads, instagram, whatsapp, referral
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  dispositivo text,       -- mobile, desktop, tablet
  user_agent text,
  pais text,
  primeira_rota text,
  ultima_rota text,
  paginas_vistas int NOT NULL DEFAULT 0,
  converteu boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asess_inicio ON public.analytics_sessions(inicio DESC);
CREATE INDEX IF NOT EXISTS idx_asess_user ON public.analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_asess_origem ON public.analytics_sessions(origem);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon insere sessao" ON public.analytics_sessions;
CREATE POLICY "Anon insere sessao" ON public.analytics_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anon atualiza propria sessao" ON public.analytics_sessions;
CREATE POLICY "Anon atualiza propria sessao" ON public.analytics_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin le sessoes" ON public.analytics_sessions;
CREATE POLICY "Admin le sessoes" ON public.analytics_sessions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_asess_updated ON public.analytics_sessions;
CREATE TRIGGER trg_asess_updated BEFORE UPDATE ON public.analytics_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) EVENTS ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text,
  user_id uuid,
  tipo text NOT NULL,     -- page_view, click, inicio_agendamento, agendamento_concluido, pagamento_confirmado
  rota text,
  rota_anterior text,
  origem text,
  dispositivo text,
  detalhes jsonb,         -- { medico_id, servico, valor, etc }
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aev_created ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aev_tipo ON public.analytics_events(tipo);
CREATE INDEX IF NOT EXISTS idx_aev_session ON public.analytics_events(session_token);
CREATE INDEX IF NOT EXISTS idx_aev_rota ON public.analytics_events(rota);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon insere evento" ON public.analytics_events;
CREATE POLICY "Anon insere evento" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin le eventos" ON public.analytics_events;
CREATE POLICY "Admin le eventos" ON public.analytics_events
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- 3) CONVERSIONS -------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text,
  user_id uuid,
  tipo text NOT NULL,     -- agendamento, pagamento
  valor numeric(10,2),
  consulta_id uuid,
  pagamento_id uuid,
  origem text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  servico text,           -- pa, consulta, plano
  medico_id uuid,
  empresa_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aconv_created ON public.analytics_conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aconv_origem ON public.analytics_conversions(origem);
CREATE INDEX IF NOT EXISTS idx_aconv_servico ON public.analytics_conversions(servico);

ALTER TABLE public.analytics_conversions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon insere conversao" ON public.analytics_conversions;
CREATE POLICY "Anon insere conversao" ON public.analytics_conversions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin le conversoes" ON public.analytics_conversions;
CREATE POLICY "Admin le conversoes" ON public.analytics_conversions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- 4) MARKETING CAMPAIGNS ----------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  canal text NOT NULL,        -- google_ads, meta_ads, instagram, whatsapp, organico, outros
  utm_source text,
  utm_medium text,
  utm_campaign text,
  custo_total numeric(10,2) NOT NULL DEFAULT 0,
  inicio date,
  fim date,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mkt_canal ON public.marketing_campaigns(canal);
CREATE INDEX IF NOT EXISTS idx_mkt_periodo ON public.marketing_campaigns(inicio,fim);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin gerencia campanhas" ON public.marketing_campaigns;
CREATE POLICY "Admin gerencia campanhas" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_mkt_updated ON public.marketing_campaigns;
CREATE TRIGGER trg_mkt_updated BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Catálogo de permissões ------------------------------
INSERT INTO public.permissions_catalog(permission_key,modulo,descricao,risco,ordem) VALUES
('analises.ver','Análises','Acessar painel de análises','medio',140),
('analises.financeiro','Análises','Ver dados financeiros das análises','alto',141),
('analises.marketing','Análises','Gerenciar campanhas e ROI','alto',142),
('analises.exportar','Análises','Exportar dados de análises','alto',143)
ON CONFLICT (permission_key) DO UPDATE SET descricao=EXCLUDED.descricao;

-- Defaults: admin já tem tudo (via has_permission). Adicionar para perfis:
INSERT INTO public.function_permissions(funcao_interna,permission_key)
VALUES
  ('supervisor','analises.ver'),
  ('gestor_operacional','analises.ver'),
  ('gestor_operacional','analises.financeiro'),
  ('financeiro','analises.ver'),
  ('financeiro','analises.financeiro'),
  ('comercial','analises.ver'),
  ('comercial','analises.marketing')
ON CONFLICT (funcao_interna,permission_key) DO NOTHING;

-- =========================================================
-- RPCs
-- =========================================================

-- 6) overview --------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_overview(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r jsonb;
  d_ini timestamptz := now() - (_dias || ' days')::interval;
  d_prev_ini timestamptz := now() - (2*_dias || ' days')::interval;
  d_prev_fim timestamptz := now() - (_dias || ' days')::interval;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_permission(auth.uid(),'analises.ver')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'sessoes',           (SELECT count(*) FROM analytics_sessions WHERE inicio >= d_ini),
    'sessoes_prev',      (SELECT count(*) FROM analytics_sessions WHERE inicio >= d_prev_ini AND inicio < d_prev_fim),
    'visitantes_unicos', (SELECT count(DISTINCT coalesce(user_id::text, session_token)) FROM analytics_sessions WHERE inicio >= d_ini),
    'visitantes_unicos_prev', (SELECT count(DISTINCT coalesce(user_id::text, session_token)) FROM analytics_sessions WHERE inicio >= d_prev_ini AND inicio < d_prev_fim),
    'conversoes',        (SELECT count(*) FROM analytics_conversions WHERE created_at >= d_ini),
    'conversoes_prev',   (SELECT count(*) FROM analytics_conversions WHERE created_at >= d_prev_ini AND created_at < d_prev_fim),
    'receita',           (SELECT coalesce(sum(valor),0) FROM analytics_conversions WHERE created_at >= d_ini AND tipo='pagamento'),
    'receita_prev',      (SELECT coalesce(sum(valor),0) FROM analytics_conversions WHERE created_at >= d_prev_ini AND created_at < d_prev_fim AND tipo='pagamento'),
    'taxa_conversao',    (
      SELECT CASE WHEN count(*) > 0
        THEN round(100.0 * sum(CASE WHEN converteu THEN 1 ELSE 0 END)::numeric / count(*), 2)
        ELSE 0 END
      FROM analytics_sessions WHERE inicio >= d_ini
    ),
    'ticket_medio',      (
      SELECT CASE WHEN count(*) > 0 THEN round(avg(valor)::numeric, 2) ELSE 0 END
      FROM analytics_conversions WHERE created_at >= d_ini AND tipo='pagamento' AND valor > 0
    ),
    'ativos_5min',       (SELECT count(DISTINCT session_token) FROM analytics_events WHERE created_at > now() - interval '5 minutes')
  ) INTO r;
  RETURN r;
END $$;

-- 7) trafego -------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_trafego(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb; d_ini timestamptz := now() - (_dias || ' days')::interval;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_permission(auth.uid(),'analises.ver')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'serie_diaria', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('data', d, 'sessoes', s, 'unicos', u) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', inicio)::date AS d,
               count(*) AS s,
               count(DISTINCT coalesce(user_id::text, session_token)) AS u
        FROM analytics_sessions WHERE inicio >= d_ini
        GROUP BY 1
      ) x
    ),
    'origem', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('origem', coalesce(origem,'desconhecido'), 'sessoes', c) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT origem, count(*) AS c
        FROM analytics_sessions WHERE inicio >= d_ini
        GROUP BY origem
      ) x
    ),
    'dispositivo', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('dispositivo', coalesce(dispositivo,'desconhecido'), 'sessoes', c)), '[]'::jsonb)
      FROM (
        SELECT dispositivo, count(*) AS c
        FROM analytics_sessions WHERE inicio >= d_ini GROUP BY dispositivo
      ) x
    ),
    'novos_recorrentes', jsonb_build_object(
      'novos', (SELECT count(*) FROM analytics_sessions WHERE inicio >= d_ini AND user_id IS NULL),
      'recorrentes', (SELECT count(*) FROM analytics_sessions WHERE inicio >= d_ini AND user_id IS NOT NULL)
    )
  ) INTO r;
  RETURN r;
END $$;

-- 8) conversao ---------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_conversao(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb; d_ini timestamptz := now() - (_dias || ' days')::interval;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_permission(auth.uid(),'analises.ver')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'funil', jsonb_build_object(
      'visitantes', (SELECT count(*) FROM analytics_sessions WHERE inicio >= d_ini),
      'iniciaram',  (SELECT count(DISTINCT session_token) FROM analytics_events WHERE created_at >= d_ini AND tipo='inicio_agendamento'),
      'agendaram',  (SELECT count(*) FROM analytics_conversions WHERE created_at >= d_ini AND tipo='agendamento'),
      'pagaram',    (SELECT count(*) FROM analytics_conversions WHERE created_at >= d_ini AND tipo='pagamento')
    ),
    'por_pagina', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'rota', rota, 'visitas', visitas, 'conversoes', conv,
        'taxa', CASE WHEN visitas>0 THEN round(100.0*conv/visitas,2) ELSE 0 END
      ) ORDER BY visitas DESC), '[]'::jsonb)
      FROM (
        SELECT rota,
               count(*) FILTER (WHERE tipo='page_view') AS visitas,
               count(*) FILTER (WHERE tipo='inicio_agendamento') AS conv
        FROM analytics_events WHERE created_at >= d_ini AND rota IS NOT NULL
        GROUP BY rota
        HAVING count(*) FILTER (WHERE tipo='page_view') > 0
        ORDER BY visitas DESC
        LIMIT 15
      ) x
    ),
    'por_servico', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('servico', coalesce(servico,'outros'), 'conversoes', c, 'receita', round(coalesce(rec,0)::numeric,2)) ORDER BY c DESC), '[]'::jsonb)
      FROM (
        SELECT servico, count(*) AS c, sum(valor) AS rec
        FROM analytics_conversions WHERE created_at >= d_ini GROUP BY servico
      ) x
    )
  ) INTO r;
  RETURN r;
END $$;

-- 9) financeiro --------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_financeiro(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb; d_ini timestamptz := now() - (_dias || ' days')::interval;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_permission(auth.uid(),'analises.financeiro')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'receita_por_canal', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'origem', coalesce(origem,'desconhecido'),
        'receita', round(coalesce(sum_v,0)::numeric,2),
        'conversoes', c
      ) ORDER BY sum_v DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT origem, sum(valor) AS sum_v, count(*) AS c
        FROM analytics_conversions
        WHERE created_at >= d_ini AND tipo='pagamento'
        GROUP BY origem
      ) x
    ),
    'receita_por_servico', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'servico', coalesce(servico,'outros'),
        'receita', round(coalesce(sum_v,0)::numeric,2),
        'ticket_medio', round(coalesce(avg_v,0)::numeric,2)
      ) ORDER BY sum_v DESC NULLS LAST), '[]'::jsonb)
      FROM (
        SELECT servico, sum(valor) AS sum_v, avg(valor) AS avg_v
        FROM analytics_conversions
        WHERE created_at >= d_ini AND tipo='pagamento'
        GROUP BY servico
      ) x
    ),
    'roi_campanhas', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'nome', mc.nome, 'canal', mc.canal,
        'custo', round(mc.custo_total::numeric,2),
        'receita', round(coalesce(rec,0)::numeric,2),
        'roi_pct', CASE WHEN mc.custo_total > 0
          THEN round(100.0*(coalesce(rec,0) - mc.custo_total)/mc.custo_total, 1) ELSE NULL END,
        'conversoes', coalesce(conv,0)
      ) ORDER BY mc.created_at DESC), '[]'::jsonb)
      FROM marketing_campaigns mc
      LEFT JOIN LATERAL (
        SELECT sum(valor) AS rec, count(*) AS conv
        FROM analytics_conversions ac
        WHERE ac.tipo='pagamento'
          AND (mc.utm_campaign IS NULL OR ac.utm_campaign = mc.utm_campaign)
          AND (mc.utm_source IS NULL OR ac.utm_source = mc.utm_source)
          AND (mc.inicio IS NULL OR ac.created_at >= mc.inicio)
          AND (mc.fim IS NULL OR ac.created_at <= (mc.fim + interval '1 day'))
      ) AS s ON true
      WHERE mc.ativo = true
    )
  ) INTO r;
  RETURN r;
END $$;

-- 10) tempo real -------------------------------------------
CREATE OR REPLACE FUNCTION public.analytics_tempo_real()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_permission(auth.uid(),'analises.ver')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'ativos', (SELECT count(DISTINCT session_token) FROM analytics_events WHERE created_at > now() - interval '5 minutes'),
    'paginas_atuais', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('rota', rota, 'usuarios', u) ORDER BY u DESC), '[]'::jsonb)
      FROM (
        SELECT rota, count(DISTINCT session_token) AS u
        FROM analytics_events
        WHERE created_at > now() - interval '5 minutes' AND tipo='page_view' AND rota IS NOT NULL
        GROUP BY rota ORDER BY u DESC LIMIT 10
      ) x
    ),
    'ultimos_eventos', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'tipo', tipo, 'rota', rota, 'origem', origem,
        'quando', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT tipo, rota, origem, created_at
        FROM analytics_events
        WHERE created_at > now() - interval '5 minutes'
        ORDER BY created_at DESC LIMIT 30
      ) x
    )
  ) INTO r;
  RETURN r;
END $$;
