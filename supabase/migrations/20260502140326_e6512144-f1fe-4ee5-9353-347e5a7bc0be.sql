
-- 1) Tabela medico_saldo_crescimento
CREATE TABLE IF NOT EXISTS public.medico_saldo_crescimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'credito' CHECK (tipo IN ('credito','debito')),
  valor numeric NOT NULL DEFAULT 0,
  saldo_apos numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL DEFAULT '',
  referencia_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medico_saldo_crescimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medico_saldo_own_select" ON public.medico_saldo_crescimento
  FOR SELECT TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "medico_saldo_admin_select" ON public.medico_saldo_crescimento
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "medico_saldo_system_insert" ON public.medico_saldo_crescimento
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_saldo_medico ON public.medico_saldo_crescimento(medico_id, created_at DESC);

-- 2) Novos campos em ranking_config
ALTER TABLE public.ranking_config
  ADD COLUMN IF NOT EXISTS cpc_padrao_centavos integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS saldo_por_consulta numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS premium_min_atendimentos integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS premium_min_avaliacao numeric NOT NULL DEFAULT 4.0,
  ADD COLUMN IF NOT EXISTS premium_max_no_show numeric NOT NULL DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS premium_min_meses_ativo integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS premium_bonus_ranking numeric NOT NULL DEFAULT 1.2;

-- 3) Tabela de conversões de impulsionamento
CREATE TABLE IF NOT EXISTS public.impulsionamento_conversoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clique_id uuid REFERENCES public.impulsionamento_cliques(id),
  campanha_id uuid NOT NULL REFERENCES public.impulsionamento_campanhas(id),
  consulta_id uuid REFERENCES public.consultas(id),
  medico_id uuid NOT NULL REFERENCES public.medicos(id),
  paciente_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.impulsionamento_conversoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversoes_medico_select" ON public.impulsionamento_conversoes
  FOR SELECT TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "conversoes_admin_select" ON public.impulsionamento_conversoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "conversoes_system_insert" ON public.impulsionamento_conversoes
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4) Função: creditar saldo ao concluir consulta
CREATE OR REPLACE FUNCTION public.creditar_saldo_consulta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_atual numeric;
  v_credito numeric;
BEGIN
  IF NEW.status = 'concluida' AND (OLD.status IS DISTINCT FROM 'concluida') THEN
    SELECT COALESCE(saldo_por_consulta, 10) INTO v_credito FROM public.ranking_config LIMIT 1;
    
    SELECT COALESCE(saldo_apos, 0) INTO v_saldo_atual
      FROM public.medico_saldo_crescimento
      WHERE medico_id = NEW.medico_id
      ORDER BY created_at DESC LIMIT 1;
    
    INSERT INTO public.medico_saldo_crescimento (medico_id, tipo, valor, saldo_apos, motivo, referencia_id)
    VALUES (NEW.medico_id, 'credito', v_credito, COALESCE(v_saldo_atual, 0) + v_credito, 'Consulta concluída', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creditar_saldo_consulta ON public.consultas;
CREATE TRIGGER trg_creditar_saldo_consulta
  AFTER UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.creditar_saldo_consulta();

-- 5) Função: debitar saldo ao criar campanha
CREATE OR REPLACE FUNCTION public.debitar_saldo_campanha()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_atual numeric;
BEGIN
  SELECT COALESCE(saldo_apos, 0) INTO v_saldo_atual
    FROM public.medico_saldo_crescimento
    WHERE medico_id = NEW.medico_id
    ORDER BY created_at DESC LIMIT 1;
  
  -- Registra débito (saldo pode ficar negativo - sistema permite, mas UI deve alertar)
  INSERT INTO public.medico_saldo_crescimento (medico_id, tipo, valor, saldo_apos, motivo, referencia_id)
  VALUES (NEW.medico_id, 'debito', NEW.orcamento_centavos, COALESCE(v_saldo_atual, 0) - NEW.orcamento_centavos, 
          'Campanha: ' || NEW.titulo, NEW.id);
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debitar_saldo_campanha ON public.impulsionamento_campanhas;
CREATE TRIGGER trg_debitar_saldo_campanha
  AFTER INSERT ON public.impulsionamento_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.debitar_saldo_campanha();

