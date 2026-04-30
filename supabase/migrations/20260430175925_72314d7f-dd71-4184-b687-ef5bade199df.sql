-- =============================================================
-- MÓDULO DE COMUNICAÇÃO — Fundação (WhatsApp / Bot / IA / Automações)
-- =============================================================

-- ENUMS ---------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.whatsapp_instance_tipo AS ENUM ('comercial','operacional','suporte');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.whatsapp_instance_status AS ENUM ('conectado','desconectado','pendente','erro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_status AS ENUM ('aberta','em_atendimento','pendente','fechada','arquivada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_channel AS ENUM ('whatsapp','site','interno','email');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_origin AS ENUM ('comercial','operacional','site','empresa','medico','sistema');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_priority AS ENUM ('baixa','normal','alta','urgente');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_sender_type AS ENUM ('paciente','lead','bot','ia','colaborador','medico','sistema');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text','template','system','media','audio','image','document','interactive');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_status AS ENUM ('queued','sent','delivered','read','failed','received');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.bot_step_type AS ENUM ('mensagem','escolha','condicao','delay','coletar_dado','validar_cpf','consultar_agendamento','enviar_link','encaminhar_humano','finalizar');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_category AS ENUM ('confirmacao','lembrete_24h','lembrete_1h','link_meet','cobranca','pos_consulta','documento','retorno','empresa','suporte','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.template_wa_status AS ENUM ('rascunho','pendente','aprovado','rejeitado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_trigger AS ENUM (
    'appointment.created','appointment.confirmed','appointment.payment_pending','appointment.payment_approved',
    'appointment.starts_soon_24h','appointment.starts_soon_1h','appointment.starts_soon_30min','appointment.starts_soon_5min',
    'appointment.finished','appointment.no_show','document.available','payment.refunded',
    'conversation.received','conversation.assigned','conversation.closed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_action_type AS ENUM ('send_template','send_message','assign_conversation','transfer_sector','create_task','notify_user','webhook');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.automation_log_status AS ENUM ('sucesso','falha','pulado','agendado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_provider AS ENUM ('lovable','openai','anthropic','gemini','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- TABELAS -------------------------------------------------------

-- WhatsApp Instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo public.whatsapp_instance_tipo NOT NULL DEFAULT 'comercial',
  numero text,
  phone_number_id text,
  business_account_id text,
  status public.whatsapp_instance_status NOT NULL DEFAULT 'pendente',
  webhook_status text,
  ultima_sincronizacao timestamptz,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Leads (contatos sem paciente cadastrado ainda)
CREATE TABLE IF NOT EXISTS public.conversation_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL,
  nome text,
  cpf text,
  email text,
  motivo_contato text,
  empresa_potencial text,
  origem text,
  observacoes text,
  paciente_id uuid,
  convertido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_leads_telefone ON public.conversation_leads(telefone);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  patient_id uuid,
  lead_id uuid REFERENCES public.conversation_leads(id) ON DELETE SET NULL,
  medico_id uuid,
  consulta_id uuid,
  empresa_id uuid,
  contact_phone text,
  contact_name text,
  assigned_to uuid,
  assigned_sector text,
  status public.conversation_status NOT NULL DEFAULT 'aberta',
  channel public.conversation_channel NOT NULL DEFAULT 'whatsapp',
  origin public.conversation_origin NOT NULL DEFAULT 'comercial',
  priority public.conversation_priority NOT NULL DEFAULT 'normal',
  bot_active boolean NOT NULL DEFAULT true,
  ai_active boolean NOT NULL DEFAULT false,
  intent text,
  tags text[] NOT NULL DEFAULT '{}',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  last_message_preview text,
  closed_at timestamptz,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_assigned_to ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conv_patient ON public.conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conv_medico ON public.conversations(medico_id);
CREATE INDEX IF NOT EXISTS idx_conv_consulta ON public.conversations(consulta_id);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg ON public.conversations(last_message_at DESC);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type public.message_sender_type NOT NULL,
  sender_id uuid,
  sender_name text,
  body text,
  message_type public.message_type NOT NULL DEFAULT 'text',
  media_url text,
  media_mime text,
  whatsapp_message_id text,
  template_id uuid,
  status public.message_status NOT NULL DEFAULT 'sent',
  failure_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_wa_id ON public.messages(whatsapp_message_id);

-- Assignments / transferências
CREATE TABLE IF NOT EXISTS public.conversation_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id uuid,
  to_user_id uuid,
  to_sector text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_assign_conv ON public.conversation_assignments(conversation_id);

-- Internal notes
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_int_notes_conv ON public.internal_notes(conversation_id);

-- Bot flows
CREATE TABLE IF NOT EXISTS public.bot_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  channel public.conversation_channel NOT NULL DEFAULT 'whatsapp',
  active boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  trigger_keywords text[] NOT NULL DEFAULT '{}',
  start_step_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bot_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.bot_flows(id) ON DELETE CASCADE,
  type public.bot_step_type NOT NULL,
  label text,
  content text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_step_id uuid,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bot_steps_flow ON public.bot_steps(flow_id, order_index);

-- Templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.template_category NOT NULL DEFAULT 'outro',
  language text NOT NULL DEFAULT 'pt_BR',
  content text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  whatsapp_status public.template_wa_status NOT NULL DEFAULT 'rascunho',
  whatsapp_template_name text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Automations
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger public.automation_trigger NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type public.automation_action_type NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channel public.conversation_channel NOT NULL DEFAULT 'whatsapp',
  active boolean NOT NULL DEFAULT false,
  delay_seconds integer NOT NULL DEFAULT 0,
  last_executed_at timestamptz,
  success_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  patient_id uuid,
  appointment_id uuid,
  conversation_id uuid,
  status public.automation_log_status NOT NULL,
  error_message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aut_logs_automation ON public.automation_logs(automation_id, executed_at DESC);

-- AI Settings & logs
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  model text,
  active boolean NOT NULL DEFAULT false,
  base_prompt text,
  knowledge_base text,
  safety_rules text,
  max_tokens integer DEFAULT 1024,
  temperature numeric(3,2) DEFAULT 0.4,
  handoff_keywords text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  provider public.ai_provider,
  model text,
  prompt text,
  response text,
  action_taken text,
  tokens_in integer,
  tokens_out integer,
  latency_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_conv ON public.ai_logs(conversation_id, created_at DESC);

-- Auditoria geral do módulo
CREATE TABLE IF NOT EXISTS public.comunicacao_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_com_aud_entity ON public.comunicacao_auditoria(entity_type, entity_id);

-- TRIGGERS updated_at -----------------------------------------
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'whatsapp_instances','conversation_leads','conversations',
    'bot_flows','bot_steps','message_templates','automation_rules','ai_settings'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;

-- HELPER: usuário é o médico de uma conversa? -----------------
CREATE OR REPLACE FUNCTION public.is_medico_da_conversa(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.id = _conversation_id
      AND m.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.consultas k ON k.id = c.consulta_id
    JOIN public.medicos m ON m.id = k.medico_id
    WHERE c.id = _conversation_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_view_conversation(_conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_permission(auth.uid(), 'comunicacao.ver_todas')
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv_id
        AND (
          c.assigned_to = auth.uid()
          OR (public.has_permission(auth.uid(), 'comunicacao.ver_atribuidas') AND c.assigned_to = auth.uid())
        )
    )
    OR public.is_medico_da_conversa(_conv_id);
$$;

-- RLS ---------------------------------------------------------
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicacao_auditoria ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances: só admin / staff com permissão
CREATE POLICY "Admin gerencia whatsapp_instances" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve whatsapp_instances" ON public.whatsapp_instances
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'integracoes.whatsapp_configurar') OR has_permission(auth.uid(),'comunicacao.ver_inbox'));

-- conversation_leads
CREATE POLICY "Admin gerencia leads" ON public.conversation_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff gerencia leads" ON public.conversation_leads
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_inbox'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.ver_inbox'));

