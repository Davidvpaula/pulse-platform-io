-- Fase 6 — IA Assistiva (copiloto)

-- 1. ai_assistant_settings (singleton)
CREATE TABLE IF NOT EXISTS public.ai_assistant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature numeric(3,2) NOT NULL DEFAULT 0.4,
  max_tokens integer NOT NULL DEFAULT 800,
  auto_summary boolean NOT NULL DEFAULT false,
  auto_intent_detection boolean NOT NULL DEFAULT false,
  auto_urgency_detection boolean NOT NULL DEFAULT false,
  auto_reply_suggestion boolean NOT NULL DEFAULT false,
  daily_token_budget integer NOT NULL DEFAULT 200000,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_ai_assistant_settings_updated ON public.ai_assistant_settings;
CREATE TRIGGER trg_ai_assistant_settings_updated
BEFORE UPDATE ON public.ai_assistant_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. ai_prompts (versionados)
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('summary','reply','intent','urgency','risk','department')),
  system_prompt text NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_prompts_tipo_ativo
  ON public.ai_prompts(tipo) WHERE ativo;

DROP TRIGGER IF EXISTS trg_ai_prompts_updated ON public.ai_prompts;
CREATE TRIGGER trg_ai_prompts_updated
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. conversation_ai_summaries
CREATE TABLE IF NOT EXISTS public.conversation_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  summary text NOT NULL,
  summary_type text NOT NULL DEFAULT 'short' CHECK (summary_type IN ('short','operational','points','sentiment')),
  last_message_id uuid,
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  model text,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_conv
  ON public.conversation_ai_summaries(conversation_id, created_at DESC);

-- 4. conversation_ai_intents
CREATE TABLE IF NOT EXISTS public.conversation_ai_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  detected_intent text NOT NULL,
  suggested_department text,
  suggested_priority text,
  confidence numeric(4,3),
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_intents_conv
  ON public.conversation_ai_intents(conversation_id, created_at DESC);

-- 5. conversation_ai_risk_analysis
CREATE TABLE IF NOT EXISTS public.conversation_ai_risk_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('baixo','medio','alto','critico')),
  score numeric(5,2),
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  requires_supervisor boolean NOT NULL DEFAULT false,
  notes text,
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_risk_conv
  ON public.conversation_ai_risk_analysis(conversation_id, created_at DESC);

-- 6. ai_audit_logs (Fase 6)
CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  action text NOT NULL,
  provider public.ai_provider NOT NULL DEFAULT 'lovable',
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_cents numeric(10,4),
  latency_ms integer,
  prompt_hash text,
  response_excerpt text,
  accepted_by_user boolean,
  actor_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_conv
  ON public.ai_audit_logs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_actor_day
  ON public.ai_audit_logs(actor_id, created_at DESC);

-- RLS
ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_ai_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_ai_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies — settings (admin + permissão configurar)
DROP POLICY IF EXISTS "ai_settings_admin" ON public.ai_assistant_settings;
CREATE POLICY "ai_settings_admin" ON public.ai_assistant_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'ia.assistiva.configurar'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'ia.assistiva.configurar'));
DROP POLICY IF EXISTS "ai_settings_read" ON public.ai_assistant_settings;
CREATE POLICY "ai_settings_read" ON public.ai_assistant_settings
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'ia.assistiva.usar'));

-- Policies — prompts (admin + gerenciar prompts)
DROP POLICY IF EXISTS "ai_prompts_manage" ON public.ai_prompts;
CREATE POLICY "ai_prompts_manage" ON public.ai_prompts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'ia.assistiva.prompts'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'ia.assistiva.prompts'));

-- Policies — summaries / intents / risk (leitura para quem usa IA ou vê inbox; gravação só backend)
DROP POLICY IF EXISTS "ai_summaries_read" ON public.conversation_ai_summaries;
CREATE POLICY "ai_summaries_read" ON public.conversation_ai_summaries
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_permission(auth.uid(),'ia.assistiva.usar')
    OR has_permission(auth.uid(),'comunicacao.ver_todas')
  );

DROP POLICY IF EXISTS "ai_intents_read" ON public.conversation_ai_intents;
CREATE POLICY "ai_intents_read" ON public.conversation_ai_intents
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_permission(auth.uid(),'ia.assistiva.usar')
    OR has_permission(auth.uid(),'comunicacao.ver_todas')
  );

