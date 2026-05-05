
-- ============================================================
-- Add protection columns to medico_ranking
-- ============================================================
ALTER TABLE public.medico_ranking
  ADD COLUMN IF NOT EXISTS avaliacao_bayesiana numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalidade_anomalia numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_novato numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalidade_compliance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protecao_detalhes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- Rewrite: ranking with anti-manipulation + fairness
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_ranking_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg record;
  -- Raw metrics
  v_avg numeric;
  v_total_av integer;
  v_total_at integer;
  v_total_ag integer;
  v_no_show integer;
  v_last_activity timestamptz;
  v_dias integer;
  -- Derived
  v_conv numeric;
  v_ns_rate numeric;
  v_recencia numeric;
  v_premium numeric;
  -- Anti-manipulation
  v_bayesian_avg numeric;
  v_platform_avg numeric;
  v_platform_count integer;
  v_bayesian_m numeric := 10; -- minimum reviews for full weight
  v_anomaly_penalty numeric := 0;
  v_recent_5star integer;
  v_recent_total integer;
  -- Fairness
  v_meses_ativo integer;
  v_novato_bonus numeric := 0;
  -- Compliance
  v_compliance_penalty numeric := 0;
  v_compliance_risk text;
  v_compliance_score numeric;
  -- Final
  v_score_anterior numeric;
  v_score numeric;
