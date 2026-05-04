-- Enum para origem do canal
CREATE TYPE public.internal_thread_origem AS ENUM (
  'Secretaria ↔ Médico',
  'Secretaria ↔ Admin',
  'Empresa ↔ Secretaria',
  'Médico ↔ Admin'
);

CREATE TYPE public.internal_thread_status AS ENUM ('aberta', 'respondida', 'resolvida');
CREATE TYPE public.internal_thread_prioridade AS ENUM ('baixa', 'normal', 'alta');

-- Threads de comunicação interna
CREATE TABLE public.internal_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assunto TEXT NOT NULL,
  origem public.internal_thread_origem NOT NULL,
  status public.internal_thread_status NOT NULL DEFAULT 'aberta',
  prioridade public.internal_thread_prioridade NOT NULL DEFAULT 'normal',
  participantes UUID[] NOT NULL DEFAULT '{}',
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES public.consultas(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_threads ENABLE ROW LEVEL SECURITY;

-- Mensagens dentro de threads
CREATE TABLE public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.internal_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX idx_internal_threads_participantes ON public.internal_threads USING GIN (participantes);
CREATE INDEX idx_internal_threads_updated ON public.internal_threads (updated_at DESC);
CREATE INDEX idx_internal_messages_thread ON public.internal_messages (thread_id, created_at);

-- Helper: check if user is participant or admin
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_threads
    WHERE id = _thread_id
      AND (_user_id = ANY(participantes) OR public.has_role(_user_id, 'admin'))
  );
$$;

-- RLS: Threads
CREATE POLICY "Participante vê threads"
ON public.internal_threads FOR SELECT TO authenticated
USING (auth.uid() = ANY(participantes) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Autenticado cria thread"
ON public.internal_threads FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND auth.uid() = ANY(participantes));

CREATE POLICY "Participante atualiza thread"
ON public.internal_threads FOR UPDATE TO authenticated
USING (auth.uid() = ANY(participantes) OR public.has_role(auth.uid(), 'admin'));

-- RLS: Messages
CREATE POLICY "Participante vê mensagens"
ON public.internal_messages FOR SELECT TO authenticated
USING (public.is_thread_participant(thread_id, auth.uid()));

CREATE POLICY "Participante envia mensagem"
ON public.internal_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND public.is_thread_participant(thread_id, auth.uid())
);

-- Trigger para atualizar updated_at da thread ao inserir mensagem
CREATE OR REPLACE FUNCTION public.update_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.internal_threads SET updated_at = now() WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_thread_on_message
AFTER INSERT ON public.internal_messages
FOR EACH ROW EXECUTE FUNCTION public.update_thread_on_message();

-- Realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;