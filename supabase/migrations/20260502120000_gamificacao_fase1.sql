-- ============================================================
-- FASE 1 — Gamificação: Avaliações + Ranking + Config Admin
-- ============================================================

-- 1. Tabela de configuração de ranking (admin)
CREATE TABLE IF NOT EXISTS public.ranking_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peso_avaliacao numeric NOT NULL DEFAULT 0.35,
  peso_atendimentos numeric NOT NULL DEFAULT 0.20,
  peso_conversao numeric NOT NULL DEFAULT 0.15,
  peso_no_show numeric NOT NULL DEFAULT 0.10,
  peso_recencia numeric NOT NULL DEFAULT 0.10,
  peso_premium numeric NOT NULL DEFAULT 0.10,
  min_avaliacoes_exibir integer NOT NULL DEFAULT 5,
  recencia_dias_ativo integer NOT NULL DEFAULT 30,
  recencia_dias_penalidade integer NOT NULL DEFAULT 70,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.ranking_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_config_admin_select" ON public.ranking_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ranking_config_admin_all" ON public.ranking_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ranking_config (id) VALUES (gen_random_uuid());

-- 2. Tabela de avaliações médicas
CREATE TABLE IF NOT EXISTS public.avaliacoes_medicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  nota smallint NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  avaliacao_publica boolean NOT NULL DEFAULT false,
  exibir_no_perfil boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consulta_id)
);

ALTER TABLE public.avaliacoes_medicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avaliacoes_paciente_insert" ON public.avaliacoes_medicas
  FOR INSERT TO authenticated
  WITH CHECK (
    paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid())
  );

CREATE POLICY "avaliacoes_paciente_select" ON public.avaliacoes_medicas
  FOR SELECT TO authenticated
  USING (
    paciente_id IN (SELECT id FROM public.pacientes WHERE user_id = auth.uid())
  );

CREATE POLICY "avaliacoes_medico_select" ON public.avaliacoes_medicas
  FOR SELECT TO authenticated
  USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

CREATE POLICY "avaliacoes_medico_update_exibir" ON public.avaliacoes_medicas
  FOR UPDATE TO authenticated
  USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

CREATE POLICY "avaliacoes_admin_select" ON public.avaliacoes_medicas
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "avaliacoes_publicas_select" ON public.avaliacoes_medicas
  FOR SELECT TO anon
  USING (avaliacao_publica = true AND exibir_no_perfil = true);

-- 3. Trigger: só permite avaliação se consulta concluída
CREATE OR REPLACE FUNCTION public.validar_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_paciente_id uuid;
  v_medico_id uuid;
BEGIN
  SELECT status, paciente_id, medico_id
  INTO v_status, v_paciente_id, v_medico_id
  FROM public.consultas WHERE id = NEW.consulta_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;
  IF v_status != 'concluida' THEN
    RAISE EXCEPTION 'Só é possível avaliar consultas concluídas';
  END IF;
  IF v_paciente_id != NEW.paciente_id THEN
    RAISE EXCEPTION 'Esta consulta não pertence a este paciente';
  END IF;
  IF v_medico_id != NEW.medico_id THEN
    RAISE EXCEPTION 'Médico informado não corresponde à consulta';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_avaliacao
  BEFORE INSERT ON public.avaliacoes_medicas
  FOR EACH ROW EXECUTE FUNCTION public.validar_avaliacao();

