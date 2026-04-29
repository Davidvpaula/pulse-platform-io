-- 1) Adiciona campo link_sala_padrao na tabela medicos
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS link_sala_padrao text;

-- Validação: quando preenchido, precisa ser uma URL https
ALTER TABLE public.medicos
  DROP CONSTRAINT IF EXISTS medicos_link_sala_padrao_https;
ALTER TABLE public.medicos
  ADD CONSTRAINT medicos_link_sala_padrao_https
  CHECK (link_sala_padrao IS NULL OR link_sala_padrao ~* '^https://');

-- 2) Trigger: ao criar consulta, se medico tiver link_sala_padrao e consulta for online,
-- preenche consultas.link_sala automaticamente
CREATE OR REPLACE FUNCTION public.consulta_preencher_link_sala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  IF NEW.modalidade = 'online' AND (NEW.link_sala IS NULL OR NEW.link_sala = '') THEN
    SELECT link_sala_padrao INTO v_link
      FROM public.medicos
     WHERE id = NEW.medico_id;
    IF v_link IS NOT NULL AND length(trim(v_link)) > 0 THEN
      NEW.link_sala := v_link;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_preencher_link_sala ON public.consultas;
CREATE TRIGGER trg_consulta_preencher_link_sala
  BEFORE INSERT ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.consulta_preencher_link_sala();

-- 3) Trigger: bloqueia criação de slot online se médico não tiver link_sala_padrao
CREATE OR REPLACE FUNCTION public.agenda_slot_exige_link_sala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text;
BEGIN
  IF NEW.modalidade = 'online' THEN
    SELECT link_sala_padrao INTO v_link
      FROM public.medicos
     WHERE id = NEW.medico_id;
    IF v_link IS NULL OR length(trim(v_link)) = 0 THEN
      RAISE EXCEPTION 'Configure o link padrão da sala (Meet, Zoom, etc.) no seu perfil antes de criar horários online.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agenda_slot_exige_link_sala ON public.agenda_slots;
CREATE TRIGGER trg_agenda_slot_exige_link_sala
  BEFORE INSERT ON public.agenda_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.agenda_slot_exige_link_sala();