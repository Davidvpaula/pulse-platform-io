
-- ============================================================
-- ETAPA 1: SERVIÇOS DA PLATAFORMA
-- ============================================================

-- 1) Estende servicos_financeiros
ALTER TABLE public.servicos_financeiros
  ADD COLUMN IF NOT EXISTS duracao_min int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS valor_paciente_centavos int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prioridade int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS especialidade_id uuid REFERENCES public.especialidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS requer_aprovacao_medico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS descricao_publica text,
  ADD COLUMN IF NOT EXISTS icone text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_servicos_financeiros_slug
  ON public.servicos_financeiros(slug) WHERE slug IS NOT NULL;

ALTER TABLE public.servicos_financeiros DROP CONSTRAINT IF EXISTS chk_servicos_duracao;
ALTER TABLE public.servicos_financeiros
  ADD CONSTRAINT chk_servicos_duracao CHECK (duracao_min BETWEEN 5 AND 480);

ALTER TABLE public.servicos_financeiros DROP CONSTRAINT IF EXISTS chk_servicos_valor;
ALTER TABLE public.servicos_financeiros
  ADD CONSTRAINT chk_servicos_valor CHECK (valor_paciente_centavos >= 0);

DROP POLICY IF EXISTS "Servicos publicos leitura" ON public.servicos_financeiros;
CREATE POLICY "Servicos publicos leitura"
ON public.servicos_financeiros FOR SELECT
TO anon, authenticated
USING (ativo = true);

-- 2) agenda_slots.servico_id
ALTER TABLE public.agenda_slots
  ADD COLUMN IF NOT EXISTS servico_id uuid REFERENCES public.servicos_financeiros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_slots_servico
  ON public.agenda_slots(servico_id) WHERE servico_id IS NOT NULL;

-- 3) medico_servicos.status (enum)
DO $$ BEGIN
  CREATE TYPE public.medico_servico_status AS ENUM ('ativo','pendente','recusado','desativado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.medico_servicos
  ADD COLUMN IF NOT EXISTS status public.medico_servico_status NOT NULL DEFAULT 'ativo';

UPDATE public.medico_servicos
   SET status = CASE WHEN ativo THEN 'ativo'::public.medico_servico_status
                     ELSE 'desativado'::public.medico_servico_status END;

-- 4) medicos.prioridade_atendimento
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS prioridade_atendimento int NOT NULL DEFAULT 100;

-- 5) consultas.avaliacao
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS avaliacao_paciente_nota smallint,
  ADD COLUMN IF NOT EXISTS avaliacao_paciente_em timestamptz,
  ADD COLUMN IF NOT EXISTS avaliacao_paciente_comentario text;

ALTER TABLE public.consultas DROP CONSTRAINT IF EXISTS chk_consulta_avaliacao_nota;
ALTER TABLE public.consultas
  ADD CONSTRAINT chk_consulta_avaliacao_nota
  CHECK (avaliacao_paciente_nota IS NULL OR avaliacao_paciente_nota BETWEEN 1 AND 5);

CREATE INDEX IF NOT EXISTS idx_consultas_aval_medico
  ON public.consultas(medico_id, avaliacao_paciente_em DESC)
  WHERE avaliacao_paciente_nota IS NOT NULL;

