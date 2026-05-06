
-- ══════════════════════════════════════════════════════════════
-- 1. admin_acoes_medico — Log imutável de ações admin
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admin_acoes_medico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo_acao text NOT NULL,
  motivo text NOT NULL,
  dados_antes jsonb DEFAULT '{}'::jsonb,
  dados_depois jsonb DEFAULT '{}'::jsonb,
  alerta_vinculado_id uuid REFERENCES public.medico_alertas_ia(id) ON DELETE SET NULL,
  anomalia_vinculada_id uuid REFERENCES public.medico_anomalias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admin_acoes_tipo_check CHECK (tipo_acao IN (
    'promover','reduzir_destaque','pausar_impulsionamento','bloquear_beneficios',
    'sinalizar_acompanhamento','solicitar_correcao','registrar_observacao',
    'congelar_ranking','liberar_selo','remover_selo','remover_restricao'
  ))
);

CREATE INDEX idx_admin_acoes_medico_id ON public.admin_acoes_medico(medico_id);
CREATE INDEX idx_admin_acoes_created ON public.admin_acoes_medico(created_at DESC);

ALTER TABLE public.admin_acoes_medico ENABLE ROW LEVEL SECURITY;

-- Admin-only: view
CREATE POLICY "admin_acoes_select" ON public.admin_acoes_medico
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin-only: insert (imutável = somente insert)
CREATE POLICY "admin_acoes_insert" ON public.admin_acoes_medico
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NO update/delete policies = imutável