DROP POLICY IF EXISTS "ai_risk_read" ON public.conversation_ai_risk_analysis;
CREATE POLICY "ai_risk_read" ON public.conversation_ai_risk_analysis
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_permission(auth.uid(),'ia.assistiva.usar')
    OR has_permission(auth.uid(),'comunicacao.ver_todas')
    OR has_permission(auth.uid(),'ia.assistiva.supervisionar')
  );

-- Policies — audit logs (admin/metricas/supervisão veem; usuário vê só os próprios)
DROP POLICY IF EXISTS "ai_audit_read_admin" ON public.ai_audit_logs;
CREATE POLICY "ai_audit_read_admin" ON public.ai_audit_logs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR has_permission(auth.uid(),'ia.assistiva.metricas')
    OR has_permission(auth.uid(),'ia.assistiva.supervisionar')
  );
DROP POLICY IF EXISTS "ai_audit_read_self" ON public.ai_audit_logs;
CREATE POLICY "ai_audit_read_self" ON public.ai_audit_logs
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid());
DROP POLICY IF EXISTS "ai_audit_update_self_accept" ON public.ai_audit_logs;
CREATE POLICY "ai_audit_update_self_accept" ON public.ai_audit_logs
  FOR UPDATE TO authenticated
  USING (actor_id = auth.uid())
  WITH CHECK (actor_id = auth.uid());

-- Permissões
INSERT INTO public.permissions_catalog (permission_key, modulo, descricao) VALUES
  ('ia.assistiva.usar',          'IA Assistiva', 'Usar a IA copiloto no Inbox'),
  ('ia.assistiva.supervisionar', 'IA Assistiva', 'Ver alertas e atividade da IA assistiva'),
  ('ia.assistiva.configurar',    'IA Assistiva', 'Configurar provider, modelo e switches'),
  ('ia.assistiva.metricas',      'IA Assistiva', 'Ver métricas e custos da IA assistiva'),
  ('ia.assistiva.prompts',       'IA Assistiva', 'Gerenciar prompts versionados da IA')
ON CONFLICT (permission_key) DO NOTHING;

-- Singleton settings (desativado por padrão)
INSERT INTO public.ai_assistant_settings (id, enabled)
SELECT gen_random_uuid(), false
WHERE NOT EXISTS (SELECT 1 FROM public.ai_assistant_settings);

-- Seeds de prompts (curtos, em português)
INSERT INTO public.ai_prompts (nome, tipo, system_prompt, versao, ativo) VALUES
  ('Resumo Operacional v1', 'summary',
   'Você é um copiloto de atendimento clínico. Resuma a conversa em até 5 frases curtas, foco operacional: quem é o paciente, o que pediu, pendências e próximos passos. NUNCA invente dados. NÃO emita diagnóstico médico. Responda em português do Brasil.',
   1, true),
  ('Sugestão de Resposta v1', 'reply',
   'Você é um copiloto que sugere respostas curtas, cordiais e profissionais para o atendente humano usar. Gere 1 a 3 sugestões. NUNCA prometa tratamento, NUNCA dê diagnóstico, NUNCA invente informação. Responda em JSON: {"suggestions":[{"text":"...","tone":"..."}]} em português do Brasil.',
   1, true),
  ('Classificação de Intenção v1', 'intent',
   'Classifique a intenção principal da conversa em UMA das categorias: agendamento, cancelamento, financeiro, suporte, urgencia_clinica, duvida_medica, documentos, reclamacao, comercial, spam. Responda em JSON: {"intent":"...","confidence":0.0-1.0,"suggested_department":"opcional","suggested_priority":"baixa|normal|alta|urgente"}.',
   1, true),
  ('Detecção de Urgência v1', 'urgency',
   'Detecte sinais de urgência emocional/clínica/operacional. NÃO faça diagnóstico médico. Apenas indique sinais observáveis. Responda em JSON: {"urgent":true|false,"signals":["..."],"recommended_priority":"baixa|normal|alta|urgente"}.',
   1, true),
  ('Análise de Risco Operacional v1', 'risk',
   'Analise risco operacional da conversa (linguagem inadequada, paciente irritado, risco reputacional/jurídico, abandono, retrabalho). Responda em JSON: {"risk_level":"baixo|medio|alto|critico","score":0-100,"signals":["..."],"requires_supervisor":true|false,"notes":"..."}.',
   1, true),
  ('Sugestão de Setor v1', 'department',
   'Sugira o melhor setor/fila para esta conversa. Responda em JSON: {"department":"...","queue":"opcional","reason":"..."}.',
   1, true)
ON CONFLICT DO NOTHING;