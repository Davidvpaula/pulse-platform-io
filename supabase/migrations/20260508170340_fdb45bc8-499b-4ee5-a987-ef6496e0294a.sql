
-- ============================================================
-- FASE 7 — IA AVATAR (estende, não duplica)
-- ============================================================

DO $$ BEGIN CREATE TYPE public.ai_avatar_modo AS ENUM ('assistido','semi_autonomo','autonomo_controlado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ai_avatar_memory_type AS ENUM ('preferencia','contexto','historico_operacional','observacao','pendencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ai_avatar_confianca AS ENUM ('critica','baixa','media','alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ai_avatar_risco AS ENUM ('nenhum','baixo','medio','alto','critico');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ai_handoff_motivo AS ENUM (
  'baixa_confianca','topico_clinico','urgencia','crise_emocional','risco_juridico',
  'paciente_irritado','solicitacao_humano','timeout_provider','erro_provider',
  'rate_limit','anti_loop','manual','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.ai_blocked_categoria AS ENUM (
  'diagnostico','prescricao','dosagem','laudo','exame','atestado',
  'urgencia_medica','conduta_clinica','aconselhamento_clinico','interpretacao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ai_settings
  ADD COLUMN IF NOT EXISTS avatar_modo public.ai_avatar_modo NOT NULL DEFAULT 'assistido',
  ADD COLUMN IF NOT EXISTS avatar_kill_switch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_kill_switch_motivo text,
  ADD COLUMN IF NOT EXISTS avatar_kill_switch_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_kill_switch_by uuid,
  ADD COLUMN IF NOT EXISTS avatar_cooldown_segundos integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS avatar_max_msgs_paciente_dia integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS avatar_max_respostas_consecutivas integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS avatar_confianca_minima public.ai_avatar_confianca NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS avatar_profile_id uuid,
  ADD COLUMN IF NOT EXISTS avatar_horario_inicio time,
  ADD COLUMN IF NOT EXISTS avatar_horario_fim time;

ALTER TABLE public.ai_logs
  ADD COLUMN IF NOT EXISTS confianca public.ai_avatar_confianca,
  ADD COLUMN IF NOT EXISTS confianca_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS risco public.ai_avatar_risco,
  ADD COLUMN IF NOT EXISTS modo public.ai_avatar_modo,
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS handoff_motivo public.ai_handoff_motivo,
  ADD COLUMN IF NOT EXISTS custo_estimado numeric(10,6),
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS auto_reply boolean NOT NULL DEFAULT false;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_avatar_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS ai_avatar_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_avatar_blocked_motivo text,
  ADD COLUMN IF NOT EXISTS ai_avatar_blocked_by uuid,
  ADD COLUMN IF NOT EXISTS ai_avatar_blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_avatar_consecutive_replies integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_avatar_last_reply_at timestamptz;

CREATE TABLE IF NOT EXISTS public.ai_avatar_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  system_prompt text NOT NULL,
  tom text NOT NULL DEFAULT 'humanizado',
  comportamento text,
  limites text,
  saudacao_padrao text,
  assinatura text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_avatar_profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ai_avatar_profiles_updated ON public.ai_avatar_profiles;
CREATE TRIGGER trg_ai_avatar_profiles_updated
BEFORE UPDATE ON public.ai_avatar_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_settings DROP CONSTRAINT IF EXISTS ai_settings_avatar_profile_fk;
ALTER TABLE public.ai_settings
  ADD CONSTRAINT ai_settings_avatar_profile_fk
  FOREIGN KEY (avatar_profile_id) REFERENCES public.ai_avatar_profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ai_avatar_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  memory_type public.ai_avatar_memory_type NOT NULL DEFAULT 'contexto',
  content text NOT NULL,
  relevance_score numeric(3,2) NOT NULL DEFAULT 0.5,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_avatar_memory_patient ON public.ai_avatar_memory(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_avatar_memory_conv ON public.ai_avatar_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_avatar_memory_expires ON public.ai_avatar_memory(expires_at);
ALTER TABLE public.ai_avatar_memory ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ai_avatar_memory_updated ON public.ai_avatar_memory;
CREATE TRIGGER trg_ai_avatar_memory_updated
BEFORE UPDATE ON public.ai_avatar_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_handoff_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  motivo public.ai_handoff_motivo NOT NULL,
  gatilho text,
  confianca public.ai_avatar_confianca,
  risco public.ai_avatar_risco,
  supervisor_alvo uuid,
  setor_alvo text,
  status text NOT NULL DEFAULT 'aberto',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_handoff_logs_conv ON public.ai_handoff_logs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_handoff_logs_motivo ON public.ai_handoff_logs(motivo);
ALTER TABLE public.ai_handoff_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ai_blocked_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  termo text NOT NULL,
  categoria public.ai_blocked_categoria NOT NULL,
  severidade public.ai_avatar_risco NOT NULL DEFAULT 'alto',
  acao text NOT NULL DEFAULT 'handoff',
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_blocked_topics_termo ON public.ai_blocked_topics(lower(termo));
ALTER TABLE public.ai_blocked_topics ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ai_blocked_topics_updated ON public.ai_blocked_topics;
CREATE TRIGGER trg_ai_blocked_topics_updated
BEFORE UPDATE ON public.ai_blocked_topics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS =====
DROP POLICY IF EXISTS "Admin gerencia avatar_profiles" ON public.ai_avatar_profiles;
CREATE POLICY "Admin gerencia avatar_profiles" ON public.ai_avatar_profiles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff ve avatar_profiles" ON public.ai_avatar_profiles;
CREATE POLICY "Staff ve avatar_profiles" ON public.ai_avatar_profiles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Admin gerencia avatar_memory" ON public.ai_avatar_memory;
CREATE POLICY "Admin gerencia avatar_memory" ON public.ai_avatar_memory
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff ve avatar_memory" ON public.ai_avatar_memory;
CREATE POLICY "Staff ve avatar_memory" ON public.ai_avatar_memory
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Staff escreve avatar_memory" ON public.ai_avatar_memory;
CREATE POLICY "Staff escreve avatar_memory" ON public.ai_avatar_memory
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Staff atualiza avatar_memory" ON public.ai_avatar_memory;
CREATE POLICY "Staff atualiza avatar_memory" ON public.ai_avatar_memory
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Admin gerencia handoff_logs" ON public.ai_handoff_logs;
CREATE POLICY "Admin gerencia handoff_logs" ON public.ai_handoff_logs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Staff ve handoff_logs" ON public.ai_handoff_logs;
CREATE POLICY "Staff ve handoff_logs" ON public.ai_handoff_logs
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Sistema insere handoff_logs" ON public.ai_handoff_logs;
CREATE POLICY "Sistema insere handoff_logs" ON public.ai_handoff_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
  OR public.has_role(auth.uid(),'supervisor')
);

DROP POLICY IF EXISTS "Admin gerencia blocked_topics" ON public.ai_blocked_topics;
CREATE POLICY "Admin gerencia blocked_topics" ON public.ai_blocked_topics
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated ve blocked_topics" ON public.ai_blocked_topics;
CREATE POLICY "Authenticated ve blocked_topics" ON public.ai_blocked_topics
FOR SELECT TO authenticated USING (true);

-- ===== RPCs =====
CREATE OR REPLACE FUNCTION public.ai_avatar_kill_switch(_on boolean, _motivo text DEFAULT NULL)
RETURNS public.ai_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.ai_settings;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden: ia.avatar.desligar requer admin';
  END IF;
  UPDATE public.ai_settings
  SET avatar_kill_switch=_on, avatar_kill_switch_motivo=_motivo,
      avatar_kill_switch_at=now(), avatar_kill_switch_by=auth.uid()
  WHERE id=(SELECT id FROM public.ai_settings ORDER BY created_at LIMIT 1)
  RETURNING * INTO _row;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.ai_avatar_pausar_conversa(
  _conversation_id uuid, _minutos integer DEFAULT 30, _motivo text DEFAULT NULL)
RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.conversations;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin')
       OR public.has_role(auth.uid(),'medico')
       OR public.has_role(auth.uid(),'secretaria')
       OR public.has_role(auth.uid(),'supervisor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.conversations
  SET ai_avatar_paused_until = now() + make_interval(mins => GREATEST(_minutos,1)),
      ai_avatar_blocked_motivo = COALESCE(_motivo, ai_avatar_blocked_motivo),
      updated_at = now()
  WHERE id = _conversation_id
  RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversa não encontrada'; END IF;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.ai_avatar_assumir_conversa(_conversation_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.conversations;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin')
       OR public.has_role(auth.uid(),'medico')
       OR public.has_role(auth.uid(),'secretaria')
       OR public.has_role(auth.uid(),'supervisor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.conversations
  SET ai_active=false, ai_avatar_blocked=true,
      ai_avatar_blocked_motivo=COALESCE(ai_avatar_blocked_motivo,'humano assumiu'),
      ai_avatar_blocked_by=auth.uid(), ai_avatar_blocked_at=now(),
      assigned_to=COALESCE(assigned_to, auth.uid()), updated_at=now()
  WHERE id=_conversation_id
  RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'conversa não encontrada'; END IF;
  INSERT INTO public.ai_handoff_logs(conversation_id, motivo, gatilho, status, metadata)
  VALUES(_conversation_id,'manual','assumir_conversa','resolvido',
         jsonb_build_object('user_id', auth.uid()));
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.ai_avatar_should_reply(_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _settings public.ai_settings;
  _conv public.conversations;
  _msgs_hoje integer;
  _now timestamptz := now();
BEGIN
  SELECT * INTO _settings FROM public.ai_settings ORDER BY created_at LIMIT 1;
  IF _settings IS NULL OR _settings.active = false THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'ai_settings_inativo');
  END IF;
  IF _settings.avatar_kill_switch THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'kill_switch_global');
  END IF;
  IF _settings.avatar_modo = 'assistido' THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'modo_assistido');
  END IF;
  SELECT * INTO _conv FROM public.conversations WHERE id = _conversation_id;
  IF _conv IS NULL THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'conversa_inexistente');
  END IF;
  IF _conv.ai_active = false THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'ai_active_false');
  END IF;
  IF _conv.ai_avatar_blocked THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'conversa_bloqueada');
  END IF;
  IF _conv.ai_avatar_paused_until IS NOT NULL AND _conv.ai_avatar_paused_until > _now THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'conversa_pausada');
  END IF;
  IF _conv.assigned_to IS NOT NULL THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'humano_assumiu');
  END IF;
  IF _conv.ai_avatar_consecutive_replies >= _settings.avatar_max_respostas_consecutivas THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'anti_loop', 'handoff_motivo','anti_loop');
  END IF;
  IF _conv.ai_avatar_last_reply_at IS NOT NULL
     AND _conv.ai_avatar_last_reply_at + make_interval(secs => _settings.avatar_cooldown_segundos) > _now THEN
    RETURN jsonb_build_object('reply', false, 'motivo', 'cooldown');
  END IF;
  IF _settings.avatar_horario_inicio IS NOT NULL AND _settings.avatar_horario_fim IS NOT NULL THEN
    IF (_now AT TIME ZONE 'America/Sao_Paulo')::time
       NOT BETWEEN _settings.avatar_horario_inicio AND _settings.avatar_horario_fim THEN
      RETURN jsonb_build_object('reply', false, 'motivo', 'fora_horario');
    END IF;
  END IF;
  IF _conv.patient_id IS NOT NULL THEN
    SELECT count(*) INTO _msgs_hoje
    FROM public.ai_logs l
    JOIN public.conversations c ON c.id = l.conversation_id
    WHERE c.patient_id = _conv.patient_id
      AND l.auto_reply = true
      AND l.created_at >= date_trunc('day', _now);
    IF _msgs_hoje >= _settings.avatar_max_msgs_paciente_dia THEN
      RETURN jsonb_build_object('reply', false, 'motivo', 'limite_diario_paciente');
    END IF;
  END IF;
  RETURN jsonb_build_object('reply', true,
    'modo', _settings.avatar_modo,
    'profile_id', _settings.avatar_profile_id,
    'confianca_minima', _settings.avatar_confianca_minima);
