
-- ============================================================
-- Função principal: calcula os 4 sub-scores de um médico
-- a partir de dados reais (consultas, avaliações, streaks, badges)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_score_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_consultas      int;
  v_concluidas           int;
  v_canceladas           int;
  v_no_show              int;
  v_taxa_conclusao       numeric;
  v_taxa_no_show         numeric;
  v_dias_desde_ultima    int;
  v_fator_recencia       numeric;

  v_media_nota           numeric;
  v_total_avaliacoes     int;
  v_avaliacoes_publicas  int;
  v_pct_publicas         numeric;

  v_pacientes_unicos     int;
  v_pacientes_retorno    int;
  v_taxa_retorno         numeric;
  v_taxa_conversao       numeric;
  v_agendadas            int;

  v_total_badges         int;
  v_melhor_streak        int;
  v_meses_ativo          int;
  v_tem_foto             boolean;
  v_tem_especialidade    boolean;

  v_score_op             numeric;
  v_score_cl             numeric;
  v_score_co             numeric;
  v_score_re             numeric;
  v_score_final          numeric;

  v_peso_op              numeric;
  v_peso_cl              numeric;
  v_peso_co              numeric;
  v_peso_re              numeric;

  v_pontos               numeric;
  v_nivel                int;
  v_nivel_nome           text;
