
-- 1) RPC batch: retorna {key, allowed} para cada chave
CREATE OR REPLACE FUNCTION public.has_permissions_batch(_user_id uuid, _keys text[])
RETURNS TABLE(permission_key text, allowed boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
BEGIN
  -- Admin bypass
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    INTO _is_admin;

  IF _is_admin THEN
    RETURN QUERY SELECT k, true FROM unnest(_keys) AS k;
    RETURN;
  END IF;

  -- Materializar dados do usuário uma vez
  RETURN QUERY
  WITH
    revokes AS (
      SELECT pc.permission_key
      FROM public.permissoes_colaborador pc
      WHERE pc.user_id = _user_id AND pc.efeito = 'revoke'
    ),
    grants AS (
      SELECT pc.permission_key
      FROM public.permissoes_colaborador pc
      WHERE pc.user_id = _user_id AND pc.efeito = 'grant'
    ),
    func_perms AS (
      SELECT fp.permission_key
      FROM public.colaboradores c
      JOIN public.function_permissions fp ON fp.funcao_interna = c.funcao_interna
      WHERE c.user_id = _user_id AND fp.ativo = true AND c.status_conta = 'ativo'
    ),
    role_perms AS (
      SELECT pp.permission_key
      FROM public.user_roles ur
      JOIN public.permissoes_perfil pp ON pp.role = ur.role
      WHERE ur.user_id = _user_id AND pp.ativo = true
    )
  SELECT
    k,
    (
      NOT EXISTS (SELECT 1 FROM revokes r WHERE r.permission_key = k)
      AND (
        EXISTS (SELECT 1 FROM grants g WHERE g.permission_key = k)
        OR EXISTS (SELECT 1 FROM func_perms f WHERE f.permission_key = k)
        OR EXISTS (SELECT 1 FROM role_perms rp WHERE rp.permission_key = k)
      )
    ) AS allowed
  FROM unnest(_keys) AS k;
END;
$$;

-- 2) Trigger de auditoria em permissoes_colaborador
CREATE OR REPLACE FUNCTION public.trg_audit_permissao_colaborador()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_user_id, permission_key, acao, valor_antes, valor_depois, motivo)
    VALUES ('colaborador', OLD.user_id, OLD.permission_key, 'revogada',
      jsonb_build_object('efeito', OLD.efeito), null, coalesce(OLD.motivo, 'Removida via trigger'));
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.permission_audit_logs (scope, target_user_id, permission_key, acao, valor_antes, valor_depois, motivo)
    VALUES ('colaborador', NEW.user_id, NEW.permission_key, 
      CASE WHEN NEW.efeito = 'grant' THEN 'concedida' ELSE 'revogada' END,
      null, jsonb_build_object('efeito', NEW.efeito), coalesce(NEW.motivo, 'Criada via trigger'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_user_id, permission_key, acao, valor_antes, valor_depois, motivo)
    VALUES ('colaborador', NEW.user_id, NEW.permission_key,
      CASE WHEN NEW.efeito = 'grant' THEN 'concedida' ELSE 'revogada' END,
      jsonb_build_object('efeito', OLD.efeito), jsonb_build_object('efeito', NEW.efeito),
      coalesce(NEW.motivo, 'Atualizada via trigger'));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_permissao_colaborador ON public.permissoes_colaborador;
CREATE TRIGGER audit_permissao_colaborador
AFTER INSERT OR UPDATE OR DELETE ON public.permissoes_colaborador
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_permissao_colaborador();

-- 3) Trigger de auditoria em function_permissions
CREATE OR REPLACE FUNCTION public.trg_audit_function_permission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_funcao, permission_key, acao, valor_antes, valor_depois)
    VALUES ('funcao', OLD.funcao_interna, OLD.permission_key, 'revogada',
      jsonb_build_object('ativo', OLD.ativo), null);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.permission_audit_logs (scope, target_funcao, permission_key, acao, valor_antes, valor_depois)
    VALUES ('funcao', NEW.funcao_interna, NEW.permission_key,
      CASE WHEN NEW.ativo THEN 'concedida' ELSE 'revogada' END,
      null, jsonb_build_object('ativo', NEW.ativo));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_funcao, permission_key, acao, valor_antes, valor_depois)
    VALUES ('funcao', NEW.funcao_interna, NEW.permission_key,
      CASE WHEN NEW.ativo THEN 'concedida' ELSE 'revogada' END,
      jsonb_build_object('ativo', OLD.ativo), jsonb_build_object('ativo', NEW.ativo));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_function_permission ON public.function_permissions;
CREATE TRIGGER audit_function_permission
AFTER INSERT OR UPDATE OR DELETE ON public.function_permissions
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_function_permission();

-- 4) Trigger de auditoria em permissoes_perfil
CREATE OR REPLACE FUNCTION public.trg_audit_permissao_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_role, permission_key, acao, valor_antes, valor_depois)
    VALUES ('perfil', OLD.role, OLD.permission_key, 'revogada',
      jsonb_build_object('ativo', OLD.ativo), null);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.permission_audit_logs (scope, target_role, permission_key, acao, valor_antes, valor_depois)
    VALUES ('perfil', NEW.role, NEW.permission_key,
      CASE WHEN NEW.ativo THEN 'concedida' ELSE 'revogada' END,
      null, jsonb_build_object('ativo', NEW.ativo));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.permission_audit_logs (scope, target_role, permission_key, acao, valor_antes, valor_depois)
    VALUES ('perfil', NEW.role, NEW.permission_key,
      CASE WHEN NEW.ativo THEN 'concedida' ELSE 'revogada' END,
      jsonb_build_object('ativo', OLD.ativo), jsonb_build_object('ativo', NEW.ativo));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_permissao_perfil ON public.permissoes_perfil;
CREATE TRIGGER audit_permissao_perfil
AFTER INSERT OR UPDATE OR DELETE ON public.permissoes_perfil
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_permissao_perfil();
