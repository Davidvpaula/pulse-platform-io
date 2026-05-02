
-- 1. Audit trigger on cupons_uso (reuses existing fn_audit_trigger)
CREATE TRIGGER trg_audit_cupons_uso
  AFTER INSERT OR UPDATE OR DELETE ON public.cupons_uso
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_trigger();

-- 2. Trigger to log coupon usage in financeiro_auditoria
CREATE OR REPLACE FUNCTION public.trg_cupons_uso_financeiro_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financeiro_auditoria (
      entidade, entidade_id, acao, actor_id,
      valor_anterior, valor_novo, motivo, payload
    ) VALUES (
      'cupons_uso', NEW.id, 'cupom_aplicado', NEW.aplicado_por,
      NEW.valor_original_centavos::text,
      NEW.valor_final_centavos::text,
      'Cupom ' || NEW.codigo_snapshot || ' aplicado',
      jsonb_build_object(
        'cupom_id', NEW.cupom_id,
        'consulta_id', NEW.consulta_id,
        'desconto_centavos', NEW.valor_desconto_centavos
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financeiro_auditoria (
      entidade, entidade_id, acao, actor_id,
      valor_anterior, valor_novo, motivo, payload
    ) VALUES (
      'cupons_uso', OLD.id, 'cupom_removido', auth.uid(),
      OLD.valor_final_centavos::text,
      OLD.valor_original_centavos::text,
      'Cupom ' || OLD.codigo_snapshot || ' removido (estorno)',
      jsonb_build_object(
        'cupom_id', OLD.cupom_id,
        'consulta_id', OLD.consulta_id,
        'desconto_centavos', OLD.valor_desconto_centavos
      )
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_cupons_uso_fin_auditoria
  AFTER INSERT OR DELETE ON public.cupons_uso
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cupons_uso_financeiro_auditoria();
