CREATE OR REPLACE FUNCTION public.relatorios_financeiro_snapshot(
  p_inicio        DATE,
  p_fim           DATE,
  p_compare_mode  TEXT DEFAULT 'periodo_anterior'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias INT;
  v_prev_inicio DATE;
  v_prev_fim DATE;
  v_kpis JSONB;
  v_kpis_prev JSONB;
  v_por_medico JSONB;
  v_por_especialidade JSONB;
  v_por_modalidade JSONB;
  v_por_metodo JSONB;
  v_por_canal JSONB;
  v_diario JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_dias := GREATEST((p_fim - p_inicio) + 1, 1);
  IF p_compare_mode = 'ano_anterior' THEN
    v_prev_inicio := (p_inicio::timestamp - INTERVAL '1 year')::date;
    v_prev_fim    := (p_fim::timestamp    - INTERVAL '1 year')::date;
  ELSE
    v_prev_inicio := p_inicio - v_dias;
    v_prev_fim    := p_inicio - 1;
  END IF;

  WITH pag AS (
    SELECT
      COALESCE(SUM(valor_bruto_snapshot),0)   AS bruto,
      COALESCE(SUM(taxa_gateway_snapshot),0)  AS taxa_gw,
      COALESCE(SUM(taxa_imposto_snapshot),0)  AS taxa_imp,
      COALESCE(SUM(valor_liquido_snapshot),0) AS liquido,
      COALESCE(SUM(valor_reembolsado_centavos),0) AS reemb,
      COUNT(*)                                AS qtd_pag
    FROM pagamentos
    WHERE snapshot_at IS NOT NULL
      AND snapshot_at::date BETWEEN p_inicio AND p_fim
  ), con AS (
    SELECT
      COALESCE(SUM(valor_snapshot_centavos),0)    AS valor_concluido,
      COALESCE(SUM(comissao_snapshot_centavos),0) AS comissao,
      COUNT(*)                                    AS qtd_concluida
    FROM consultas
    WHERE snapshot_at IS NOT NULL
      AND snapshot_at::date BETWEEN p_inicio AND p_fim
  )
  SELECT jsonb_build_object(
    'receita_bruta_centavos',    pag.bruto,
    'taxa_gateway_centavos',     pag.taxa_gw,
    'taxa_imposto_centavos',     pag.taxa_imp,
    'receita_liquida_centavos',  pag.liquido,
    'reembolsos_centavos',       pag.reemb,
    'pagamentos_pagos',          pag.qtd_pag,
    'comissao_plataforma_centavos', con.comissao,
    'repasse_medicos_centavos',  GREATEST(con.valor_concluido - con.comissao, 0),
    'consultas_concluidas',      con.qtd_concluida,
    'ticket_medio_centavos',     CASE WHEN con.qtd_concluida > 0 THEN ROUND(con.valor_concluido::numeric / con.qtd_concluida) ELSE 0 END
  ) INTO v_kpis FROM pag, con;

  WITH pag AS (
    SELECT
      COALESCE(SUM(valor_bruto_snapshot),0)   AS bruto,
      COALESCE(SUM(valor_liquido_snapshot),0) AS liquido,
      COUNT(*)                                AS qtd_pag
    FROM pagamentos
    WHERE snapshot_at IS NOT NULL
      AND snapshot_at::date BETWEEN v_prev_inicio AND v_prev_fim
  ), con AS (
    SELECT
      COALESCE(SUM(valor_snapshot_centavos),0)    AS valor_concluido,
      COALESCE(SUM(comissao_snapshot_centavos),0) AS comissao,
      COUNT(*)                                    AS qtd_concluida
    FROM consultas
    WHERE snapshot_at IS NOT NULL
      AND snapshot_at::date BETWEEN v_prev_inicio AND v_prev_fim
  )
  SELECT jsonb_build_object(
    'receita_bruta_centavos',    pag.bruto,
    'receita_liquida_centavos',  pag.liquido,
    'comissao_plataforma_centavos', con.comissao,
    'repasse_medicos_centavos',  GREATEST(con.valor_concluido - con.comissao, 0),
    'consultas_concluidas',      con.qtd_concluida,
    'pagamentos_pagos',          pag.qtd_pag,
    'ticket_medio_centavos',     CASE WHEN con.qtd_concluida > 0 THEN ROUND(con.valor_concluido::numeric / con.qtd_concluida) ELSE 0 END,
    'inicio',                    v_prev_inicio,
    'fim',                       v_prev_fim
  ) INTO v_kpis_prev FROM pag, con;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'receita_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_medico FROM (
    SELECT jsonb_build_object(
      'medico_id', c.medico_id,
      'medico_nome', COALESCE(p.nome_completo, '—'),
      'consultas', COUNT(*),
      'receita_centavos', COALESCE(SUM(c.valor_snapshot_centavos),0),
      'comissao_centavos', COALESCE(SUM(c.comissao_snapshot_centavos),0),
      'repasse_centavos', GREATEST(COALESCE(SUM(c.valor_snapshot_centavos),0) - COALESCE(SUM(c.comissao_snapshot_centavos),0),0)
    ) AS t
    FROM consultas c
    LEFT JOIN medicos m ON m.id = c.medico_id
    LEFT JOIN profiles p ON p.user_id = m.user_id
    WHERE c.snapshot_at IS NOT NULL
      AND c.snapshot_at::date BETWEEN p_inicio AND p_fim
    GROUP BY c.medico_id, p.nome_completo
  ) sub;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'receita_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_especialidade FROM (
    SELECT jsonb_build_object(
      'especialidade', COALESCE(e.nome,'—'),
      'consultas', COUNT(*),
      'receita_centavos', COALESCE(SUM(c.valor_snapshot_centavos),0)
    ) AS t
    FROM consultas c
    LEFT JOIN especialidades e ON e.id = c.especialidade_id
    WHERE c.snapshot_at IS NOT NULL
      AND c.snapshot_at::date BETWEEN p_inicio AND p_fim
    GROUP BY e.nome
  ) sub;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'receita_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_modalidade FROM (
    SELECT jsonb_build_object(
      'modalidade', c.modalidade::text,
      'consultas', COUNT(*),
      'receita_centavos', COALESCE(SUM(c.valor_snapshot_centavos),0)
    ) AS t
    FROM consultas c
    WHERE c.snapshot_at IS NOT NULL
      AND c.snapshot_at::date BETWEEN p_inicio AND p_fim
    GROUP BY c.modalidade
  ) sub;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'receita_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_metodo FROM (
    SELECT jsonb_build_object(
      'metodo', metodo::text,
      'pagamentos', COUNT(*),
      'receita_centavos', COALESCE(SUM(valor_liquido_snapshot),0)
    ) AS t
    FROM pagamentos
    WHERE snapshot_at IS NOT NULL
      AND snapshot_at::date BETWEEN p_inicio AND p_fim
    GROUP BY metodo
  ) sub;

  SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'receita_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_canal FROM (
    SELECT jsonb_build_object(
      'canal', COALESCE(c.canal_origem::text,'—'),
      'consultas', COUNT(*),
      'receita_centavos', COALESCE(SUM(c.valor_snapshot_centavos),0)
    ) AS t
    FROM consultas c
    WHERE c.snapshot_at IS NOT NULL
      AND c.snapshot_at::date BETWEEN p_inicio AND p_fim
    GROUP BY c.canal_origem
  ) sub;

  SELECT COALESCE(jsonb_agg(t ORDER BY t->>'dia'), '[]'::jsonb)
  INTO v_diario FROM (
    SELECT jsonb_build_object(
      'dia', d::date,
      'receita_bruta_centavos',  COALESCE((SELECT SUM(valor_bruto_snapshot)   FROM pagamentos WHERE snapshot_at::date = d::date),0),
      'receita_liquida_centavos',COALESCE((SELECT SUM(valor_liquido_snapshot) FROM pagamentos WHERE snapshot_at::date = d::date),0),
      'consultas',               COALESCE((SELECT COUNT(*) FROM consultas WHERE snapshot_at::date = d::date),0)
    ) AS t
    FROM generate_series(p_inicio::date, p_fim::date, INTERVAL '1 day') d
  ) sub;

  RETURN jsonb_build_object(
    'periodo', jsonb_build_object('inicio', p_inicio, 'fim', p_fim, 'compare_mode', p_compare_mode),
    'kpis', v_kpis,
    'kpis_anterior', v_kpis_prev,
    'por_medico', v_por_medico,
    'por_especialidade', v_por_especialidade,
    'por_modalidade', v_por_modalidade,
    'por_metodo', v_por_metodo,
    'por_canal', v_por_canal,
    'diario', v_diario
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.relatorios_financeiro_snapshot(DATE, DATE, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.relatorios_financeiro_snapshot(DATE, DATE, TEXT) TO authenticated;