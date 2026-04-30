
-- ============================================================
-- Tabela de revisões (workflow "marcar como revisado")
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_revisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_modulo TEXT NOT NULL,        -- 'consultas' | 'colaboradores' | 'planos' | 'comunicacao'
  evento_id UUID NOT NULL,
  reviewed_by UUID NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nota TEXT,
  UNIQUE (evento_modulo, evento_id)
);

CREATE INDEX IF NOT EXISTS idx_audit_revisoes_lookup ON public.audit_revisoes(evento_modulo, evento_id);

ALTER TABLE public.audit_revisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia audit_revisoes"
ON public.audit_revisoes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff cria audit_revisoes"
ON public.audit_revisoes FOR INSERT TO authenticated
WITH CHECK (public.has_permission(auth.uid(), 'auditoria.marcar_revisado') AND reviewed_by = auth.uid());

CREATE POLICY "Staff ve audit_revisoes"
ON public.audit_revisoes FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'auditoria.ver'));

-- Catálogo de permissões (best-effort)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permissoes_catalogo') THEN
    INSERT INTO public.permissoes_catalogo (chave, descricao, modulo) VALUES
      ('auditoria.ver', 'Visualizar registros de auditoria', 'auditoria'),
      ('auditoria.ver_criticos', 'Visualizar eventos críticos da auditoria', 'auditoria'),
      ('auditoria.exportar', 'Exportar registros de auditoria', 'auditoria'),
      ('auditoria.marcar_revisado', 'Marcar eventos como revisados', 'auditoria')
    ON CONFLICT (chave) DO NOTHING;
  END IF;
END$$;

-- ============================================================
-- VIEW unificada de auditoria
-- ============================================================
CREATE OR REPLACE VIEW public.audit_eventos_unificado AS
WITH base AS (
  SELECT
    'consultas'::text AS modulo,
    a.id,
    a.created_at,
    a.actor_id,
    a.acao AS acao,
    'consulta'::text AS entidade_tipo,
    a.consulta_id AS entidade_id,
    a.campo,
    a.valor_anterior,
    a.valor_novo,
    a.motivo,
    a.observacao,
    a.payload
  FROM public.consultas_auditoria a
  UNION ALL
  SELECT
    'colaboradores'::text,
    a.id, a.created_at, a.actor_id, a.acao,
    'colaborador'::text, a.colaborador_id,
    a.campo, a.valor_anterior, a.valor_novo, a.motivo, a.observacao, a.payload
  FROM public.colaboradores_auditoria a
  UNION ALL
  SELECT
    'planos'::text,
    a.id, a.created_at, a.actor_id, a.acao,
    CASE WHEN a.assinatura_id IS NOT NULL THEN 'assinatura' ELSE 'plano' END,
    COALESCE(a.assinatura_id, a.plano_id),
    a.campo, a.valor_anterior, a.valor_novo, a.motivo, a.observacao, a.payload
  FROM public.planos_auditoria a
  UNION ALL
  SELECT
    'comunicacao'::text,
    a.id, a.created_at, a.actor_id, a.action,
    a.entity_type, a.entity_id,
    NULL::text, NULL::text, NULL::text, NULL::text, NULL::text,
    a.metadata
  FROM public.comunicacao_auditoria a
)
SELECT
  b.modulo,
  b.id,
  b.created_at,
  b.actor_id,
  b.acao,
  b.entidade_tipo,
  b.entidade_id,
  b.campo,
  b.valor_anterior,
  b.valor_novo,
  b.motivo,
  b.observacao,
  b.payload,
  -- Nível de risco automático
  CASE
    WHEN b.acao ILIKE '%reembolso%' OR b.acao ILIKE '%comissao%' OR b.acao ILIKE '%permissao%'
         OR b.acao ILIKE '%bloque%' OR b.acao ILIKE '%suspens%'
         OR b.acao ILIKE '%integraca%' OR b.acao ILIKE '%inativ%' OR b.acao ILIKE '%exclu%'
         OR b.acao ILIKE '%delete%' OR b.acao ILIKE '%remover%'
      THEN 'critico'
    WHEN b.acao ILIKE '%cancel%' OR b.acao ILIKE '%pagamento%' OR b.acao ILIKE '%plano%'
         OR b.acao ILIKE '%aprovacao%' OR b.acao ILIKE '%reprovacao%' OR b.acao ILIKE '%troca%'
      THEN 'alto'
    WHEN b.acao ILIKE '%edit%' OR b.acao ILIKE '%update%' OR b.acao ILIKE '%alterac%'
         OR b.acao ILIKE '%transfer%' OR b.acao ILIKE '%bot%' OR b.acao ILIKE '%ia_%'
      THEN 'medio'
    ELSE 'baixo'
  END AS risco,
  -- Origem inferida
  CASE
    WHEN b.actor_id IS NULL THEN 'sistema'
    ELSE 'manual'
  END AS origem,
  -- Nome do ator (best-effort)
  COALESCE(
    (SELECT nome_completo FROM public.colaboradores c WHERE c.user_id = b.actor_id LIMIT 1),
    (SELECT nome FROM public.medicos m WHERE m.user_id = b.actor_id LIMIT 1),
    'Sistema'
  ) AS actor_nome,
  -- Revisado?
  (SELECT r.id FROM public.audit_revisoes r WHERE r.evento_modulo = b.modulo AND r.evento_id = b.id LIMIT 1) IS NOT NULL AS revisado,
  (SELECT r.reviewed_at FROM public.audit_revisoes r WHERE r.evento_modulo = b.modulo AND r.evento_id = b.id LIMIT 1) AS reviewed_at,
  (SELECT r.reviewed_by FROM public.audit_revisoes r WHERE r.evento_modulo = b.modulo AND r.evento_id = b.id LIMIT 1) AS reviewed_by,
  (SELECT r.nota FROM public.audit_revisoes r WHERE r.evento_modulo = b.modulo AND r.evento_id = b.id LIMIT 1) AS revisao_nota
