-- ============================================================
-- Inbox Fase Estabilidade — Etapa A
-- ============================================================

-- A.2 Colunas aditivas
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS locked_by         uuid,
  ADD COLUMN IF NOT EXISTS locked_at         timestamptz,
  ADD COLUMN IF NOT EXISTS bot_handoff_at    timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS paciente_ativo_id uuid;

CREATE INDEX IF NOT EXISTS idx_conv_locked_by ON public.conversations(locked_by) WHERE locked_by IS NOT NULL;

ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS ai_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- A.1 conversation_pacientes
CREATE TABLE IF NOT EXISTS public.conversation_pacientes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  paciente_id     uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  parentesco      text,
  origem          text NOT NULL DEFAULT 'manual',
  vinculado_por   uuid,
  vinculado_em    timestamptz NOT NULL DEFAULT now(),
  confirmado_por  uuid,
  confirmado_em   timestamptz,
  removido_em     timestamptz,
  observacao      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, paciente_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_pac_conv ON public.conversation_pacientes(conversation_id) WHERE removido_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_conv_pac_pac  ON public.conversation_pacientes(paciente_id)     WHERE removido_em IS NULL;

ALTER TABLE public.conversation_pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia conversation_pacientes"
  ON public.conversation_pacientes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff ve conversation_pacientes da conversa"
  ON public.conversation_pacientes FOR SELECT TO authenticated
  USING (user_can_view_conversation(conversation_id));

CREATE POLICY "Staff cria conversation_pacientes se responde"
  ON public.conversation_pacientes FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(), 'comunicacao.responder'::text)
    AND user_can_view_conversation(conversation_id)
  );

CREATE POLICY "Staff atualiza conversation_pacientes proprio"
  ON public.conversation_pacientes FOR UPDATE TO authenticated
  USING (
    has_permission(auth.uid(), 'comunicacao.responder'::text)
    AND user_can_view_conversation(conversation_id)
  );

