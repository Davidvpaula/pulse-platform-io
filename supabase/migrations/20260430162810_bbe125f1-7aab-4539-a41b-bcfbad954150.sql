-- =========================================================
-- COLABORADORES INTERNOS
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.funcao_interna AS ENUM
    ('secretaria','supervisor','financeiro','comercial','atendimento','suporte','gestor_operacional','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.status_colaborador AS ENUM
    ('ativo','pendente_convite','suspenso','bloqueado','removido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nome_completo text NOT NULL,
  cpf text,
  data_nascimento date,
  telefone text,
  email text NOT NULL,
  funcao_interna public.funcao_interna NOT NULL DEFAULT 'secretaria',
  cargo_descricao text,
  foto_url text,
  setor text,
  gestor_id uuid,
  observacoes_internas text,
  status_conta public.status_colaborador NOT NULL DEFAULT 'pendente_convite',
  status_motivo text,
  status_observacao text,
  status_alterado_por uuid,
  status_alterado_em timestamptz,
  suspenso_ate timestamptz,
  suspenso_indeterminado boolean NOT NULL DEFAULT false,
  obrigar_troca_senha boolean NOT NULL DEFAULT true,
  ultimo_acesso_em timestamptz,
  convite_enviado_em timestamptz,
  removido_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colab_status ON public.colaboradores(status_conta);
CREATE INDEX IF NOT EXISTS idx_colab_funcao ON public.colaboradores(funcao_interna);
CREATE INDEX IF NOT EXISTS idx_colab_gestor ON public.colaboradores(gestor_id);

CREATE TRIGGER trg_colab_updated BEFORE UPDATE ON public.colaboradores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia colaboradores" ON public.colaboradores
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Colaborador ve proprio cadastro" ON public.colaboradores
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Permissões individuais (override sobre permissoes_perfil)
DO $$ BEGIN
  CREATE TYPE public.permissao_efeito AS ENUM ('grant','revoke');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.permissoes_colaborador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  efeito public.permissao_efeito NOT NULL DEFAULT 'grant',
  concedido_por uuid,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_permcolab_user ON public.permissoes_colaborador(user_id);
CREATE TRIGGER trg_permcolab_updated BEFORE UPDATE ON public.permissoes_colaborador
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.permissoes_colaborador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia permissoes individuais" ON public.permissoes_colaborador
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "User ve proprias permissoes individuais" ON public.permissoes_colaborador
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Auditoria
CREATE TABLE IF NOT EXISTS public.colaboradores_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL,
  actor_id uuid,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  observacao text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_colab_aud_colab ON public.colaboradores_auditoria(colaborador_id, created_at DESC);

ALTER TABLE public.colaboradores_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve auditoria colaboradores" ON public.colaboradores_auditoria
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Colaborador ve propria auditoria" ON public.colaboradores_auditoria
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.colaboradores c
          WHERE c.id = colaboradores_auditoria.colaborador_id AND c.user_id = auth.uid())
);

-- =========================================================
-- has_permission: agora considera override individual
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- 1) Admin tem tudo
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
  OR (
    -- 2) Não pode ter revoke individual
    NOT EXISTS (
      SELECT 1 FROM public.permissoes_colaborador
      WHERE user_id = _user_id AND permission_key = _key AND efeito = 'revoke'
    )
    AND (
      -- 3) grant individual OU permissao da role
      EXISTS (
        SELECT 1 FROM public.permissoes_colaborador
        WHERE user_id = _user_id AND permission_key = _key AND efeito = 'grant'
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.permissoes_perfil pp ON pp.role = ur.role
        WHERE ur.user_id = _user_id
          AND pp.permission_key = _key
          AND pp.ativo = true
      )
    )
  )
$$;

-- =========================================================
-- RPCs administrativos
-- =========================================================