-- 6) Função: verificar e conceder premium conquistado
CREATE OR REPLACE FUNCTION public.verificar_premium_conquistado(p_medico_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg record;
  v_atendimentos integer;
  v_avg numeric;
  v_no_show_rate numeric;
  v_total_ag integer;
  v_no_show integer;
  v_primeiro timestamptz;
  v_meses integer;
  v_qualifica boolean := true;
BEGIN
  SELECT * INTO v_cfg FROM public.ranking_config LIMIT 1;
  
  SELECT COUNT(*) INTO v_atendimentos
    FROM public.consultas WHERE medico_id = p_medico_id AND status = 'concluida';
  IF v_atendimentos < COALESCE(v_cfg.premium_min_atendimentos, 50) THEN v_qualifica := false; END IF;
  
  SELECT COALESCE(AVG(nota), 0) INTO v_avg
    FROM public.avaliacoes_medicas WHERE medico_id = p_medico_id;
  IF v_avg < COALESCE(v_cfg.premium_min_avaliacao, 4.0) THEN v_qualifica := false; END IF;
  
  SELECT COUNT(*) INTO v_total_ag
    FROM public.consultas WHERE medico_id = p_medico_id
    AND status IN ('agendada','confirmada','em_andamento','concluida','no_show','aguardando_pagamento');
  SELECT COUNT(*) INTO v_no_show
    FROM public.consultas WHERE medico_id = p_medico_id AND status = 'no_show';
  v_no_show_rate := CASE WHEN v_total_ag > 0 THEN v_no_show::numeric / v_total_ag ELSE 0 END;
  IF v_no_show_rate > COALESCE(v_cfg.premium_max_no_show, 0.1) THEN v_qualifica := false; END IF;
  
  SELECT MIN(created_at) INTO v_primeiro
    FROM public.consultas WHERE medico_id = p_medico_id AND status = 'concluida';
  v_meses := EXTRACT(MONTH FROM age(now(), COALESCE(v_primeiro, now())));
  IF v_meses < COALESCE(v_cfg.premium_min_meses_ativo, 3) THEN v_qualifica := false; END IF;
  
  IF v_qualifica THEN
    INSERT INTO public.medico_premium (medico_id, ativo, tipo, inicio, updated_at)
    VALUES (p_medico_id, true, 'conquistado', now(), now())
    ON CONFLICT (medico_id) DO UPDATE SET
      ativo = true,
      tipo = CASE WHEN public.medico_premium.tipo = 'pago' THEN 'pago' ELSE 'conquistado' END,
      updated_at = now()
    WHERE public.medico_premium.tipo != 'pago';
  END IF;
  
  RETURN v_qualifica;
END;
$$;

-- 7) Registrar conversão
CREATE OR REPLACE FUNCTION public.registrar_conversao_impulsionamento(
  p_campanha_id uuid,
  p_consulta_id uuid,
  p_medico_id uuid,
  p_paciente_id uuid DEFAULT NULL,
  p_clique_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.impulsionamento_conversoes (clique_id, campanha_id, consulta_id, medico_id, paciente_id)
  VALUES (p_clique_id, p_campanha_id, p_consulta_id, p_medico_id, p_paciente_id);
  
  -- Audit
  INSERT INTO public.audit_eventos_unificado (id, modulo, actor_id, acao, entidade_tipo, entidade_id, payload, risco, origem)
  VALUES (gen_random_uuid(), 'gamificacao', p_medico_id, 'conversao_impulsionamento', 'impulsionamento_conversoes', p_campanha_id,
    jsonb_build_object('consulta_id', p_consulta_id, 'campanha_id', p_campanha_id), 'baixo', 'sistema');
END;
$$;

-- 8) Atualizar recalcular_ranking_medico para usar premium_bonus_ranking da config
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

  SELECT COALESCE(mp.ativo, false) INTO v_is_premium
    FROM public.medico_premium mp WHERE mp.medico_id = p_medico_id;
  v_premium := CASE WHEN v_is_premium THEN COALESCE(v_cfg.premium_bonus_ranking, 1.2) ELSE 1.0 END;

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

  -- Verificar se qualifica para premium conquistado
  PERFORM public.verificar_premium_conquistado(p_medico_id);
END;
$$;

-- 9) Habilitar pg_cron e pg_net para ranking periódico
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