-- A.1 conversation_meta_window
CREATE TABLE IF NOT EXISTS public.conversation_meta_window (
  conversation_id    uuid PRIMARY KEY REFERENCES public.conversations(id) ON DELETE CASCADE,
  last_inbound_at    timestamptz NOT NULL,
  window_expires_at  timestamptz NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_meta_window ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver janela se ve a conversa"
  ON public.conversation_meta_window FOR SELECT TO authenticated
  USING (user_can_view_conversation(conversation_id));

-- A.1 conversation_audit_log
CREATE TABLE IF NOT EXISTS public.conversation_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  actor_user_id   uuid,
  action          text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address      text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_audit_conv  ON public.conversation_audit_log(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_audit_actor ON public.conversation_audit_log(actor_user_id, created_at DESC);

ALTER TABLE public.conversation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve audit log"
  ON public.conversation_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff ve audit log proprio"
  ON public.conversation_audit_log FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

-- A.4 Trigger janela 24h
CREATE OR REPLACE FUNCTION public.tg_messages_update_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_type IN ('paciente', 'lead') THEN
    INSERT INTO public.conversation_meta_window (conversation_id, last_inbound_at, window_expires_at, updated_at)
    VALUES (NEW.conversation_id, NEW.created_at, NEW.created_at + interval '24 hours', now())
    ON CONFLICT (conversation_id) DO UPDATE
      SET last_inbound_at   = EXCLUDED.last_inbound_at,
          window_expires_at = EXCLUDED.window_expires_at,
          updated_at        = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_update_window
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.tg_messages_update_window();

-- A.4 Trigger audit lock
CREATE OR REPLACE FUNCTION public.tg_conversations_audit_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.locked_by IS DISTINCT FROM OLD.locked_by THEN
    INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
    VALUES (NEW.id, auth.uid(), CASE WHEN NEW.locked_by IS NULL THEN 'liberar' ELSE 'assumir' END,
            jsonb_build_object('from', OLD.locked_by, 'to', NEW.locked_by));
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.assigned_sector IS DISTINCT FROM OLD.assigned_sector THEN
    INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
    VALUES (NEW.id, auth.uid(), 'transferir',
            jsonb_build_object(
              'from_user', OLD.assigned_to, 'to_user', NEW.assigned_to,
              'from_sector', OLD.assigned_sector, 'to_sector', NEW.assigned_sector
            ));
  END IF;

  IF NEW.paciente_ativo_id IS DISTINCT FROM OLD.paciente_ativo_id THEN
    INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
    VALUES (NEW.id, auth.uid(), 'trocar_paciente_ativo',
            jsonb_build_object('from', OLD.paciente_ativo_id, 'to', NEW.paciente_ativo_id));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_conversations_audit_lock
AFTER UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.tg_conversations_audit_lock();

-- A.4 Trigger updated_at
CREATE TRIGGER trg_conv_pacientes_updated_at
BEFORE UPDATE ON public.conversation_pacientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A.5 RPCs
CREATE OR REPLACE FUNCTION public.assumir_conversa(p_conversation_id uuid)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT has_permission(v_uid, 'comunicacao.responder') AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para assumir conversa' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;

  IF v_conv.locked_by IS NOT NULL AND v_conv.locked_by <> v_uid AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Conversa já está sendo atendida por outro colaborador' USING ERRCODE = '55006'; END IF;

  UPDATE public.conversations
     SET locked_by = v_uid, locked_at = now(),
         assigned_to = COALESCE(assigned_to, v_uid),
         status = CASE WHEN status = 'aberta' THEN 'em_atendimento'::conversation_status ELSE status END,
         bot_active = false,
         bot_handoff_at = COALESCE(bot_handoff_at, now()),
         first_response_at = COALESCE(first_response_at, now()),
         updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  RETURN v_conv;
END; $$;

CREATE OR REPLACE FUNCTION public.liberar_conversa(p_conversation_id uuid)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;
  IF v_conv.locked_by IS DISTINCT FROM v_uid AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas o atendente atual ou admin pode liberar' USING ERRCODE = '42501'; END IF;

  UPDATE public.conversations SET locked_by = NULL, locked_at = NULL, updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  RETURN v_conv;
END; $$;

CREATE OR REPLACE FUNCTION public.transferir_conversa(
  p_conversation_id uuid, p_to_user_id uuid DEFAULT NULL,
  p_to_sector text DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF p_to_user_id IS NULL AND p_to_sector IS NULL THEN
    RAISE EXCEPTION 'Informe destino (usuário ou setor)' USING ERRCODE = '22023'; END IF;
  IF NOT has_permission(v_uid, 'comunicacao.responder') AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para transferir' USING ERRCODE = '42501'; END IF;

  UPDATE public.conversations
     SET assigned_to = COALESCE(p_to_user_id, assigned_to),
         assigned_sector = COALESCE(p_to_sector, assigned_sector),
         locked_by = NULL, locked_at = NULL,
         status = 'pendente'::conversation_status, updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversa não encontrada' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (p_conversation_id, v_uid, 'transferir_motivo',
          jsonb_build_object('to_user', p_to_user_id, 'to_sector', p_to_sector, 'reason', p_reason));
  RETURN v_conv;
END; $$;

CREATE OR REPLACE FUNCTION public.vincular_paciente_conversa(
  p_conversation_id uuid, p_paciente_id uuid,
  p_parentesco text DEFAULT 'titular', p_origem text DEFAULT 'manual')
RETURNS public.conversation_pacientes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.conversation_pacientes; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT has_permission(v_uid, 'comunicacao.responder') AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão para vincular paciente' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.conversation_pacientes (conversation_id, paciente_id, parentesco, origem, vinculado_por)
  VALUES (p_conversation_id, p_paciente_id, p_parentesco, p_origem, v_uid)
  ON CONFLICT (conversation_id, paciente_id) DO UPDATE
    SET parentesco = EXCLUDED.parentesco, origem = EXCLUDED.origem,
        vinculado_por = EXCLUDED.vinculado_por, vinculado_em = now(),
        removido_em = NULL, updated_at = now()
  RETURNING * INTO v_link;

  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (p_conversation_id, v_uid, 'vincular_paciente',
          jsonb_build_object('paciente_id', p_paciente_id, 'parentesco', p_parentesco, 'origem', p_origem));
  RETURN v_link;
END; $$;

CREATE OR REPLACE FUNCTION public.confirmar_vinculo_paciente(p_link_id uuid)
RETURNS public.conversation_pacientes LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.conversation_pacientes; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT has_permission(v_uid, 'comunicacao.responder') AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;

  UPDATE public.conversation_pacientes
     SET confirmado_por = v_uid, confirmado_em = now(), updated_at = now()
   WHERE id = p_link_id RETURNING * INTO v_link;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vínculo não encontrado' USING ERRCODE = 'P0002'; END IF;

  INSERT INTO public.conversation_audit_log (conversation_id, actor_user_id, action, payload)
  VALUES (v_link.conversation_id, v_uid, 'confirmar_vinculo',
          jsonb_build_object('link_id', v_link.id, 'paciente_id', v_link.paciente_id));
  RETURN v_link;
END; $$;

CREATE OR REPLACE FUNCTION public.definir_paciente_ativo_conversa(
  p_conversation_id uuid, p_paciente_id uuid)
RETURNS public.conversations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conv public.conversations; v_uid uuid := auth.uid(); v_exists boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '28000'; END IF;
  IF NOT has_permission(v_uid, 'comunicacao.responder') AND NOT has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501'; END IF;

  IF p_paciente_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.conversation_pacientes
       WHERE conversation_id = p_conversation_id AND paciente_id = p_paciente_id AND removido_em IS NULL
    ) INTO v_exists;
    IF NOT v_exists THEN
      RAISE EXCEPTION 'Paciente não está vinculado a esta conversa' USING ERRCODE = '23503'; END IF;
  END IF;

  UPDATE public.conversations SET paciente_ativo_id = p_paciente_id, updated_at = now()
   WHERE id = p_conversation_id RETURNING * INTO v_conv;
  RETURN v_conv;
END; $$;

GRANT EXECUTE ON FUNCTION public.assumir_conversa(uuid)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.liberar_conversa(uuid)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.transferir_conversa(uuid, uuid, text, text)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_paciente_conversa(uuid, uuid, text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_vinculo_paciente(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_paciente_ativo_conversa(uuid, uuid)         TO authenticated;