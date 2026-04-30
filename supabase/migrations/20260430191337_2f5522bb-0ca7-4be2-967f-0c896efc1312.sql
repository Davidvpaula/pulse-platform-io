-- ============================================================
-- FASE 2 — INTEGRIDADE DE DADOS
-- ============================================================

-- 1) AUDIT LOG GLOBAL --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID,
  actor_role TEXT,
  table_name TEXT NOT NULL,
  record_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','FORCE_TRANSITION','SNAPSHOT_BYPASS')),
  before_data JSONB,
  after_data JSONB,
  changed_fields TEXT[],
  motivo TEXT,
  request_ctx JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_occurred ON public.audit_log (occurred_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê audit_log" ON public.audit_log;
CREATE POLICY "Admin lê audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ninguém faz INSERT/UPDATE/DELETE manual; só triggers SECURITY DEFINER
DROP POLICY IF EXISTS "Bloqueia escrita manual no audit_log" ON public.audit_log;
CREATE POLICY "Bloqueia escrita manual no audit_log" ON public.audit_log
  FOR ALL TO authenticated USING (false) WITH CHECK (false);


-- 2) FUNÇÃO GENÉRICA DE AUDITORIA -------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_changed TEXT[];
  v_record_id TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF v_actor IS NOT NULL THEN
    SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_actor LIMIT 1;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD); v_after := NULL;
    v_record_id := COALESCE((to_jsonb(OLD)->>'id'), NULL);
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL; v_after := to_jsonb(NEW);
    v_record_id := COALESCE((to_jsonb(NEW)->>'id'), NULL);
  ELSE
    v_before := to_jsonb(OLD); v_after := to_jsonb(NEW);
    v_record_id := COALESCE((to_jsonb(NEW)->>'id'), NULL);
    SELECT array_agg(k) INTO v_changed
    FROM jsonb_object_keys(v_after) k
    WHERE v_before->k IS DISTINCT FROM v_after->k
      AND k NOT IN ('updated_at');
    -- não loga se só updated_at mudou
    IF v_changed IS NULL OR array_length(v_changed,1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_role, table_name, record_id, action, before_data, after_data, changed_fields)
  VALUES (v_actor, v_role, TG_TABLE_NAME, v_record_id, TG_OP, v_before, v_after, v_changed);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


-- 3) MÁQUINA DE ESTADOS DE CONSULTAS ----------------------------------------
-- Função auxiliar de contexto: admin pode setar uma flag por sessão
CREATE OR REPLACE FUNCTION public.set_force_status_transition(_motivo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas admin pode forçar transição de status';
  END IF;
  PERFORM set_config('app.force_status_transition', COALESCE(_motivo,'sem motivo'), true);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_consulta_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old TEXT := OLD.status::text;
  v_new TEXT := NEW.status::text;
  v_force TEXT;
  v_actor UUID := auth.uid();
  v_valid BOOLEAN := false;
BEGIN
  IF v_old = v_new THEN RETURN NEW; END IF;

  -- Transições legítimas
  v_valid := CASE v_old
    WHEN 'agendada'              THEN v_new IN ('aguardando_pagamento','confirmada','cancelada','no_show')
    WHEN 'aguardando_pagamento'  THEN v_new IN ('confirmada','cancelada','agendada')
    WHEN 'confirmada'            THEN v_new IN ('em_andamento','cancelada','no_show')
    WHEN 'em_andamento'          THEN v_new IN ('concluida','cancelada')
    WHEN 'concluida'             THEN false
    WHEN 'cancelada'             THEN false
    WHEN 'no_show'               THEN false
    ELSE false
  END;

  IF v_valid THEN RETURN NEW; END IF;

  -- Não é válida → exige flag de força + admin
  v_force := current_setting('app.force_status_transition', true);
  IF v_force IS NOT NULL AND v_force <> '' AND public.has_role(v_actor, 'admin'::app_role) THEN
    INSERT INTO public.audit_log (actor_id, actor_role, table_name, record_id, action, before_data, after_data, motivo)
    VALUES (v_actor, 'admin', 'consultas', NEW.id::text, 'FORCE_TRANSITION',
            jsonb_build_object('status', v_old), jsonb_build_object('status', v_new), v_force);
    -- consome a flag
    PERFORM set_config('app.force_status_transition', '', true);
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transição de status inválida: % → %. Use set_force_status_transition para sobrepor (apenas admin).', v_old, v_new
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_status_guard ON public.consultas;
CREATE TRIGGER trg_consulta_status_guard
  BEFORE UPDATE OF status ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.fn_consulta_status_guard();


-- 4) SNAPSHOT FINANCEIRO IMUTÁVEL -------------------------------------------

