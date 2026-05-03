
-- 1) Drop existing
DROP VIEW IF EXISTS public.audit_eventos_unificado CASCADE;
DROP TABLE IF EXISTS public.audit_eventos_unificado CASCADE;

-- 2) Recreate view — ALL audit tables, LEFT JOIN for revisoes
CREATE OR REPLACE VIEW public.audit_eventos_unificado AS
WITH base AS (
  SELECT 'consultas'::text AS modulo, a.id, a.created_at, a.actor_id, a.acao,
         'consulta'::text AS entidade_tipo, a.consulta_id AS entidade_id,
         a.campo, a.valor_anterior, a.valor_novo, a.motivo, a.observacao, a.payload
  FROM consultas_auditoria a
  UNION ALL
  SELECT 'colaboradores', a.id, a.created_at, a.actor_id, a.acao,
         'colaborador', a.colaborador_id, a.campo, a.valor_anterior, a.valor_novo,
         a.motivo, a.observacao, a.payload
  FROM colaboradores_auditoria a
  UNION ALL
  SELECT 'planos', a.id, a.created_at, a.actor_id, a.acao,
         CASE WHEN a.assinatura_id IS NOT NULL THEN 'assinatura' ELSE 'plano' END,
         COALESCE(a.assinatura_id, a.plano_id), a.campo, a.valor_anterior, a.valor_novo,
         a.motivo, a.observacao, a.payload
  FROM planos_auditoria a
  UNION ALL
  SELECT 'comunicacao', a.id, a.created_at, a.actor_id, a.action,
         a.entity_type, a.entity_id, NULL, NULL, NULL, NULL, NULL, a.metadata
  FROM comunicacao_auditoria a
  UNION ALL
  SELECT 'financeiro', a.id, a.created_at, a.actor_id, a.acao,
         a.entidade, a.entidade_id, NULL, a.valor_anterior, a.valor_novo,
         a.motivo, a.observacao, a.payload
  FROM financeiro_auditoria a
  UNION ALL
  SELECT 'medicos', a.id, a.created_at, a.actor_id, a.acao,
         'medico', a.medico_id, NULL, a.status_anterior::text, a.status_novo::text,
         a.motivo, a.observacao, a.payload
  FROM medicos_auditoria a
  UNION ALL
  SELECT 'pacientes', a.id, a.created_at, a.actor_id, a.acao,
         'paciente', a.paciente_id, NULL, a.status_anterior::text, a.status_novo::text,
         a.motivo, a.observacao, a.payload
  FROM pacientes_auditoria a
  UNION ALL
  SELECT 'empresas', a.id, a.created_at, a.actor_id, a.acao,
         'empresa', a.empresa_id, a.campo, a.valor_anterior, a.valor_novo,
         a.motivo, a.observacao, a.payload
  FROM empresas_auditoria a
  UNION ALL
  SELECT 'permissoes', a.id, a.created_at, a.changed_by, a.acao,
         COALESCE(a.scope, 'permissao'), a.target_user_id,
         a.permission_key, a.valor_antes::text, a.valor_depois::text,
         a.motivo, NULL, NULL::jsonb
  FROM permission_audit_logs a
  UNION ALL
  SELECT 'geral', gen_random_uuid(), a.occurred_at, a.actor_id, a.action,
         a.table_name, CASE WHEN a.record_id ~ '^[0-9a-f\-]{36}$' THEN a.record_id::uuid ELSE NULL END,
         NULL, a.before_data::text, a.after_data::text,
         a.motivo, NULL, a.request_ctx
  FROM audit_log a
)
SELECT
  b.modulo, b.id, b.created_at, b.actor_id,
  COALESCE(c.nome_completo, m.nome, 'Sistema') AS actor_nome,
  b.acao, b.entidade_tipo, b.entidade_id,
  b.campo, b.valor_anterior, b.valor_novo,
  b.motivo, b.observacao, b.payload,
  CASE
    WHEN b.acao ~~* ANY(ARRAY['%reembolso%','%comissao%','%permissao%','%bloque%','%suspens%','%integraca%','%inativ%','%exclu%','%delete%','%remover%']) THEN 'critico'
    WHEN b.acao ~~* ANY(ARRAY['%cancel%','%pagamento%','%plano%','%aprovacao%','%reprovacao%','%troca%']) THEN 'alto'
    WHEN b.acao ~~* ANY(ARRAY['%edit%','%update%','%alterac%','%transfer%','%bot%','%ia_%']) THEN 'medio'
    ELSE 'baixo'
  END AS risco,
  CASE WHEN b.actor_id IS NULL THEN 'sistema' ELSE 'manual' END AS origem,
  (r.id IS NOT NULL) AS revisado,
  r.reviewed_at, r.reviewed_by, r.nota AS revisao_nota
FROM base b
LEFT JOIN colaboradores c ON c.user_id = b.actor_id
LEFT JOIN medicos m ON m.user_id = b.actor_id AND c.user_id IS NULL
LEFT JOIN audit_revisoes r ON r.evento_modulo = b.modulo AND r.evento_id = b.id;

