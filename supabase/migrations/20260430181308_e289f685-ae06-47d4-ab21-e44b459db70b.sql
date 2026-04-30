
-- ============================================================
-- MARKETING: tabelas para tracking manual
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_campanhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'organico', -- google_ads, meta_ads, instagram, seo, indicacao, direto, outro
  descricao TEXT,
  custo_centavos INTEGER NOT NULL DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketing_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campanha_id UUID REFERENCES public.marketing_campanhas(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  fonte TEXT NOT NULL DEFAULT 'organico',
  visitantes INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  agendamentos INTEGER NOT NULL DEFAULT 0,
  consultas INTEGER NOT NULL DEFAULT 0,
  retornos INTEGER NOT NULL DEFAULT 0,
  receita_centavos INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_eventos_data ON public.marketing_eventos(data);
CREATE INDEX IF NOT EXISTS idx_marketing_eventos_fonte ON public.marketing_eventos(fonte);
CREATE INDEX IF NOT EXISTS idx_marketing_eventos_campanha ON public.marketing_eventos(campanha_id);

ALTER TABLE public.marketing_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia marketing_campanhas"
ON public.marketing_campanhas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff ve marketing_campanhas"
ON public.marketing_campanhas FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'relatorios.ver'));

CREATE POLICY "Admin gerencia marketing_eventos"
ON public.marketing_eventos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff ve marketing_eventos"
ON public.marketing_eventos FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'relatorios.ver'));