BEGIN
  -- Config
  SELECT * INTO v_cfg FROM ranking_config LIMIT 1;

  -- Previous score
  SELECT ranking_score INTO v_score_anterior
  FROM medico_ranking WHERE medico_id = p_medico_id;

  -- ═══════════════════════════════════════════
  -- 1. RAW METRICS
  -- ═══════════════════════════════════════════
  SELECT COALESCE(AVG(nota), 0), COUNT(*)
  INTO v_avg, v_total_av
  FROM avaliacoes_medicas WHERE medico_id = p_medico_id;

  SELECT COUNT(*) INTO v_total_at
  FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT COUNT(*) INTO v_total_ag
  FROM consultas WHERE medico_id = p_medico_id
    AND status IN ('agendada','confirmada','em_andamento','concluida','no_show','aguardando_pagamento');

  SELECT COUNT(*) INTO v_no_show
  FROM consultas WHERE medico_id = p_medico_id AND status = 'no_show';

  v_conv := CASE WHEN v_total_ag > 0 THEN v_total_at::numeric / v_total_ag ELSE 0 END;
  v_ns_rate := CASE WHEN v_total_ag > 0 THEN v_no_show::numeric / v_total_ag ELSE 0 END;

  -- Recency
  SELECT MAX(COALESCE(c.updated_at, c.created_at)) INTO v_last_activity
  FROM consultas c WHERE c.medico_id = p_medico_id AND c.status = 'concluida';

  v_dias := EXTRACT(DAY FROM (now() - COALESCE(v_last_activity, now() - interval '365 days')));

  IF v_dias <= COALESCE(v_cfg.recencia_dias_ativo, 30) THEN v_recencia := 1.0;
  ELSIF v_dias <= COALESCE(v_cfg.recencia_dias_penalidade, 70) THEN v_recencia := 0.8;
  ELSE v_recencia := 0.5;
  END IF;

  -- Premium factor
  v_premium := 1.0;
  IF EXISTS (SELECT 1 FROM medico_premium WHERE medico_id = p_medico_id AND ativo = true) THEN
    v_premium := COALESCE(v_cfg.premium_bonus_ranking, 1.2);
  END IF;

  -- ═══════════════════════════════════════════
  -- 2. BAYESIAN SMOOTHING (anti-manipulation)
  -- Blends individual avg with platform avg using sample size confidence
  -- Formula: B = (n * avg + m * C) / (n + m)
  -- where m = min reviews threshold, C = platform average
  -- ═══════════════════════════════════════════
  SELECT COALESCE(AVG(nota), 3.0), COALESCE(COUNT(*), 0)
  INTO v_platform_avg, v_platform_count
  FROM avaliacoes_medicas;

  IF v_platform_count = 0 THEN v_platform_avg := 3.0; END IF;

  v_bayesian_avg := (v_total_av * v_avg + v_bayesian_m * v_platform_avg) / (v_total_av + v_bayesian_m);

  -- ═══════════════════════════════════════════
  -- 3. ANOMALY DETECTION
  -- Detect suspicious rating patterns: burst of 5-star reviews
  -- ═══════════════════════════════════════════
  SELECT COUNT(*), COUNT(*) FILTER (WHERE nota = 5)
  INTO v_recent_total, v_recent_5star
  FROM avaliacoes_medicas
  WHERE medico_id = p_medico_id
    AND created_at >= now() - interval '7 days';

  -- Flag: ≥5 ratings in 7 days AND all are 5 stars
  IF v_recent_total >= 5 AND v_recent_5star = v_recent_total THEN
    v_anomaly_penalty := 0.15; -- 15% penalty

    -- Auto-register anomaly if not already detected this week
    IF NOT EXISTS (
      SELECT 1 FROM medico_anomalias
      WHERE medico_id = p_medico_id
        AND tipo_anomalia = 'avaliacoes_suspeitas_ranking'
        AND created_at >= now() - interval '7 days'
    ) THEN
      INSERT INTO medico_anomalias (medico_id, tipo_anomalia, descricao, severidade, score_confianca, dados_evidencia)
      VALUES (
        p_medico_id,
        'avaliacoes_suspeitas_ranking',
        format('%s avaliações 5★ consecutivas em 7 dias — penalidade de ranking aplicada', v_recent_total),
        'alerta',
        0.75,
        jsonb_build_object('total_7d', v_recent_total, '5_star_7d', v_recent_5star, 'penalidade', v_anomaly_penalty)
      );
    END IF;
  END IF;

  -- Additional check: single-patient burst (same patient, multiple reviews)
  DECLARE
    v_dup_patient integer;
  BEGIN
    SELECT COUNT(*) INTO v_dup_patient
    FROM (
      SELECT paciente_id, COUNT(*) as cnt
      FROM avaliacoes_medicas
      WHERE medico_id = p_medico_id
        AND created_at >= now() - interval '30 days'
      GROUP BY paciente_id
      HAVING COUNT(*) > 2
    ) sub;

    IF v_dup_patient > 0 THEN
      v_anomaly_penalty := GREATEST(v_anomaly_penalty, 0.10);
    END IF;
  END;

  -- ═══════════════════════════════════════════
  -- 4. TENURE FAIRNESS (new physician boost)
  -- Physicians < 3 months get graduated boost up to 10%
  -- ═══════════════════════════════════════════
  SELECT COALESCE(EXTRACT(MONTH FROM age(now(), MIN(created_at)))::int, 0)
  INTO v_meses_ativo
  FROM consultas WHERE medico_id = p_medico_id;

  IF v_meses_ativo < 3 THEN
    -- Graduated: 10% at month 0, 6.7% at month 1, 3.3% at month 2
    v_novato_bonus := 0.10 * (1.0 - v_meses_ativo::numeric / 3.0);
  END IF;

  -- ═══════════════════════════════════════════
  -- 5. COMPLIANCE PENALTY
  -- Pull from medico_score_compliance if available
  -- ═══════════════════════════════════════════
  SELECT score_total, nivel_risco
  INTO v_compliance_score, v_compliance_risk
  FROM medico_score_compliance
  WHERE medico_id = p_medico_id;

  IF v_compliance_risk IS NOT NULL THEN
    CASE v_compliance_risk
      WHEN 'critico' THEN v_compliance_penalty := 0.20;
      WHEN 'alto' THEN v_compliance_penalty := 0.10;
      WHEN 'medio' THEN v_compliance_penalty := 0.03;
      ELSE v_compliance_penalty := 0;
    END CASE;
  END IF;

  -- ═══════════════════════════════════════════
  -- 6. FINAL SCORE CALCULATION
  -- Uses Bayesian avg instead of raw avg
  -- Applies penalties and bonuses multiplicatively
  -- ═══════════════════════════════════════════
  v_score := (
    (v_bayesian_avg * COALESCE(v_cfg.peso_avaliacao, 0.35)) +
    (log(v_total_at + 1) * COALESCE(v_cfg.peso_atendimentos, 0.20)) +
    (v_conv * COALESCE(v_cfg.peso_conversao, 0.15)) +
    ((1 - v_ns_rate) * COALESCE(v_cfg.peso_no_show, 0.10)) +
    (v_recencia * COALESCE(v_cfg.peso_recencia, 0.10)) +
    (v_premium * COALESCE(v_cfg.peso_premium, 0.10))
  );

  -- Apply modifiers
  v_score := v_score * (1.0 + v_novato_bonus) * (1.0 - v_anomaly_penalty) * (1.0 - v_compliance_penalty);

  -- Clamp to 0-10
  v_score := GREATEST(0, LEAST(v_score, 10));

  -- ═══════════════════════════════════════════
  -- 7. UPSERT
  -- ═══════════════════════════════════════════
  INSERT INTO medico_ranking (
    medico_id, avaliacao_media, avaliacao_bayesiana, total_avaliacoes,
    total_atendimentos, total_agendamentos, taxa_conversao, taxa_no_show,
    fator_recencia, fator_premium, ranking_score,
    penalidade_anomalia, bonus_novato, penalidade_compliance,
    protecao_detalhes, last_activity_at, updated_at
  ) VALUES (
    p_medico_id, v_avg, ROUND(v_bayesian_avg, 3), v_total_av,
    v_total_at, v_total_ag, v_conv, v_ns_rate,
    v_recencia, v_premium, ROUND(v_score, 4),
    v_anomaly_penalty, v_novato_bonus, v_compliance_penalty,
    jsonb_build_object(
      'bayesian_m', v_bayesian_m,
      'platform_avg', ROUND(v_platform_avg, 3),
      'raw_avg', ROUND(v_avg, 3),
      'bayesian_avg', ROUND(v_bayesian_avg, 3),
      'anomaly_check', jsonb_build_object(
        'recent_7d_total', v_recent_total,
        'recent_7d_5star', v_recent_5star,
        'penalty_applied', v_anomaly_penalty
      ),
      'tenure', jsonb_build_object(
        'meses_ativo', v_meses_ativo,
        'bonus', v_novato_bonus
      ),
      'compliance', jsonb_build_object(
        'score', v_compliance_score,
        'risk', v_compliance_risk,
        'penalty', v_compliance_penalty
      ),
      'premium_factor', v_premium,
      'recencia_factor', v_recencia,
      'score_raw_pre_modifiers', ROUND(
        (v_bayesian_avg * COALESCE(v_cfg.peso_avaliacao, 0.35)) +
        (log(v_total_at + 1) * COALESCE(v_cfg.peso_atendimentos, 0.20)) +
        (v_conv * COALESCE(v_cfg.peso_conversao, 0.15)) +
        ((1 - v_ns_rate) * COALESCE(v_cfg.peso_no_show, 0.10)) +
        (v_recencia * COALESCE(v_cfg.peso_recencia, 0.10)) +
        (v_premium * COALESCE(v_cfg.peso_premium, 0.10)),
      4)
    ),
    v_last_activity, now()
  )
  ON CONFLICT (medico_id) DO UPDATE SET
    avaliacao_media = EXCLUDED.avaliacao_media,
    avaliacao_bayesiana = EXCLUDED.avaliacao_bayesiana,
    total_avaliacoes = EXCLUDED.total_avaliacoes,
    total_atendimentos = EXCLUDED.total_atendimentos,
    total_agendamentos = EXCLUDED.total_agendamentos,
    taxa_conversao = EXCLUDED.taxa_conversao,
    taxa_no_show = EXCLUDED.taxa_no_show,
    fator_recencia = EXCLUDED.fator_recencia,
    fator_premium = EXCLUDED.fator_premium,
    ranking_score = EXCLUDED.ranking_score,
    penalidade_anomalia = EXCLUDED.penalidade_anomalia,
    bonus_novato = EXCLUDED.bonus_novato,
    penalidade_compliance = EXCLUDED.penalidade_compliance,
    protecao_detalhes = EXCLUDED.protecao_detalhes,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = now();

  -- ═══════════════════════════════════════════
  -- 8. AUDIT LOG
  -- ═══════════════════════════════════════════
  INSERT INTO ranking_audit_log (medico_id, evento, score_anterior, score_novo, detalhes)
  VALUES (
    p_medico_id,
    'ranking_recalculado',
    v_score_anterior,
    ROUND(v_score, 4),
    jsonb_build_object(
      'bayesian_avg', ROUND(v_bayesian_avg, 3),
      'anomaly_penalty', v_anomaly_penalty,
      'novato_bonus', v_novato_bonus,
      'compliance_penalty', v_compliance_penalty,
      'premium', v_premium,
      'recencia', v_recencia
    )
  );
END;
$$;

-- ============================================================
-- Rewrite batch recalculation with position assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_ranking_todos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM medicos WHERE status = 'aprovado' LOOP
    PERFORM recalcular_ranking_medico(r.id);
  END LOOP;
  -- Assign positions
  WITH ranked AS (
    SELECT medico_id, ROW_NUMBER() OVER (ORDER BY ranking_score DESC) as pos
    FROM medico_ranking
  )
  UPDATE medico_ranking mr SET posicao = ranked.pos
  FROM ranked WHERE mr.medico_id = ranked.medico_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalcular_ranking_medico(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalcular_ranking_todos() FROM anon;
