
CREATE OR REPLACE FUNCTION public.relatorios_financeiro(
  p_inicio DATE DEFAULT (now() - interval '30 days')::date,
  p_fim    DATE DEFAULT now()::date
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resultado JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_build_object(
    'receita_bruta_centavos', COALESCE((
      SELECT SUM(valor_bruto_centavos) FROM pagamentos
      WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
    ), 0),
    'receita_liquida_centavos', COALESCE((
      SELECT SUM(valor_liquido_centavos) FROM pagamentos
      WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
    ), 0),
    'total_pagamentos', COALESCE((
      SELECT COUNT(*) FROM pagamentos
      WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
    ), 0),
    'taxa_gateway_total_centavos', COALESCE((
      SELECT SUM(taxa_gateway_centavos) FROM pagamentos
      WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
    ), 0),
    'reembolsos_centavos', COALESCE((
      SELECT SUM(valor_reembolsado_centavos) FROM pagamentos
      WHERE data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1) AND valor_reembolsado_centavos > 0
    ), 0),
    'pendentes_centavos', COALESCE((
      SELECT SUM(valor_bruto_centavos) FROM pagamentos
      WHERE status = 'pendente' AND created_at >= p_inicio AND created_at < (p_fim + 1)
    ), 0),
    'plataforma_centavos', COALESCE((
      SELECT SUM(valor_plataforma_centavos) FROM consultas_financeiro
      WHERE status = 'valido' AND data_consulta >= p_inicio AND data_consulta < (p_fim + 1)
    ), 0),
    'medicos_centavos', COALESCE((
      SELECT SUM(valor_medico_centavos) FROM consultas_financeiro
      WHERE status = 'valido' AND data_consulta >= p_inicio AND data_consulta < (p_fim + 1)
    ), 0),
    'comissao_media_pct', COALESCE((
      SELECT ROUND(AVG(comissao_pct_aplicada), 2) FROM consultas_financeiro
      WHERE status = 'valido' AND data_consulta >= p_inicio AND data_consulta < (p_fim + 1)
    ), 0),
    'por_metodo', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT metodo::text, COUNT(*) as total, SUM(valor_bruto_centavos) as valor_centavos
        FROM pagamentos
        WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
        GROUP BY metodo ORDER BY valor_centavos DESC
      ) t
    ), '[]'::json),
    'receita_por_dia', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT data_pagamento::date as dia, SUM(valor_bruto_centavos) as bruto, SUM(valor_liquido_centavos) as liquido, COUNT(*) as total
        FROM pagamentos
        WHERE status = 'pago' AND data_pagamento >= p_inicio AND data_pagamento < (p_fim + 1)
        GROUP BY data_pagamento::date ORDER BY dia
      ) t
    ), '[]'::json),
    'assinaturas_ativas', COALESCE((
      SELECT COUNT(*) FROM assinaturas WHERE status = 'ativa'
    ), 0),
    'receita_recorrente_centavos', COALESCE((
      SELECT SUM(valor_cobrado_centavos) FROM assinaturas WHERE status = 'ativa'
    ), 0)
  ) INTO resultado;

  RETURN resultado;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.relatorios_financeiro(DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.relatorios_financeiro(DATE, DATE) TO authenticated;
