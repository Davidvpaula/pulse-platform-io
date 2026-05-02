
-- Trigger function: incrementa uso_atual em cupons ao inserir em cupons_uso
CREATE OR REPLACE FUNCTION public.trg_cupons_uso_incrementar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cupons
     SET uso_atual = uso_atual + 1,
         updated_at = now()
   WHERE id = NEW.cupom_id;
  RETURN NEW;
END;
$$;

-- Trigger on cupons_uso
CREATE TRIGGER cupons_uso_after_insert
  AFTER INSERT ON public.cupons_uso
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cupons_uso_incrementar();

-- Also handle DELETE (rollback usage count)
CREATE OR REPLACE FUNCTION public.trg_cupons_uso_decrementar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cupons
     SET uso_atual = greatest(0, uso_atual - 1),
         updated_at = now()
   WHERE id = OLD.cupom_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER cupons_uso_after_delete
  AFTER DELETE ON public.cupons_uso
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cupons_uso_decrementar();
