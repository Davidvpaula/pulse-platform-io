
CREATE OR REPLACE FUNCTION public.trg_acceptance_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    occurred_at, actor_id, actor_role, table_name, record_id,
    action, after_data
  ) VALUES (
    now(),
    NEW.user_id,
    'paciente',
    'user_terms_acceptance',
    NEW.id::text,
    'aceite_termo',
    jsonb_build_object('termo_id', NEW.termo_id, 'ip', NEW.ip_address)
  );
  RETURN NEW;
END;
$$;
