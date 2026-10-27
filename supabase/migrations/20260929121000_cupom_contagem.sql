-- O AFTER INSERT já incrementa o contador. O BEFORE só identifica o ator.
CREATE OR REPLACE FUNCTION public.cupons_uso_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.aplicado_por IS NULL THEN NEW.aplicado_por := auth.uid(); END IF;
  RETURN NEW;
END; $$;