CREATE TRIGGER trg_marketing_campanhas_updated
BEFORE UPDATE ON public.marketing_campanhas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Catálogo de permissão (best-effort, ignora se tabela não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permissoes_catalogo') THEN
    INSERT INTO public.permissoes_catalogo (chave, descricao, modulo)
    VALUES ('relatorios.ver', 'Visualizar relatórios analíticos', 'relatorios')
    ON CONFLICT (chave) DO NOTHING;
  END IF;
END$$;

-- ============================================================
-- RPCs de Relatórios
-- ============================================================

-- Visão Executiva
CREATE OR REPLACE FUNCTION public.relatorios_executivo(
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_medico_id UUID DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_canal TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _autorizado BOOLEAN;
  _result JSONB;
  _receita_bruta BIGINT := 0;
  _receita_plataforma BIGINT := 0;
  _receita_medico BIGINT := 0;
  _total_consultas INT := 0;
  _concluidas INT := 0;
  _no_show INT := 0;
  _canceladas INT := 0;
  _confirmadas INT := 0;
  _ticket_medio BIGINT := 0;
  _novos_pacientes INT := 0;
  _pacientes_recorrentes INT := 0;
  _leads INT := 0;
  _periodo_dias INT;
  _delta_receita NUMERIC := 0;
  _delta_consultas NUMERIC := 0;
  _receita_anterior BIGINT := 0;
  _consultas_anterior INT := 0;
BEGIN
  _autorizado := public.has_role(auth.uid(), 'admin'::app_role)
                 OR public.has_permission(auth.uid(), 'relatorios.ver');
  IF NOT _autorizado THEN
    RAISE EXCEPTION 'Sem permissão para relatórios';
  END IF;

  _periodo_dias := GREATEST(1, EXTRACT(DAY FROM (p_fim - p_inicio))::INT);

  -- KPIs base sobre consultas
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE c.status = 'concluida'),
    COUNT(*) FILTER (WHERE c.status = 'no_show'),
    COUNT(*) FILTER (WHERE c.status = 'cancelada'),
    COUNT(*) FILTER (WHERE c.status = 'confirmada')
  INTO _total_consultas, _concluidas, _no_show, _canceladas, _confirmadas
  FROM public.consultas c
  LEFT JOIN public.medicos m ON m.id = c.medico_id
  WHERE c.inicio >= p_inicio AND c.inicio < p_fim
    AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
    AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
    AND (p_canal IS NULL OR c.canal_origem::text = p_canal)
    AND (p_status IS NULL OR c.status::text = p_status)
    AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id);

  -- Receita real (consultas_financeiro válidas)
  SELECT
    COALESCE(SUM(cf.valor_bruto_centavos), 0),
    COALESCE(SUM(cf.valor_plataforma_centavos), 0),
    COALESCE(SUM(cf.valor_medico_centavos), 0)
  INTO _receita_bruta, _receita_plataforma, _receita_medico
  FROM public.consultas_financeiro cf
  LEFT JOIN public.medicos m ON m.id = cf.medico_id
  WHERE cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
    AND cf.status = 'valido'
    AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
    AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
    AND (p_empresa_id IS NULL OR cf.empresa_id = p_empresa_id);

  IF _concluidas > 0 THEN
    _ticket_medio := _receita_bruta / _concluidas;
  END IF;

  -- Novos pacientes no período
  SELECT COUNT(*) INTO _novos_pacientes
  FROM public.pacientes
  WHERE created_at >= p_inicio AND created_at < p_fim;

  -- Pacientes recorrentes: tiveram >= 2 consultas concluídas no período
  SELECT COUNT(*) INTO _pacientes_recorrentes
  FROM (
    SELECT c.paciente_id
    FROM public.consultas c
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim AND c.status = 'concluida'
    GROUP BY c.paciente_id
    HAVING COUNT(*) >= 2
  ) sub;

  -- Leads do período
  SELECT COUNT(*) INTO _leads
  FROM public.conversation_leads
  WHERE created_at >= p_inicio AND created_at < p_fim;

  -- Comparativo período anterior (mesma duração)
  SELECT COALESCE(SUM(cf.valor_bruto_centavos),0), COUNT(DISTINCT cf.consulta_id)
  INTO _receita_anterior, _consultas_anterior
  FROM public.consultas_financeiro cf
  WHERE cf.data_consulta >= (p_inicio - (p_fim - p_inicio))
    AND cf.data_consulta < p_inicio
    AND cf.status = 'valido';

  IF _receita_anterior > 0 THEN
    _delta_receita := ((_receita_bruta - _receita_anterior)::NUMERIC / _receita_anterior::NUMERIC) * 100;
  END IF;
  IF _consultas_anterior > 0 THEN
    _delta_consultas := ((_total_consultas - _consultas_anterior)::NUMERIC / _consultas_anterior::NUMERIC) * 100;
  END IF;

  _result := jsonb_build_object(
    'receita_bruta_centavos', _receita_bruta,
    'receita_plataforma_centavos', _receita_plataforma,
    'receita_medico_centavos', _receita_medico,
    'lucro_estimado_centavos', _receita_plataforma,
    'total_consultas', _total_consultas,
    'concluidas', _concluidas,
    'no_show', _no_show,
    'canceladas', _canceladas,
    'confirmadas', _confirmadas,
    'taxa_comparecimento', CASE WHEN _total_consultas > 0 THEN ROUND((_concluidas::NUMERIC / _total_consultas) * 100, 2) ELSE 0 END,
    'taxa_no_show', CASE WHEN _total_consultas > 0 THEN ROUND((_no_show::NUMERIC / _total_consultas) * 100, 2) ELSE 0 END,
    'taxa_cancelamento', CASE WHEN _total_consultas > 0 THEN ROUND((_canceladas::NUMERIC / _total_consultas) * 100, 2) ELSE 0 END,
    'ticket_medio_centavos', _ticket_medio,
    'novos_pacientes', _novos_pacientes,
    'pacientes_recorrentes', _pacientes_recorrentes,
    'leads', _leads,
    'taxa_conversao_lead', CASE WHEN _leads > 0 THEN ROUND((_concluidas::NUMERIC / _leads) * 100, 2) ELSE 0 END,
    'crescimento_receita_pct', ROUND(_delta_receita, 2),
    'crescimento_consultas_pct', ROUND(_delta_consultas, 2),
    'periodo_dias', _periodo_dias
  );

  RETURN _result;
END;
$$;

