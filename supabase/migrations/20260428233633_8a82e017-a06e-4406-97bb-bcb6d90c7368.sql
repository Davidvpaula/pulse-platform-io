CREATE OR REPLACE FUNCTION public.cpf_valido(_cpf text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _cpf IS NULL OR length(regexp_replace(_cpf, '\D', '', 'g')) = 11
$$;