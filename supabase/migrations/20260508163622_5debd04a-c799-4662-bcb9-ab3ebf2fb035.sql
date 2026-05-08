
-- 1. Novo valor de status (não destrutivo)
ALTER TYPE public.conversation_status ADD VALUE IF NOT EXISTS 'aguardando_paciente';

-- 2. Setores
CREATE TABLE IF NOT EXISTS public.communication_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communication_departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth ve setores" ON public.communication_departments;
CREATE POLICY "Auth ve setores" ON public.communication_departments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gerencia setores" ON public.communication_departments;
CREATE POLICY "Admin gerencia setores" ON public.communication_departments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Filas
CREATE TABLE IF NOT EXISTS public.communication_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  department_id uuid REFERENCES public.communication_departments(id) ON DELETE SET NULL,
  descricao text,
  prioridade_padrao public.conversation_priority NOT NULL DEFAULT 'normal',
  sla_minutos int NOT NULL DEFAULT 60,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queues_dept ON public.communication_queues(department_id);
ALTER TABLE public.communication_queues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth ve filas" ON public.communication_queues;
CREATE POLICY "Auth ve filas" ON public.communication_queues
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin gerencia filas" ON public.communication_queues;
CREATE POLICY "Admin gerencia filas" ON public.communication_queues
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Membros de fila
CREATE TABLE IF NOT EXISTS public.queue_members (
  queue_id uuid NOT NULL REFERENCES public.communication_queues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'atendente' CHECK (role IN ('atendente','supervisor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (queue_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_qmembers_user ON public.queue_members(user_id);
ALTER TABLE public.queue_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Atendente ve seus membros" ON public.queue_members;
CREATE POLICY "Atendente ve seus membros" ON public.queue_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin gerencia membros" ON public.queue_members;
CREATE POLICY "Admin gerencia membros" ON public.queue_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Conversations: novos campos
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.communication_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_id uuid REFERENCES public.communication_queues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid;
CREATE INDEX IF NOT EXISTS idx_conv_queue ON public.conversations(queue_id);
CREATE INDEX IF NOT EXISTS idx_conv_dept ON public.conversations(department_id);
CREATE INDEX IF NOT EXISTS idx_conv_sla ON public.conversations(sla_due_at) WHERE resolved_at IS NULL;

-- 6. Attendant presence
CREATE TABLE IF NOT EXISTS public.attendant_presence (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online','ocupado','ausente','offline')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  current_conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendant_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Operadores veem presença" ON public.attendant_presence;
CREATE POLICY "Operadores veem presença" ON public.attendant_presence
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.medicos WHERE user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Usuario atualiza propria presença" ON public.attendant_presence;
CREATE POLICY "Usuario atualiza propria presença" ON public.attendant_presence
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Conversation typing
CREATE TABLE IF NOT EXISTS public.conversation_typing (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_typing boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE public.conversation_typing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quem ve a conversa ve typing" ON public.conversation_typing;
CREATE POLICY "Quem ve a conversa ve typing" ON public.conversation_typing
  FOR SELECT TO authenticated USING (public.user_can_view_conversation(conversation_id));
DROP POLICY IF EXISTS "Usuario marca proprio typing" ON public.conversation_typing;
CREATE POLICY "Usuario marca proprio typing" ON public.conversation_typing
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendant_presence;

-- 8. claim_conversation (alias)
CREATE OR REPLACE FUNCTION public.claim_conversation(p_conversation_id uuid)
RETURNS public.conversations
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.assumir_conversa(p_conversation_id); $$;

-- 9. update_conversation_status
CREATE OR REPLACE FUNCTION public.update_conversation_status(p_conversation_id uuid, p_status public.conversation_status)
RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT public.has_permission(v_uid, 'comunicacao.responder') AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;
  v_old := v_conv.status::text;
  UPDATE public.conversations
     SET status = p_status,
         resolved_at = CASE WHEN p_status = 'fechada' THEN now() ELSE resolved_at END,
         resolved_by = CASE WHEN p_status = 'fechada' THEN v_uid ELSE resolved_by END,
         closed_at = CASE WHEN p_status = 'fechada' THEN COALESCE(closed_at, now()) ELSE closed_at END,
         closed_by = CASE WHEN p_status = 'fechada' THEN COALESCE(closed_by, v_uid) ELSE closed_by END,
         updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (p_conversation_id, v_uid, 'status_alterado', jsonb_build_object('old', v_old, 'new', p_status));
  RETURN v_conv;
END; $$;

-- 10. update_conversation_priority
CREATE OR REPLACE FUNCTION public.update_conversation_priority(p_conversation_id uuid, p_priority public.conversation_priority)
RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT public.has_permission(v_uid, 'comunicacao.inbox.alterar_prioridade') AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para alterar prioridade' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;
  v_old := v_conv.priority::text;
  UPDATE public.conversations SET priority = p_priority, updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (p_conversation_id, v_uid, 'prioridade_alterada', jsonb_build_object('old', v_old, 'new', p_priority));
  RETURN v_conv;
END; $$;

-- 11. set_conversation_queue (atribui fila + recalcula SLA)
CREATE OR REPLACE FUNCTION public.set_conversation_queue(p_conversation_id uuid, p_queue_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid(); v_q public.communication_queues;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT public.has_permission(v_uid, 'comunicacao.responder') AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_q FROM public.communication_queues WHERE id = p_queue_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fila não encontrada' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.conversations
     SET queue_id = p_queue_id,
         department_id = COALESCE(v_q.department_id, department_id),
         sla_due_at = now() + (v_q.sla_minutos || ' minutes')::interval,
         updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (p_conversation_id, v_uid, 'fila_atribuida', jsonb_build_object('queue_id', p_queue_id, 'department_id', v_q.department_id));
  RETURN v_conv;
END; $$;

-- 12. update_attendant_presence
CREATE OR REPLACE FUNCTION public.update_attendant_presence(p_status text, p_current_conversation_id uuid DEFAULT NULL)
RETURNS public.attendant_presence
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.attendant_presence;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF p_status NOT IN ('online','ocupado','ausente','offline') THEN
    RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.attendant_presence (user_id, status, last_seen_at, current_conversation_id, updated_at)
  VALUES (v_uid, p_status, now(), p_current_conversation_id, now())
  ON CONFLICT (user_id) DO UPDATE
    SET status = EXCLUDED.status,
        last_seen_at = now(),
        current_conversation_id = EXCLUDED.current_conversation_id,
        updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

-- 13. set_typing
CREATE OR REPLACE FUNCTION public.set_typing(p_conversation_id uuid, p_is_typing boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  INSERT INTO public.conversation_typing (conversation_id, user_id, is_typing, updated_at)
  VALUES (p_conversation_id, v_uid, p_is_typing, now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET is_typing = EXCLUDED.is_typing, updated_at = now();
END; $$;

-- 14. resolver_conversa (atalho)
CREATE OR REPLACE FUNCTION public.resolver_conversa(p_conversation_id uuid)
RETURNS public.conversations
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.update_conversation_status(p_conversation_id, 'fechada'::public.conversation_status); $$;

GRANT EXECUTE ON FUNCTION public.claim_conversation(uuid),
                         public.update_conversation_status(uuid, public.conversation_status),
                         public.update_conversation_priority(uuid, public.conversation_priority),
                         public.set_conversation_queue(uuid, uuid),
                         public.update_attendant_presence(text, uuid),
                         public.set_typing(uuid, boolean),
                         public.resolver_conversa(uuid)
TO authenticated;
