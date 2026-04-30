
-- ENUM status_conta_paciente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_conta_paciente') THEN
    CREATE TYPE public.status_conta_paciente AS ENUM ('ativo','suspenso','bloqueado');
  END IF;
END$$;

-- EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text UNIQUE,
  email text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas (ativo);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia empresas" ON public.empresas;
CREATE POLICY "Admin gerencia empresas" ON public.empresas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff vê empresas" ON public.empresas;
CREATE POLICY "Staff vê empresas" ON public.empresas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretaria')
    OR public.has_role(auth.uid(),'supervisor')
  );

DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PACIENTES: novas colunas
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS status_conta public.status_conta_paciente NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS status_motivo text,
  ADD COLUMN IF NOT EXISTS status_observacao text,
  ADD COLUMN IF NOT EXISTS status_alterado_por uuid,
  ADD COLUMN IF NOT EXISTS status_alterado_em timestamptz,
  ADD COLUMN IF NOT EXISTS empresa_setor text,
  ADD COLUMN IF NOT EXISTS empresa_cargo text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS nacionalidade text,
  ADD COLUMN IF NOT EXISTS telefone_secundario text,
  ADD COLUMN IF NOT EXISTS feegow_paciente_id text,
  ADD COLUMN IF NOT EXISTS feegow_status public.feegow_status NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS feegow_ultimo_envio_em timestamptz,
  ADD COLUMN IF NOT EXISTS feegow_erro text,
  ADD COLUMN IF NOT EXISTS origem_cadastro text,
  ADD COLUMN IF NOT EXISTS responsavel_cadastro_id uuid,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_pacientes_status_conta ON public.pacientes (status_conta);
CREATE INDEX IF NOT EXISTS idx_pacientes_empresa_id ON public.pacientes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_feegow_status ON public.pacientes (feegow_status);
CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON public.pacientes (cpf);

-- AUDITORIA pacientes
CREATE TABLE IF NOT EXISTS public.pacientes_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  actor_id uuid,
  acao text NOT NULL,
  status_anterior public.status_conta_paciente,
  status_novo public.status_conta_paciente,
  motivo text,
  observacao text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pac_audit_paciente ON public.pacientes_auditoria (paciente_id, created_at DESC);
ALTER TABLE public.pacientes_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin vê auditoria pacientes" ON public.pacientes_auditoria;
CREATE POLICY "Admin vê auditoria pacientes" ON public.pacientes_auditoria
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- PERMISSOES_PERFIL
CREATE TABLE IF NOT EXISTS public.permissoes_perfil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_key text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);
ALTER TABLE public.permissoes_perfil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia permissoes" ON public.permissoes_perfil;
CREATE POLICY "Admin gerencia permissoes" ON public.permissoes_perfil
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "User ve proprias permissoes" ON public.permissoes_perfil;
CREATE POLICY "User ve proprias permissoes" ON public.permissoes_perfil
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = permissoes_perfil.role
    )
  );

DROP TRIGGER IF EXISTS trg_permissoes_perfil_updated_at ON public.permissoes_perfil;
CREATE TRIGGER trg_permissoes_perfil_updated_at
  BEFORE UPDATE ON public.permissoes_perfil
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- helper has_permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permissoes_perfil pp ON pp.role = ur.role
    WHERE ur.user_id = _user_id
      AND pp.permission_key = _key
      AND pp.ativo = true
  )
$$;

