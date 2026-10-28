CREATE OR REPLACE FUNCTION public.proteger_status_operacional_paciente()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user='authenticated' AND NOT has_role(auth.uid(),'admin')
    AND EXISTS(SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role::text IN ('colaborador','secretaria','supervisor'))
    AND (NEW.status_conta,NEW.bloqueado_ate,NEW.status_motivo,NEW.status_observacao,NEW.status_alterado_por,NEW.status_alterado_em)
      IS DISTINCT FROM (OLD.status_conta,OLD.bloqueado_ate,OLD.status_motivo,OLD.status_observacao,OLD.status_alterado_por,OLD.status_alterado_em)
  THEN RAISE EXCEPTION 'Altere o status pela operação auditada' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER proteger_status_operacional_paciente BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.proteger_status_operacional_paciente();