END; $$;

-- ===== Permissões =====
INSERT INTO public.permissions_catalog (permission_key, modulo, descricao) VALUES
  ('ia.avatar.usar',          'IA Avatar', 'Permite que a IA Avatar responda em conversas atribuídas'),
  ('ia.avatar.supervisionar', 'IA Avatar', 'Visualiza respostas, memória e handoffs da IA Avatar'),
  ('ia.avatar.configurar',    'IA Avatar', 'Configura modos, limites e parâmetros da IA Avatar'),
  ('ia.avatar.desligar',      'IA Avatar', 'Aciona kill-switch global ou bloqueio por conversa'),
  ('ia.avatar.prompts',       'IA Avatar', 'Edita personas e prompts da IA Avatar'),
  ('ia.avatar.memoria',       'IA Avatar', 'Edita ou remove memórias contextuais da IA Avatar')
ON CONFLICT (permission_key) DO NOTHING;

-- ===== Seeds =====
INSERT INTO public.ai_blocked_topics (termo, categoria, severidade, acao, descricao) VALUES
  ('diagnóstico',        'diagnostico',         'critico', 'handoff', 'Pedido de diagnóstico'),
  ('diagnostico',        'diagnostico',         'critico', 'handoff', 'Pedido de diagnóstico (sem acento)'),
  ('o que eu tenho',     'diagnostico',         'alto',    'handoff', 'Pedido de hipótese diagnóstica'),
  ('receita',            'prescricao',          'critico', 'handoff', 'Pedido de receita médica'),
  ('prescrição',         'prescricao',          'critico', 'handoff', 'Pedido de prescrição'),
  ('prescricao',         'prescricao',          'critico', 'handoff', 'Pedido de prescrição (sem acento)'),
  ('remédio',            'prescricao',          'alto',    'handoff', 'Indicação de remédio'),
  ('remedio',            'prescricao',          'alto',    'handoff', 'Indicação de remédio (sem acento)'),
  ('medicamento',        'prescricao',          'alto',    'handoff', 'Indicação de medicamento'),
  ('dose',               'dosagem',             'critico', 'handoff', 'Pedido de dose'),
  ('dosagem',            'dosagem',             'critico', 'handoff', 'Pedido de dosagem'),
  ('quantos comprimidos','dosagem',             'critico', 'handoff', 'Quantidade de comprimidos'),
  ('laudo',              'laudo',               'critico', 'handoff', 'Pedido de laudo'),
  ('atestado',           'atestado',            'critico', 'handoff', 'Pedido de atestado'),
  ('exame',              'exame',               'medio',   'handoff', 'Interpretação de exame'),
  ('resultado de exame', 'exame',               'alto',    'handoff', 'Interpretação de resultado'),
  ('é grave',            'interpretacao',       'alto',    'handoff', 'Avaliação de gravidade'),
  ('estou passando mal', 'urgencia_medica',     'critico', 'handoff', 'Possível urgência'),
  ('dor no peito',       'urgencia_medica',     'critico', 'handoff', 'Urgência cardiológica'),
  ('falta de ar',        'urgencia_medica',     'critico', 'handoff', 'Urgência respiratória'),
  ('desmaiei',           'urgencia_medica',     'critico', 'handoff', 'Síncope'),
  ('quero me matar',     'urgencia_medica',     'critico', 'handoff', 'Crise emocional grave'),
  ('suicídio',           'urgencia_medica',     'critico', 'handoff', 'Crise emocional grave'),
  ('suicidio',           'urgencia_medica',     'critico', 'handoff', 'Crise emocional grave'),
  ('o que devo fazer',   'conduta_clinica',     'medio',   'handoff', 'Pedido de conduta clínica'),
  ('posso tomar',        'aconselhamento_clinico','alto',  'handoff', 'Aconselhamento medicamentoso')
ON CONFLICT ((lower(termo))) DO NOTHING;

INSERT INTO public.ai_avatar_profiles (nome, system_prompt, tom, saudacao_padrao, assinatura, ativo)
SELECT 'Recepção Padrão',
  'Você é o assistente virtual da clínica. Acolhedor, breve e claro. NÃO é médico. NÃO diagnostica, prescreve, indica medicamentos ou interpreta exames. Em qualquer dúvida clínica, encaminhe para um humano. Sempre deixe claro que é um assistente virtual.',
  'humanizado',
  'Olá! Sou o assistente virtual da clínica. Como posso ajudar?',
  '— Assistente Virtual (não substitui profissional de saúde).',
  true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_avatar_profiles);
