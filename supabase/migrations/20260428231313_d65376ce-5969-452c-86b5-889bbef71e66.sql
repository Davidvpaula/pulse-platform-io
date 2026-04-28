-- Adicionar campos de especialista (CFM) ao vínculo médico-especialidade
ALTER TABLE public.medico_especialidades
  ADD COLUMN IF NOT EXISTS especialista boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rqe text;

-- Validação: se marcado como especialista, RQE deve estar preenchido
-- (exceto Clínica Geral, que nunca é "especialidade" no sentido CFM)
CREATE OR REPLACE FUNCTION public.validar_rqe_especialista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
BEGIN
  SELECT slug INTO v_slug FROM public.especialidades WHERE id = NEW.especialidade_id;

  -- Clínica Geral: não permite marcar como especialista
  IF v_slug IN ('clinica-geral', 'clinico-geral') THEN
    NEW.especialista := false;
    NEW.rqe := NULL;
  ELSIF NEW.especialista = true AND (NEW.rqe IS NULL OR length(trim(NEW.rqe)) = 0) THEN
    RAISE EXCEPTION 'RQE é obrigatório quando o médico é especialista (CFM).';
  ELSIF NEW.especialista = false THEN
    NEW.rqe := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_rqe_especialista ON public.medico_especialidades;
CREATE TRIGGER trg_validar_rqe_especialista
  BEFORE INSERT OR UPDATE ON public.medico_especialidades
  FOR EACH ROW EXECUTE FUNCTION public.validar_rqe_especialista();