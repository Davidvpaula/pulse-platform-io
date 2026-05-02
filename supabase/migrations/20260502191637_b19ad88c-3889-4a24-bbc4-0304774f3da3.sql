-- Trigger function for servicos_financeiros audit
CREATE OR REPLACE FUNCTION public.fn_audit_servicos_financeiros()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.financeiro_auditoria (
    entidade, entidade_id, acao, actor_id,
    valor_anterior, valor_novo, payload
  ) VALUES (
    'servicos_financeiros',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD)::text ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW)::text ELSE NULL END,
    jsonb_build_object(
      'nome', COALESCE(NEW.nome, OLD.nome),
      'operacao', TG_OP
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_audit_servicos_financeiros
  AFTER INSERT OR UPDATE OR DELETE ON public.servicos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_servicos_financeiros();