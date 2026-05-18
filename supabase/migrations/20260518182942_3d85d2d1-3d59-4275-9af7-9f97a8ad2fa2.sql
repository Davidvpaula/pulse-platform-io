CREATE OR REPLACE FUNCTION public.trg_acceptance_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM medicos WHERE user_id = NEW.user_id) THEN 'medico'
    WHEN EXISTS (SELECT 1 FROM empresas WHERE user_id = NEW.user_id) THEN 'empresa'
    WHEN EXISTS (SELECT 1 FROM colaboradores WHERE user_id = NEW.user_id) THEN 'colaborador'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN 'admin'
    ELSE 'paciente'
  END INTO v_role;

  INSERT INTO public.audit_log (
    occurred_at, actor_id, actor_role, table_name, record_id, action, after_data
  ) VALUES (
    now(), NEW.user_id, v_role, 'user_terms_acceptance', NEW.id::text,
    'INSERT',
    jsonb_build_object('event','aceite_termo','termo_id',NEW.termo_id,'ip',NEW.ip_address)
  );
  RETURN NEW;
END $$;