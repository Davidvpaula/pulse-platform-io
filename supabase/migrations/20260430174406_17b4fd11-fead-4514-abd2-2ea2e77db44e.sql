
-- =====================
-- ENUMs
-- =====================
CREATE TYPE public.plano_status AS ENUM ('rascunho','ativo','inativo','arquivado');
CREATE TYPE public.plano_publico AS ENUM ('paciente','empresa','ambos');
CREATE TYPE public.plano_categoria AS ENUM ('saude_mental','fitness','clinico_geral','infantil','empresarial','personalizado');
CREATE TYPE public.plano_cobranca AS ENUM ('gratuito','valor_fixo','mensal','anual','por_uso','por_colaborador','hibrido');
CREATE TYPE public.beneficio_tipo AS ENUM ('especialidade','medico','servico','categoria','desconto_geral');
CREATE TYPE public.beneficio_periodo AS ENUM ('semanal','mensal','anual','total');
CREATE TYPE public.assinatura_status AS ENUM ('trial','ativa','pausada','cancelada','inadimplente');
CREATE TYPE public.assinatura_ciclo AS ENUM ('mensal','anual','unico');

-- =====================
-- TABLE: planos
-- =====================
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  descricao_comercial TEXT,
  categoria public.plano_categoria NOT NULL DEFAULT 'personalizado',
  publico public.plano_publico NOT NULL DEFAULT 'paciente',
  modelo_cobranca public.plano_cobranca NOT NULL DEFAULT 'mensal',
  status public.plano_status NOT NULL DEFAULT 'rascunho',

  valor_mensal_centavos INTEGER NOT NULL DEFAULT 0,
  valor_anual_centavos INTEGER NOT NULL DEFAULT 0,
  valor_promocional_centavos INTEGER,
  taxa_adesao_centavos INTEGER NOT NULL DEFAULT 0,

  custo_operacional_centavos INTEGER NOT NULL DEFAULT 0,
  taxa_pagamento_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  imposto_estimado_pct NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- desconto geral aplicado pelo plano
  desconto_geral_pct NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- publicação no site
  publicado_site BOOLEAN NOT NULL DEFAULT false,
  destacado BOOLEAN NOT NULL DEFAULT false,
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  imagem_url TEXT,
  icone TEXT,
  cta_texto TEXT,
  cta_url TEXT,

  empresa_id UUID,
  medico_id UUID,
  especialidade_id UUID,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planos_status ON public.planos(status);
CREATE INDEX idx_planos_publico ON public.planos(publico);
CREATE INDEX idx_planos_categoria ON public.planos(categoria);
CREATE INDEX idx_planos_publicado ON public.planos(publicado_site) WHERE publicado_site = true;

-- =====================
-- TABLE: plano_beneficios
-- =====================
CREATE TABLE public.plano_beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  tipo public.beneficio_tipo NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,

  especialidade_id UUID,
  medico_id UUID,
  servico_id UUID,

  quantidade INTEGER NOT NULL DEFAULT 0,
  ilimitado BOOLEAN NOT NULL DEFAULT false,
  periodo public.beneficio_periodo NOT NULL DEFAULT 'mensal',
  acumulativo BOOLEAN NOT NULL DEFAULT false,

  custo_estimado_centavos INTEGER NOT NULL DEFAULT 0,
  valor_adicional_centavos INTEGER NOT NULL DEFAULT 0,

  desconto_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  preco_fixo_centavos INTEGER,

  regra_uso TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plano_beneficios_plano ON public.plano_beneficios(plano_id);

-- =====================
-- TABLE: assinaturas
-- =====================
CREATE TABLE public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  paciente_id UUID,
  empresa_id UUID,

  status public.assinatura_status NOT NULL DEFAULT 'ativa',
  ciclo public.assinatura_ciclo NOT NULL DEFAULT 'mensal',

  valor_cobrado_centavos INTEGER NOT NULL DEFAULT 0,
  forma_pagamento TEXT,

  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  proxima_cobranca DATE,
  data_cancelamento DATE,
  motivo_cancelamento TEXT,

  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_assinatura_titular CHECK (
    (paciente_id IS NOT NULL) OR (empresa_id IS NOT NULL)
  )
);

CREATE INDEX idx_assinaturas_plano ON public.assinaturas(plano_id);
CREATE INDEX idx_assinaturas_paciente ON public.assinaturas(paciente_id);
CREATE INDEX idx_assinaturas_empresa ON public.assinaturas(empresa_id);
CREATE INDEX idx_assinaturas_status ON public.assinaturas(status);

