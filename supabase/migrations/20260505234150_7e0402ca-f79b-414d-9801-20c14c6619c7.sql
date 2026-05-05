
-- ============================================================
-- Tipo de alerta IA
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.alerta_ia_tipo AS ENUM (
    'queda_pontualidade', 'aumento_reclamacoes', 'excesso_retrabalho',
    'correcoes_receita', 'crescimento_suspeito_avaliacoes', 'conversoes_incompativeis',
    'comportamento_fora_padrao', 'queda_atividade', 'risco_churn',
    'possivel_manipulacao', 'abuso_campanha', 'no_show_recorrente',
    'conflito_operacional', 'anomalia_generica'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alerta_ia_severidade AS ENUM ('info', 'atencao', 'alerta', 'critico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.alerta_ia_status AS ENUM ('novo', 'visto', 'em_acompanhamento', 'resolvido', 'ignorado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.anomalia_status AS ENUM ('detectada', 'investigando', 'confirmada', 'descartada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nivel_risco AS ENUM ('baixo', 'medio', 'alto', 'critico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 1) medico_score_operacional (interno, não público)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_score_operacional (
  medico_id uuid PRIMARY KEY REFERENCES public.medicos(id) ON DELETE CASCADE,
  score_pontualidade numeric NOT NULL DEFAULT 0,
  score_cancelamento numeric NOT NULL DEFAULT 0,
  score_no_show numeric NOT NULL DEFAULT 0,
  score_resposta numeric NOT NULL DEFAULT 0,
  score_uso_sistema numeric NOT NULL DEFAULT 0,
  score_documentacao numeric NOT NULL DEFAULT 0,
  score_total numeric NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_score_operacional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_score_op" ON public.medico_score_operacional
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all_score_op" ON public.medico_score_operacional
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2) medico_score_compliance
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_score_compliance (
  medico_id uuid PRIMARY KEY REFERENCES public.medicos(id) ON DELETE CASCADE,
  score_confianca numeric NOT NULL DEFAULT 100,
  score_padrao_comportamento numeric NOT NULL DEFAULT 100,
  score_avaliacoes_integridade numeric NOT NULL DEFAULT 100,
  score_campanhas_integridade numeric NOT NULL DEFAULT 100,
  score_total numeric NOT NULL DEFAULT 100,
  nivel_risco public.nivel_risco NOT NULL DEFAULT 'baixo',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_score_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_score_comp" ON public.medico_score_compliance
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_all_score_comp" ON public.medico_score_compliance
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3) medico_alertas_ia
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_alertas_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo public.alerta_ia_tipo NOT NULL,
  severidade public.alerta_ia_severidade NOT NULL DEFAULT 'info',
  titulo text NOT NULL,
  descricao text NOT NULL,
  justificativa text,
  dados_utilizados jsonb NOT NULL DEFAULT '{}'::jsonb,
  recomendacao_ia text,
  status public.alerta_ia_status NOT NULL DEFAULT 'novo',
  resolvido_por uuid REFERENCES auth.users(id),
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_alertas_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_alertas" ON public.medico_alertas_ia
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_alertas" ON public.medico_alertas_ia
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_alertas_ia_medico ON public.medico_alertas_ia(medico_id);
CREATE INDEX idx_alertas_ia_status ON public.medico_alertas_ia(status);
CREATE INDEX idx_alertas_ia_severidade ON public.medico_alertas_ia(severidade);

-- ============================================================
-- 4) medico_auditoria_ia (imutável)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_auditoria_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo_analise text NOT NULL,
  resultado text NOT NULL,
  dados_entrada jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados_saida jsonb NOT NULL DEFAULT '{}'::jsonb,
  modelo_ia text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  versao_prompt text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_auditoria_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_auditoria" ON public.medico_auditoria_ia
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_auditoria_ia_medico ON public.medico_auditoria_ia(medico_id);

-- ============================================================
-- 5) medico_anomalias (antifraude)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_anomalias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo_anomalia text NOT NULL,
  descricao text NOT NULL,
  severidade public.alerta_ia_severidade NOT NULL DEFAULT 'atencao',
  dados_evidencia jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_confianca numeric NOT NULL DEFAULT 0,
  status public.anomalia_status NOT NULL DEFAULT 'detectada',
  investigado_por uuid REFERENCES auth.users(id),
  investigado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_anomalias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_anomalias" ON public.medico_anomalias
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update_anomalias" ON public.medico_anomalias
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_anomalias_medico ON public.medico_anomalias(medico_id);
CREATE INDEX idx_anomalias_status ON public.medico_anomalias(status);