-- 3) RPC auditoria_listar
CREATE OR REPLACE FUNCTION public.auditoria_listar(
  p_inicio timestamptz DEFAULT now() - interval '30 days',
  p_fim timestamptz DEFAULT now(),
  p_modulo text DEFAULT 'todos',
  p_risco text DEFAULT 'todos',
  p_origem text DEFAULT 'todos',
  p_actor uuid DEFAULT NULL,
  p_entidade_id uuid DEFAULT NULL,
  p_acao text DEFAULT '',
  p_busca text DEFAULT '',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  modulo text, id uuid, created_at timestamptz,
  actor_id uuid, actor_nome text, acao text,
  entidade_tipo text, entidade_id uuid,
  campo text, valor_anterior text, valor_novo text,
  motivo text, observacao text, payload jsonb,
  risco text, origem text,
  revisado boolean, reviewed_at timestamptz, reviewed_by uuid, revisao_nota text,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_total bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM colaboradores WHERE user_id = auth.uid() AND funcao IN ('admin','supervisor')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO v_total
  FROM audit_eventos_unificado e
  WHERE e.created_at BETWEEN p_inicio AND p_fim
    AND (p_modulo = 'todos' OR e.modulo = p_modulo)
    AND (p_risco = 'todos' OR e.risco = p_risco)
    AND (p_origem = 'todos' OR e.origem = p_origem)
    AND (p_actor IS NULL OR e.actor_id = p_actor)
    AND (p_entidade_id IS NULL OR e.entidade_id = p_entidade_id)
    AND (p_acao = '' OR e.acao ILIKE '%' || p_acao || '%')
    AND (p_busca = '' OR (
      e.acao ILIKE '%' || p_busca || '%'
      OR e.actor_nome ILIKE '%' || p_busca || '%'
      OR e.motivo ILIKE '%' || p_busca || '%'
      OR e.observacao ILIKE '%' || p_busca || '%'
    ));

  RETURN QUERY
  SELECT e.modulo, e.id, e.created_at, e.actor_id, e.actor_nome, e.acao,
    e.entidade_tipo, e.entidade_id, e.campo, e.valor_anterior, e.valor_novo,
    e.motivo, e.observacao, e.payload, e.risco, e.origem,
    e.revisado, e.reviewed_at, e.reviewed_by, e.revisao_nota, v_total
  FROM audit_eventos_unificado e
  WHERE e.created_at BETWEEN p_inicio AND p_fim
    AND (p_modulo = 'todos' OR e.modulo = p_modulo)
    AND (p_risco = 'todos' OR e.risco = p_risco)
    AND (p_origem = 'todos' OR e.origem = p_origem)
    AND (p_actor IS NULL OR e.actor_id = p_actor)
    AND (p_entidade_id IS NULL OR e.entidade_id = p_entidade_id)
    AND (p_acao = '' OR e.acao ILIKE '%' || p_acao || '%')
    AND (p_busca = '' OR (
      e.acao ILIKE '%' || p_busca || '%'
      OR e.actor_nome ILIKE '%' || p_busca || '%'
      OR e.motivo ILIKE '%' || p_busca || '%'
      OR e.observacao ILIKE '%' || p_busca || '%'
    ))
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4) RPC auditoria_dashboard
CREATE OR REPLACE FUNCTION public.auditoria_dashboard(
  p_inicio timestamptz DEFAULT now() - interval '30 days',
  p_fim timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM colaboradores WHERE user_id = auth.uid() AND funcao IN ('admin','supervisor')) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT jsonb_build_object(
    'total', count(*),
    'ultimas_24h', count(*) FILTER (WHERE e.created_at >= now() - interval '24 hours'),
    'por_risco', jsonb_build_object(
      'critico', count(*) FILTER (WHERE e.risco = 'critico'),
      'alto', count(*) FILTER (WHERE e.risco = 'alto'),
      'medio', count(*) FILTER (WHERE e.risco = 'medio'),
      'baixo', count(*) FILTER (WHERE e.risco = 'baixo')
    ),
    'por_modulo', (
      SELECT COALESCE(jsonb_object_agg(sub.modulo, sub.cnt), '{}'::jsonb)
      FROM (SELECT e2.modulo, count(*) AS cnt FROM audit_eventos_unificado e2
            WHERE e2.created_at BETWEEN p_inicio AND p_fim GROUP BY e2.modulo) sub
    ),
    'por_origem', jsonb_build_object(
      'manual', count(*) FILTER (WHERE e.origem = 'manual'),
      'sistema', count(*) FILTER (WHERE e.origem = 'sistema')
    ),
    'revisados', count(*) FILTER (WHERE e.revisado = true),
    'nao_revisados', count(*) FILTER (WHERE e.revisado = false),
    'top_atores', COALESCE((
      SELECT jsonb_agg(row_to_json(sub2))
      FROM (SELECT e3.actor_nome, count(*) AS total FROM audit_eventos_unificado e3
            WHERE e3.created_at BETWEEN p_inicio AND p_fim AND e3.actor_nome != 'Sistema'
            GROUP BY e3.actor_nome ORDER BY count(*) DESC LIMIT 5) sub2
    ), '[]'::jsonb)
  ) INTO v_result
  FROM audit_eventos_unificado e
  WHERE e.created_at BETWEEN p_inicio AND p_fim;

  RETURN v_result;
END;
$$;
