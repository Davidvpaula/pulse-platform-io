
CREATE OR REPLACE FUNCTION public.trg_validar_cancelamento_4h()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when status is changing TO cancelada
  IF NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada' THEN
    -- Skip for admins
    IF has_role(auth.uid(), 'admin') THEN
      RETURN NEW;
    END IF;
    -- Skip for medicos (they cancel via their own flow)
    IF EXISTS (SELECT 1 FROM medicos m WHERE m.user_id = auth.uid() AND m.id = OLD.medico_id) THEN
      RETURN NEW;
    END IF;
    -- Skip for staff with permission
    IF has_permission(auth.uid(), 'agenda.ver_todas') THEN
      RETURN NEW;
    END IF;
    -- Enforce 4h rule for patients
    IF OLD.inicio - now() < interval '4 hours' THEN
      RAISE EXCEPTION 'Não é possível cancelar com menos de 4 horas de antecedência. Entre em contato via WhatsApp para cancelamentos de última hora.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consulta_cancelamento_4h
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validar_cancelamento_4h();
