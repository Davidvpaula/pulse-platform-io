
-- Tabela de preferências de notificação do médico
CREATE TABLE public.medico_notificacao_prefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE UNIQUE,
  lembretes_consulta BOOLEAN NOT NULL DEFAULT true,
  alertas_operacionais BOOLEAN NOT NULL DEFAULT true,
  resumo_diario_email BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medico_notificacao_prefs ENABLE ROW LEVEL SECURITY;

-- Médico vê suas próprias prefs
CREATE POLICY "medico_notif_prefs_select" ON public.medico_notificacao_prefs
  FOR SELECT TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

-- Médico insere suas próprias prefs
CREATE POLICY "medico_notif_prefs_insert" ON public.medico_notificacao_prefs
  FOR INSERT TO authenticated
  WITH CHECK (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

-- Médico atualiza suas próprias prefs
CREATE POLICY "medico_notif_prefs_update" ON public.medico_notificacao_prefs
  FOR UPDATE TO authenticated
  USING (medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_medico_notif_prefs_updated_at
  BEFORE UPDATE ON public.medico_notificacao_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
