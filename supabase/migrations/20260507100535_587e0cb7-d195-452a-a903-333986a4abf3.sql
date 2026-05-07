
CREATE OR REPLACE FUNCTION public.medicos_protege_campos_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role (edge functions) pode tudo
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admin pode tudo
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Demais usuários (médico no próprio cadastro): preserva campos sensíveis
  NEW.status := OLD.status;
  NEW.motivo_reprovacao := OLD.motivo_reprovacao;
  NEW.feegow_status := OLD.feegow_status;
  NEW.feegow_professional_id := OLD.feegow_professional_id;
  NEW.feegow_liberado_em := OLD.feegow_liberado_em;
  NEW.feegow_erro := OLD.feegow_erro;
  NEW.feegow_payload := OLD.feegow_payload;
  RETURN NEW;
END;
$$;
