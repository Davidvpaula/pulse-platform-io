
CREATE OR REPLACE FUNCTION public.trg_cupons_bloquear_delete_com_uso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cupons_uso WHERE cupom_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Não é possível excluir o cupom "%" porque já possui histórico de uso. Desative-o em vez de removê-lo.', OLD.codigo
      USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cupons_bloquear_delete
  BEFORE DELETE ON public.cupons
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cupons_bloquear_delete_com_uso();
