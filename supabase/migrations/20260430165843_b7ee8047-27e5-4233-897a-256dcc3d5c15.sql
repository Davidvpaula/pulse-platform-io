-- ============================================================
-- SISTEMA FINANCEIRO COMPLETO
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 1) ENUMS
DO $$ BEGIN
  CREATE TYPE servico_financeiro_tipo AS ENUM ('consulta','pronto_atendimento','pacote');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE servico_financeiro_modelo AS ENUM ('percentual','valor_fixo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consulta_financeiro_status AS ENUM ('valido','invalidado','reembolsado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fechamento_status AS ENUM ('em_aberto','pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) TABELAS
CREATE TABLE IF NOT EXISTS public.servicos_financeiros (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  descricao       text,
  tipo            servico_financeiro_tipo NOT NULL DEFAULT 'consulta',
  modelo          servico_financeiro_modelo NOT NULL DEFAULT 'percentual',
  comissao_pct    numeric(5,2),
  valor_fixo_centavos integer,
  ativo           boolean NOT NULL DEFAULT true,
  ordem           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  CONSTRAINT chk_pct CHECK (comissao_pct IS NULL OR (comissao_pct >= 0 AND comissao_pct <= 100)),
  CONSTRAINT chk_modelo_campos CHECK (
    (modelo = 'percentual' AND comissao_pct IS NOT NULL)
    OR (modelo = 'valor_fixo' AND valor_fixo_centavos IS NOT NULL AND valor_fixo_centavos >= 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_servicos_financeiros_ativo ON public.servicos_financeiros(ativo);

CREATE TABLE IF NOT EXISTS public.medico_comissao_override (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       uuid NOT NULL,
  servico_id      uuid,
  comissao_pct    numeric(5,2) NOT NULL,
  motivo          text,
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  CONSTRAINT chk_override_pct CHECK (comissao_pct >= 0 AND comissao_pct <= 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_override_medico_servico
  ON public.medico_comissao_override(medico_id, COALESCE(servico_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.medico_servicos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id       uuid NOT NULL,
  servico_id      uuid NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  aderido_em      timestamptz NOT NULL DEFAULT now(),
  desativado_em   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medico_id, servico_id)
);

CREATE TABLE IF NOT EXISTS public.consultas_financeiro (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id              uuid NOT NULL UNIQUE,
  medico_id                uuid NOT NULL,
  paciente_id              uuid NOT NULL,
  empresa_id               uuid,
  servico_id               uuid,
  servico_nome_snapshot    text,
  data_consulta            timestamptz NOT NULL,
  valor_bruto_centavos     integer NOT NULL DEFAULT 0,
  modelo_aplicado          servico_financeiro_modelo NOT NULL DEFAULT 'percentual',
  comissao_pct_aplicada    numeric(5,2),
  valor_plataforma_centavos integer NOT NULL DEFAULT 0,
  valor_medico_centavos    integer NOT NULL DEFAULT 0,
  status                   consulta_financeiro_status NOT NULL DEFAULT 'valido',
  origem_regra             text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consfin_medico_data ON public.consultas_financeiro(medico_id, data_consulta);
CREATE INDEX IF NOT EXISTS idx_consfin_status ON public.consultas_financeiro(status);
CREATE INDEX IF NOT EXISTS idx_consfin_empresa ON public.consultas_financeiro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_consfin_servico ON public.consultas_financeiro(servico_id);

CREATE TABLE IF NOT EXISTS public.reembolsos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id     uuid NOT NULL,
  motivo          text NOT NULL,
  observacao      text,
  valor_centavos  integer NOT NULL DEFAULT 0,
  actor_id        uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reembolsos_consulta ON public.reembolsos(consulta_id);

CREATE TABLE IF NOT EXISTS public.fechamentos_mensais (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id              uuid NOT NULL,
  competencia_ano        integer NOT NULL,
  competencia_mes        integer NOT NULL,
  status                 fechamento_status NOT NULL DEFAULT 'em_aberto',
  qtd_consultas          integer NOT NULL DEFAULT 0,
  valor_bruto_centavos   integer NOT NULL DEFAULT 0,
  valor_plataforma_centavos integer NOT NULL DEFAULT 0,
  valor_medico_centavos  integer NOT NULL DEFAULT 0,
  pago_em                timestamptz,
  pago_por               uuid,
  observacao             text,
  comprovante_url        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medico_id, competencia_ano, competencia_mes),
  CONSTRAINT chk_mes CHECK (competencia_mes BETWEEN 1 AND 12)
);

ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS servico_id uuid;

INSERT INTO public.app_settings (key, value)
VALUES ('financeiro.comissao_padrao_pct', to_jsonb(44.00))
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.servicos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medico_comissao_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medico_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reembolsos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fechamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia servicos_financeiros" ON public.servicos_financeiros FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve servicos_financeiros com permissao" ON public.servicos_financeiros FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Medico ve servicos ativos" ON public.servicos_financeiros FOR SELECT TO authenticated
USING (ativo = true AND EXISTS (SELECT 1 FROM public.medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin gerencia overrides" ON public.medico_comissao_override FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve overrides com permissao" ON public.medico_comissao_override FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.editar_comissao') OR has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Medico ve proprio override" ON public.medico_comissao_override FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_comissao_override.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admin gerencia medico_servicos" ON public.medico_servicos FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve medico_servicos com permissao" ON public.medico_servicos FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Medico gerencia proprio medico_servicos" ON public.medico_servicos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_servicos.medico_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_servicos.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admin gerencia consultas_financeiro" ON public.consultas_financeiro FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve consultas_financeiro com permissao" ON public.consultas_financeiro FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Medico ve proprio financeiro" ON public.consultas_financeiro FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = consultas_financeiro.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admin gerencia reembolsos" ON public.reembolsos FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve reembolsos com permissao" ON public.reembolsos FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.ver') OR has_permission(auth.uid(),'financeiro.reembolsar'));
CREATE POLICY "Medico ve reembolsos proprios" ON public.reembolsos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.consultas c JOIN public.medicos m ON m.id = c.medico_id
  WHERE c.id = reembolsos.consulta_id AND m.user_id = auth.uid()
));

CREATE POLICY "Admin gerencia fechamentos" ON public.fechamentos_mensais FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve fechamentos com permissao" ON public.fechamentos_mensais FOR SELECT TO authenticated
USING (has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Medico ve proprios fechamentos" ON public.fechamentos_mensais FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = fechamentos_mensais.medico_id AND m.user_id = auth.uid()));

-- 6) FUNÇÃO DE CÁLCULO + TRIGGER
CREATE OR REPLACE FUNCTION public._financeiro_calc_comissao(_medico_id uuid, _servico_id uuid)
RETURNS TABLE(modelo servico_financeiro_modelo, pct numeric, valor_fixo integer, origem text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pct numeric; v_modelo servico_financeiro_modelo := 'percentual';
  v_valor_fixo integer; v_padrao numeric;
BEGIN
  IF _servico_id IS NOT NULL THEN
    SELECT comissao_pct INTO v_pct FROM public.medico_comissao_override
    WHERE medico_id = _medico_id AND servico_id = _servico_id AND ativo = true LIMIT 1;
    IF v_pct IS NOT NULL THEN
      RETURN QUERY SELECT 'percentual'::servico_financeiro_modelo, v_pct, NULL::integer, 'override_medico_servico'::text;
      RETURN;
    END IF;
  END IF;
  SELECT comissao_pct INTO v_pct FROM public.medico_comissao_override
  WHERE medico_id = _medico_id AND servico_id IS NULL AND ativo = true LIMIT 1;
  IF v_pct IS NOT NULL THEN
    RETURN QUERY SELECT 'percentual'::servico_financeiro_modelo, v_pct, NULL::integer, 'override_medico_global'::text;
    RETURN;
  END IF;
  IF _servico_id IS NOT NULL THEN
    SELECT s.modelo, s.comissao_pct, s.valor_fixo_centavos INTO v_modelo, v_pct, v_valor_fixo
    FROM public.servicos_financeiros s WHERE s.id = _servico_id;
    IF v_modelo IS NOT NULL THEN
      RETURN QUERY SELECT v_modelo, v_pct, v_valor_fixo, 'servico'::text;
      RETURN;
    END IF;
  END IF;
  SELECT (value)::text::numeric INTO v_padrao FROM public.app_settings WHERE key = 'financeiro.comissao_padrao_pct';
  v_padrao := COALESCE(v_padrao, 44);
  RETURN QUERY SELECT 'percentual'::servico_financeiro_modelo, v_padrao, NULL::integer, 'padrao_global'::text;
END; $$;

CREATE OR REPLACE FUNCTION public._financeiro_gerar_snapshot(_consulta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c RECORD; v RECORD; v_servico_nome text; v_plat integer; v_med integer;
BEGIN
  SELECT * INTO c FROM public.consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF c.status <> 'concluida' THEN RETURN; END IF;
  SELECT * INTO v FROM public._financeiro_calc_comissao(c.medico_id, c.servico_id);
  IF v.modelo = 'valor_fixo' THEN
    v_plat := LEAST(COALESCE(v.valor_fixo,0), c.valor_centavos);
    v_med  := GREATEST(c.valor_centavos - v_plat, 0);
  ELSE
    v_plat := round(c.valor_centavos * COALESCE(v.pct,0) / 100.0)::integer;
    v_med  := c.valor_centavos - v_plat;
  END IF;
  IF c.servico_id IS NOT NULL THEN
    SELECT nome INTO v_servico_nome FROM public.servicos_financeiros WHERE id = c.servico_id;
  END IF;
  INSERT INTO public.consultas_financeiro (
    consulta_id, medico_id, paciente_id, empresa_id, servico_id, servico_nome_snapshot,
    data_consulta, valor_bruto_centavos, modelo_aplicado, comissao_pct_aplicada,
    valor_plataforma_centavos, valor_medico_centavos, status, origem_regra
  ) VALUES (
    c.id, c.medico_id, c.paciente_id, c.empresa_id, c.servico_id, v_servico_nome,
    c.inicio, c.valor_centavos, v.modelo, v.pct, v_plat, v_med, 'valido', v.origem
  )
  ON CONFLICT (consulta_id) DO UPDATE SET
    medico_id = EXCLUDED.medico_id, paciente_id = EXCLUDED.paciente_id,
    empresa_id = EXCLUDED.empresa_id, servico_id = EXCLUDED.servico_id,
    servico_nome_snapshot = EXCLUDED.servico_nome_snapshot,
    data_consulta = EXCLUDED.data_consulta,
    valor_bruto_centavos = EXCLUDED.valor_bruto_centavos,
    modelo_aplicado = EXCLUDED.modelo_aplicado,
    comissao_pct_aplicada = EXCLUDED.comissao_pct_aplicada,
    valor_plataforma_centavos = EXCLUDED.valor_plataforma_centavos,
    valor_medico_centavos = EXCLUDED.valor_medico_centavos,
    origem_regra = EXCLUDED.origem_regra, updated_at = now()
  WHERE public.consultas_financeiro.status = 'valido';
END; $$;

CREATE OR REPLACE FUNCTION public._trg_consulta_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'concluida' AND (OLD.status IS DISTINCT FROM 'concluida') THEN
    PERFORM public._financeiro_gerar_snapshot(NEW.id);
  END IF;
  IF NEW.status IN ('cancelada','no_show') AND OLD.status = 'concluida' THEN
    UPDATE public.consultas_financeiro SET status = 'invalidado', updated_at = now()
    WHERE consulta_id = NEW.id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_consulta_financeiro ON public.consultas;
CREATE TRIGGER trg_consulta_financeiro
AFTER UPDATE OF status ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public._trg_consulta_financeiro();

-- 7) RPCs
CREATE OR REPLACE FUNCTION public.financeiro_reembolsar_consulta(_consulta_id uuid, _motivo text, _observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_valor integer;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'financeiro.reembolsar')) THEN
    RAISE EXCEPTION 'Sem permissão para reembolsar';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN RAISE EXCEPTION 'Motivo é obrigatório'; END IF;
  SELECT valor_centavos INTO v_valor FROM public.consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  UPDATE public.consultas_financeiro SET status = 'reembolsado', updated_at = now() WHERE consulta_id = _consulta_id;
  INSERT INTO public.reembolsos (consulta_id, motivo, observacao, valor_centavos, actor_id)
  VALUES (_consulta_id, trim(_motivo), _observacao, COALESCE(v_valor,0), v_uid);
  INSERT INTO public.consultas_auditoria (consulta_id, actor_id, acao, motivo, payload)
  VALUES (_consulta_id, v_uid, 'reembolso', trim(_motivo), jsonb_build_object('observacao',_observacao));
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.financeiro_reembolsar_consulta(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.financeiro_invalidar_consulta(_consulta_id uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'financeiro.reembolsar')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN RAISE EXCEPTION 'Motivo é obrigatório'; END IF;
  UPDATE public.consultas_financeiro SET status = 'invalidado', updated_at = now() WHERE consulta_id = _consulta_id;
  INSERT INTO public.consultas_auditoria (consulta_id, actor_id, acao, motivo)
  VALUES (_consulta_id, v_uid, 'invalidar_financeiro', trim(_motivo));
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.financeiro_invalidar_consulta(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.financeiro_dashboard(_inicio date, _fim date, _empresa_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_kpis jsonb; v_por_medico jsonb; v_por_servico jsonb; v_por_empresa jsonb;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'financeiro.ver')) THEN
    RAISE EXCEPTION 'Sem permissão para ver financeiro';
  END IF;
  WITH base AS (
    SELECT * FROM public.consultas_financeiro
    WHERE data_consulta::date BETWEEN _inicio AND _fim
      AND (_empresa_id IS NULL OR empresa_id = _empresa_id)
  )
  SELECT jsonb_build_object(
    'consultas_validas', count(*) FILTER (WHERE status='valido'),
    'consultas_invalidadas', count(*) FILTER (WHERE status='invalidado'),
    'consultas_reembolsadas', count(*) FILTER (WHERE status='reembolsado'),
    'faturamento_bruto_centavos', COALESCE(sum(valor_bruto_centavos) FILTER (WHERE status='valido'),0),
    'receita_plataforma_centavos', COALESCE(sum(valor_plataforma_centavos) FILTER (WHERE status='valido'),0),
    'repasse_medicos_centavos', COALESCE(sum(valor_medico_centavos) FILTER (WHERE status='valido'),0),
    'ticket_medio_centavos', COALESCE(round(avg(valor_bruto_centavos) FILTER (WHERE status='valido')),0)
  ) INTO v_kpis FROM base;

  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'valor_medico_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_por_medico FROM (
    SELECT jsonb_build_object(
      'medico_id', cf.medico_id, 'medico_nome', m.nome,
      'qtd', count(*),
      'bruto_centavos', sum(cf.valor_bruto_centavos),
      'plataforma_centavos', sum(cf.valor_plataforma_centavos),
      'valor_medico_centavos', sum(cf.valor_medico_centavos)
    ) AS x
    FROM public.consultas_financeiro cf
    JOIN public.medicos m ON m.id = cf.medico_id
    WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status = 'valido'
      AND (_empresa_id IS NULL OR cf.empresa_id = _empresa_id)
    GROUP BY cf.medico_id, m.nome
  ) y;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_por_servico FROM (
    SELECT jsonb_build_object(
      'servico_id', cf.servico_id,
      'servico_nome', COALESCE(s.nome, cf.servico_nome_snapshot, '— Sem serviço —'),
      'qtd', count(*),
      'bruto_centavos', sum(cf.valor_bruto_centavos),
      'plataforma_centavos', sum(cf.valor_plataforma_centavos),
      'valor_medico_centavos', sum(cf.valor_medico_centavos)
    ) AS x
    FROM public.consultas_financeiro cf
    LEFT JOIN public.servicos_financeiros s ON s.id = cf.servico_id
    WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status = 'valido'
      AND (_empresa_id IS NULL OR cf.empresa_id = _empresa_id)
    GROUP BY cf.servico_id, s.nome, cf.servico_nome_snapshot
  ) y;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO v_por_empresa FROM (
    SELECT jsonb_build_object(
      'empresa_id', cf.empresa_id,
      'empresa_nome', COALESCE(e.nome_fantasia, e.razao_social, '— Sem empresa —'),
      'qtd', count(*),
      'bruto_centavos', sum(cf.valor_bruto_centavos),
      'plataforma_centavos', sum(cf.valor_plataforma_centavos),
      'valor_medico_centavos', sum(cf.valor_medico_centavos)
    ) AS x
    FROM public.consultas_financeiro cf
    LEFT JOIN public.empresas e ON e.id = cf.empresa_id
    WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status = 'valido'
    GROUP BY cf.empresa_id, e.nome_fantasia, e.razao_social
  ) y;

  RETURN jsonb_build_object(
    'inicio', _inicio, 'fim', _fim, 'kpis', v_kpis,
    'por_medico', v_por_medico, 'por_servico', v_por_servico, 'por_empresa', v_por_empresa
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.financeiro_dashboard(date,date,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.financeiro_fechamento_mensal(_ano integer, _mes integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_inicio date; v_fim date; v_medicos jsonb;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'financeiro.ver')) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  v_inicio := make_date(_ano, _mes, 1);
  v_fim := (v_inicio + interval '1 month')::date;
  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'valor_medico_centavos')::bigint DESC), '[]'::jsonb)
  INTO v_medicos FROM (
    SELECT jsonb_build_object(
      'medico_id', m.id, 'medico_nome', m.nome, 'medico_email', m.email,
      'qtd_validas', count(*) FILTER (WHERE cf.status='valido'),
      'qtd_invalidas', count(*) FILTER (WHERE cf.status<>'valido'),
      'bruto_centavos', COALESCE(sum(cf.valor_bruto_centavos) FILTER (WHERE cf.status='valido'),0),
      'plataforma_centavos', COALESCE(sum(cf.valor_plataforma_centavos) FILTER (WHERE cf.status='valido'),0),
      'valor_medico_centavos', COALESCE(sum(cf.valor_medico_centavos) FILTER (WHERE cf.status='valido'),0),
      'pct_media', COALESCE(round(avg(cf.comissao_pct_aplicada) FILTER (WHERE cf.status='valido'),2),0),
      'fechamento_status', COALESCE((SELECT status::text FROM public.fechamentos_mensais f
                                     WHERE f.medico_id = m.id AND f.competencia_ano = _ano AND f.competencia_mes = _mes), 'em_aberto'),
      'fechamento_pago_em', (SELECT pago_em FROM public.fechamentos_mensais f
                              WHERE f.medico_id = m.id AND f.competencia_ano = _ano AND f.competencia_mes = _mes)
    ) AS x
    FROM public.consultas_financeiro cf
    JOIN public.medicos m ON m.id = cf.medico_id
    WHERE cf.data_consulta >= v_inicio AND cf.data_consulta < v_fim
    GROUP BY m.id, m.nome, m.email
  ) y;
  RETURN jsonb_build_object('ano', _ano, 'mes', _mes, 'inicio', v_inicio, 'fim', v_fim, 'medicos', v_medicos);
END; $$;
GRANT EXECUTE ON FUNCTION public.financeiro_fechamento_mensal(integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.financeiro_marcar_pago(_medico_id uuid, _ano integer, _mes integer, _observacao text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_inicio date; v_fim date;
        v_qtd integer; v_bruto bigint; v_plat bigint; v_med bigint;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'financeiro.editar_comissao')) THEN
    RAISE EXCEPTION 'Sem permissão para marcar pagamento';
  END IF;
  v_inicio := make_date(_ano, _mes, 1);
  v_fim := (v_inicio + interval '1 month')::date;
  SELECT count(*), COALESCE(sum(valor_bruto_centavos),0),
         COALESCE(sum(valor_plataforma_centavos),0), COALESCE(sum(valor_medico_centavos),0)
  INTO v_qtd, v_bruto, v_plat, v_med
  FROM public.consultas_financeiro
  WHERE medico_id = _medico_id AND status = 'valido'
    AND data_consulta >= v_inicio AND data_consulta < v_fim;
  INSERT INTO public.fechamentos_mensais (
    medico_id, competencia_ano, competencia_mes, status,
    qtd_consultas, valor_bruto_centavos, valor_plataforma_centavos, valor_medico_centavos,
    pago_em, pago_por, observacao
  ) VALUES (
    _medico_id, _ano, _mes, 'pago',
    v_qtd, v_bruto::int, v_plat::int, v_med::int, now(), v_uid, _observacao
  )
  ON CONFLICT (medico_id, competencia_ano, competencia_mes) DO UPDATE SET
    status = 'pago',
    qtd_consultas = EXCLUDED.qtd_consultas,
    valor_bruto_centavos = EXCLUDED.valor_bruto_centavos,
    valor_plataforma_centavos = EXCLUDED.valor_plataforma_centavos,
    valor_medico_centavos = EXCLUDED.valor_medico_centavos,
    pago_em = now(), pago_por = v_uid,
    observacao = COALESCE(_observacao, fechamentos_mensais.observacao),
    updated_at = now();
  RETURN jsonb_build_object('ok', true, 'valor_medico_centavos', v_med);
END; $$;
GRANT EXECUTE ON FUNCTION public.financeiro_marcar_pago(uuid,integer,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.medico_servico_toggle(_servico_id uuid, _ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_medico_id uuid;
BEGIN
  SELECT id INTO v_medico_id FROM public.medicos WHERE user_id = v_uid;
  IF v_medico_id IS NULL THEN RAISE EXCEPTION 'Apenas médicos podem aderir a serviços'; END IF;
  INSERT INTO public.medico_servicos (medico_id, servico_id, ativo, aderido_em, desativado_em)
  VALUES (v_medico_id, _servico_id, _ativo,
          CASE WHEN _ativo THEN now() ELSE NULL END,
          CASE WHEN _ativo THEN NULL ELSE now() END)
  ON CONFLICT (medico_id, servico_id) DO UPDATE SET
    ativo = _ativo,
    aderido_em = CASE WHEN _ativo THEN now() ELSE medico_servicos.aderido_em END,
    desativado_em = CASE WHEN _ativo THEN NULL ELSE now() END,
    updated_at = now();
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.medico_servico_toggle(uuid,boolean) TO authenticated;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_servicos_financeiros_upd ON public.servicos_financeiros;
CREATE TRIGGER trg_servicos_financeiros_upd BEFORE UPDATE ON public.servicos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_overrides_upd ON public.medico_comissao_override;
CREATE TRIGGER trg_overrides_upd BEFORE UPDATE ON public.medico_comissao_override
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_medico_servicos_upd ON public.medico_servicos;
CREATE TRIGGER trg_medico_servicos_upd BEFORE UPDATE ON public.medico_servicos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_consultas_financeiro_upd ON public.consultas_financeiro;
CREATE TRIGGER trg_consultas_financeiro_upd BEFORE UPDATE ON public.consultas_financeiro
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_fechamentos_upd ON public.fechamentos_mensais;
CREATE TRIGGER trg_fechamentos_upd BEFORE UPDATE ON public.fechamentos_mensais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();