-- ============================================================
-- 6) medico_logs_confianca (trilha imutável)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medico_logs_confianca (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  evento text NOT NULL,
  score_antes numeric,
  score_depois numeric,
  motivo text,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_logs_confianca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_logs_confianca" ON public.medico_logs_confianca
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_logs_confianca_medico ON public.medico_logs_confianca(medico_id);

-- ============================================================
-- RPC: coletar métricas operacionais de um médico (dados reais)
-- ============================================================
CREATE OR REPLACE FUNCTION public.coletar_metricas_medico(p_medico_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_consultas int;
  v_concluidas int;
  v_canceladas int;
  v_no_show int;
  v_media_nota numeric;
  v_total_avaliacoes int;
  v_avaliacoes_negativas int;
  v_pacientes_unicos int;
  v_pacientes_retorno int;
  v_agendadas int;
  v_dias_desde_ultima int;
  v_meses_ativo int;
  v_total_badges int;
  v_melhor_streak int;
  v_campanhas_ativas int;
  v_gasto_campanhas int;
  v_cliques_campanhas int;
  v_avaliacoes_ultimos_30d int;
  v_avaliacoes_5_estrelas_30d int;
  v_canceladas_pelo_medico int;
BEGIN
  -- Consultas
  SELECT count(*),
    count(*) FILTER (WHERE status = 'concluida'),
    count(*) FILTER (WHERE status = 'cancelada'),
    count(*) FILTER (WHERE status = 'no_show')
  INTO v_total_consultas, v_concluidas, v_canceladas, v_no_show
  FROM consultas WHERE medico_id = p_medico_id;

  SELECT count(*) INTO v_agendadas
  FROM consultas WHERE medico_id = p_medico_id
    AND status IN ('agendada','confirmada','concluida','em_andamento');

  -- Avaliações
  SELECT COALESCE(avg(nota), 0), count(*),
    count(*) FILTER (WHERE nota <= 2)
  INTO v_media_nota, v_total_avaliacoes, v_avaliacoes_negativas
  FROM avaliacoes_medicas WHERE medico_id = p_medico_id;

  -- Avaliações últimos 30 dias
  SELECT count(*), count(*) FILTER (WHERE nota = 5)
  INTO v_avaliacoes_ultimos_30d, v_avaliacoes_5_estrelas_30d
  FROM avaliacoes_medicas
  WHERE medico_id = p_medico_id AND created_at >= now() - interval '30 days';

  -- Pacientes
  SELECT count(DISTINCT paciente_id) INTO v_pacientes_unicos
  FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT count(*) INTO v_pacientes_retorno
  FROM (
    SELECT paciente_id FROM consultas
    WHERE medico_id = p_medico_id AND status = 'concluida'
    GROUP BY paciente_id HAVING count(*) > 1
  ) sub;

  -- Recência
  SELECT COALESCE(EXTRACT(DAY FROM now() - max(inicio))::int, 999)
  INTO v_dias_desde_ultima
  FROM consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT COALESCE(EXTRACT(MONTH FROM age(now(), min(created_at)))::int, 0)
  INTO v_meses_ativo
  FROM consultas WHERE medico_id = p_medico_id;

  -- Badges/streaks
  SELECT count(*) INTO v_total_badges
  FROM medico_badges WHERE medico_id = p_medico_id AND ativo = true;

  SELECT COALESCE(max(melhor_streak), 0) INTO v_melhor_streak
  FROM medico_streaks WHERE medico_id = p_medico_id;

  -- Campanhas
  SELECT count(*), COALESCE(sum(gasto_centavos), 0), COALESCE(sum(cliques), 0)
  INTO v_campanhas_ativas, v_gasto_campanhas, v_cliques_campanhas
  FROM impulsionamento_campanhas WHERE medico_id = p_medico_id AND status = 'ativa';

  -- Canceladas pelo médico (sem paciente cancelando)
  v_canceladas_pelo_medico := v_canceladas; -- simplificação; refinável

  v_result := jsonb_build_object(
    'medico_id', p_medico_id,
    'total_consultas', v_total_consultas,
    'concluidas', v_concluidas,
    'canceladas', v_canceladas,
    'canceladas_pelo_medico', v_canceladas_pelo_medico,
    'no_show', v_no_show,
    'agendadas_validas', v_agendadas,
    'media_nota', round(v_media_nota, 2),
    'total_avaliacoes', v_total_avaliacoes,
    'avaliacoes_negativas', v_avaliacoes_negativas,
    'avaliacoes_ultimos_30d', v_avaliacoes_ultimos_30d,
    'avaliacoes_5_estrelas_30d', v_avaliacoes_5_estrelas_30d,
    'pacientes_unicos', v_pacientes_unicos,
    'pacientes_retorno', v_pacientes_retorno,
    'taxa_conclusao', CASE WHEN v_total_consultas > 0 THEN round(v_concluidas::numeric / v_total_consultas * 100, 1) ELSE 0 END,
    'taxa_no_show', CASE WHEN v_total_consultas > 0 THEN round(v_no_show::numeric / v_total_consultas * 100, 1) ELSE 0 END,
    'taxa_cancelamento', CASE WHEN v_total_consultas > 0 THEN round(v_canceladas::numeric / v_total_consultas * 100, 1) ELSE 0 END,
    'taxa_conversao', CASE WHEN v_agendadas > 0 THEN round(v_concluidas::numeric / v_agendadas * 100, 1) ELSE 0 END,
    'taxa_retorno', CASE WHEN v_pacientes_unicos > 0 THEN round(v_pacientes_retorno::numeric / v_pacientes_unicos * 100, 1) ELSE 0 END,
    'dias_desde_ultima', v_dias_desde_ultima,
    'meses_ativo', v_meses_ativo,
    'total_badges', v_total_badges,
    'melhor_streak', v_melhor_streak,
    'campanhas_ativas', v_campanhas_ativas,
    'gasto_campanhas_centavos', v_gasto_campanhas,
    'cliques_campanhas', v_cliques_campanhas,
    'collected_at', now()
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.coletar_metricas_medico(uuid) FROM anon;
