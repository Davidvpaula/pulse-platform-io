
CREATE OR REPLACE FUNCTION public.trg_planos_bloquear_delete_com_assinaturas()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assinaturas
    WHERE plano_id = OLD.id
      AND status IN ('trial', 'ativa', 'pausada')
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir o plano "%" porque possui assinaturas ativas/pausadas/trial. Cancele-as primeiro.', OLD.nome;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_planos_bloquear_delete
BEFORE DELETE ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.trg_planos_bloquear_delete_com_assinaturas();

-- Hardening: revogar execução anônima
REVOKE EXECUTE ON FUNCTION public.trg_planos_bloquear_delete_com_assinaturas() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_planos_bloquear_delete_com_assinaturas() FROM public;