FROM base b;

-- ============================================================
-- RPC: dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION public.auditoria_dashboard(
  p_inicio TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  p_fim TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok BOOLEAN;
  _total INT := 0;
  _hoje INT := 0;
  _criticos INT := 0;
  _altos INT := 0;
  _medios INT := 0;
  _baixos INT := 0;
  _financeiro INT := 0;
  _permissoes INT := 0;
  _integracao INT := 0;
  _bloqueios INT := 0;
  _nao_revisados INT := 0;
  _por_modulo JSONB;
  _por_dia JSONB;
  _top_atores JSONB;
BEGIN
  _ok := public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_permission(auth.uid(), 'auditoria.ver');
  IF NOT _ok THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())),
    COUNT(*) FILTER (WHERE risco = 'critico'),
    COUNT(*) FILTER (WHERE risco = 'alto'),
    COUNT(*) FILTER (WHERE risco = 'medio'),
    COUNT(*) FILTER (WHERE risco = 'baixo'),
    COUNT(*) FILTER (WHERE acao ILIKE '%pagamento%' OR acao ILIKE '%reembolso%' OR acao ILIKE '%comissao%' OR acao ILIKE '%cobranca%'),
    COUNT(*) FILTER (WHERE acao ILIKE '%permissao%' OR acao ILIKE '%role%'),
    COUNT(*) FILTER (WHERE acao ILIKE '%integraca%' OR acao ILIKE '%feegow%' OR acao ILIKE '%whatsapp%' OR acao ILIKE '%webhook%'),
    COUNT(*) FILTER (WHERE acao ILIKE '%bloque%' OR acao ILIKE '%suspens%'),
    COUNT(*) FILTER (WHERE risco IN ('critico','alto') AND NOT revisado)
  INTO _total, _hoje, _criticos, _altos, _medios, _baixos,
       _financeiro, _permissoes, _integracao, _bloqueios, _nao_revisados
  FROM public.audit_eventos_unificado
  WHERE created_at >= p_inicio AND created_at <= p_fim;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('modulo', modulo, 'total', total) ORDER BY total DESC), '[]'::jsonb)
  INTO _por_modulo
  FROM (
    SELECT modulo, COUNT(*)::INT AS total
    FROM public.audit_eventos_unificado
    WHERE created_at >= p_inicio AND created_at <= p_fim
    GROUP BY modulo
  ) m;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('dia', dia, 'total', total) ORDER BY dia), '[]'::jsonb)
  INTO _por_dia
  FROM (
    SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
           COUNT(*)::INT AS total
    FROM public.audit_eventos_unificado
    WHERE created_at >= p_inicio AND created_at <= p_fim
    GROUP BY 1
  ) d;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('actor_nome', actor_nome, 'total', total) ORDER BY total DESC), '[]'::jsonb)
  INTO _top_atores
  FROM (
    SELECT actor_nome, COUNT(*)::INT AS total
    FROM public.audit_eventos_unificado
    WHERE created_at >= p_inicio AND created_at <= p_fim
      AND actor_nome IS NOT NULL
    GROUP BY actor_nome
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ) a;

  RETURN jsonb_build_object(
    'total', _total, 'hoje', _hoje,
    'criticos', _criticos, 'altos', _altos, 'medios', _medios, 'baixos', _baixos,
    'financeiro', _financeiro, 'permissoes', _permissoes,
    'integracao', _integracao, 'bloqueios', _bloqueios,
    'nao_revisados_sensiveis', _nao_revisados,
    'por_modulo', _por_modulo,
    'por_dia', _por_dia,
    'top_atores', _top_atores
  );
