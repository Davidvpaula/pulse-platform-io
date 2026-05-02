
CREATE OR REPLACE FUNCTION public.trg_termos_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_log (
    occurred_at, actor_id, actor_role, table_name, record_id,
    action, before_data, after_data, changed_fields
  ) VALUES (
    now(),
    COALESCE(auth.uid(), NEW.created_by),
    'admin',
    'termos_condicoes',
    NEW.id::text,
    CASE WHEN TG_OP = 'INSERT' THEN 'criacao_termo'
         WHEN TG_OP = 'UPDATE' AND NEW.status = 'ativo' AND (OLD.status IS DISTINCT FROM 'ativo') THEN 'ativacao_termo'
         ELSE 'edicao_termo' END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW),
    CASE WHEN TG_OP = 'UPDATE' THEN ARRAY['status'] ELSE ARRAY['*'] END
  );
  RETURN NEW;
END;
$$;