-- Série temporal: consultas e receita por dia
CREATE OR REPLACE FUNCTION public.relatorios_consultas_diarias(
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_medico_id UUID DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_canal TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS TABLE (
  dia DATE,
  total_consultas INT,
  concluidas INT,
  no_show INT,
  canceladas INT,
  receita_centavos BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT (c.inicio AT TIME ZONE 'America/Sao_Paulo')::DATE AS dia,
           c.status::text AS status,
           c.id AS consulta_id
    FROM public.consultas c
    LEFT JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
      AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
      AND (p_canal IS NULL OR c.canal_origem::text = p_canal)
      AND (p_status IS NULL OR c.status::text = p_status)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
  ),
  receitas AS (
    SELECT (cf.data_consulta AT TIME ZONE 'America/Sao_Paulo')::DATE AS dia,
           SUM(cf.valor_bruto_centavos)::BIGINT AS receita
    FROM public.consultas_financeiro cf
    LEFT JOIN public.medicos m ON m.id = cf.medico_id
    WHERE cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
      AND cf.status = 'valido'
      AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
      AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
      AND (p_empresa_id IS NULL OR cf.empresa_id = p_empresa_id)
    GROUP BY 1
  )
  SELECT
    b.dia,
    COUNT(*)::INT AS total_consultas,
    COUNT(*) FILTER (WHERE b.status = 'concluida')::INT AS concluidas,
    COUNT(*) FILTER (WHERE b.status = 'no_show')::INT AS no_show,
    COUNT(*) FILTER (WHERE b.status = 'cancelada')::INT AS canceladas,
    COALESCE(MAX(r.receita), 0) AS receita_centavos
  FROM base b
  LEFT JOIN receitas r ON r.dia = b.dia
  GROUP BY b.dia
  ORDER BY b.dia;
$$;

-- Operação clínica
CREATE OR REPLACE FUNCTION public.relatorios_clinica(
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_medico_id UUID DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_canal TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _autorizado BOOLEAN;
  _por_especialidade JSONB;
  _por_horario JSONB;
  _por_canal JSONB;
  _tempo_medio_min NUMERIC := 0;
  _taxa_retorno NUMERIC := 0;
BEGIN
  _autorizado := public.has_role(auth.uid(), 'admin'::app_role)
                 OR public.has_permission(auth.uid(), 'relatorios.ver');
  IF NOT _autorizado THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'especialidade', COALESCE(NULLIF(m.especialidade,''), 'Não informada'),
    'total', cnt,
    'concluidas', concl,
    'receita_centavos', COALESCE(rec, 0)
  ) ORDER BY cnt DESC), '[]'::jsonb)
  INTO _por_especialidade
  FROM (
    SELECT c.medico_id,
           COUNT(*)::INT AS cnt,
           COUNT(*) FILTER (WHERE c.status = 'concluida')::INT AS concl
    FROM public.consultas c
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
      AND (p_canal IS NULL OR c.canal_origem::text = p_canal)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    GROUP BY c.medico_id
  ) sub
  JOIN public.medicos m ON m.id = sub.medico_id
  LEFT JOIN LATERAL (
    SELECT SUM(cf.valor_bruto_centavos)::BIGINT AS rec
    FROM public.consultas_financeiro cf
    WHERE cf.medico_id = sub.medico_id
      AND cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
      AND cf.status = 'valido'
  ) rec ON TRUE
  WHERE (p_especialidade IS NULL OR m.especialidade = p_especialidade);

  -- Distribuição por hora do dia (0-23)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('hora', hora, 'total', total) ORDER BY hora), '[]'::jsonb)
  INTO _por_horario
  FROM (
    SELECT EXTRACT(HOUR FROM c.inicio AT TIME ZONE 'America/Sao_Paulo')::INT AS hora,
           COUNT(*)::INT AS total
    FROM public.consultas c
    LEFT JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
      AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
      AND (p_canal IS NULL OR c.canal_origem::text = p_canal)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    GROUP BY 1
  ) h;

  -- Por canal
  SELECT COALESCE(jsonb_agg(jsonb_build_object('canal', canal, 'total', total) ORDER BY total DESC), '[]'::jsonb)
  INTO _por_canal
  FROM (
    SELECT c.canal_origem::text AS canal, COUNT(*)::INT AS total
    FROM public.consultas c
    LEFT JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
      AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    GROUP BY 1
  ) ch;

  -- Tempo médio de atendimento (minutos) – baseado em fim - inicio das concluídas
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (c.fim - c.inicio))/60), 0)
  INTO _tempo_medio_min
  FROM public.consultas c
  LEFT JOIN public.medicos m ON m.id = c.medico_id
  WHERE c.inicio >= p_inicio AND c.inicio < p_fim
    AND c.status = 'concluida'
    AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
    AND (p_especialidade IS NULL OR m.especialidade = p_especialidade);

  -- Taxa de retorno: pacientes com 2+ consultas concluídas no período
  SELECT
    CASE WHEN COUNT(DISTINCT c.paciente_id) > 0
         THEN ROUND((COUNT(DISTINCT c.paciente_id) FILTER (
                       WHERE (SELECT COUNT(*) FROM public.consultas c2
                              WHERE c2.paciente_id = c.paciente_id
                                AND c2.status = 'concluida'
                                AND c2.inicio >= p_inicio AND c2.inicio < p_fim) >= 2
                     )::NUMERIC / COUNT(DISTINCT c.paciente_id)) * 100, 2)
         ELSE 0
    END
  INTO _taxa_retorno
  FROM public.consultas c
  WHERE c.inicio >= p_inicio AND c.inicio < p_fim
    AND c.status = 'concluida';

  RETURN jsonb_build_object(
    'por_especialidade', _por_especialidade,
    'por_horario', _por_horario,
    'por_canal', _por_canal,
    'tempo_medio_minutos', ROUND(_tempo_medio_min, 1),
    'taxa_retorno_pct', _taxa_retorno
  );
