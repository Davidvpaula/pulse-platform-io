CREATE OR REPLACE FUNCTION public.auditoria_listar(
  p_inicio timestamp with time zone DEFAULT (now() - '30 days'::interval),
  p_fim timestamp with time zone DEFAULT now(),
  p_modulo text DEFAULT 'todos'::text,
  p_risco text DEFAULT 'todos'::text,
  p_origem text DEFAULT 'todos'::text,
  p_actor uuid DEFAULT NULL::uuid,
  p_entidade_id uuid DEFAULT NULL::uuid,
  p_acao text DEFAULT ''::text,
  p_busca text DEFAULT ''::text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_actor_tipo text DEFAULT 'todos'::text,
  p_categoria_financeira text DEFAULT ''::text,
  p_correlation_id text DEFAULT ''::text
)
 RETURNS TABLE(modulo text, id uuid, created_at timestamp with time zone, actor_id uuid, actor_nome text, acao text, entidade_tipo text, entidade_id uuid, campo text, valor_anterior text, valor_novo text, motivo text, observacao text, payload jsonb, risco text, origem text, revisado boolean, reviewed_at timestamp with time zone, reviewed_by uuid, revisao_nota text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    ))
    AND (
      coalesce(p_actor_tipo,'todos') = 'todos'
      OR (p_actor_tipo = 'sistema' AND e.actor_id IS NULL)
      OR (p_actor_tipo <> 'sistema' AND e.actor_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = e.actor_id AND ur.role::text = p_actor_tipo
      ))
    )
    AND (
      coalesce(p_categoria_financeira,'') = ''
      OR (e.payload ? 'categoria' AND e.payload->>'categoria' = p_categoria_financeira)
      OR (e.payload ? 'categoria_financeira' AND e.payload->>'categoria_financeira' = p_categoria_financeira)
    )
    AND (
      coalesce(p_correlation_id,'') = ''
      OR (e.payload ? 'correlation_id' AND e.payload->>'correlation_id' = p_correlation_id)
    );

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
    AND (
      coalesce(p_actor_tipo,'todos') = 'todos'
      OR (p_actor_tipo = 'sistema' AND e.actor_id IS NULL)
      OR (p_actor_tipo <> 'sistema' AND e.actor_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = e.actor_id AND ur.role::text = p_actor_tipo
      ))
    )
    AND (
      coalesce(p_categoria_financeira,'') = ''
      OR (e.payload ? 'categoria' AND e.payload->>'categoria' = p_categoria_financeira)
      OR (e.payload ? 'categoria_financeira' AND e.payload->>'categoria_financeira' = p_categoria_financeira)
    )
    AND (
      coalesce(p_correlation_id,'') = ''
      OR (e.payload ? 'correlation_id' AND e.payload->>'correlation_id' = p_correlation_id)
    )
  ORDER BY e.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;