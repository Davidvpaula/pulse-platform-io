
-- 1. Tabela Premium do médico
CREATE TABLE public.medico_premium (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE UNIQUE,
  ativo boolean NOT NULL DEFAULT false,
  tipo text NOT NULL DEFAULT 'pago' CHECK (tipo IN ('pago','conquistado')),
  inicio timestamptz,
  fim timestamptz,
  auto_renovar boolean NOT NULL DEFAULT false,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_premium ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_le_proprio_premium"
  ON public.medico_premium FOR SELECT TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "admin_gerencia_premium"
  ON public.medico_premium FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "publico_ve_premium_ativo"
  ON public.medico_premium FOR SELECT TO anon
  USING (ativo = true);

-- 2. Campanhas de impulsionamento (CPC)
CREATE TABLE public.impulsionamento_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  orcamento_centavos integer NOT NULL DEFAULT 0,
  gasto_centavos integer NOT NULL DEFAULT 0,
  cpc_centavos integer NOT NULL DEFAULT 50,
  cliques integer NOT NULL DEFAULT 0,
  impressoes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','encerrada','cancelada')),
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz,
  especialidade_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impulsionamento_campanhas ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_impulsionamento_medico ON public.impulsionamento_campanhas(medico_id);
CREATE INDEX idx_impulsionamento_status ON public.impulsionamento_campanhas(status);

CREATE POLICY "medico_le_proprias_campanhas"
  ON public.impulsionamento_campanhas FOR SELECT TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "medico_insere_campanhas"
  ON public.impulsionamento_campanhas FOR INSERT TO authenticated
  WITH CHECK (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "medico_atualiza_campanhas"
  ON public.impulsionamento_campanhas FOR UPDATE TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "admin_gerencia_campanhas"
  ON public.impulsionamento_campanhas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Log de cliques
CREATE TABLE public.impulsionamento_cliques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.impulsionamento_campanhas(id) ON DELETE CASCADE,
  paciente_id uuid,
  origem text DEFAULT 'busca',
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.impulsionamento_cliques ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cliques_campanha ON public.impulsionamento_cliques(campanha_id);

CREATE POLICY "admin_le_cliques"
  ON public.impulsionamento_cliques FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "medico_le_proprios_cliques"
  ON public.impulsionamento_cliques FOR SELECT TO authenticated
  USING (
    campanha_id IN (
      SELECT ic.id FROM public.impulsionamento_campanhas ic
      WHERE ic.medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    )
  );

-- Inserção de cliques é público (via busca)
CREATE POLICY "insere_clique"
  ON public.impulsionamento_cliques FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. Função para registrar clique e debitar orçamento
CREATE OR REPLACE FUNCTION public.registrar_clique_impulsionamento(
  p_campanha_id uuid,
  p_paciente_id uuid DEFAULT NULL,
  p_origem text DEFAULT 'busca',
  p_ip_hash text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpc integer;
  v_orcamento integer;
  v_gasto integer;
BEGIN
  SELECT cpc_centavos, orcamento_centavos, gasto_centavos
    INTO v_cpc, v_orcamento, v_gasto
    FROM public.impulsionamento_campanhas
    WHERE id = p_campanha_id AND status = 'ativa'
    FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Verificar orçamento
  IF (v_gasto + v_cpc) > v_orcamento THEN
    UPDATE public.impulsionamento_campanhas
      SET status = 'encerrada', updated_at = now()
      WHERE id = p_campanha_id;
    RETURN;
  END IF;

  -- Registrar clique
  INSERT INTO public.impulsionamento_cliques (campanha_id, paciente_id, origem, ip_hash)
    VALUES (p_campanha_id, p_paciente_id, p_origem, p_ip_hash);

  -- Atualizar campanha
  UPDATE public.impulsionamento_campanhas
    SET cliques = cliques + 1,
        gasto_centavos = gasto_centavos + v_cpc,
        impressoes = impressoes + 1,
        updated_at = now()
    WHERE id = p_campanha_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_clique_impulsionamento FROM anon;

-- 5. Atualizar recalcular_ranking_medico para considerar premium ativo
CREATE OR REPLACE FUNCTION public.recalcular_ranking_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric; v_total_av integer; v_total_at integer; v_total_ag integer;
  v_no_show integer; v_last_activity timestamptz; v_recencia numeric;
  v_premium numeric; v_conv numeric; v_ns_rate numeric; v_score numeric;
  v_cfg record; v_dias integer; v_is_premium boolean;
BEGIN
  SELECT * INTO v_cfg FROM public.ranking_config LIMIT 1;

  SELECT COALESCE(AVG(nota), 0), COUNT(*)
    INTO v_avg, v_total_av
    FROM public.avaliacoes_medicas WHERE medico_id = p_medico_id;

  SELECT COUNT(*) INTO v_total_at
    FROM public.consultas WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT COUNT(*) INTO v_total_ag
    FROM public.consultas WHERE medico_id = p_medico_id
    AND status IN ('agendada','confirmada','em_andamento','concluida','no_show','aguardando_pagamento');

  SELECT COUNT(*) INTO v_no_show
    FROM public.consultas WHERE medico_id = p_medico_id AND status = 'no_show';

  v_conv := CASE WHEN v_total_ag > 0 THEN v_total_at::numeric / v_total_ag ELSE 0 END;
  v_ns_rate := CASE WHEN v_total_ag > 0 THEN v_no_show::numeric / v_total_ag ELSE 0 END;

  SELECT MAX(COALESCE(c.updated_at, c.created_at))
    INTO v_last_activity
    FROM public.consultas c WHERE c.medico_id = p_medico_id AND c.status = 'concluida';

  v_dias := EXTRACT(DAY FROM (now() - COALESCE(v_last_activity, now() - interval '365 days')));
  IF v_dias <= COALESCE(v_cfg.recencia_dias_ativo, 30) THEN v_recencia := 1.0;
  ELSIF v_dias <= COALESCE(v_cfg.recencia_dias_penalidade, 70) THEN v_recencia := 0.8;
  ELSE v_recencia := 0.5; END IF;

  -- Premium: 1.2 se ativo, 1.0 caso contrário
  SELECT COALESCE(mp.ativo, false) INTO v_is_premium
    FROM public.medico_premium mp WHERE mp.medico_id = p_medico_id;
  v_premium := CASE WHEN v_is_premium THEN 1.2 ELSE 1.0 END;

  v_score := (v_avg * COALESCE(v_cfg.peso_avaliacao, 0.35))
           + (log(v_total_at + 1) * COALESCE(v_cfg.peso_atendimentos, 0.20))
           + (v_conv * COALESCE(v_cfg.peso_conversao, 0.15))
           + ((1 - v_ns_rate) * COALESCE(v_cfg.peso_no_show, 0.10))
           + (v_recencia * COALESCE(v_cfg.peso_recencia, 0.10))
           + (v_premium * COALESCE(v_cfg.peso_premium, 0.10));

  INSERT INTO public.medico_ranking (medico_id, avaliacao_media, total_avaliacoes,
    total_atendimentos, total_agendamentos, taxa_conversao, taxa_no_show,
    fator_recencia, fator_premium, ranking_score, last_activity_at, updated_at)
  VALUES (p_medico_id, v_avg, v_total_av, v_total_at, v_total_ag,
    v_conv, v_ns_rate, v_recencia, v_premium, v_score, v_last_activity, now())
  ON CONFLICT (medico_id) DO UPDATE SET
    avaliacao_media = EXCLUDED.avaliacao_media,
    total_avaliacoes = EXCLUDED.total_avaliacoes,
    total_atendimentos = EXCLUDED.total_atendimentos,
    total_agendamentos = EXCLUDED.total_agendamentos,
    taxa_conversao = EXCLUDED.taxa_conversao,
    taxa_no_show = EXCLUDED.taxa_no_show,
    fator_recencia = EXCLUDED.fator_recencia,
    fator_premium = EXCLUDED.fator_premium,
    ranking_score = EXCLUDED.ranking_score,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = now();
END;
$$;
