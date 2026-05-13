-- Trigger: notificar médico quando contrato é aprovado/reprovado
CREATE OR REPLACE FUNCTION public.notificar_medico_contrato_revisado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_titulo text;
  v_descricao text;
BEGIN
  -- só age quando status muda para aprovado/reprovado
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('aprovado', 'reprovado') THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_user_id FROM public.medicos WHERE id = NEW.medico_id;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovado' THEN
    v_titulo := 'Contrato aprovado';
    v_descricao := 'Seu contrato foi validado pela administração da plataforma.';
  ELSE
    v_titulo := 'Contrato reprovado';
    v_descricao := COALESCE(
      'Motivo: ' || NULLIF(trim(NEW.motivo_reprovacao), ''),
      'Seu contrato foi reprovado. Reenvie um novo arquivo assinado.'
    );
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, descricao, referencia_tipo, referencia_id, perfil)
  VALUES (v_user_id, 'contrato', v_titulo, v_descricao, 'medicos_contratos', NEW.id, 'medico');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_medico_contrato_revisado ON public.medicos_contratos;
CREATE TRIGGER trg_notificar_medico_contrato_revisado
AFTER UPDATE OF status ON public.medicos_contratos
FOR EACH ROW
EXECUTE FUNCTION public.notificar_medico_contrato_revisado();