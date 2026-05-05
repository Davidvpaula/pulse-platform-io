
CREATE OR REPLACE FUNCTION public.fn_audit_perfil_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_changed TEXT[];
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_actor LIMIT 1;
  END IF;

  SELECT array_agg(k) INTO v_changed
  FROM jsonb_object_keys(to_jsonb(NEW)) k
  WHERE to_jsonb(OLD)->k IS DISTINCT FROM to_jsonb(NEW)->k
    AND k NOT IN ('updated_at');

  IF v_changed IS NULL OR array_length(v_changed,1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_role, table_name, record_id, action, before_data, after_data, changed_fields)
  VALUES (v_actor, v_role, TG_TABLE_NAME, NEW.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_changed);

  RETURN NEW;
END;
$$;
