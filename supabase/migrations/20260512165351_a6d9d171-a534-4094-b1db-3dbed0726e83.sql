
CREATE TYPE public.medico_contrato_status AS ENUM ('pendente','em_analise','aprovado','reprovado');

CREATE TABLE public.medicos_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  termo_id uuid NOT NULL REFERENCES public.termos_condicoes(id),
  arquivo_path text NOT NULL,
  arquivo_nome text NOT NULL,
  status public.medico_contrato_status NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz NOT NULL DEFAULT now(),
  revisado_em timestamptz,
  revisado_por uuid REFERENCES auth.users(id),
  motivo_reprovacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicos_contratos_medico ON public.medicos_contratos(medico_id);
CREATE INDEX idx_medicos_contratos_status ON public.medicos_contratos(status);

ALTER TABLE public.medicos_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico ve seus contratos"
ON public.medicos_contratos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Medico insere seus contratos"
ON public.medicos_contratos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admin gerencia todos contratos"
ON public.medicos_contratos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_medicos_contratos_updated_at
BEFORE UPDATE ON public.medicos_contratos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: ao aprovar/reprovar, notifica o medico
CREATE OR REPLACE FUNCTION public.trg_medicos_contratos_notify()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid;
BEGIN
  IF NEW.status IN ('aprovado','reprovado') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT user_id INTO v_user FROM public.medicos WHERE id = NEW.medico_id;
    IF v_user IS NOT NULL THEN
      INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem, link)
      VALUES (
        v_user,
        'contrato_' || NEW.status::text,
        CASE WHEN NEW.status = 'aprovado' THEN 'Contrato aprovado' ELSE 'Contrato reprovado' END,
        CASE WHEN NEW.status = 'aprovado'
          THEN 'Seu contrato foi aprovado pela administração.'
          ELSE coalesce('Motivo: ' || NEW.motivo_reprovacao, 'Seu contrato foi reprovado. Reenvie com as correções.')
        END,
        '/app/medico/perfil'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_medicos_contratos_notify
AFTER UPDATE ON public.medicos_contratos
FOR EACH ROW EXECUTE FUNCTION public.trg_medicos_contratos_notify();
