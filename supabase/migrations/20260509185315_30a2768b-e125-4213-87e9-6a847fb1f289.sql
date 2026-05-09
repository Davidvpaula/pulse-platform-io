CREATE OR REPLACE FUNCTION public.agenda_slot_exige_link_sala()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link text;
  v_tipo text;
BEGIN
  IF NEW.modalidade = 'online' THEN
    SELECT link_sala_padrao, COALESCE(tipo_sala, 'fixo')
      INTO v_link, v_tipo
      FROM public.medicos
     WHERE id = NEW.medico_id;

    -- Modo dinâmico: link é gerado pelo Google Meet via google-calendar-sync.
    -- Não exige link_sala_padrao.
    IF v_tipo = 'dinamico' THEN
      RETURN NEW;
    END IF;

    -- Modo fixo (default): exige link_sala_padrao configurado.
    IF v_link IS NULL OR length(trim(v_link)) = 0 THEN
      RAISE EXCEPTION 'Configure o link padrão da sala (Meet, Zoom, etc.) no seu perfil ou ative o modo Google Meet dinâmico antes de criar horários online.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;