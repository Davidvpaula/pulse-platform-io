-- Trigger: liberar slot quando consulta é cancelada/no_show
CREATE OR REPLACE FUNCTION public.fn_liberar_slot_ao_cancelar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelada', 'no_show')
     AND OLD.status NOT IN ('cancelada', 'no_show')
     AND NEW.slot_id IS NOT NULL
  THEN
    UPDATE public.agenda_slots
    SET status = 'disponivel',
        reservado_por = NULL,
        reserva_expira_em = NULL,
        reservado_por_consulta_id = NULL
    WHERE id = NEW.slot_id
      AND status IN ('reservado', 'bloqueado');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_liberar_slot_cancelamento
  AFTER UPDATE OF status ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION fn_liberar_slot_ao_cancelar();

-- Fix: liberar os 16 slots órfãos já existentes
UPDATE public.agenda_slots s
SET status = 'disponivel',
    reservado_por = NULL,
    reserva_expira_em = NULL,
    reservado_por_consulta_id = NULL
WHERE s.status IN ('reservado', 'bloqueado')
  AND s.reservado_por_consulta_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.consultas c
    WHERE c.id = s.reservado_por_consulta_id
    AND c.status IN ('cancelada', 'no_show')
  );