BEGIN
  -- ── Pesos da config ──
  SELECT
    COALESCE(peso_score_operacional, 0.30),
    COALESCE(peso_score_clinico, 0.30),
    COALESCE(peso_score_comercial, 0.20),
    COALESCE(peso_score_reputacional, 0.20)
  INTO v_peso_op, v_peso_cl, v_peso_co, v_peso_re
  FROM ranking_config LIMIT 1;

  -- fallback
  IF v_peso_op IS NULL THEN
    v_peso_op := 0.30; v_peso_cl := 0.30;
    v_peso_co := 0.20; v_peso_re := 0.20;
  END IF;

  -- ══════════════════════════════════════════════
  -- 1) SCORE OPERACIONAL (0-100)
  --    - Taxa de conclusão (40%)
  --    - Taxa de no-show invertida (25%)
  --    - Volume de atendimentos (20%)
  --    - Recência de atividade (15%)
  -- ══════════════════════════════════════════════
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'concluida'),
    count(*) FILTER (WHERE status = 'cancelada'),
    count(*) FILTER (WHERE status = 'no_show')
  INTO v_total_consultas, v_concluidas, v_canceladas, v_no_show
  FROM consultas WHERE medico_id = p_medico_id;

  v_taxa_conclusao := CASE WHEN v_total_consultas > 0
    THEN v_concluidas::numeric / v_total_consultas ELSE 0 END;

  v_taxa_no_show := CASE WHEN v_total_consultas > 0
    THEN v_no_show::numeric / v_total_consultas ELSE 0 END;

  SELECT COALESCE(
    EXTRACT(DAY FROM now() - max(inicio))::int, 999
  ) INTO v_dias_desde_ultima
  FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  v_fator_recencia := GREATEST(0, 1.0 - (v_dias_desde_ultima::numeric / 90.0));

  -- Volume normalizado: 100 consultas concluídas = score máximo
  v_score_op := (
    (LEAST(v_taxa_conclusao, 1.0) * 100 * 0.40) +
    ((1.0 - LEAST(v_taxa_no_show, 1.0)) * 100 * 0.25) +
    (LEAST(v_concluidas::numeric / 100.0, 1.0) * 100 * 0.20) +
    (v_fator_recencia * 100 * 0.15)
  );

  -- ══════════════════════════════════════════════
  -- 2) SCORE CLÍNICO (0-100)
  --    - Média de avaliação (50%)  [1-5 → 0-100]
  --    - Quantidade de avaliações (30%)
  --    - % avaliações públicas (20%)
  -- ══════════════════════════════════════════════
  SELECT
    COALESCE(avg(nota), 0),
    count(*),
    count(*) FILTER (WHERE avaliacao_publica = true)
  INTO v_media_nota, v_total_avaliacoes, v_avaliacoes_publicas
  FROM avaliacoes_medicas WHERE medico_id = p_medico_id;

  v_pct_publicas := CASE WHEN v_total_avaliacoes > 0
    THEN v_avaliacoes_publicas::numeric / v_total_avaliacoes ELSE 0 END;

  v_score_cl := (
    (LEAST(v_media_nota / 5.0, 1.0) * 100 * 0.50) +
    (LEAST(v_total_avaliacoes::numeric / 50.0, 1.0) * 100 * 0.30) +
    (v_pct_publicas * 100 * 0.20)
  );

  -- ══════════════════════════════════════════════
  -- 3) SCORE COMERCIAL (0-100)
  --    - Taxa de conversão agendada→concluída (35%)
  --    - Pacientes únicos (35%)
  --    - Taxa de retorno de pacientes (30%)
  -- ══════════════════════════════════════════════
  SELECT count(*) INTO v_agendadas
  FROM consultas WHERE medico_id = p_medico_id
    AND status IN ('agendada','confirmada','concluida','em_andamento');

  v_taxa_conversao := CASE WHEN v_agendadas > 0
    THEN v_concluidas::numeric / v_agendadas ELSE 0 END;

  SELECT count(DISTINCT paciente_id) INTO v_pacientes_unicos
  FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT count(*) INTO v_pacientes_retorno
  FROM (
    SELECT paciente_id FROM consultas
    WHERE medico_id = p_medico_id AND status = 'concluida'
    GROUP BY paciente_id HAVING count(*) > 1
  ) sub;

  v_taxa_retorno := CASE WHEN v_pacientes_unicos > 0
    THEN v_pacientes_retorno::numeric / v_pacientes_unicos ELSE 0 END;

  v_score_co := (
    (LEAST(v_taxa_conversao, 1.0) * 100 * 0.35) +
    (LEAST(v_pacientes_unicos::numeric / 80.0, 1.0) * 100 * 0.35) +
    (LEAST(v_taxa_retorno, 1.0) * 100 * 0.30)
  );

  -- ══════════════════════════════════════════════
  -- 4) SCORE REPUTACIONAL (0-100)
  --    - Badges conquistados (25%)
  --    - Melhor streak (25%)
  --    - Meses de atividade na plataforma (25%)
  --    - Completude de perfil (25%)
  -- ══════════════════════════════════════════════
  SELECT count(*) INTO v_total_badges
  FROM medico_badges WHERE medico_id = p_medico_id AND ativo = true;

  SELECT COALESCE(max(melhor_streak), 0) INTO v_melhor_streak
  FROM medico_streaks WHERE medico_id = p_medico_id;

  SELECT COALESCE(
    EXTRACT(MONTH FROM age(now(), min(created_at)))::int, 0
  ) INTO v_meses_ativo
  FROM consultas WHERE medico_id = p_medico_id;

  SELECT
    (foto_url IS NOT NULL AND foto_url <> ''),
    EXISTS (SELECT 1 FROM medico_especialidades WHERE medico_especialidades.medico_id = p_medico_id)
  INTO v_tem_foto, v_tem_especialidade
  FROM medicos WHERE id = p_medico_id;

  v_score_re := (
    (LEAST(v_total_badges::numeric / 10.0, 1.0) * 100 * 0.25) +
    (LEAST(v_melhor_streak::numeric / 30.0, 1.0) * 100 * 0.25) +
    (LEAST(v_meses_ativo::numeric / 12.0, 1.0) * 100 * 0.25) +
    (((CASE WHEN v_tem_foto THEN 0.5 ELSE 0 END) +
      (CASE WHEN v_tem_especialidade THEN 0.5 ELSE 0 END)) * 100 * 0.25)
  );

  -- ── Score final ponderado ──
  v_score_final := (
    v_score_op * v_peso_op +
    v_score_cl * v_peso_cl +
    v_score_co * v_peso_co +
    v_score_re * v_peso_re
  );

  -- ── Pontos acumulados (soma incremental) ──
  v_pontos := GREATEST(v_score_final, 0);

  -- ── Nível ──
  v_nivel := CASE
    WHEN v_pontos >= 1500 THEN 6
    WHEN v_pontos >= 1000 THEN 5
    WHEN v_pontos >= 600  THEN 4
    WHEN v_pontos >= 300  THEN 3
    WHEN v_pontos >= 100  THEN 2
    ELSE 1
  END;
  v_nivel_nome := CASE v_nivel
    WHEN 6 THEN 'Elite'
    WHEN 5 THEN 'Referência'
    WHEN 4 THEN 'Destaque'
    WHEN 3 THEN 'Engajado'
    WHEN 2 THEN 'Ativo'
    ELSE 'Iniciante'
  END;

  -- ── Upsert ──
  INSERT INTO medico_score_detalhado (
    medico_id, score_operacional, score_clinico, score_comercial, score_reputacional,
    score_final, detalhes_operacional, detalhes_clinico, detalhes_comercial,
    detalhes_reputacional, nivel, nivel_nome, total_pontos_acumulados, updated_at
  ) VALUES (
    p_medico_id,
    ROUND(v_score_op, 2), ROUND(v_score_cl, 2), ROUND(v_score_co, 2), ROUND(v_score_re, 2),
    ROUND(v_score_final, 2),
    jsonb_build_object(
      'total_consultas', v_total_consultas,
      'concluidas', v_concluidas,
      'canceladas', v_canceladas,
      'no_show', v_no_show,
      'taxa_conclusao', ROUND(v_taxa_conclusao * 100, 1),
      'taxa_no_show', ROUND(v_taxa_no_show * 100, 1),
      'dias_desde_ultima', v_dias_desde_ultima,
      'fator_recencia', ROUND(v_fator_recencia, 3)
    ),
    jsonb_build_object(
      'media_nota', ROUND(v_media_nota, 2),
      'total_avaliacoes', v_total_avaliacoes,
      'avaliacoes_publicas', v_avaliacoes_publicas,
      'pct_publicas', ROUND(v_pct_publicas * 100, 1)
    ),
    jsonb_build_object(
      'agendadas_validas', v_agendadas,
      'taxa_conversao', ROUND(v_taxa_conversao * 100, 1),
      'pacientes_unicos', v_pacientes_unicos,
      'pacientes_retorno', v_pacientes_retorno,
      'taxa_retorno', ROUND(v_taxa_retorno * 100, 1)
    ),
    jsonb_build_object(
      'total_badges', v_total_badges,
      'melhor_streak', v_melhor_streak,
      'meses_ativo', v_meses_ativo,
      'tem_foto', v_tem_foto,
      'tem_especialidade', v_tem_especialidade
    ),
    v_nivel, v_nivel_nome, ROUND(v_pontos, 2), now()
  )
  ON CONFLICT (medico_id) DO UPDATE SET
    score_operacional = EXCLUDED.score_operacional,
    score_clinico = EXCLUDED.score_clinico,
    score_comercial = EXCLUDED.score_comercial,
    score_reputacional = EXCLUDED.score_reputacional,
    score_final = EXCLUDED.score_final,
    detalhes_operacional = EXCLUDED.detalhes_operacional,
    detalhes_clinico = EXCLUDED.detalhes_clinico,
    detalhes_comercial = EXCLUDED.detalhes_comercial,
    detalhes_reputacional = EXCLUDED.detalhes_reputacional,
    nivel = EXCLUDED.nivel,
    nivel_nome = EXCLUDED.nivel_nome,
    total_pontos_acumulados = GREATEST(
      medico_score_detalhado.total_pontos_acumulados,
      EXCLUDED.total_pontos_acumulados
    ),
    updated_at = now();

  -- ── Audit log ──
  INSERT INTO ranking_audit_log (medico_id, evento, score_novo, detalhes)
  VALUES (
    p_medico_id,
    'score_recalculado',
    ROUND(v_score_final, 2),
    jsonb_build_object(
      'op', ROUND(v_score_op, 2),
      'cl', ROUND(v_score_cl, 2),
      'co', ROUND(v_score_co, 2),
      're', ROUND(v_score_re, 2)
    )
  );
END;
$$;

-- ============================================================
-- Recalcular scores de TODOS os médicos ativos
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalcular_scores_todos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM medicos WHERE ativo = true LOOP
    PERFORM calcular_score_medico(r.id);
  END LOOP;
END;
$$;

-- ============================================================
-- Trigger: recalcula score quando consulta muda de status
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_score_after_consulta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('concluida', 'cancelada', 'no_show') AND
     (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM calcular_score_medico(NEW.medico_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_score_after_consulta ON consultas;
CREATE TRIGGER trg_score_after_consulta
  AFTER UPDATE ON consultas
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_score_after_consulta();

-- ============================================================
-- Trigger: recalcula score quando nova avaliação é inserida
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_score_after_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM calcular_score_medico(NEW.medico_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_score_after_avaliacao ON avaliacoes_medicas;
CREATE TRIGGER trg_score_after_avaliacao
  AFTER INSERT ON avaliacoes_medicas
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_score_after_avaliacao();