-- =====================
-- TABLE: assinatura_uso
-- =====================
CREATE TABLE public.assinatura_uso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id UUID NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  beneficio_id UUID REFERENCES public.plano_beneficios(id) ON DELETE SET NULL,
  consulta_id UUID,
  quantidade INTEGER NOT NULL DEFAULT 1,
  custo_centavos INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  registrado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assinatura_uso_ass ON public.assinatura_uso(assinatura_id);
CREATE INDEX idx_assinatura_uso_ben ON public.assinatura_uso(beneficio_id);

-- =====================
-- TABLE: planos_auditoria
-- =====================
CREATE TABLE public.planos_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID,
  assinatura_id UUID,
  acao TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT,
  observacao TEXT,
  payload JSONB,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_planos_aud_plano ON public.planos_auditoria(plano_id);

-- =====================
-- updated_at triggers
-- =====================
CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plano_beneficios_updated BEFORE UPDATE ON public.plano_beneficios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assinaturas_updated BEFORE UPDATE ON public.assinaturas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- RLS
-- =====================
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plano_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinatura_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_auditoria ENABLE ROW LEVEL SECURITY;

-- planos policies
CREATE POLICY "Admin gerencia planos" ON public.planos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff ve planos com permissao" ON public.planos
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'planos.ver'));

CREATE POLICY "Planos publicados publicos" ON public.planos
  FOR SELECT TO anon, authenticated
  USING (publicado_site = true AND status = 'ativo');

CREATE POLICY "Paciente ve planos contratados" ON public.planos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assinaturas a
    JOIN public.pacientes p ON p.id = a.paciente_id
    WHERE a.plano_id = planos.id AND p.user_id = auth.uid()
  ));

-- plano_beneficios policies
CREATE POLICY "Admin gerencia beneficios" ON public.plano_beneficios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff ve beneficios" ON public.plano_beneficios
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'planos.ver'));

CREATE POLICY "Beneficios de planos publicados" ON public.plano_beneficios
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.planos p
    WHERE p.id = plano_beneficios.plano_id
      AND p.publicado_site = true AND p.status = 'ativo'
  ));

-- assinaturas policies
CREATE POLICY "Admin gerencia assinaturas" ON public.assinaturas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff ve assinaturas" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'planos.ver'));

CREATE POLICY "Paciente ve propria assinatura" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.id = assinaturas.paciente_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Empresa ve propria assinatura" ON public.assinaturas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa'::app_role) AND empresa_id IS NOT NULL AND is_empresa_owner(empresa_id));

-- assinatura_uso policies
CREATE POLICY "Admin gerencia uso" ON public.assinatura_uso
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff ve uso" ON public.assinatura_uso
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'planos.ver'));

CREATE POLICY "Paciente ve proprio uso" ON public.assinatura_uso
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assinaturas a
    JOIN public.pacientes p ON p.id = a.paciente_id
    WHERE a.id = assinatura_uso.assinatura_id AND p.user_id = auth.uid()
  ));

-- planos_auditoria policies
CREATE POLICY "Admin ve auditoria planos" ON public.planos_auditoria
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Staff ve auditoria planos" ON public.planos_auditoria
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'planos.ver_financeiro'));