END;
$$;

-- ============================================================
-- RPC: listagem com filtros
-- ============================================================
CREATE OR REPLACE FUNCTION public.auditoria_listar(
  p_inicio TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  p_fim TIMESTAMPTZ DEFAULT now(),
  p_modulo TEXT DEFAULT NULL,
  p_risco TEXT DEFAULT NULL,
  p_actor UUID DEFAULT NULL,
  p_acao TEXT DEFAULT NULL,
  p_entidade_id UUID DEFAULT NULL,
  p_origem TEXT DEFAULT NULL,
  p_revisado TEXT DEFAULT NULL, -- 'sim'|'nao'|null
  p_busca TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  modulo TEXT,
  id UUID,
  created_at TIMESTAMPTZ,
  actor_id UUID,
  actor_nome TEXT,
  acao TEXT,
  entidade_tipo TEXT,
  entidade_id UUID,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT,
  observacao TEXT,
  payload JSONB,
  risco TEXT,
  origem TEXT,
  revisado BOOLEAN,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  revisao_nota TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok BOOLEAN;
  _ver_criticos BOOLEAN;
BEGIN
  _ok := public.has_role(auth.uid(), 'admin'::app_role)
         OR public.has_permission(auth.uid(), 'auditoria.ver');
  IF NOT _ok THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  _ver_criticos := public.has_role(auth.uid(), 'admin'::app_role)
                   OR public.has_permission(auth.uid(), 'auditoria.ver_criticos');

  RETURN QUERY
  WITH filtrado AS (
    SELECT v.*
    FROM public.audit_eventos_unificado v
    WHERE v.created_at >= p_inicio AND v.created_at <= p_fim
      AND (p_modulo IS NULL OR v.modulo = p_modulo)
      AND (p_risco IS NULL OR v.risco = p_risco)
      AND (p_actor IS NULL OR v.actor_id = p_actor)
      AND (p_acao IS NULL OR v.acao ILIKE '%' || p_acao || '%')
      AND (p_entidade_id IS NULL OR v.entidade_id = p_entidade_id)
      AND (p_origem IS NULL OR v.origem = p_origem)
      AND (p_revisado IS NULL
           OR (p_revisado = 'sim' AND v.revisado = TRUE)
           OR (p_revisado = 'nao' AND v.revisado = FALSE))
      AND (p_busca IS NULL OR (
            v.acao ILIKE '%' || p_busca || '%' OR
            COALESCE(v.actor_nome, '') ILIKE '%' || p_busca || '%' OR
            COALESCE(v.motivo, '') ILIKE '%' || p_busca || '%' OR
            COALESCE(v.observacao, '') ILIKE '%' || p_busca || '%'
          ))
      AND (_ver_criticos OR v.risco <> 'critico')
  ),
  contado AS (SELECT COUNT(*)::BIGINT AS c FROM filtrado)
  SELECT f.modulo, f.id, f.created_at, f.actor_id, f.actor_nome, f.acao,
         f.entidade_tipo, f.entidade_id, f.campo, f.valor_anterior, f.valor_novo,
         f.motivo, f.observacao, f.payload, f.risco, f.origem,
         f.revisado, f.reviewed_at, f.reviewed_by, f.revisao_nota,
         (SELECT c FROM contado)
  FROM filtrado f
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