-- ══════════════════════════════════════════════════════════════
-- 2. medico_restricoes — Estado de restrições ativas
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.medico_restricoes (
  medico_id uuid PRIMARY KEY REFERENCES public.medicos(id) ON DELETE CASCADE,
  ranking_congelado boolean NOT NULL DEFAULT false,
  impulsionamento_pausado boolean NOT NULL DEFAULT false,
  beneficios_bloqueados boolean NOT NULL DEFAULT false,
  em_acompanhamento boolean NOT NULL DEFAULT false,
  selo_removido boolean NOT NULL DEFAULT false,
  motivo text,
  aplicado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aplicado_em timestamptz DEFAULT now(),
  expira_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_restricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restricoes_select_admin" ON public.medico_restricoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "restricoes_insert_admin" ON public.medico_restricoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "restricoes_update_admin" ON public.medico_restricoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_medico_restricoes_updated_at
  BEFORE UPDATE ON public.medico_restricoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════════
-- 3. Atualizar recalcular_ranking_medico para respeitar restrições
--    e NUNCA permitir que premium anule penalidades
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.recalcular_ranking_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_media_raw numeric;
  v_total_aval integer;
  v_media_global numeric;
  v_n_global integer;
  v_C numeric;
  v_bayesian numeric;
  v_total_consultas integer;
  v_fator_recencia numeric;
  v_fator_premium numeric := 1.0;
  v_is_premium boolean;
  v_penalidade_anomalia numeric := 0;
  v_penalidade_compliance numeric := 0;
  v_bonus_novato numeric := 0;
  v_score_final numeric;
  v_score_anterior numeric;
  v_nivel_risco text;
  v_data_cadastro timestamptz;
  v_meses_ativo numeric;
  v_aval_recentes_5 integer;
  v_ranking_congelado boolean := false;
  v_protecao jsonb;
BEGIN
  -- ── Verificar se ranking está congelado ──
  SELECT COALESCE(r.ranking_congelado, false)
    INTO v_ranking_congelado
    FROM medico_restricoes r
   WHERE r.medico_id = p_medico_id;

  IF v_ranking_congelado THEN
    -- Apenas registrar no audit log que tentou recalcular mas estava congelado
    INSERT INTO ranking_audit_log (medico_id, score_anterior, score_novo, motivo, detalhes)
    SELECT ranking_score, ranking_score, 'ranking_congelado',
           jsonb_build_object('acao', 'recalculo_bloqueado_por_congelamento')
      FROM medico_ranking WHERE medico_id = p_medico_id;
    RETURN;
  END IF;

  -- ── Score anterior ──
  SELECT ranking_score INTO v_score_anterior
    FROM medico_ranking WHERE medico_id = p_medico_id;

  -- ── Avaliações do médico ──
  SELECT COALESCE(AVG(nota), 0), COALESCE(COUNT(*), 0)
    INTO v_media_raw, v_total_aval
    FROM avaliacoes_medicas WHERE medico_id = p_medico_id;

  -- ── Média global (Bayesian smoothing) ──
  SELECT COALESCE(AVG(nota), 3.5), GREATEST(COALESCE(COUNT(*), 1), 1)
    INTO v_media_global, v_n_global
    FROM avaliacoes_medicas;

  v_C := GREATEST(v_n_global * 0.1, 5);
  v_bayesian := (v_C * v_media_global + v_total_aval * v_media_raw) / (v_C + v_total_aval);

  -- ── Total consultas ──
  SELECT COALESCE(COUNT(*), 0) INTO v_total_consultas
    FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  -- ── Recência ──
  SELECT CASE
    WHEN MAX(data_consulta) IS NULL THEN 0.5
    WHEN MAX(data_consulta) >= CURRENT_DATE - INTERVAL '7 days' THEN 1.0
    WHEN MAX(data_consulta) >= CURRENT_DATE - INTERVAL '30 days' THEN 0.9
    WHEN MAX(data_consulta) >= CURRENT_DATE - INTERVAL '90 days' THEN 0.7
    ELSE 0.5
  END INTO v_fator_recencia
    FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  -- ── Premium: APENAS boost de visibilidade, NUNCA anula penalidades ──
  SELECT COALESCE(mp.ativo, false)
    INTO v_is_premium
    FROM medico_premium mp WHERE mp.medico_id = p_medico_id;

  IF v_is_premium THEN
    v_fator_premium := 1.05; -- Apenas 5% de boost visual, NÃO afeta penalidades
  END IF;

  -- ── Detecção de anomalia: burst de avaliações ──
  SELECT COUNT(*) INTO v_aval_recentes_5
    FROM avaliacoes_medicas
   WHERE medico_id = p_medico_id
     AND nota = 5
     AND created_at >= NOW() - INTERVAL '7 days';

  IF v_aval_recentes_5 >= 5 THEN
    v_penalidade_anomalia := 0.15;
    INSERT INTO medico_anomalias (medico_id, tipo_anomalia, descricao, severidade, score_confianca, dados_evidencia)
    VALUES (p_medico_id, 'burst_avaliacoes_positivas',
            v_aval_recentes_5 || ' avaliações nota 5 em 7 dias — possível manipulação',
            'atencao', 0.7,
            jsonb_build_object('count_5stars_7d', v_aval_recentes_5))
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Penalidade de compliance (IA) — Premium NUNCA anula isso ──
  SELECT nivel_risco INTO v_nivel_risco
    FROM medico_score_compliance WHERE medico_id = p_medico_id;

  v_penalidade_compliance := CASE v_nivel_risco
    WHEN 'critico' THEN 0.20
    WHEN 'alto'    THEN 0.10
    WHEN 'medio'   THEN 0.05
    ELSE 0
  END;

  -- ── Bônus novato ──
  SELECT created_at INTO v_data_cadastro FROM medicos WHERE id = p_medico_id;
  IF v_data_cadastro IS NOT NULL THEN
    v_meses_ativo := EXTRACT(EPOCH FROM (NOW() - v_data_cadastro)) / (86400 * 30);
    IF v_meses_ativo < 3 THEN
      v_bonus_novato := 0.10 * (1 - v_meses_ativo / 3);
    END IF;
  END IF;

  -- ── Score final: Premium boost é INDEPENDENTE das penalidades ──
  -- Penalidades são aplicadas ANTES do boost premium e NÃO são anuladas por ele
  v_score_final := v_bayesian
    * (1 - v_penalidade_anomalia)
    * (1 - v_penalidade_compliance)
    * (1 + v_bonus_novato)
    * v_fator_recencia;

  -- Premium boost é multiplicativo MAS limitado: não pode recuperar mais de 5% do que as penalidades tiraram
  v_score_final := v_score_final * v_fator_premium;

  v_protecao := jsonb_build_object(
    'bayesian_C', v_C,
    'media_global', v_media_global,
    'media_raw', v_media_raw,
    'total_avaliacoes', v_total_aval,
    'burst_5stars_7d', v_aval_recentes_5,
    'penalidade_anomalia', v_penalidade_anomalia,
    'penalidade_compliance', v_penalidade_compliance,
    'nivel_risco_compliance', COALESCE(v_nivel_risco, 'nenhum'),
    'bonus_novato', v_bonus_novato,
    'meses_ativo', COALESCE(v_meses_ativo, 0),
    'fator_recencia', v_fator_recencia,
    'fator_premium', v_fator_premium,
    'premium_nao_anula_penalidades', true,
    'ranking_congelado', false,
    'calculated_at', NOW()
  );

  -- ── Upsert ranking ──
  INSERT INTO medico_ranking (
    medico_id, avaliacao_media, avaliacao_bayesiana, total_avaliacoes,
    total_consultas, fator_recencia, fator_premium,
    penalidade_anomalia, penalidade_compliance, bonus_novato,
    ranking_score, protecao_detalhes, updated_at
  ) VALUES (
    p_medico_id, v_media_raw, v_bayesian, v_total_aval,
    v_total_consultas, v_fator_recencia, v_fator_premium,
    v_penalidade_anomalia, v_penalidade_compliance, v_bonus_novato,
    v_score_final, v_protecao, NOW()
  )
  ON CONFLICT (medico_id) DO UPDATE SET
    avaliacao_media = EXCLUDED.avaliacao_media,
    avaliacao_bayesiana = EXCLUDED.avaliacao_bayesiana,
    total_avaliacoes = EXCLUDED.total_avaliacoes,
    total_consultas = EXCLUDED.total_consultas,
    fator_recencia = EXCLUDED.fator_recencia,
    fator_premium = EXCLUDED.fator_premium,
    penalidade_anomalia = EXCLUDED.penalidade_anomalia,
    penalidade_compliance = EXCLUDED.penalidade_compliance,
    bonus_novato = EXCLUDED.bonus_novato,
    ranking_score = EXCLUDED.ranking_score,
    protecao_detalhes = EXCLUDED.protecao_detalhes,
    updated_at = NOW();

  -- ── Audit log ──
  INSERT INTO ranking_audit_log (medico_id, score_anterior, score_novo, motivo, detalhes)
  VALUES (p_medico_id, COALESCE(v_score_anterior, 0), v_score_final, 'recalculo_periodico', v_protecao);

  -- ── Recalcular posições ──
  WITH ranked AS (
    SELECT medico_id, ROW_NUMBER() OVER (ORDER BY ranking_score DESC) AS pos
      FROM medico_ranking
  )
  UPDATE medico_ranking mr SET posicao = r.pos
    FROM ranked r WHERE mr.medico_id = r.medico_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 4. Função auxiliar: aplicar restrição (chamada pelo frontend)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.aplicar_restricao_medico(
  p_medico_id uuid,
  p_tipo text,
  p_ativo boolean,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO medico_restricoes (medico_id, aplicado_por, motivo)
  VALUES (p_medico_id, auth.uid(), p_motivo)
  ON CONFLICT (medico_id) DO NOTHING;

  CASE p_tipo
    WHEN 'ranking_congelado' THEN
      UPDATE medico_restricoes SET ranking_congelado = p_ativo, motivo = COALESCE(p_motivo, motivo), aplicado_por = auth.uid(), aplicado_em = now(), updated_at = now() WHERE medico_id = p_medico_id;
    WHEN 'impulsionamento_pausado' THEN
      UPDATE medico_restricoes SET impulsionamento_pausado = p_ativo, motivo = COALESCE(p_motivo, motivo), aplicado_por = auth.uid(), aplicado_em = now(), updated_at = now() WHERE medico_id = p_medico_id;
    WHEN 'beneficios_bloqueados' THEN
      UPDATE medico_restricoes SET beneficios_bloqueados = p_ativo, motivo = COALESCE(p_motivo, motivo), aplicado_por = auth.uid(), aplicado_em = now(), updated_at = now() WHERE medico_id = p_medico_id;
    WHEN 'em_acompanhamento' THEN
      UPDATE medico_restricoes SET em_acompanhamento = p_ativo, motivo = COALESCE(p_motivo, motivo), aplicado_por = auth.uid(), aplicado_em = now(), updated_at = now() WHERE medico_id = p_medico_id;
    WHEN 'selo_removido' THEN
      UPDATE medico_restricoes SET selo_removido = p_ativo, motivo = COALESCE(p_motivo, motivo), aplicado_por = auth.uid(), aplicado_em = now(), updated_at = now() WHERE medico_id = p_medico_id;
    ELSE
      RAISE EXCEPTION 'Tipo de restrição inválido: %', p_tipo;
  END CASE;
END;
$$;
