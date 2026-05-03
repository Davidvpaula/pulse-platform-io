
DROP FUNCTION IF EXISTS public.relatorios_financeiro_snapshot(DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.relatorios_financeiro_snapshot(
  p_inicio  DATE DEFAULT (now() - interval '30 days')::date,
  p_fim     DATE DEFAULT now()::date,
  p_medico  TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado JSON;
  v_medico_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_medico IS NOT NULL AND p_medico <> '' THEN
    v_medico_id := p_medico::uuid;
  END IF;

  SELECT json_build_object(
    'top_medicos', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT cf.medico_id,
               p.nome_completo as medico_nome,
               COUNT(*) as total_consultas,
               SUM(cf.valor_bruto_centavos) as bruto_centavos,
               SUM(cf.valor_plataforma_centavos) as plataforma_centavos,
               SUM(cf.valor_medico_centavos) as medico_centavos,
               ROUND(AVG(cf.comissao_pct_aplicada), 2) as comissao_media
        FROM consultas_financeiro cf
        LEFT JOIN profiles p ON p.id = cf.medico_id
        WHERE cf.status = 'valido'
          AND cf.data_consulta >= p_inicio AND cf.data_consulta < (p_fim + 1)
          AND (v_medico_id IS NULL OR cf.medico_id = v_medico_id)
        GROUP BY cf.medico_id, p.nome_completo
        ORDER BY bruto_centavos DESC
        LIMIT 20
      ) t
    ), '[]'::json),

    'por_servico', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT cf.servico_nome_snapshot as servico,
               COUNT(*) as total,
               SUM(cf.valor_bruto_centavos) as bruto_centavos,
               SUM(cf.valor_plataforma_centavos) as plataforma_centavos
        FROM consultas_financeiro cf
        WHERE cf.status = 'valido'
          AND cf.data_consulta >= p_inicio AND cf.data_consulta < (p_fim + 1)
          AND (v_medico_id IS NULL OR cf.medico_id = v_medico_id)
        GROUP BY cf.servico_nome_snapshot
        ORDER BY bruto_centavos DESC
        LIMIT 15
      ) t
    ), '[]'::json),

    'por_modelo', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT cf.modelo_aplicado::text as modelo,
               COUNT(*) as total,
               SUM(cf.valor_bruto_centavos) as bruto_centavos
        FROM consultas_financeiro cf
        WHERE cf.status = 'valido'
          AND cf.data_consulta >= p_inicio AND cf.data_consulta < (p_fim + 1)
          AND (v_medico_id IS NULL OR cf.medico_id = v_medico_id)
        GROUP BY cf.modelo_aplicado
        ORDER BY bruto_centavos DESC
      ) t
    ), '[]'::json),

    'pendentes', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT pg.id, pg.consulta_id, pg.valor_bruto_centavos, pg.metodo::text,
               pg.created_at, pg.data_vencimento,
               pr.nome_completo as paciente_nome
        FROM pagamentos pg
        LEFT JOIN profiles pr ON pr.id = pg.paciente_id
        WHERE pg.status = 'pendente'
          AND pg.created_at >= p_inicio AND pg.created_at < (p_fim + 1)
        ORDER BY pg.created_at DESC
        LIMIT 50
      ) t
    ), '[]'::json)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.relatorios_financeiro_snapshot(DATE, DATE, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.relatorios_financeiro_snapshot(DATE, DATE, TEXT) TO authenticated;
