
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.saque_status AS ENUM ('solicitado','em_analise','aprovado','pago','recusado','cancelado');
CREATE TYPE public.saque_metodo AS ENUM ('pix','ted');
CREATE TYPE public.tipo_pessoa AS ENUM ('pf','pj');
CREATE TYPE public.tipo_conta_bancaria AS ENUM ('corrente','poupanca');
CREATE TYPE public.pix_tipo AS ENUM ('cpf','cnpj','email','telefone','aleatoria');
CREATE TYPE public.nfe_status AS ENUM ('pendente','validada','recusada');
CREATE TYPE public.endereco_tipo AS ENUM ('residencial','comercial');

-- =============================================
-- TABLE: medico_enderecos
-- =============================================
CREATE TABLE public.medico_enderecos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo public.endereco_tipo NOT NULL DEFAULT 'residencial',
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(medico_id, tipo)
);
ALTER TABLE public.medico_enderecos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico sees own addresses" ON public.medico_enderecos
  FOR SELECT USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Medico manages own addresses" ON public.medico_enderecos
  FOR ALL USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  ) WITH CHECK (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manages all addresses" ON public.medico_enderecos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medico_enderecos_updated_at
  BEFORE UPDATE ON public.medico_enderecos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: medico_dados_bancarios
-- =============================================
CREATE TABLE public.medico_dados_bancarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo_pessoa public.tipo_pessoa NOT NULL DEFAULT 'pf',
  titular_nome TEXT NOT NULL DEFAULT '',
  titular_documento TEXT NOT NULL DEFAULT '',
  banco TEXT NOT NULL DEFAULT '',
  agencia TEXT NOT NULL DEFAULT '',
  conta TEXT NOT NULL DEFAULT '',
  tipo_conta public.tipo_conta_bancaria NOT NULL DEFAULT 'corrente',
  pix_tipo public.pix_tipo,
  pix_chave TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medico_dados_bancarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico sees own bank data" ON public.medico_dados_bancarios
  FOR SELECT USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Medico manages own bank data" ON public.medico_dados_bancarios
  FOR ALL USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  ) WITH CHECK (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manages all bank data" ON public.medico_dados_bancarios
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_medico_dados_bancarios_updated_at
  BEFORE UPDATE ON public.medico_dados_bancarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: saques_medicos
-- =============================================
CREATE TABLE public.saques_medicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  valor_centavos INTEGER NOT NULL,
  status public.saque_status NOT NULL DEFAULT 'solicitado',
  metodo public.saque_metodo NOT NULL DEFAULT 'pix',
  dados_bancarios_id UUID REFERENCES public.medico_dados_bancarios(id),
  periodo_inicio DATE,
  periodo_fim DATE,
  solicitado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_em TIMESTAMPTZ,
  pago_em TIMESTAMPTZ,
  recusado_em TIMESTAMPTZ,
  motivo_recusa TEXT,
  observacao TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saques_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico sees own withdrawals" ON public.saques_medicos
  FOR SELECT USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Medico creates own withdrawals" ON public.saques_medicos
  FOR INSERT WITH CHECK (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manages all withdrawals" ON public.saques_medicos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_saques_medicos_updated_at
  BEFORE UPDATE ON public.saques_medicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE: saque_medico_itens
-- =============================================
CREATE TABLE public.saque_medico_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saque_id UUID NOT NULL REFERENCES public.saques_medicos(id) ON DELETE CASCADE,
  consulta_financeiro_id UUID NOT NULL REFERENCES public.consultas_financeiro(id),
  valor_medico_centavos INTEGER NOT NULL,
  UNIQUE(consulta_financeiro_id)
);
ALTER TABLE public.saque_medico_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico sees own saque items" ON public.saque_medico_itens
  FOR SELECT USING (
    saque_id IN (
      SELECT id FROM public.saques_medicos
      WHERE medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Medico inserts own saque items" ON public.saque_medico_itens
  FOR INSERT WITH CHECK (
    saque_id IN (
      SELECT id FROM public.saques_medicos
      WHERE medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Admin manages all saque items" ON public.saque_medico_itens
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TABLE: medico_nfes
-- =============================================
CREATE TABLE public.medico_nfes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  saque_id UUID REFERENCES public.saques_medicos(id),
  arquivo_url TEXT,
  numero_nota TEXT,
  valor_centavos INTEGER,
  data_emissao DATE,
  status public.nfe_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medico_nfes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico sees own nfes" ON public.medico_nfes
  FOR SELECT USING (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "Medico inserts own nfes" ON public.medico_nfes
  FOR INSERT WITH CHECK (
    medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );
CREATE POLICY "Admin manages all nfes" ON public.medico_nfes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- STORAGE BUCKET: medico-nfes
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('medico-nfes', 'medico-nfes', false);

CREATE POLICY "Medico uploads own nfes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'medico-nfes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Medico reads own nfes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medico-nfes'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY "Admin reads all nfes storage" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medico-nfes'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================
-- AUDIT TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_medico_dados_bancarios()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.financeiro_auditoria (entidade, entidade_id, acao, actor_id, valor_anterior, valor_novo, motivo)
  VALUES (
    'medico_dados_bancarios',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::text END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::text END,
    'Alteração de dados bancários'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_medico_dados_bancarios
  AFTER INSERT OR UPDATE OR DELETE ON public.medico_dados_bancarios
  FOR EACH ROW EXECUTE FUNCTION public.audit_medico_dados_bancarios();

CREATE OR REPLACE FUNCTION public.audit_saques_medicos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.financeiro_auditoria (entidade, entidade_id, acao, actor_id, valor_anterior, valor_novo, motivo, payload)
    VALUES (
      'saques_medicos',
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'solicitacao_saque' ELSE 'mudanca_status_saque' END,
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status::text END,
      NEW.status::text,
      COALESCE(NEW.motivo_recusa, NEW.observacao),
      jsonb_build_object('valor_centavos', NEW.valor_centavos, 'metodo', NEW.metodo::text, 'medico_id', NEW.medico_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_saques_medicos
  AFTER INSERT OR UPDATE ON public.saques_medicos
  FOR EACH ROW EXECUTE FUNCTION public.audit_saques_medicos();

-- =============================================
-- PERMISSIONS CATALOG
-- =============================================
INSERT INTO public.permissions_catalog (permission_key, modulo, descricao, risco, ordem) VALUES
  ('financeiro.saques.ver', 'Financeiro', 'Ver solicitações de saque dos médicos', 'medio', 200),
  ('financeiro.saques.aprovar', 'Financeiro', 'Aprovar solicitações de saque', 'alto', 201),
  ('financeiro.saques.marcar_pago', 'Financeiro', 'Marcar saque como pago', 'alto', 202),
  ('financeiro.saques.recusar', 'Financeiro', 'Recusar solicitações de saque', 'alto', 203),
  ('financeiro.saques.configurar', 'Financeiro', 'Configurar regras de liberação de saque', 'critico', 204),
  ('financeiro.ver_dados_bancarios_medico', 'Financeiro', 'Ver dados bancários dos médicos', 'alto', 205),
  ('financeiro.nfe.ver', 'Financeiro', 'Ver notas fiscais dos médicos', 'medio', 206)
ON CONFLICT (permission_key) DO NOTHING;

-- =============================================
-- APP SETTINGS DEFAULTS
-- =============================================
INSERT INTO public.app_settings (key, value) VALUES
  ('financeiro.saque.frequencia', '"quinzenal"'),
  ('financeiro.saque.dias_fechamento', '[1, 15]'),
  ('financeiro.saque.prazo_liberacao_dias', '7'),
  ('financeiro.saque.valor_minimo_centavos', '5000'),
  ('financeiro.saque.exigir_nfe', 'false'),
  ('financeiro.saque.permitir_parcial', 'true')
ON CONFLICT (key) DO NOTHING;
