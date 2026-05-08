CREATE OR REPLACE FUNCTION public.relatorios_financeiro_snapshot(
  p_inicio date DEFAULT ((now() - '30 days'::interval))::date,
  p_fim date DEFAULT (now())::date,
  p_compare_mode text DEFAULT 'periodo_anterior'
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  resultado JSON;
  v_dias INT;
  v_comp_inicio DATE;
  v_comp_fim DATE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_dias := (p_fim - p_inicio);

  IF p_compare_mode = 'ano_anterior' THEN
    v_comp_inicio := p_inicio - INTERVAL '1 year';
    v_comp_fim := p_fim - INTERVAL '1 year';
  ELSE
    v_comp_inicio := p_inicio - (v_dias || ' days')::interval;
    v_comp_fim := p_inicio - INTERVAL '1 day';
  END IF;

  SELECT json_build_object(
    'kpis', (
      SELECT json_build_object(
        'inicio', p_inicio,
        'fim', p_fim,
        'receita_bruta_centavos', COALESCE(SUM(cf.valor_bruto_centavos), 0),
        'receita_liquida_centavos', COALESCE(SUM(cf.valor_medico_centavos), 0),
        'comissao_plataforma_centavos', COALESCE(SUM(cf.valor_plataforma_centavos), 0),
        'repasse_medicos_centavos', COALESCE(SUM(cf.valor_medico_centavos), 0),
        'taxa_gateway_centavos', 0,
        'taxa_imposto_centavos', 0,
        'reembolsos_centavos', 0,
        'consultas_concluidas', COUNT(*),
        'ticket_medio_centavos', CASE WHEN COUNT(*) > 0 THEN (SUM(cf.valor_bruto_centavos) / COUNT(*)) ELSE 0 END
      )
      FROM consultas_financeiro cf
      WHERE cf.status = 'valido'
        AND cf.data_consulta::date >= p_inicio
        AND cf.data_consulta::date <= p_fim
    ),
    'comparativo', (
      SELECT json_build_object(
        'inicio', v_comp_inicio,
        'fim', v_comp_fim,
        'receita_bruta_centavos', COALESCE(SUM(cf.valor_bruto_centavos), 0),
        'consultas_concluidas', COUNT(*)
      )
      FROM consultas_financeiro cf
      WHERE cf.status = 'valido'
        AND cf.data_consulta::date >= v_comp_inicio
        AND cf.data_consulta::date <= v_comp_fim
    ),
    'serie_diaria', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT cf.data_consulta::date as dia,
               COUNT(*) as consultas,
               SUM(cf.valor_bruto_centavos) as receita_centavos
        FROM consultas_financeiro cf
        WHERE cf.status = 'valido'
          AND cf.data_consulta::date >= p_inicio
          AND cf.data_consulta::date <= p_fim
        GROUP BY cf.data_consulta::date
        ORDER BY dia
      ) t
    ), '[]'::json),
    'top_medicos', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT m.id, m.nome,
               COUNT(*) as consultas,
               SUM(cf.valor_bruto_centavos) as receita_centavos,
               SUM(cf.valor_medico_centavos) as repasse_centavos
        FROM consultas_financeiro cf
        JOIN medicos m ON m.id = cf.medico_id
        WHERE cf.status = 'valido'
          AND cf.data_consulta::date >= p_inicio
          AND cf.data_consulta::date <= p_fim
        GROUP BY m.id, m.nome
        ORDER BY receita_centavos DESC
        LIMIT 10
      ) t
    ), '[]'::json),
    'por_metodo', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT COALESCE(pg.metodo::text, 'indefinido') as metodo,
               COUNT(*) as pagamentos,
               SUM(pg.valor_centavos) as receita_centavos
        FROM pagamentos pg
        WHERE pg.status = 'pago'
          AND pg.created_at::date >= p_inicio
          AND pg.created_at::date <= p_fim
        GROUP BY pg.metodo
        ORDER BY receita_centavos DESC
      ) t
    ), '[]'::json),
    'por_canal', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT COALESCE(c.canal_origem::text, 'direto') as canal,
               COUNT(*) as consultas,
               SUM(cf.valor_bruto_centavos) as receita_centavos
        FROM consultas_financeiro cf
        LEFT JOIN consultas c ON c.id = cf.consulta_id
        WHERE cf.status = 'valido'
          AND cf.data_consulta::date >= p_inicio
          AND cf.data_consulta::date <= p_fim
        GROUP BY c.canal_origem
        ORDER BY receita_centavos DESC
      ) t
    ), '[]'::json)
  ) INTO resultado;

  RETURN resultado;
END;
$function$;