-- 4a) Pagamento: congela valores quando vira 'pago'
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS snapshot_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_bruto_snapshot     INTEGER,
  ADD COLUMN IF NOT EXISTS taxa_gateway_snapshot    INTEGER,
  ADD COLUMN IF NOT EXISTS taxa_imposto_snapshot    INTEGER,
  ADD COLUMN IF NOT EXISTS valor_liquido_snapshot   INTEGER;

CREATE OR REPLACE FUNCTION public.fn_pagamento_snapshot_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Congela ao virar 'pago'
  IF NEW.status::text = 'pago' AND (OLD.status::text IS DISTINCT FROM 'pago') AND NEW.snapshot_at IS NULL THEN
    NEW.snapshot_at            := now();
    NEW.valor_bruto_snapshot   := COALESCE(NEW.valor_bruto_centavos, NEW.valor_centavos, 0);
    NEW.taxa_gateway_snapshot  := COALESCE(NEW.taxa_gateway_centavos, 0);
    NEW.taxa_imposto_snapshot  := COALESCE(NEW.taxa_imposto_centavos, 0);
    NEW.valor_liquido_snapshot := COALESCE(NEW.valor_liquido_centavos,
                                           NEW.valor_bruto_snapshot - NEW.taxa_gateway_snapshot - NEW.taxa_imposto_snapshot);
    RETURN NEW;
  END IF;

  -- Já snapshotado: bloqueia alterações nos campos congelados
  IF OLD.snapshot_at IS NOT NULL THEN
    IF NEW.valor_bruto_snapshot   IS DISTINCT FROM OLD.valor_bruto_snapshot
    OR NEW.taxa_gateway_snapshot  IS DISTINCT FROM OLD.taxa_gateway_snapshot
    OR NEW.taxa_imposto_snapshot  IS DISTINCT FROM OLD.taxa_imposto_snapshot
    OR NEW.valor_liquido_snapshot IS DISTINCT FROM OLD.valor_liquido_snapshot
    OR NEW.snapshot_at            IS DISTINCT FROM OLD.snapshot_at THEN
      RAISE EXCEPTION 'Snapshot financeiro do pagamento % é imutável', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pagamento_snapshot ON public.pagamentos;
CREATE TRIGGER trg_pagamento_snapshot
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_pagamento_snapshot_guard();

-- 4b) Consulta: congela valor + comissão ao virar 'concluida'
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS snapshot_at                 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_snapshot_centavos     INTEGER,
  ADD COLUMN IF NOT EXISTS comissao_snapshot_centavos  INTEGER,
  ADD COLUMN IF NOT EXISTS comissao_percentual_snapshot NUMERIC(5,2);

CREATE OR REPLACE FUNCTION public.fn_consulta_snapshot_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct NUMERIC(5,2);
BEGIN
  -- Congela ao virar 'concluida'
  IF NEW.status::text = 'concluida' AND (OLD.status::text IS DISTINCT FROM 'concluida') AND NEW.snapshot_at IS NULL THEN
    SELECT comissao_percentual INTO v_pct FROM public.medicos WHERE id = NEW.medico_id;
    NEW.snapshot_at                  := now();
    NEW.valor_snapshot_centavos      := NEW.valor_centavos;
    NEW.comissao_percentual_snapshot := v_pct;
    NEW.comissao_snapshot_centavos   := ROUND(NEW.valor_centavos * COALESCE(v_pct,0) / 100.0)::int;
    RETURN NEW;
  END IF;

  -- Já snapshotado: bloqueia alterações nos campos congelados
  IF OLD.snapshot_at IS NOT NULL THEN
    IF NEW.snapshot_at                  IS DISTINCT FROM OLD.snapshot_at
    OR NEW.valor_snapshot_centavos      IS DISTINCT FROM OLD.valor_snapshot_centavos
    OR NEW.comissao_snapshot_centavos   IS DISTINCT FROM OLD.comissao_snapshot_centavos
    OR NEW.comissao_percentual_snapshot IS DISTINCT FROM OLD.comissao_percentual_snapshot THEN
      RAISE EXCEPTION 'Snapshot financeiro da consulta % é imutável', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consulta_snapshot ON public.consultas;
CREATE TRIGGER trg_consulta_snapshot
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.fn_consulta_snapshot_guard();


-- 5) APLICAR AUDIT TRIGGER NAS TABELAS CRÍTICAS + OPERACIONAIS --------------
DO $$
DECLARE
  t TEXT;
  tabelas TEXT[] := ARRAY[
    'consultas','pagamentos','user_roles','permissoes_colaborador','medicos',
    'agenda_slots','cupons','empresas','colaboradores'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger()', t, t);
    END IF;
  END LOOP;
END $$;
