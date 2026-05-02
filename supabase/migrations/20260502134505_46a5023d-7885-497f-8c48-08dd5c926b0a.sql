
-- Enum para tipos de termo
CREATE TYPE public.termo_tipo AS ENUM (
  'consulta_paciente',
  'privacidade',
  'plano_plataforma',
  'plano_medico',
  'contrato_medico',
  'gamificacao_premium',
  'criacao_plano_medico',
  'uso_feegow'
);

-- Tabela principal de termos
CREATE TABLE public.termos_condicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.termo_tipo NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  versao int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'inativo' CHECK (status IN ('ativo','inativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(tipo, versao)
);

ALTER TABLE public.termos_condicoes ENABLE ROW LEVEL SECURITY;

-- Admin CRUD
CREATE POLICY "admin_termos_select" ON public.termos_condicoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_termos_insert" ON public.termos_condicoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_termos_update" ON public.termos_condicoes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Usuarios autenticados podem ler termos ativos
CREATE POLICY "users_termos_select_ativo" ON public.termos_condicoes
  FOR SELECT TO authenticated
  USING (status = 'ativo');

-- Trigger: ao ativar um termo, desativa o anterior do mesmo tipo
CREATE OR REPLACE FUNCTION public.trg_termos_ensure_single_active()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'ativo' THEN
    UPDATE public.termos_condicoes
      SET status = 'inativo'
      WHERE tipo = NEW.tipo AND id != NEW.id AND status = 'ativo';
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_termos_single_active
  BEFORE INSERT OR UPDATE ON public.termos_condicoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_termos_ensure_single_active();

-- Função para auto-incrementar versão por tipo
CREATE OR REPLACE FUNCTION public.trg_termos_auto_versao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.versao IS NULL OR NEW.versao <= 0 THEN
    SELECT COALESCE(MAX(versao), 0) + 1 INTO NEW.versao
      FROM public.termos_condicoes WHERE tipo = NEW.tipo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_termos_auto_versao
  BEFORE INSERT ON public.termos_condicoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_termos_auto_versao();

-- Tabela de aceite do usuario
CREATE TABLE public.user_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  termo_id uuid NOT NULL REFERENCES public.termos_condicoes(id),
  aceito_em timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Usuario insere seu proprio aceite
CREATE POLICY "user_acceptance_insert" ON public.user_terms_acceptance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuario ve seus proprios aceites
CREATE POLICY "user_acceptance_select_own" ON public.user_terms_acceptance
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin ve todos
CREATE POLICY "admin_acceptance_select_all" ON public.user_terms_acceptance
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Auditoria: criacao e update de termos
CREATE OR REPLACE FUNCTION public.trg_termos_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_eventos_unificado (
    id, modulo, actor_id, acao, entidade_tipo, entidade_id,
    campo, valor_anterior, valor_novo, risco, origem
  ) VALUES (
    gen_random_uuid(),
    'termos',
    COALESCE(auth.uid(), NEW.created_by),
    CASE WHEN TG_OP = 'INSERT' THEN 'criacao_termo'
         WHEN TG_OP = 'UPDATE' AND NEW.status = 'ativo' AND (OLD.status IS DISTINCT FROM 'ativo') THEN 'ativacao_termo'
         ELSE 'edicao_termo' END,
    'termos_condicoes',
    NEW.id,
    'status',
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    'baixo',
    'sistema'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_termos_audit
  AFTER INSERT OR UPDATE ON public.termos_condicoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_termos_audit();

-- Auditoria: aceite de usuario
CREATE OR REPLACE FUNCTION public.trg_acceptance_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_eventos_unificado (
    id, modulo, actor_id, acao, entidade_tipo, entidade_id,
    payload, risco, origem
  ) VALUES (
    gen_random_uuid(),
    'termos',
    NEW.user_id,
    'aceite_termo',
    'user_terms_acceptance',
    NEW.id,
    jsonb_build_object('termo_id', NEW.termo_id, 'ip', NEW.ip_address),
    'baixo',
    'usuario'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_acceptance_audit
  AFTER INSERT ON public.user_terms_acceptance
  FOR EACH ROW EXECUTE FUNCTION public.trg_acceptance_audit();

-- Index para buscas rapidas
CREATE INDEX idx_termos_tipo_status ON public.termos_condicoes(tipo, status);
CREATE INDEX idx_acceptance_user ON public.user_terms_acceptance(user_id);
CREATE INDEX idx_acceptance_termo ON public.user_terms_acceptance(termo_id);