END;
$$;

-- Performance médicos
CREATE OR REPLACE FUNCTION public.relatorios_medicos_performance(
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_especialidade TEXT DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS TABLE (
  medico_id UUID,
  medico_nome TEXT,
  especialidade TEXT,
  total_consultas INT,
  concluidas INT,
  no_show INT,
  canceladas INT,
  receita_bruta_centavos BIGINT,
  receita_medico_centavos BIGINT,
  taxa_no_show NUMERIC,
  pacientes_unicos INT,
  ticket_medio_centavos BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cs AS (
    SELECT c.medico_id,
           COUNT(*)::INT AS total,
           COUNT(*) FILTER (WHERE c.status = 'concluida')::INT AS concl,
           COUNT(*) FILTER (WHERE c.status = 'no_show')::INT AS ns,
           COUNT(*) FILTER (WHERE c.status = 'cancelada')::INT AS canc,
           COUNT(DISTINCT c.paciente_id)::INT AS pacs
    FROM public.consultas c
    LEFT JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_especialidade IS NULL OR m.especialidade = p_especialidade)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    GROUP BY c.medico_id
  ),
  fin AS (
    SELECT cf.medico_id,
           SUM(cf.valor_bruto_centavos)::BIGINT AS bruto,
           SUM(cf.valor_medico_centavos)::BIGINT AS medico
    FROM public.consultas_financeiro cf
    WHERE cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
      AND cf.status = 'valido'
      AND (p_empresa_id IS NULL OR cf.empresa_id = p_empresa_id)
    GROUP BY cf.medico_id
  )
  SELECT
    m.id,
    m.nome,
    COALESCE(NULLIF(m.especialidade,''), 'Não informada'),
    COALESCE(cs.total, 0),
    COALESCE(cs.concl, 0),
    COALESCE(cs.ns, 0),
    COALESCE(cs.canc, 0),
    COALESCE(fin.bruto, 0),
    COALESCE(fin.medico, 0),
    CASE WHEN COALESCE(cs.total,0) > 0 THEN ROUND(cs.ns::NUMERIC / cs.total * 100, 2) ELSE 0 END,
    COALESCE(cs.pacs, 0),
    CASE WHEN COALESCE(cs.concl,0) > 0 THEN COALESCE(fin.bruto,0) / cs.concl ELSE 0 END
  FROM public.medicos m
  LEFT JOIN cs ON cs.medico_id = m.id
  LEFT JOIN fin ON fin.medico_id = m.id
  WHERE (p_especialidade IS NULL OR m.especialidade = p_especialidade)
    AND (cs.medico_id IS NOT NULL OR fin.medico_id IS NOT NULL)
  ORDER BY COALESCE(fin.bruto, 0) DESC, COALESCE(cs.total, 0) DESC;
$$;

-- Financeiro detalhado
CREATE OR REPLACE FUNCTION public.relatorios_financeiro(
  p_inicio TIMESTAMPTZ,
  p_fim TIMESTAMPTZ,
  p_medico_id UUID DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _autorizado BOOLEAN;
  _bruto BIGINT := 0; _liquido BIGINT := 0;
  _comissao BIGINT := 0; _repasse BIGINT := 0;
  _reembolsado BIGINT := 0; _pendente BIGINT := 0;
  _por_servico JSONB; _por_canal JSONB; _por_status JSONB;
BEGIN
  _autorizado := public.has_role(auth.uid(), 'admin'::app_role)
                 OR public.has_permission(auth.uid(), 'relatorios.ver');
  IF NOT _autorizado THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Totais via consultas_financeiro
  SELECT
    COALESCE(SUM(cf.valor_bruto_centavos), 0),
    COALESCE(SUM(cf.valor_plataforma_centavos), 0),
    COALESCE(SUM(cf.valor_medico_centavos), 0)
  INTO _bruto, _comissao, _repasse
  FROM public.consultas_financeiro cf
  WHERE cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
    AND cf.status = 'valido'
    AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
    AND (p_empresa_id IS NULL OR cf.empresa_id = p_empresa_id);

  -- Pagamentos: líquido / reembolsos / pendentes
  SELECT
    COALESCE(SUM(p.valor_liquido_centavos) FILTER (WHERE p.status::text IN ('pago','aprovado','confirmado')), 0),
    COALESCE(SUM(p.valor_reembolsado_centavos), 0),
    COALESCE(SUM(p.valor_centavos) FILTER (WHERE p.status::text IN ('pendente','aguardando_pagamento')), 0)
  INTO _liquido, _reembolsado, _pendente
  FROM public.pagamentos p
  WHERE p.created_at >= p_inicio AND p.created_at < p_fim
    AND (p_medico_id IS NULL OR p.medico_id = p_medico_id)
    AND (p_empresa_id IS NULL OR p.empresa_id = p_empresa_id);

  -- Por serviço
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'servico', COALESCE(NULLIF(cf.servico_nome_snapshot,''), 'Avulso'),
    'total', cnt, 'receita_centavos', rec
  ) ORDER BY rec DESC), '[]'::jsonb)
  INTO _por_servico
  FROM (
    SELECT cf.servico_nome_snapshot,
           COUNT(*)::INT AS cnt,
           SUM(cf.valor_bruto_centavos)::BIGINT AS rec
    FROM public.consultas_financeiro cf
    WHERE cf.data_consulta >= p_inicio AND cf.data_consulta < p_fim
      AND cf.status = 'valido'
      AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
      AND (p_empresa_id IS NULL OR cf.empresa_id = p_empresa_id)
    GROUP BY 1
  ) cf;

  -- Por canal (via consultas)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('canal', canal, 'receita_centavos', rec) ORDER BY rec DESC), '[]'::jsonb)
  INTO _por_canal
  FROM (
    SELECT c.canal_origem::text AS canal,
           COALESCE(SUM(cf.valor_bruto_centavos),0)::BIGINT AS rec
    FROM public.consultas c
    LEFT JOIN public.consultas_financeiro cf ON cf.consulta_id = c.id AND cf.status='valido'
    WHERE c.inicio >= p_inicio AND c.inicio < p_fim
      AND (p_medico_id IS NULL OR c.medico_id = p_medico_id)
      AND (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
    GROUP BY 1
  ) chn;

  -- Pagamentos por status
  SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'total', total, 'valor_centavos', valor) ORDER BY valor DESC), '[]'::jsonb)
  INTO _por_status
  FROM (
    SELECT p.status::text AS status, COUNT(*)::INT AS total, COALESCE(SUM(p.valor_centavos),0)::BIGINT AS valor
    FROM public.pagamentos p
    WHERE p.created_at >= p_inicio AND p.created_at < p_fim
      AND (p_medico_id IS NULL OR p.medico_id = p_medico_id)
      AND (p_empresa_id IS NULL OR p.empresa_id = p_empresa_id)
    GROUP BY 1
  ) ps;

  RETURN jsonb_build_object(
    'receita_bruta_centavos', _bruto,
    'receita_liquida_centavos', _liquido,
    'comissao_plataforma_centavos', _comissao,
    'repasse_medicos_centavos', _repasse,
    'reembolsos_centavos', _reembolsado,
    'pendente_centavos', _pendente,
    'por_servico', _por_servico,
    'por_canal', _por_canal,
    'por_status_pagamento', _por_status
  );