-- 6) Pesos do ranking
INSERT INTO public.app_settings(key, value)
VALUES ('ranking.pesos', '{"disponibilidade":0.40,"avaliacao":0.25,"espera":0.25,"prioridade":0.10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7) fn_resolver_comissao
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_resolver_comissao(
  _medico_id uuid, _servico_id uuid, _valor_bruto_centavos int
) RETURNS TABLE(
  modelo public.servico_financeiro_modelo,
  comissao_pct numeric(5,2),
  valor_medico_centavos int,
  valor_plataforma_centavos int,
  origem_regra text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pct numeric(5,2);
  v_modelo public.servico_financeiro_modelo;
  v_fixo int;
  v_origem text;
BEGIN
  IF _servico_id IS NOT NULL THEN
    SELECT comissao_pct INTO v_pct
      FROM public.medico_comissao_override
     WHERE medico_id = _medico_id AND servico_id = _servico_id AND ativo = true LIMIT 1;
    IF v_pct IS NOT NULL THEN v_modelo := 'percentual'; v_origem := 'override_servico'; END IF;
  END IF;

  IF v_pct IS NULL THEN
    SELECT comissao_pct INTO v_pct
      FROM public.medico_comissao_override
     WHERE medico_id = _medico_id AND servico_id IS NULL AND ativo = true LIMIT 1;
    IF v_pct IS NOT NULL THEN v_modelo := 'percentual'; v_origem := 'override_global_medico'; END IF;
  END IF;

  IF v_pct IS NULL AND _servico_id IS NOT NULL THEN
    SELECT s.modelo, s.comissao_pct, s.valor_fixo_centavos
      INTO v_modelo, v_pct, v_fixo
      FROM public.servicos_financeiros s WHERE s.id = _servico_id;
    IF v_modelo IS NOT NULL THEN v_origem := 'servico'; END IF;
  END IF;

  IF v_modelo IS NULL THEN
    SELECT (value)::text::numeric INTO v_pct
      FROM public.app_settings WHERE key = 'financeiro.comissao_padrao_pct';
    IF v_pct IS NULL THEN v_pct := 50; END IF;
    v_modelo := 'percentual'; v_origem := 'global';
  END IF;

  IF v_modelo = 'valor_fixo' THEN
    valor_medico_centavos := COALESCE(v_fixo, 0);
    valor_plataforma_centavos := GREATEST(0, _valor_bruto_centavos - valor_medico_centavos);
    comissao_pct := NULL;
  ELSE
    valor_medico_centavos := ROUND(_valor_bruto_centavos * v_pct / 100.0)::int;
    valor_plataforma_centavos := _valor_bruto_centavos - valor_medico_centavos;
    comissao_pct := v_pct;
  END IF;

  modelo := v_modelo;
  origem_regra := v_origem;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_resolver_comissao(uuid,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_resolver_comissao(uuid,uuid,int) TO authenticated;

-- ============================================================
-- 8) Trigger slot ↔ serviço
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_agenda_slot_servico_check()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_dur int;
BEGIN
  IF NEW.servico_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.medico_servicos
       WHERE medico_id = NEW.medico_id AND servico_id = NEW.servico_id
         AND status = 'ativo' AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Médico não aderiu ao serviço selecionado' USING ERRCODE = '23514';
    END IF;
    SELECT duracao_min INTO v_dur FROM public.servicos_financeiros WHERE id = NEW.servico_id;
    IF v_dur IS NOT NULL THEN
      NEW.fim := NEW.inicio + (v_dur || ' minutes')::interval;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.servico_id IS NOT NULL AND NEW.servico_id IS NULL
     AND EXISTS (SELECT 1 FROM public.consultas WHERE slot_id = OLD.id) THEN
    RAISE EXCEPTION 'Slot já vinculado a consulta não pode virar particular';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agenda_slot_servico_check ON public.agenda_slots;
CREATE TRIGGER trg_agenda_slot_servico_check
BEFORE INSERT OR UPDATE ON public.agenda_slots
FOR EACH ROW EXECUTE FUNCTION public.fn_agenda_slot_servico_check();

-- ============================================================
-- 9) Snapshot financeiro (AFTER INSERT consultas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_consulta_snapshot_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_valor_bruto int;
  v_servico_nome text;
  r record;
BEGIN
  IF NEW.servico_id IS NOT NULL THEN
    SELECT valor_paciente_centavos, nome
      INTO v_valor_bruto, v_servico_nome
      FROM public.servicos_financeiros WHERE id = NEW.servico_id;
  END IF;
  v_valor_bruto := COALESCE(v_valor_bruto, NEW.valor_centavos, 0);

  SELECT * INTO r FROM public.fn_resolver_comissao(NEW.medico_id, NEW.servico_id, v_valor_bruto);

  INSERT INTO public.consultas_financeiro(
    consulta_id, medico_id, paciente_id, empresa_id, servico_id, servico_nome_snapshot,
    data_consulta, valor_bruto_centavos, modelo_aplicado, comissao_pct_aplicada,
    valor_plataforma_centavos, valor_medico_centavos, status, origem_regra
  ) VALUES (
    NEW.id, NEW.medico_id, NEW.paciente_id, NEW.empresa_id, NEW.servico_id, v_servico_nome,
    NEW.inicio, v_valor_bruto, r.modelo, r.comissao_pct,
    r.valor_plataforma_centavos, r.valor_medico_centavos, 'valido', r.origem_regra
  ) ON CONFLICT (consulta_id) DO NOTHING;

  UPDATE public.consultas
     SET valor_snapshot_centavos = v_valor_bruto,
         comissao_snapshot_centavos = r.valor_medico_centavos,
         snapshot_at = now()
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_snapshot_financeiro ON public.consultas;
CREATE TRIGGER trg_consulta_snapshot_financeiro
AFTER INSERT ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public.fn_consulta_snapshot_financeiro();

-- ============================================================
-- 10) Imutabilidade do snapshot
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_consultas_financeiro_imutavel()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.valor_bruto_centavos      <> OLD.valor_bruto_centavos
  OR NEW.valor_medico_centavos     <> OLD.valor_medico_centavos
  OR NEW.valor_plataforma_centavos <> OLD.valor_plataforma_centavos
  OR COALESCE(NEW.comissao_pct_aplicada,-1) <> COALESCE(OLD.comissao_pct_aplicada,-1)
  OR NEW.modelo_aplicado <> OLD.modelo_aplicado
  OR COALESCE(NEW.origem_regra,'') <> COALESCE(OLD.origem_regra,'')
  OR NEW.consulta_id <> OLD.consulta_id THEN
    RAISE EXCEPTION 'consultas_financeiro: snapshot imutável (apenas status pode mudar)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consultas_financeiro_imutavel ON public.consultas_financeiro;
CREATE TRIGGER trg_consultas_financeiro_imutavel
BEFORE UPDATE ON public.consultas_financeiro
FOR EACH ROW EXECUTE FUNCTION public.fn_consultas_financeiro_imutavel();

-- ============================================================
-- 11) Ranking de médicos por serviço
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ranking_medico_servico(
  _servico_id uuid,
  _modalidade public.consulta_modalidade DEFAULT NULL,
  _limit int DEFAULT 10
) RETURNS TABLE(
  medico_id uuid,
  medico_nome text,
  proximo_slot_id uuid,
  proximo_slot_inicio timestamptz,
  espera_min int,
  avaliacao numeric,
  prioridade int,
  score numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  pesos jsonb;
  w_disp numeric; w_aval numeric; w_esp numeric; w_prio numeric;
BEGIN
  SELECT value INTO pesos FROM public.app_settings WHERE key = 'ranking.pesos';
  pesos := COALESCE(pesos, '{"disponibilidade":0.40,"avaliacao":0.25,"espera":0.25,"prioridade":0.10}'::jsonb);
  w_disp := (pesos->>'disponibilidade')::numeric;
  w_aval := (pesos->>'avaliacao')::numeric;
  w_esp  := (pesos->>'espera')::numeric;
  w_prio := (pesos->>'prioridade')::numeric;

  RETURN QUERY
  WITH proximos AS (
    SELECT s.medico_id,
           (ARRAY_AGG(s.id ORDER BY s.inicio))[1] AS slot_id,
           MIN(s.inicio) AS prox
      FROM public.agenda_slots s
      JOIN public.medico_servicos ms
        ON ms.medico_id = s.medico_id AND ms.servico_id = _servico_id
       AND ms.status = 'ativo' AND ms.ativo = true
     WHERE s.servico_id = _servico_id
       AND s.status = 'disponivel'
       AND s.inicio > now()
       AND (_modalidade IS NULL OR s.modalidade = _modalidade)
     GROUP BY s.medico_id
  ),
  aval AS (
    SELECT c.medico_id, AVG(c.avaliacao_paciente_nota)::numeric AS media
      FROM public.consultas c
     WHERE c.avaliacao_paciente_nota IS NOT NULL
       AND c.avaliacao_paciente_em > now() - interval '90 days'
     GROUP BY c.medico_id
  )
  SELECT
    m.id, m.nome, p.slot_id, p.prox,
    GREATEST(0, EXTRACT(EPOCH FROM (p.prox - now()))::int / 60) AS espera_min,
    COALESCE(a.media, 3.5) AS avaliacao,
    m.prioridade_atendimento,
    (
      w_disp * (CASE WHEN p.prox <= now() + interval '30 min' THEN 1.0
                     WHEN p.prox >= now() + interval '4 hours' THEN 0.0
                     ELSE 1.0 - EXTRACT(EPOCH FROM (p.prox - now() - interval '30 min'))::numeric / (3.5*3600)
                END)
    + w_aval * (COALESCE(a.media, 3.5) / 5.0)
    + w_esp  * GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (p.prox - now()))::numeric / (4*3600))
    + w_prio * GREATEST(0, 1.0 - LEAST(m.prioridade_atendimento, 999)::numeric / 999.0)
    ) AS score
   FROM public.medicos m
   JOIN proximos p ON p.medico_id = m.id
   LEFT JOIN aval a ON a.medico_id = m.id
  WHERE m.status = 'ativo'
    AND (m.suspenso_ate IS NULL OR m.suspenso_ate < now())
    AND m.suspenso_indeterminado = false
  ORDER BY score DESC NULLS LAST, p.prox ASC
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_ranking_medico_servico(uuid, public.consulta_modalidade, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ranking_medico_servico(uuid, public.consulta_modalidade, int) TO anon, authenticated;