-- conversations
CREATE POLICY "Admin gerencia conversations" ON public.conversations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve todas conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_todas'));
CREATE POLICY "Staff ve conversations atribuidas" ON public.conversations
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_atribuidas') AND assigned_to = auth.uid());
CREATE POLICY "Staff atualiza conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.responder') AND (
    has_permission(auth.uid(),'comunicacao.ver_todas') OR assigned_to = auth.uid()
  ))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.responder'));
CREATE POLICY "Staff cria conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(),'comunicacao.responder'));
CREATE POLICY "Medico ve conversations vinculadas" ON public.conversations
  FOR SELECT TO authenticated
  USING (is_medico_da_conversa(id));

-- messages
CREATE POLICY "Admin gerencia messages" ON public.messages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Ver messages se ve a conversa" ON public.messages
  FOR SELECT TO authenticated
  USING (user_can_view_conversation(conversation_id));
CREATE POLICY "Inserir messages se pode responder" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    has_permission(auth.uid(),'comunicacao.responder')
    AND user_can_view_conversation(conversation_id)
  );

-- conversation_assignments
CREATE POLICY "Admin gerencia assignments" ON public.conversation_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve assignments" ON public.conversation_assignments
  FOR SELECT TO authenticated
  USING (user_can_view_conversation(conversation_id));
