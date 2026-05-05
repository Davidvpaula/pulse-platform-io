
-- 1. Expand ranking_config with new sub-score weights and settings
ALTER TABLE public.ranking_config
  ADD COLUMN IF NOT EXISTS peso_score_operacional numeric NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS peso_score_clinico numeric NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS peso_score_comercial numeric NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS peso_score_reputacional numeric NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS badge_check_interval_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS creditos_taxa_conversao numeric NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS creditos_validade_dias integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS streak_bonus_multiplicador numeric NOT NULL DEFAULT 1.1,
  ADD COLUMN IF NOT EXISTS meta_bonus_pontos integer NOT NULL DEFAULT 50;

-- 2. medico_score_detalhado
CREATE TABLE public.medico_score_detalhado (
  medico_id uuid PRIMARY KEY REFERENCES public.medicos(id) ON DELETE CASCADE,
  score_operacional numeric NOT NULL DEFAULT 0,
  score_clinico numeric NOT NULL DEFAULT 0,
  score_comercial numeric NOT NULL DEFAULT 0,
  score_reputacional numeric NOT NULL DEFAULT 0,
  score_final numeric NOT NULL DEFAULT 0,
  detalhes_operacional jsonb DEFAULT '{}',
  detalhes_clinico jsonb DEFAULT '{}',
  detalhes_comercial jsonb DEFAULT '{}',
  detalhes_reputacional jsonb DEFAULT '{}',
  nivel integer NOT NULL DEFAULT 1,
  nivel_nome text NOT NULL DEFAULT 'Iniciante',
  total_pontos_acumulados numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_score_detalhado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprio score detalhado"
  ON public.medico_score_detalhado FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todos os scores"
  ON public.medico_score_detalhado FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role gerencia scores"
  ON public.medico_score_detalhado FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. medico_badges
CREATE TABLE public.medico_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  badge_nome text NOT NULL,
  badge_descricao text,
  badge_icone text DEFAULT 'award',
  conquistado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz,
  ativo boolean NOT NULL DEFAULT true,
  UNIQUE(medico_id, badge_key)
);

ALTER TABLE public.medico_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprios badges"
  ON public.medico_badges FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todos os badges"
  ON public.medico_badges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia badges"
  ON public.medico_badges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_medico_badges_medico ON public.medico_badges(medico_id);

-- 4. medico_streaks
CREATE TABLE public.medico_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'consulta_diaria', 'resposta_rapida'
  dias_consecutivos integer NOT NULL DEFAULT 0,
  melhor_streak integer NOT NULL DEFAULT 0,
  ultima_atividade date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(medico_id, tipo)
);

ALTER TABLE public.medico_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprios streaks"
  ON public.medico_streaks FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todos os streaks"
  ON public.medico_streaks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia streaks"
  ON public.medico_streaks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. medico_metas
CREATE TABLE public.medico_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL, -- 'consultas_mes', 'avaliacao_media', 'taxa_conversao', etc
  threshold numeric NOT NULL,
  periodo text NOT NULL DEFAULT 'mensal', -- 'semanal', 'mensal', 'trimestral'
  pontos_recompensa integer NOT NULL DEFAULT 50,
  badge_recompensa text, -- badge_key opcional
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos authenticated veem metas"
  ON public.medico_metas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gerencia metas"
  ON public.medico_metas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. medico_metas_progresso
CREATE TABLE public.medico_metas_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  meta_id uuid NOT NULL REFERENCES public.medico_metas(id) ON DELETE CASCADE,
  valor_atual numeric NOT NULL DEFAULT 0,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  periodo_referencia text NOT NULL, -- '2026-05', '2026-Q2', etc
  pontos_creditados boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(medico_id, meta_id, periodo_referencia)
);

ALTER TABLE public.medico_metas_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprio progresso"
  ON public.medico_metas_progresso FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todo progresso"
  ON public.medico_metas_progresso FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia progresso"
  ON public.medico_metas_progresso FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_metas_progresso_medico ON public.medico_metas_progresso(medico_id);

-- 7. premium_assinaturas
CREATE TABLE public.premium_assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  plano text NOT NULL, -- 'basico', 'profissional', 'enterprise'
  valor_centavos integer NOT NULL,
  moeda text NOT NULL DEFAULT 'brl',
  status text NOT NULL DEFAULT 'ativa', -- 'ativa', 'cancelada', 'pausada', 'inadimplente', 'expirada'
  stripe_subscription_id text,
  stripe_customer_id text,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim_ciclo_atual timestamptz,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  auto_renovar boolean NOT NULL DEFAULT true,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprias assinaturas"
  ON public.premium_assinaturas FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todas assinaturas"
  ON public.premium_assinaturas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia assinaturas"
  ON public.premium_assinaturas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_premium_assinaturas_medico ON public.premium_assinaturas(medico_id);
