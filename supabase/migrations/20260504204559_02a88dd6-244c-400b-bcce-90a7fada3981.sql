
-- Trigger function genérica para auditar UPDATE em tabelas de perfil
CREATE OR REPLACE FUNCTION public.fn_audit_perfil_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auditoria (
    usuario_id,
    acao,
    tabela,
    registro_id,
    dados_anteriores,
    dados_novos,
    ip,
    created_at
  ) VALUES (
    auth.uid(),
    'update',
    TG_TABLE_NAME,
    NEW.id::text,
    to_jsonb(OLD),
    to_jsonb(NEW),
    NULL,
    now()
  );
  RETURN NEW;
END;
$$;

-- Trigger em pacientes
CREATE TRIGGER trg_audit_pacientes_update
  AFTER UPDATE ON public.pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_perfil_update();

-- Trigger em medicos
CREATE TRIGGER trg_audit_medicos_update
  AFTER UPDATE ON public.medicos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_perfil_update();

-- Trigger em empresas
CREATE TRIGGER trg_audit_empresas_update
  AFTER UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_perfil_update();