CREATE POLICY "Staff cria assignments" ON public.conversation_assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(),'comunicacao.transferir') AND user_can_view_conversation(conversation_id));

-- internal_notes
CREATE POLICY "Admin gerencia internal_notes" ON public.internal_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve internal_notes" ON public.internal_notes
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_inbox') AND user_can_view_conversation(conversation_id));
CREATE POLICY "Staff cria internal_notes" ON public.internal_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND user_can_view_conversation(conversation_id));

-- bot_flows / bot_steps
CREATE POLICY "Admin gerencia bot_flows" ON public.bot_flows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff configura bot_flows" ON public.bot_flows
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.configurar_bot'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.configurar_bot'));
CREATE POLICY "Staff ve bot_flows ativos" ON public.bot_flows
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_inbox'));

CREATE POLICY "Admin gerencia bot_steps" ON public.bot_steps
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff configura bot_steps" ON public.bot_steps
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.configurar_bot'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.configurar_bot'));
CREATE POLICY "Staff ve bot_steps" ON public.bot_steps
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_inbox'));

-- message_templates
CREATE POLICY "Admin gerencia templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff configura templates" ON public.message_templates
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.configurar_templates'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.configurar_templates'));
CREATE POLICY "Staff ve templates ativos" ON public.message_templates
  FOR SELECT TO authenticated
  USING (active = true AND (has_permission(auth.uid(),'comunicacao.enviar_template') OR has_permission(auth.uid(),'comunicacao.ver_inbox')));

-- automation_rules
CREATE POLICY "Admin gerencia automation_rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff configura automation_rules" ON public.automation_rules
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.configurar_automacoes'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.configurar_automacoes'));
CREATE POLICY "Staff ve automation_rules" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_metricas') OR has_permission(auth.uid(),'comunicacao.ver_inbox'));

-- automation_logs
CREATE POLICY "Admin ve automation_logs" ON public.automation_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve automation_logs" ON public.automation_logs
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_metricas'));

-- ai_settings
CREATE POLICY "Admin gerencia ai_settings" ON public.ai_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff configura ai_settings" ON public.ai_settings
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.configurar_ia'))
  WITH CHECK (has_permission(auth.uid(),'comunicacao.configurar_ia'));
CREATE POLICY "Staff ve ai_settings" ON public.ai_settings
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_inbox'));

-- ai_logs
CREATE POLICY "Admin ve ai_logs" ON public.ai_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve ai_logs" ON public.ai_logs
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'comunicacao.ver_metricas') OR has_permission(auth.uid(),'comunicacao.configurar_ia'));

-- auditoria
CREATE POLICY "Admin ve com_auditoria" ON public.comunicacao_auditoria
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- REALTIME ----------------------------------------------------
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- TRIGGER: ao inserir mensagem, atualiza last_message na conversa
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = LEFT(COALESCE(NEW.body,''), 200),
      unread_count = CASE
        WHEN NEW.sender_type IN ('paciente','lead') THEN unread_count + 1
        ELSE unread_count
      END,
      updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_conversation ON public.messages;
CREATE TRIGGER trg_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();