CREATE INDEX idx_premium_assinaturas_stripe ON public.premium_assinaturas(stripe_subscription_id);

-- 8. premium_creditos
CREATE TABLE public.premium_creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'conversao_pontos', 'bonus_meta', 'bonus_admin'
  pontos_convertidos numeric DEFAULT 0,
  creditos_centavos integer NOT NULL,
  creditos_restantes_centavos integer NOT NULL,
  taxa_conversao numeric NOT NULL DEFAULT 0.05,
  valido_ate timestamptz NOT NULL,
  utilizado boolean NOT NULL DEFAULT false,
  utilizado_em timestamptz,
  campanha_id uuid REFERENCES public.impulsionamento_campanhas(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_creditos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprios créditos"
  ON public.premium_creditos FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todos créditos"
  ON public.premium_creditos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia créditos"
  ON public.premium_creditos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_premium_creditos_medico ON public.premium_creditos(medico_id);

-- 9. ranking_audit_log (imutável — somente INSERT)
CREATE TABLE public.ranking_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  evento text NOT NULL, -- 'score_recalculado', 'badge_conquistado', 'badge_expirado', 'premium_ativado', 'premium_desativado', 'credito_convertido', 'meta_concluida', 'ranking_congelado'
  score_anterior numeric,
  score_novo numeric,
  posicao_anterior integer,
  posicao_nova integer,
  detalhes jsonb DEFAULT '{}',
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprio audit"
  ON public.ranking_audit_log FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todo audit"
  ON public.ranking_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Somente INSERT via service role / triggers
CREATE POLICY "Insert via sistema"
  ON public.ranking_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ranking_audit_medico ON public.ranking_audit_log(medico_id);
CREATE INDEX idx_ranking_audit_created ON public.ranking_audit_log(created_at DESC);

-- 10. campanha_metricas_diarias
CREATE TABLE public.campanha_metricas_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.impulsionamento_campanhas(id) ON DELETE CASCADE,
  data date NOT NULL,
  cliques integer NOT NULL DEFAULT 0,
  impressoes integer NOT NULL DEFAULT 0,
  conversoes integer NOT NULL DEFAULT 0,
  gasto_centavos integer NOT NULL DEFAULT 0,
  cpc_medio_centavos numeric DEFAULT 0,
  taxa_conversao numeric DEFAULT 0,
  UNIQUE(campanha_id, data)
);

ALTER TABLE public.campanha_metricas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê métricas próprias campanhas"
  ON public.campanha_metricas_diarias FOR SELECT
  TO authenticated
  USING (campanha_id IN (
    SELECT id FROM public.impulsionamento_campanhas
    WHERE medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  ));

CREATE POLICY "Admin vê todas métricas"
  ON public.campanha_metricas_diarias FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia métricas"
  ON public.campanha_metricas_diarias FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_campanha_metricas_campanha ON public.campanha_metricas_diarias(campanha_id);

-- 11. Tabela recomendacoes_ia (cache de recomendações)
CREATE TABLE public.recomendacoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'campanha', 'horario', 'perfil', 'investimento', 'alerta'
  titulo text NOT NULL,
  descricao text NOT NULL,
  prioridade text NOT NULL DEFAULT 'media', -- 'baixa', 'media', 'alta', 'urgente'
  dados jsonb DEFAULT '{}',
  lida boolean NOT NULL DEFAULT false,
  valida_ate timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recomendacoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê próprias recomendações"
  ON public.recomendacoes_ia FOR SELECT
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Médico marca como lida"
  ON public.recomendacoes_ia FOR UPDATE
  TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin vê todas recomendações"
  ON public.recomendacoes_ia FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia recomendações"
  ON public.recomendacoes_ia FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_recomendacoes_medico ON public.recomendacoes_ia(medico_id);

-- 12. Função para calcular nível baseado em pontos
CREATE OR REPLACE FUNCTION public.calcular_nivel_medico(p_total_pontos numeric)
RETURNS TABLE(nivel integer, nivel_nome text) AS $$
BEGIN
  IF p_total_pontos >= 1500 THEN
    RETURN QUERY SELECT 6, 'Elite'::text;
  ELSIF p_total_pontos >= 1000 THEN
    RETURN QUERY SELECT 5, 'Referência'::text;
  ELSIF p_total_pontos >= 600 THEN
    RETURN QUERY SELECT 4, 'Destaque'::text;
  ELSIF p_total_pontos >= 300 THEN
    RETURN QUERY SELECT 3, 'Engajado'::text;
  ELSIF p_total_pontos >= 100 THEN
    RETURN QUERY SELECT 2, 'Ativo'::text;
  ELSE
    RETURN QUERY SELECT 1, 'Iniciante'::text;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
