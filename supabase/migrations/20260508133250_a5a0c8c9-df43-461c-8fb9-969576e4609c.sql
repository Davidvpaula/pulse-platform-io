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
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role)) THEN
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

CREATE OR REPLACE FUNCTION public.auditoria_dashboard(
  p_inicio timestamptz DEFAULT now() - interval '30 days',
  p_fim timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'supervisor'::app_role)) THEN
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