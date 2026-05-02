
-- ============================================================
-- 1. UPDATE policy for analytics_sessions (tracker needs it)
-- ============================================================
CREATE POLICY "Tracker atualiza propria sessao"
ON public.analytics_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================================
-- 2. analytics_overview(_dias int)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_overview(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz := now() - (_dias || ' days')::interval;
  _inicio_prev timestamptz := now() - ((_dias * 2) || ' days')::interval;
  _fim_prev timestamptz := _inicio;
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'sessoes',            (SELECT count(*) FROM analytics_sessions WHERE inicio >= _inicio),
    'sessoes_prev',       (SELECT count(*) FROM analytics_sessions WHERE inicio >= _inicio_prev AND inicio < _fim_prev),
    'visitantes_unicos',  (SELECT count(DISTINCT coalesce(user_id::text, session_token)) FROM analytics_sessions WHERE inicio >= _inicio),
    'visitantes_unicos_prev', (SELECT count(DISTINCT coalesce(user_id::text, session_token)) FROM analytics_sessions WHERE inicio >= _inicio_prev AND inicio < _fim_prev),
    'conversoes',         (SELECT count(*) FROM analytics_conversions WHERE created_at >= _inicio),
    'conversoes_prev',    (SELECT count(*) FROM analytics_conversions WHERE created_at >= _inicio_prev AND created_at < _fim_prev),
    'receita',            (SELECT coalesce(sum(valor), 0) FROM analytics_conversions WHERE tipo = 'pagamento' AND created_at >= _inicio),
    'receita_prev',       (SELECT coalesce(sum(valor), 0) FROM analytics_conversions WHERE tipo = 'pagamento' AND created_at >= _inicio_prev AND created_at < _fim_prev),
    'taxa_conversao',     (SELECT CASE WHEN count(*) = 0 THEN 0
                            ELSE round((SELECT count(*)::numeric FROM analytics_conversions WHERE created_at >= _inicio)
                                       / count(*)::numeric * 100, 1)
                           END FROM analytics_sessions WHERE inicio >= _inicio),
    'ticket_medio',       (SELECT CASE WHEN count(*) = 0 THEN 0
                            ELSE round(coalesce(sum(valor), 0) / count(*)::numeric, 2)
                           END FROM analytics_conversions WHERE tipo = 'pagamento' AND created_at >= _inicio)
  ) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 3. analytics_trafego(_dias int)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_trafego(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz := now() - (_dias || ' days')::interval;
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'serie_diaria', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.data), '[]'::jsonb)
      FROM (
        SELECT
          to_char(inicio::date, 'DD/MM') AS data,
          count(*) AS sessoes,
          count(DISTINCT coalesce(user_id::text, session_token)) AS unicos
        FROM analytics_sessions
        WHERE inicio >= _inicio
        GROUP BY inicio::date
        ORDER BY inicio::date
      ) t
    ),
    'origem', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.sessoes DESC), '[]'::jsonb)
      FROM (
        SELECT origem, count(*) AS sessoes
        FROM analytics_sessions
        WHERE inicio >= _inicio
        GROUP BY origem
      ) t
    ),
    'dispositivo', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT dispositivo, count(*) AS sessoes
        FROM analytics_sessions
        WHERE inicio >= _inicio
        GROUP BY dispositivo
        ORDER BY sessoes DESC
      ) t
    ),
    'novos_recorrentes', (
      SELECT jsonb_build_object(
        'novos', count(*) FILTER (WHERE primeira_vez),
        'recorrentes', count(*) FILTER (WHERE NOT primeira_vez)
      )
      FROM (
        SELECT
          s.id,
          NOT EXISTS (
            SELECT 1 FROM analytics_sessions s2
            WHERE s2.user_id = s.user_id
              AND s2.user_id IS NOT NULL
              AND s2.inicio < s.inicio
              AND s2.inicio >= _inicio - interval '365 days'
          ) AS primeira_vez
        FROM analytics_sessions s
        WHERE s.inicio >= _inicio
      ) sub
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 4. analytics_conversao(_dias int)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_conversao(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz := now() - (_dias || ' days')::interval;
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'funil', jsonb_build_object(
      'visitantes',  (SELECT count(*) FROM analytics_sessions WHERE inicio >= _inicio),
      'iniciaram',   (SELECT count(*) FROM analytics_events WHERE tipo = 'inicio_agendamento' AND created_at >= _inicio),
      'agendaram',   (SELECT count(*) FROM analytics_conversions WHERE tipo = 'agendamento' AND created_at >= _inicio),
      'pagaram',     (SELECT count(*) FROM analytics_conversions WHERE tipo = 'pagamento' AND created_at >= _inicio)
    ),
    'por_pagina', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.visitas DESC), '[]'::jsonb)
      FROM (
        SELECT
          rota,
          count(*) AS visitas,
          count(*) FILTER (WHERE tipo = 'inicio_agendamento') AS conversoes,
          CASE WHEN count(*) = 0 THEN 0
               ELSE round(count(*) FILTER (WHERE tipo = 'inicio_agendamento')::numeric / count(*)::numeric * 100, 1)
          END AS taxa
        FROM analytics_events
        WHERE created_at >= _inicio
        GROUP BY rota
        ORDER BY visitas DESC
        LIMIT 20
      ) t
    ),
    'por_servico', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.receita DESC), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(servico, 'Não identificado') AS servico,
          count(*) AS conversoes,
          coalesce(sum(valor), 0) AS receita
        FROM analytics_conversions
        WHERE created_at >= _inicio
        GROUP BY servico
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 5. analytics_financeiro(_dias int)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_financeiro(_dias int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inicio timestamptz := now() - (_dias || ' days')::interval;
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'receita_por_canal', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.receita DESC), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(origem, 'direto') AS origem,
          coalesce(sum(valor), 0) AS receita,
          count(*) AS conversoes
        FROM analytics_conversions
        WHERE tipo = 'pagamento' AND created_at >= _inicio
        GROUP BY origem
      ) t
    ),
    'receita_por_servico', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.receita DESC), '[]'::jsonb)
      FROM (
        SELECT
          coalesce(servico, 'Não identificado') AS servico,
          coalesce(sum(valor), 0) AS receita,
          CASE WHEN count(*) = 0 THEN 0
               ELSE round(coalesce(sum(valor), 0) / count(*)::numeric, 2)
          END AS ticket_medio
        FROM analytics_conversions
        WHERE tipo = 'pagamento' AND created_at >= _inicio
        GROUP BY servico
      ) t
    ),
    'roi_campanhas', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      FROM (
        SELECT
          mc.nome,
          mc.canal,
          mc.custo_total AS custo,
          coalesce(sub.receita, 0) AS receita,
          coalesce(sub.conversoes, 0) AS conversoes,
          CASE WHEN mc.custo_total = 0 OR mc.custo_total IS NULL THEN NULL
               ELSE round(((coalesce(sub.receita, 0) - mc.custo_total) / mc.custo_total) * 100, 1)
          END AS roi_pct
        FROM marketing_campaigns mc
        LEFT JOIN LATERAL (
          SELECT
            sum(ac.valor) AS receita,
            count(*) AS conversoes
          FROM analytics_conversions ac
          WHERE ac.tipo = 'pagamento'
            AND ac.created_at >= _inicio
            AND ac.utm_source = mc.utm_source
            AND mc.utm_source IS NOT NULL
        ) sub ON true
        WHERE mc.created_at >= _inicio OR mc.inicio >= (_inicio::date)
        ORDER BY mc.created_at DESC
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- 6. analytics_tempo_real()
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_tempo_real()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'ativos', (
      SELECT count(DISTINCT session_token)
      FROM analytics_events
      WHERE created_at >= now() - interval '5 minutes'
    ),
    'paginas_atuais', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.usuarios DESC), '[]'::jsonb)
      FROM (
        SELECT rota, count(DISTINCT session_token) AS usuarios
        FROM analytics_events
        WHERE created_at >= now() - interval '5 minutes'
          AND tipo = 'page_view'
        GROUP BY rota
        ORDER BY usuarios DESC
        LIMIT 20
      ) t
    ),
    'ultimos_eventos', (
      SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.quando DESC), '[]'::jsonb)
      FROM (
        SELECT tipo, rota, created_at AS quando
        FROM analytics_events
        WHERE created_at >= now() - interval '15 minutes'
        ORDER BY created_at DESC
        LIMIT 30
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;
