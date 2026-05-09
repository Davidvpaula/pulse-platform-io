-- 1) Coluna de timestamp da última atualização do link
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS link_sala_padrao_atualizado_em timestamptz;

-- 2) Default tipo_sala = 'fixo'
ALTER TABLE public.medicos
  ALTER COLUMN tipo_sala SET DEFAULT 'fixo';

-- 3) Médicos em dinamico voltam para fixo (modo dinâmico fica como opção futura)
UPDATE public.medicos
   SET tipo_sala = 'fixo'
 WHERE tipo_sala = 'dinamico';

-- 4) Backfill: quem já tem link, marca como "atualizado agora"
UPDATE public.medicos
   SET link_sala_padrao_atualizado_em = COALESCE(link_sala_padrao_atualizado_em, now())
 WHERE link_sala_padrao IS NOT NULL
   AND length(trim(link_sala_padrao)) > 0;

-- 5) Trigger BEFORE UPDATE: marca data quando link muda
CREATE OR REPLACE FUNCTION public.medico_marcar_link_atualizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.link_sala_padrao, '') IS DISTINCT FROM COALESCE(OLD.link_sala_padrao, '') THEN
    NEW.link_sala_padrao_atualizado_em := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medico_marcar_link_atualizado ON public.medicos;
CREATE TRIGGER trg_medico_marcar_link_atualizado
  BEFORE UPDATE ON public.medicos
  FOR EACH ROW
  EXECUTE FUNCTION public.medico_marcar_link_atualizado();

-- 6) Endurecer trigger de slot: SEMPRE exigir link_sala_padrao para slot online
CREATE OR REPLACE FUNCTION public.agenda_slot_exige_link_sala()
RETURNS TRIGGER
LANGUAGE plpgsql
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
      RAISE EXCEPTION 'Médico precisa configurar o link fixo da sala (link_sala_padrao) antes de oferecer horários online'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;