-- =====================
-- FUNCTION: cálculo de saúde financeira
-- =====================
CREATE OR REPLACE FUNCTION public.plano_saude_financeira(_plano_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plano RECORD;
  _qtd_assinantes INTEGER := 0;
  _receita_total BIGINT := 0;
  _custo_real BIGINT := 0;
  _custo_estimado BIGINT := 0;
  _custo_total BIGINT := 0;
  _lucro BIGINT := 0;
  _margem NUMERIC := 0;
  _classificacao TEXT := 'saudavel';
  _custo_por_assinante BIGINT := 0;
  _receita_por_assinante BIGINT := 0;
  _origem_custo TEXT := 'estimado';
BEGIN
  SELECT * INTO _plano FROM public.planos WHERE id = _plano_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('erro','plano_nao_encontrado');
  END IF;

  SELECT COUNT(*) INTO _qtd_assinantes
  FROM public.assinaturas
  WHERE plano_id = _plano_id AND status IN ('ativa','trial','inadimplente');

  -- receita: valor cobrado das assinaturas ativas
  SELECT COALESCE(SUM(valor_cobrado_centavos),0) INTO _receita_total
  FROM public.assinaturas
  WHERE plano_id = _plano_id AND status IN ('ativa','trial');

  -- se não houver assinantes, projeta com valor do plano
  IF _qtd_assinantes = 0 THEN
    _receita_total := COALESCE(_plano.valor_mensal_centavos,0);
    _qtd_assinantes := 1;
  END IF;

  -- custo real via consultas_financeiro vinculadas ao paciente da assinatura
  SELECT COALESCE(SUM(cf.valor_medico_centavos),0) INTO _custo_real
  FROM public.consultas_financeiro cf
  JOIN public.assinaturas a ON a.paciente_id = cf.paciente_id
  WHERE a.plano_id = _plano_id;

  -- custo estimado via benefícios * assinantes
  SELECT COALESCE(SUM(
    CASE WHEN ilimitado THEN custo_estimado_centavos * 4
         ELSE custo_estimado_centavos * GREATEST(quantidade,1) END
  ),0) INTO _custo_estimado
  FROM public.plano_beneficios
  WHERE plano_id = _plano_id;

  _custo_estimado := _custo_estimado * _qtd_assinantes
                   + COALESCE(_plano.custo_operacional_centavos,0) * _qtd_assinantes;

  IF _custo_real > 0 THEN
    _custo_total := _custo_real + COALESCE(_plano.custo_operacional_centavos,0) * _qtd_assinantes;
    _origem_custo := 'real';
  ELSE
    _custo_total := _custo_estimado;
    _origem_custo := 'estimado';
  END IF;

  -- adiciona taxa de pagamento e imposto sobre receita
  _custo_total := _custo_total
    + (_receita_total * COALESCE(_plano.taxa_pagamento_pct,0) / 100)::BIGINT
    + (_receita_total * COALESCE(_plano.imposto_estimado_pct,0) / 100)::BIGINT;

  _lucro := _receita_total - _custo_total;
  IF _receita_total > 0 THEN
    _margem := (_lucro::NUMERIC / _receita_total::NUMERIC) * 100;
  END IF;

  _custo_por_assinante := CASE WHEN _qtd_assinantes>0 THEN _custo_total / _qtd_assinantes ELSE _custo_total END;
  _receita_por_assinante := CASE WHEN _qtd_assinantes>0 THEN _receita_total / _qtd_assinantes ELSE _receita_total END;

  -- classificação
  IF _receita_total = 0 THEN
    _classificacao := 'sem_dados';
  ELSIF _custo_total > _receita_total THEN
    _classificacao := 'prejuizo';
  ELSIF _custo_total >= (_receita_total * 0.8) THEN
    _classificacao := 'risco_alto';
  ELSIF _custo_total >= (_receita_total * 0.5) THEN
    _classificacao := 'atencao';
  ELSE
    _classificacao := 'saudavel';
  END IF;

  RETURN jsonb_build_object(
    'plano_id', _plano_id,
    'qtd_assinantes', _qtd_assinantes,
    'receita_total_centavos', _receita_total,
    'receita_por_assinante_centavos', _receita_por_assinante,
    'custo_total_centavos', _custo_total,
    'custo_por_assinante_centavos', _custo_por_assinante,
    'custo_real_centavos', _custo_real,
    'custo_estimado_centavos', _custo_estimado,
    'origem_custo', _origem_custo,
    'lucro_centavos', _lucro,
    'margem_pct', ROUND(_margem,2),
    'classificacao', _classificacao
  );
END;
$$;

-- =====================
-- Trigger de auditoria simples para planos
-- =====================
CREATE OR REPLACE FUNCTION public.fn_planos_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.planos_auditoria(plano_id, acao, payload, actor_id)
    VALUES (NEW.id, 'criado', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.valor_mensal_centavos IS DISTINCT FROM OLD.valor_mensal_centavos THEN
      INSERT INTO public.planos_auditoria(plano_id, acao, campo, valor_anterior, valor_novo, actor_id)
      VALUES (NEW.id, 'preco_alterado','valor_mensal_centavos',OLD.valor_mensal_centavos::text,NEW.valor_mensal_centavos::text, auth.uid());
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.planos_auditoria(plano_id, acao, campo, valor_anterior, valor_novo, actor_id)
      VALUES (NEW.id, 'status_alterado','status',OLD.status::text,NEW.status::text, auth.uid());
    END IF;
    IF NEW.publicado_site IS DISTINCT FROM OLD.publicado_site THEN
      INSERT INTO public.planos_auditoria(plano_id, acao, campo, valor_anterior, valor_novo, actor_id)
      VALUES (NEW.id, 'publicacao_alterada','publicado_site',OLD.publicado_site::text,NEW.publicado_site::text, auth.uid());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_planos_auditoria
AFTER INSERT OR UPDATE ON public.planos
FOR EACH ROW EXECUTE FUNCTION public.fn_planos_auditoria();