-- helper para registrar auditoria
CREATE OR REPLACE FUNCTION public.registrar_auditoria_colaborador(
  _colab_id uuid, _acao text, _campo text DEFAULT NULL,
  _valor_anterior text DEFAULT NULL, _valor_novo text DEFAULT NULL,
  _motivo text DEFAULT NULL, _observacao text DEFAULT NULL,
  _payload jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.colaboradores_auditoria
    (colaborador_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo, observacao, payload)
  VALUES (_colab_id, auth.uid(), _acao, _campo, _valor_anterior, _valor_novo, _motivo, _observacao, _payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Atualizar dados básicos
CREATE OR REPLACE FUNCTION public.colaborador_atualizar(
  _id uuid, _patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old record;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_old FROM public.colaboradores WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado'; END IF;

  UPDATE public.colaboradores SET
    nome_completo       = COALESCE(_patch->>'nome_completo', nome_completo),
    cpf                 = COALESCE(_patch->>'cpf', cpf),
    data_nascimento     = COALESCE((_patch->>'data_nascimento')::date, data_nascimento),
    telefone            = COALESCE(_patch->>'telefone', telefone),
    funcao_interna      = COALESCE((_patch->>'funcao_interna')::public.funcao_interna, funcao_interna),
    cargo_descricao     = COALESCE(_patch->>'cargo_descricao', cargo_descricao),
    foto_url            = COALESCE(_patch->>'foto_url', foto_url),
    setor               = COALESCE(_patch->>'setor', setor),
    gestor_id           = COALESCE((_patch->>'gestor_id')::uuid, gestor_id),
    observacoes_internas= COALESCE(_patch->>'observacoes_internas', observacoes_internas),
    obrigar_troca_senha = COALESCE((_patch->>'obrigar_troca_senha')::boolean, obrigar_troca_senha),
    updated_at          = now()
  WHERE id=_id;

  PERFORM public.registrar_auditoria_colaborador(_id,'editado',NULL,NULL,NULL,NULL,NULL,_patch);
  RETURN jsonb_build_object('ok',true);
END $$;

-- Mudar status (suspender/bloquear/remover/reativar)
CREATE OR REPLACE FUNCTION public.colaborador_alterar_status(
  _id uuid, _novo public.status_colaborador, _motivo text,
  _observacao text DEFAULT NULL,
  _suspenso_ate timestamptz DEFAULT NULL,
  _indeterminado boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo é obrigatório'; END IF;

  IF _novo = 'suspenso' AND NOT _indeterminado AND (_suspenso_ate IS NULL OR _suspenso_ate <= now()) THEN
    RAISE EXCEPTION 'Data de término futura ou marcar como indeterminada';
  END IF;

  SELECT status_conta::text INTO v_old FROM public.colaboradores WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado'; END IF;

  UPDATE public.colaboradores SET
    status_conta            = _novo,
    status_motivo           = _motivo,
    status_observacao       = _observacao,
    status_alterado_por     = v_uid,
    status_alterado_em      = now(),
    suspenso_ate            = CASE WHEN _novo='suspenso' AND NOT _indeterminado THEN _suspenso_ate ELSE NULL END,
    suspenso_indeterminado  = CASE WHEN _novo='suspenso' THEN _indeterminado ELSE false END,
    removido_em             = CASE WHEN _novo='removido' THEN now() ELSE removido_em END,
    updated_at              = now()
  WHERE id=_id;

  PERFORM public.registrar_auditoria_colaborador(
    _id,'status:'||_novo::text,'status_conta',v_old,_novo::text,_motivo,_observacao,
    jsonb_build_object('suspenso_ate',_suspenso_ate,'indeterminado',_indeterminado));
  RETURN jsonb_build_object('ok',true);
END $$;

-- Conceder/Revogar permissão individual
CREATE OR REPLACE FUNCTION public.colaborador_set_permissao(
  _user_id uuid, _key text, _efeito public.permissao_efeito, _motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_colab_id uuid; v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;

  SELECT id INTO v_colab_id FROM public.colaboradores WHERE user_id=_user_id;

  SELECT efeito::text INTO v_old FROM public.permissoes_colaborador
   WHERE user_id=_user_id AND permission_key=_key;

  INSERT INTO public.permissoes_colaborador (user_id, permission_key, efeito, concedido_por, motivo)
  VALUES (_user_id, _key, _efeito, v_uid, _motivo)
  ON CONFLICT (user_id, permission_key)
  DO UPDATE SET efeito=EXCLUDED.efeito, concedido_por=v_uid, motivo=_motivo, updated_at=now();

  IF v_colab_id IS NOT NULL THEN
    PERFORM public.registrar_auditoria_colaborador(
      v_colab_id,'permissao:'||_efeito::text,_key,v_old,_efeito::text,_motivo,NULL,NULL);
  END IF;

  RETURN jsonb_build_object('ok',true);
END $$;

-- Remover override (volta ao padrão da role)
CREATE OR REPLACE FUNCTION public.colaborador_remover_permissao(
  _user_id uuid, _key text, _motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_colab_id uuid; v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;

  SELECT id INTO v_colab_id FROM public.colaboradores WHERE user_id=_user_id;
  SELECT efeito::text INTO v_old FROM public.permissoes_colaborador
   WHERE user_id=_user_id AND permission_key=_key;

  DELETE FROM public.permissoes_colaborador
   WHERE user_id=_user_id AND permission_key=_key;

  IF v_colab_id IS NOT NULL AND v_old IS NOT NULL THEN
    PERFORM public.registrar_auditoria_colaborador(
      v_colab_id,'permissao:reset',_key,v_old,'(default)',_motivo,NULL,NULL);
  END IF;

  RETURN jsonb_build_object('ok',true);
END $$;

-- Trocar role (admin pode mudar entre secretaria/supervisor/etc)
CREATE OR REPLACE FUNCTION public.colaborador_set_role(
  _user_id uuid, _role public.app_role, _motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_colab_id uuid;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _role IN ('paciente','medico','empresa') THEN
    RAISE EXCEPTION 'Role inválida para colaborador interno: %', _role; END IF;

  -- Remove roles internas anteriores e atribui a nova (mantém paciente/medico/empresa se houver)
  DELETE FROM public.user_roles
   WHERE user_id=_user_id AND role IN ('admin','secretaria','supervisor');

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO v_colab_id FROM public.colaboradores WHERE user_id=_user_id;
  IF v_colab_id IS NOT NULL THEN
    PERFORM public.registrar_auditoria_colaborador(
      v_colab_id,'role:trocada','role',NULL,_role::text,_motivo,NULL,NULL);
  END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