-- 4. Tabela de ranking materializado
CREATE TABLE IF NOT EXISTS public.medico_ranking (
  medico_id uuid PRIMARY KEY REFERENCES public.medicos(id) ON DELETE CASCADE,
  avaliacao_media numeric NOT NULL DEFAULT 0,
  total_avaliacoes integer NOT NULL DEFAULT 0,
  total_atendimentos integer NOT NULL DEFAULT 0,
  total_agendamentos integer NOT NULL DEFAULT 0,
  taxa_conversao numeric NOT NULL DEFAULT 0,
  taxa_no_show numeric NOT NULL DEFAULT 0,
  fator_recencia numeric NOT NULL DEFAULT 1.0,
  fator_premium numeric NOT NULL DEFAULT 1.0,
  ranking_score numeric NOT NULL DEFAULT 0,
  posicao integer,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_ranking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_medico_select" ON public.medico_ranking
  FOR SELECT TO authenticated
  USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

CREATE POLICY "ranking_admin_select" ON public.medico_ranking
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "ranking_publico_select" ON public.medico_ranking
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "ranking_auth_publico_select" ON public.medico_ranking
  FOR SELECT TO authenticated
  USING (true);

-- 5. Função para recalcular ranking de um médico
CREATE OR REPLACE FUNCTION public.recalcular_ranking_medico(p_medico_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
  v_total_av integer;
  v_total_at integer;
  v_total_ag integer;
  v_no_show integer;
  v_last_activity timestamptz;
  v_recencia numeric;
  v_premium numeric;
  v_conv numeric;
  v_ns_rate numeric;
  v_score numeric;
  v_cfg record;
  v_dias integer;
BEGIN
  SELECT * INTO v_cfg FROM public.ranking_config LIMIT 1;

  SELECT COALESCE(AVG(nota), 0), COUNT(*)
  INTO v_avg, v_total_av
  FROM public.avaliacoes_medicas WHERE medico_id = p_medico_id;

  SELECT COUNT(*) INTO v_total_at
  FROM public.consultas
  WHERE medico_id = p_medico_id AND status = 'concluida';

  SELECT COUNT(*) INTO v_total_ag
  FROM public.consultas
  WHERE medico_id = p_medico_id AND status IN ('agendada','confirmada','em_andamento','concluida','no_show','aguardando_pagamento');

  SELECT COUNT(*) INTO v_no_show
  FROM public.consultas
  WHERE medico_id = p_medico_id AND status = 'no_show';

  v_conv := CASE WHEN v_total_ag > 0 THEN v_total_at::numeric / v_total_ag ELSE 0 END;
  v_ns_rate := CASE WHEN v_total_ag > 0 THEN v_no_show::numeric / v_total_ag ELSE 0 END;

  SELECT MAX(COALESCE(c.updated_at, c.created_at)) INTO v_last_activity
  FROM public.consultas c
  WHERE c.medico_id = p_medico_id AND c.status = 'concluida';

  v_dias := EXTRACT(DAY FROM (now() - COALESCE(v_last_activity, now() - interval '365 days')));
  IF v_dias <= COALESCE(v_cfg.recencia_dias_ativo, 30) THEN
    v_recencia := 1.0;
  ELSIF v_dias <= COALESCE(v_cfg.recencia_dias_penalidade, 70) THEN
    v_recencia := 0.8;
  ELSE
    v_recencia := 0.5;
  END IF;

  v_premium := 1.0;

  v_score := (v_avg * COALESCE(v_cfg.peso_avaliacao, 0.35))
           + (log(v_total_at + 1) * COALESCE(v_cfg.peso_atendimentos, 0.20))
           + (v_conv * COALESCE(v_cfg.peso_conversao, 0.15))
           + ((1 - v_ns_rate) * COALESCE(v_cfg.peso_no_show, 0.10))
           + (v_recencia * COALESCE(v_cfg.peso_recencia, 0.10))
           + (v_premium * COALESCE(v_cfg.peso_premium, 0.10));

  INSERT INTO public.medico_ranking (
    medico_id, avaliacao_media, total_avaliacoes, total_atendimentos,
    total_agendamentos, taxa_conversao, taxa_no_show, fator_recencia,
    fator_premium, ranking_score, last_activity_at, updated_at
  ) VALUES (
    p_medico_id, v_avg, v_total_av, v_total_at,
    v_total_ag, v_conv, v_ns_rate, v_recencia,
    v_premium, v_score, v_last_activity, now()
  )
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

-- 6. Recalcular todos e atualizar posições
CREATE OR REPLACE FUNCTION public.recalcular_ranking_todos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.medicos WHERE status = 'aprovado'
  LOOP
    PERFORM public.recalcular_ranking_medico(r.id);
  END LOOP;

  WITH ranked AS (
    SELECT medico_id, ROW_NUMBER() OVER (ORDER BY ranking_score DESC) as pos
    FROM public.medico_ranking
  )
  UPDATE public.medico_ranking mr
  SET posicao = ranked.pos
  FROM ranked
  WHERE mr.medico_id = ranked.medico_id;
END;
$$;

-- 7. Trigger: recalcular ranking após avaliação
CREATE OR REPLACE FUNCTION public.after_avaliacao_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalcular_ranking_medico(NEW.medico_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_avaliacao_recalc
  AFTER INSERT ON public.avaliacoes_medicas
  FOR EACH ROW EXECUTE FUNCTION public.after_avaliacao_recalc();

-- 8. Permissões no catálogo
INSERT INTO public.permissions_catalog (key, label, module, description)
VALUES
  ('gamificacao.ver', 'Ver gamificação', 'gamificacao', 'Ver painel de gamificação e ranking'),
  ('gamificacao.configurar', 'Configurar gamificação', 'gamificacao', 'Alterar pesos do ranking e regras')
ON CONFLICT (key) DO NOTHING;
