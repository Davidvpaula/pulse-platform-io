
-- Tabela espelho de eventos do Google Calendar por consulta
CREATE TABLE public.consulta_google_event (
  consulta_id uuid PRIMARY KEY REFERENCES public.consultas(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  google_event_id text,
  calendar_id text NOT NULL DEFAULT 'primary',
  sync_status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cge_status CHECK (sync_status IN ('pending','synced','failed','deleted','skipped'))
);

CREATE INDEX idx_cge_status_pending ON public.consulta_google_event (sync_status)
  WHERE sync_status <> 'synced';
CREATE INDEX idx_cge_medico ON public.consulta_google_event (medico_id);

ALTER TABLE public.consulta_google_event ENABLE ROW LEVEL SECURITY;

-- Médico dono pode visualizar status do espelho
CREATE POLICY "Medico ve seu proprio sync google"
  ON public.consulta_google_event
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.medicos m
      WHERE m.id = consulta_google_event.medico_id
        AND m.user_id = auth.uid()
    )
  );

-- Admin pode visualizar tudo (NOC futuro)
CREATE POLICY "Admin ve todo sync google"
  ON public.consulta_google_event
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER trg_cge_updated_at
  BEFORE UPDATE ON public.consulta_google_event
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