END;
$$;

-- Marketing funil
CREATE OR REPLACE FUNCTION public.relatorios_marketing_funil(
  p_inicio DATE,
  p_fim DATE,
  p_fonte TEXT DEFAULT NULL,
  p_campanha_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _autorizado BOOLEAN;
  _vis BIGINT := 0; _leads BIGINT := 0; _agend BIGINT := 0;
  _consult BIGINT := 0; _ret BIGINT := 0; _rec BIGINT := 0;
  _custo BIGINT := 0;
  _por_fonte JSONB; _serie JSONB;
BEGIN
  _autorizado := public.has_role(auth.uid(), 'admin'::app_role)
                 OR public.has_permission(auth.uid(), 'relatorios.ver');
  IF NOT _autorizado THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT
    COALESCE(SUM(visitantes),0), COALESCE(SUM(leads),0),
    COALESCE(SUM(agendamentos),0), COALESCE(SUM(consultas),0),
    COALESCE(SUM(retornos),0), COALESCE(SUM(receita_centavos),0)
  INTO _vis, _leads, _agend, _consult, _ret, _rec
  FROM public.marketing_eventos
  WHERE data >= p_inicio AND data <= p_fim
    AND (p_fonte IS NULL OR fonte = p_fonte)
    AND (p_campanha_id IS NULL OR campanha_id = p_campanha_id);

  SELECT COALESCE(SUM(custo_centavos), 0)
  INTO _custo
  FROM public.marketing_campanhas
  WHERE ativo = true
    AND (p_campanha_id IS NULL OR id = p_campanha_id)
    AND (p_fonte IS NULL OR fonte = p_fonte)
    AND (data_inicio IS NULL OR data_inicio <= p_fim)
    AND (data_fim IS NULL OR data_fim >= p_inicio);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fonte', fonte,
    'visitantes', vis, 'leads', lds, 'consultas', cons,
    'receita_centavos', rec
  ) ORDER BY vis DESC), '[]'::jsonb)
  INTO _por_fonte
  FROM (
    SELECT fonte,
           SUM(visitantes)::BIGINT AS vis,
           SUM(leads)::BIGINT AS lds,
           SUM(consultas)::BIGINT AS cons,
           SUM(receita_centavos)::BIGINT AS rec
    FROM public.marketing_eventos
    WHERE data >= p_inicio AND data <= p_fim
      AND (p_campanha_id IS NULL OR campanha_id = p_campanha_id)
    GROUP BY fonte
  ) f;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'dia', dia, 'visitantes', vis, 'leads', lds, 'consultas', cons
  ) ORDER BY dia), '[]'::jsonb)
  INTO _serie
  FROM (
    SELECT data AS dia,
           SUM(visitantes)::BIGINT AS vis,
           SUM(leads)::BIGINT AS lds,
           SUM(consultas)::BIGINT AS cons
    FROM public.marketing_eventos
    WHERE data >= p_inicio AND data <= p_fim
      AND (p_fonte IS NULL OR fonte = p_fonte)
      AND (p_campanha_id IS NULL OR campanha_id = p_campanha_id)
    GROUP BY data
  ) s;

  RETURN jsonb_build_object(
    'visitantes', _vis, 'leads', _leads, 'agendamentos', _agend,
    'consultas', _consult, 'retornos', _ret,
    'receita_centavos', _rec, 'custo_centavos', _custo,
    'cpl_centavos', CASE WHEN _leads > 0 THEN _custo / _leads ELSE 0 END,
    'cpa_centavos', CASE WHEN _consult > 0 THEN _custo / _consult ELSE 0 END,
    'roi_pct', CASE WHEN _custo > 0 THEN ROUND(((_rec - _custo)::NUMERIC / _custo) * 100, 2) ELSE 0 END,
    'taxa_visita_lead', CASE WHEN _vis > 0 THEN ROUND((_leads::NUMERIC / _vis) * 100, 2) ELSE 0 END,
    'taxa_lead_consulta', CASE WHEN _leads > 0 THEN ROUND((_consult::NUMERIC / _leads) * 100, 2) ELSE 0 END,
    'por_fonte', _por_fonte,
    'serie_diaria', _serie
  );
END;
$$;