-- Seeds de permissões
INSERT INTO public.permissoes_perfil (role, permission_key, ativo) VALUES
  ('secretaria','pacientes.ver', true),
  ('secretaria','pacientes.criar', true),
  ('secretaria','pacientes.editar', true),
  ('secretaria','pacientes.agendar', true),
  ('secretaria','pacientes.ver_documentos', true),
  ('secretaria','pacientes.ver_financeiro', true),
  ('secretaria','pacientes.suspender', false),
  ('secretaria','pacientes.bloquear', false),
  ('secretaria','pacientes.reativar', false),
  ('secretaria','pacientes.feegow_enviar', false),
  ('supervisor','pacientes.ver', true),
  ('supervisor','pacientes.criar', true),
  ('supervisor','pacientes.editar', true),
  ('supervisor','pacientes.agendar', true),
  ('supervisor','pacientes.ver_documentos', true),
  ('supervisor','pacientes.ver_financeiro', true),
  ('supervisor','pacientes.suspender', true),
  ('supervisor','pacientes.bloquear', false),
  ('supervisor','pacientes.reativar', true),
  ('supervisor','pacientes.feegow_enviar', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- RLS adicionais em pacientes
DROP POLICY IF EXISTS "Supervisor ve pacientes" ON public.pacientes;
CREATE POLICY "Supervisor ve pacientes" ON public.pacientes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'supervisor') AND public.has_permission(auth.uid(),'pacientes.ver'));

DROP POLICY IF EXISTS "Staff edita paciente com permissao" ON public.pacientes;
CREATE POLICY "Staff edita paciente com permissao" ON public.pacientes
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(),'secretaria') OR public.has_role(auth.uid(),'supervisor'))
    AND public.has_permission(auth.uid(),'pacientes.editar')
  )
  WITH CHECK (
    (public.has_role(auth.uid(),'secretaria') OR public.has_role(auth.uid(),'supervisor'))
    AND public.has_permission(auth.uid(),'pacientes.editar')
  );

DROP POLICY IF EXISTS "Staff cria paciente com permissao" ON public.pacientes;
CREATE POLICY "Staff cria paciente com permissao" ON public.pacientes
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(),'secretaria') OR public.has_role(auth.uid(),'supervisor'))
    AND public.has_permission(auth.uid(),'pacientes.criar')
  );

DROP POLICY IF EXISTS "Staff ve auditoria com permissao" ON public.pacientes_auditoria;
CREATE POLICY "Staff ve auditoria com permissao" ON public.pacientes_auditoria
  FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'secretaria') OR public.has_role(auth.uid(),'supervisor'))
    AND public.has_permission(auth.uid(),'pacientes.ver')
  );

-- RPC alterar_status_conta_paciente
CREATE OR REPLACE FUNCTION public.alterar_status_conta_paciente(
  _paciente_id uuid,
  _novo_status public.status_conta_paciente,
  _motivo text,
  _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pac record;
  v_perm_key text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo é obrigatório';
  END IF;

  v_perm_key := CASE _novo_status
    WHEN 'suspenso'  THEN 'pacientes.suspender'
    WHEN 'bloqueado' THEN 'pacientes.bloquear'
    WHEN 'ativo'     THEN 'pacientes.reativar'
  END;

  IF NOT public.has_permission(v_uid, v_perm_key) THEN
    RAISE EXCEPTION 'Sem permissão para % conta de paciente', _novo_status
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pac FROM public.pacientes WHERE id = _paciente_id FOR UPDATE;
  IF v_pac IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;
  IF v_pac.status_conta = _novo_status THEN
    RAISE EXCEPTION 'Paciente já está com status %', _novo_status;
  END IF;

  UPDATE public.pacientes
     SET status_conta = _novo_status,
         status_motivo = _motivo,
         status_observacao = _observacao,
         status_alterado_por = v_uid,
         status_alterado_em = now(),
         updated_at = now()
   WHERE id = _paciente_id;

  INSERT INTO public.pacientes_auditoria
    (paciente_id, actor_id, acao, status_anterior, status_novo, motivo, observacao)
  VALUES
    (_paciente_id, v_uid,
     'status:' || _novo_status::text,
     v_pac.status_conta, _novo_status, _motivo, _observacao);

  RETURN jsonb_build_object('ok', true, 'paciente_id', _paciente_id, 'status', _novo_status);
END;
$$;
