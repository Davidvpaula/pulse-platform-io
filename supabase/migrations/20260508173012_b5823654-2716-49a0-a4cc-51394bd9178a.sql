
-- ============================================================
-- FASE 8 — PRODUÇÃO OFICIAL (WABA + OBSERVABILIDADE)
-- ============================================================

-- ===== Enums =====
DO $$ BEGIN CREATE TYPE public.whatsapp_modo AS ENUM ('sandbox','staging','producao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.severity_evento AS ENUM ('info','warn','error','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.waba_health_status AS ENUM ('ok','degraded','down','pending_credentials','unknown');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Tabela: meta_waba_health =====
CREATE TABLE IF NOT EXISTS public.meta_waba_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.waba_health_status NOT NULL DEFAULT 'unknown',
  phone_number_id text,
  business_account_id text,
  display_phone_number text,
  quality_rating text,
  throughput_tier text,
  error_code text,
  error_message text,
  last_check_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_waba_health_check ON public.meta_waba_health(last_check_at DESC);
ALTER TABLE public.meta_waba_health ENABLE ROW LEVEL SECURITY;

-- ===== Tabela: meta_template_sync_log =====
CREATE TABLE IF NOT EXISTS public.meta_template_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  template_name text,
  status_meta text,
  payload jsonb,
  dry_run boolean NOT NULL DEFAULT true,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_tpl_sync_log_at ON public.meta_template_sync_log(created_at DESC);
ALTER TABLE public.meta_template_sync_log ENABLE ROW LEVEL SECURITY;

-- ===== Tabela: whatsapp_envio_metricas =====
CREATE TABLE IF NOT EXISTS public.whatsapp_envio_metricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  total_enviadas integer NOT NULL DEFAULT 0,
  entregues integer NOT NULL DEFAULT 0,
  lidas integer NOT NULL DEFAULT 0,
  falhas integer NOT NULL DEFAULT 0,
  mock_sent integer NOT NULL DEFAULT 0,
  custo_estimado numeric(12,4) NOT NULL DEFAULT 0,
  por_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_envio_metricas_data ON public.whatsapp_envio_metricas(data);
ALTER TABLE public.whatsapp_envio_metricas ENABLE ROW LEVEL SECURITY;

-- ===== Tabela: observabilidade_eventos =====
CREATE TABLE IF NOT EXISTS public.observabilidade_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo text NOT NULL,
  evento text NOT NULL,
  severity public.severity_evento NOT NULL DEFAULT 'info',
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_obs_eventos_at ON public.observabilidade_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_eventos_mod_sev ON public.observabilidade_eventos(modulo, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_obs_eventos_conv ON public.observabilidade_eventos(conversation_id, created_at DESC);
ALTER TABLE public.observabilidade_eventos ENABLE ROW LEVEL SECURITY;

-- ===== Tabela: producao_checklist (itens estáticos) =====
CREATE TABLE IF NOT EXISTS public.producao_checklist (
  key text PRIMARY KEY,
  label text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);
ALTER TABLE public.producao_checklist ENABLE ROW LEVEL SECURITY;

-- ===== Tabela: producao_checklist_status =====
CREATE TABLE IF NOT EXISTS public.producao_checklist_status (
  item_key text PRIMARY KEY REFERENCES public.producao_checklist(key) ON DELETE CASCADE,
  ok boolean NOT NULL DEFAULT false,
  evidencia text,
  conferido_por uuid,
  conferido_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.producao_checklist_status ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_prod_checklist_status_updated ON public.producao_checklist_status;
CREATE TRIGGER trg_prod_checklist_status_updated
BEFORE UPDATE ON public.producao_checklist_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== RLS =====
DROP POLICY IF EXISTS "Admin/Supervisor ve waba_health" ON public.meta_waba_health;
CREATE POLICY "Admin/Supervisor ve waba_health" ON public.meta_waba_health
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "Admin gerencia waba_health" ON public.meta_waba_health;
CREATE POLICY "Admin gerencia waba_health" ON public.meta_waba_health
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor ve tpl_sync" ON public.meta_template_sync_log;
CREATE POLICY "Admin/Supervisor ve tpl_sync" ON public.meta_template_sync_log
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "Admin gerencia tpl_sync" ON public.meta_template_sync_log;
CREATE POLICY "Admin gerencia tpl_sync" ON public.meta_template_sync_log
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor ve metricas" ON public.whatsapp_envio_metricas;
CREATE POLICY "Admin/Supervisor ve metricas" ON public.whatsapp_envio_metricas
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "Admin gerencia metricas" ON public.whatsapp_envio_metricas;
CREATE POLICY "Admin gerencia metricas" ON public.whatsapp_envio_metricas
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor ve observabilidade" ON public.observabilidade_eventos;
CREATE POLICY "Admin/Supervisor ve observabilidade" ON public.observabilidade_eventos
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "Staff insere observabilidade" ON public.observabilidade_eventos;
CREATE POLICY "Staff insere observabilidade" ON public.observabilidade_eventos
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'supervisor')
  OR public.has_role(auth.uid(),'medico')
  OR public.has_role(auth.uid(),'secretaria')
);

DROP POLICY IF EXISTS "Admin gerencia observabilidade" ON public.observabilidade_eventos;
CREATE POLICY "Admin gerencia observabilidade" ON public.observabilidade_eventos
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated ve checklist" ON public.producao_checklist;
CREATE POLICY "Authenticated ve checklist" ON public.producao_checklist
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin gerencia checklist" ON public.producao_checklist;
CREATE POLICY "Admin gerencia checklist" ON public.producao_checklist
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admin/Supervisor ve checklist_status" ON public.producao_checklist_status;
CREATE POLICY "Admin/Supervisor ve checklist_status" ON public.producao_checklist_status
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "Admin gerencia checklist_status" ON public.producao_checklist_status;
CREATE POLICY "Admin gerencia checklist_status" ON public.producao_checklist_status
FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== app_settings (defaults seguros) =====
INSERT INTO public.app_settings (key, value) VALUES
  ('whatsapp.modo', '"sandbox"'::jsonb),
  ('whatsapp.fallback_ativo', 'true'::jsonb),
  ('whatsapp.taxa_max_msg_min', '60'::jsonb),
  ('observabilidade.alertas_email', '[]'::jsonb),
  ('observabilidade.retencao_dias', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ===== Permissões =====
INSERT INTO public.permissions_catalog (permission_key, modulo, descricao) VALUES
  ('comunicacao.producao.ver',    'Produção', 'Visualiza painel de produção do WhatsApp'),
  ('comunicacao.producao.ativar', 'Produção', 'Ativa modo produção do WhatsApp (kill-switch global)'),
  ('observabilidade.ver',         'Observabilidade', 'Visualiza eventos de observabilidade'),
  ('observabilidade.exportar',    'Observabilidade', 'Exporta CSV de observabilidade')
ON CONFLICT (permission_key) DO NOTHING;

-- ===== Seeds checklist =====
INSERT INTO public.producao_checklist (key, label, descricao, obrigatorio, ordem) VALUES
  ('waba_credentials',     'Credenciais Meta configuradas',   'META_WABA_TOKEN, PHONE_NUMBER_ID e BUSINESS_ID definidos', true, 1),
  ('waba_health_ok',       'WABA Health = ok',                'Health check da Meta retornou status ok', true, 2),
  ('templates_aprovados',  'Templates aprovados pela Meta',   'Todos os templates obrigatórios aprovados', true, 3),
  ('webhook_validado',     'Webhook Meta validado',           'Endpoint /whatsapp-webhook respondendo verify token', true, 4),
  ('rls_auditada',         'RLS revisada por admin',          'Políticas RLS de comunicação revisadas', true, 5),
  ('kill_switch_testado',  'Kill-switch IA Avatar testado',   'Comando ai_avatar_kill_switch validado em sandbox', true, 6),
  ('rate_limit_ok',        'Rate limit configurado',          'Taxa máxima por minuto definida em app_settings', true, 7),
  ('fallback_transporte',  'Fallback de transporte ativo',    'Mensagens com falha não bloqueiam fila', true, 8),
  ('templates_sincronizados', 'Templates sincronizados',      'message_templates.status_meta atualizado', true, 9),
  ('observabilidade_ativa',   'Observabilidade ligada',       'Eventos críticos sendo logados', true, 10),
  ('lgpd_revisada',           'LGPD revisada',                'Avisos e gates LGPD validados', true, 11),
  ('runbook_publicado',       'Runbook de incidentes',        'Procedimento de pausa/rollback documentado', false, 12)
ON CONFLICT (key) DO NOTHING;

-- ===== RPCs =====

-- Loga evento de observabilidade (utilitária, retorna id)
CREATE OR REPLACE FUNCTION public.observabilidade_log(
  _modulo text,
  _evento text,
  _severity public.severity_evento DEFAULT 'info',
  _conversation_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.observabilidade_eventos(modulo, evento, severity, conversation_id, user_id, metadata)
  VALUES (_modulo, _evento, _severity, _conversation_id, auth.uid(), COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- Purge eventos antigos (job cron)
CREATE OR REPLACE FUNCTION public.observabilidade_purge()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _dias integer;
  _removed integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden: apenas admin';
  END IF;
  SELECT COALESCE((value)::text::integer, 30) INTO _dias
  FROM public.app_settings WHERE key = 'observabilidade.retencao_dias';
  WITH d AS (
    DELETE FROM public.observabilidade_eventos
    WHERE created_at < (now() - make_interval(days => _dias))
    RETURNING 1
  ) SELECT count(*) INTO _removed FROM d;
  RETURN _removed;
END; $$;

-- Avalia se produção pode ser ativada
CREATE OR REPLACE FUNCTION public.producao_pode_ativar()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pendencias jsonb;
  _health_ok boolean;
  _modo_atual text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT (value)::text INTO _modo_atual FROM public.app_settings WHERE key='whatsapp.modo';
  SELECT EXISTS(
    SELECT 1 FROM public.meta_waba_health
    ORDER BY last_check_at DESC LIMIT 1
  ) INTO _health_ok;

  IF _health_ok THEN
    SELECT (status = 'ok') INTO _health_ok
    FROM public.meta_waba_health
    ORDER BY last_check_at DESC LIMIT 1;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'key', c.key, 'label', c.label, 'obrigatorio', c.obrigatorio
  )) INTO _pendencias
  FROM public.producao_checklist c
  LEFT JOIN public.producao_checklist_status s ON s.item_key = c.key
  WHERE c.ativo AND c.obrigatorio AND COALESCE(s.ok, false) = false;

  RETURN jsonb_build_object(
    'pode_ativar', (_pendencias IS NULL AND _health_ok),
    'modo_atual', COALESCE(REPLACE(_modo_atual, '"', ''), 'sandbox'),
    'health_ok', _health_ok,
    'pendencias', COALESCE(_pendencias, '[]'::jsonb)
  );
END; $$;

-- Ativa produção (validação rígida + auditoria)
CREATE OR REPLACE FUNCTION public.producao_ativar(_modo public.whatsapp_modo)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _check jsonb;
  _modo_anterior text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode alterar o modo';
  END IF;

  SELECT (value)::text INTO _modo_anterior FROM public.app_settings WHERE key='whatsapp.modo';
  _modo_anterior := COALESCE(REPLACE(_modo_anterior, '"', ''), 'sandbox');

  -- Para produção, exige checklist + health
  IF _modo = 'producao' THEN
    _check := public.producao_pode_ativar();
    IF NOT (_check->>'pode_ativar')::boolean THEN
      RAISE EXCEPTION 'producao_bloqueada: %', _check::text;
    END IF;
  END IF;

  UPDATE public.app_settings
  SET value = to_jsonb(_modo::text), updated_at = now()
  WHERE key = 'whatsapp.modo';

  PERFORM public.observabilidade_log(
    'producao',
    CASE WHEN _modo = 'producao' THEN 'ativacao_producao' ELSE 'rollback_modo' END,
    'critical'::public.severity_evento,
    NULL,
    jsonb_build_object('modo_anterior', _modo_anterior, 'modo_novo', _modo::text)
  );

  RETURN jsonb_build_object('ok', true, 'modo_anterior', _modo_anterior, 'modo_novo', _modo::text);
END; $$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.observabilidade_log(text, text, public.severity_evento, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.observabilidade_purge() TO authenticated;
GRANT EXECUTE ON FUNCTION public.producao_pode_ativar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.producao_ativar(public.whatsapp_modo) TO authenticated;
