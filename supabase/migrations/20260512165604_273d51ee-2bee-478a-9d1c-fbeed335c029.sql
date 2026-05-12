
CREATE OR REPLACE FUNCTION public.trg_medicos_contratos_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.status IN ('aprovado','reprovado') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT user_id INTO v_user FROM public.medicos WHERE id = NEW.medico_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, tipo, titulo, descricao, perfil, referencia_tipo, referencia_id)
      VALUES (
        v_user,
        'contrato_' || NEW.status::text,
        CASE WHEN NEW.status = 'aprovado' THEN 'Contrato aprovado' ELSE 'Contrato reprovado' END,
        CASE WHEN NEW.status = 'aprovado'
          THEN 'Seu contrato foi aprovado pela administração.'
          ELSE coalesce('Motivo: ' || NEW.motivo_reprovacao, 'Seu contrato foi reprovado. Reenvie com as correções.')
        END,
        'medico',
        'medico_contrato',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;
