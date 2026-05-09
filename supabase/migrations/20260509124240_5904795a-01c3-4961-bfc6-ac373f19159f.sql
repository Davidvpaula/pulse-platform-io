
CREATE TABLE IF NOT EXISTS public.financeiro_reconciliacao_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  duracao_ms integer,
  origem text NOT NULL DEFAULT 'cron',
  actor_user_id uuid,
  medicos_processados integer NOT NULL DEFAULT 0,
  medicos_com_drift integer NOT NULL DEFAULT 0,
  drift_total_cents bigint NOT NULL DEFAULT 0,
  hash_global text,
  status text NOT NULL DEFAULT 'ok',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finrec_jobs_iniciado ON public.financeiro_reconciliacao_jobs(iniciado_em DESC);
CREATE INDEX IF NOT EXISTS idx_finrec_jobs_status ON public.financeiro_reconciliacao_jobs(status);

ALTER TABLE public.financeiro_reconciliacao_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read finrec jobs" ON public.financeiro_reconciliacao_jobs;
CREATE POLICY "admin read finrec jobs"
  ON public.financeiro_reconciliacao_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.financeiro_reconciliacao_jobs FROM anon, authenticated;

CREATE OR REPLACE VIEW public.vw_financeiro_drift AS
WITH ledger AS (
  SELECT
    conta_ref_id AS medico_id,
    SUM(CASE WHEN direcao = 'credito' THEN valor_cents ELSE -valor_cents END) AS saldo_ledger_cents,
    COUNT(*) AS qtd_movs,
    MAX(ocorrido_em) AS ultimo_mov_em
  FROM public.financeiro_movimentos
  WHERE conta = 'medico'
  GROUP BY conta_ref_id
),
snapshot AS (
  SELECT
    medico_id,
    COALESCE(SUM(valor_medico_centavos) FILTER (WHERE status = 'valido'), 0) AS saldo_snapshot_cents,
    COUNT(*) AS qtd_snapshot
  FROM public.consultas_financeiro
  WHERE medico_id IS NOT NULL
  GROUP BY medico_id
)
SELECT
  COALESCE(l.medico_id, s.medico_id) AS medico_id,
  COALESCE(l.saldo_ledger_cents, 0) AS saldo_ledger_cents,
  COALESCE(s.saldo_snapshot_cents, 0) AS saldo_snapshot_cents,
  COALESCE(l.saldo_ledger_cents, 0) - COALESCE(s.saldo_snapshot_cents, 0) AS drift_cents,
  COALESCE(l.qtd_movs, 0) AS qtd_movimentos,
  COALESCE(s.qtd_snapshot, 0) AS qtd_snapshot,
  l.ultimo_mov_em
FROM ledger l
FULL OUTER JOIN snapshot s ON s.medico_id = l.medico_id;

CREATE OR REPLACE VIEW public.vw_financeiro_obs_kpis AS
SELECT
  (SELECT COUNT(*) FROM public.financeiro_movimentos) AS total_movimentos,
  (SELECT COUNT(*) FROM public.financeiro_movimentos WHERE created_at >= now() - interval '24 hours') AS movs_24h,
  (SELECT COUNT(*) FROM public.financeiro_movimentos WHERE created_at >= now() - interval '7 days') AS movs_7d,
  (SELECT COUNT(DISTINCT conta_ref_id) FROM public.financeiro_movimentos WHERE conta = 'medico') AS medicos_cobertos,
  (SELECT COUNT(*) FROM public.financeiro_idempotency) AS idempotency_keys,
  (SELECT COUNT(*) FROM public.financeiro_alertas WHERE resolvido_em IS NULL) AS alertas_abertos,
  (SELECT COUNT(*) FROM public.financeiro_alertas WHERE resolvido_em IS NULL AND severidade = 'critico') AS alertas_criticos,
  (SELECT COUNT(*) FROM public.financeiro_outbox WHERE status = 'pendente') AS outbox_pendente,
  (SELECT hash_atual FROM public.financeiro_movimentos ORDER BY seq DESC LIMIT 1) AS hash_global_atual,
  (SELECT MAX(ocorrido_em) FROM public.financeiro_movimentos) AS ultimo_movimento_em,
  (SELECT iniciado_em FROM public.financeiro_reconciliacao_jobs ORDER BY iniciado_em DESC LIMIT 1) AS ultima_reconciliacao_em,
  (SELECT drift_total_cents FROM public.financeiro_reconciliacao_jobs ORDER BY iniciado_em DESC LIMIT 1) AS ultimo_drift_total_cents,
  (SELECT status FROM public.financeiro_reconciliacao_jobs ORDER BY iniciado_em DESC LIMIT 1) AS ultimo_status_reconciliacao;

CREATE OR REPLACE FUNCTION public.fn_reconciliar_global(p_origem text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid := gen_random_uuid();
  v_inicio timestamptz := now();
  v_medicos int := 0;
  v_drift_qtd int := 0;
  v_drift_total bigint := 0;
  v_hash text;
  v_status text := 'ok';
  v_detalhes jsonb := '[]'::jsonb;
  v_row record;
  v_drift bigint;
BEGIN
  INSERT INTO public.financeiro_reconciliacao_jobs(id, origem, actor_user_id, status)
  VALUES (v_job_id, p_origem, auth.uid(), 'em_andamento');

  FOR v_row IN
    SELECT medico_id, drift_cents, saldo_ledger_cents, saldo_snapshot_cents
    FROM public.vw_financeiro_drift
    WHERE medico_id IS NOT NULL
  LOOP
    v_medicos := v_medicos + 1;
    v_drift := COALESCE(v_row.drift_cents, 0);
    IF v_drift <> 0 THEN
      v_drift_qtd := v_drift_qtd + 1;
      v_drift_total := v_drift_total + ABS(v_drift);
      v_detalhes := v_detalhes || jsonb_build_object(
        'medico_id', v_row.medico_id,
        'drift_cents', v_drift,
        'ledger_cents', v_row.saldo_ledger_cents,
        'snapshot_cents', v_row.saldo_snapshot_cents
      );
      INSERT INTO public.financeiro_alertas(tipo, severidade, payload, medico_id)
      VALUES (
        'drift_reconciliacao',
        CASE WHEN ABS(v_drift) > 100000 THEN 'critico' ELSE 'aviso' END,
        jsonb_build_object('job_id', v_job_id, 'drift_cents', v_drift, 'ledger_cents', v_row.saldo_ledger_cents, 'snapshot_cents', v_row.saldo_snapshot_cents),
        v_row.medico_id
      );
    END IF;
  END LOOP;

  IF v_drift_qtd > 0 THEN v_status := 'drift'; END IF;

  SELECT hash_atual INTO v_hash FROM public.financeiro_movimentos ORDER BY seq DESC LIMIT 1;

  UPDATE public.financeiro_reconciliacao_jobs SET
    finalizado_em = now(),
    duracao_ms = EXTRACT(MILLISECONDS FROM (now() - v_inicio))::int,
    medicos_processados = v_medicos,
    medicos_com_drift = v_drift_qtd,
    drift_total_cents = v_drift_total,
    hash_global = v_hash,
    status = v_status,
    detalhes = jsonb_build_object('drifts', v_detalhes)
  WHERE id = v_job_id;

  RETURN jsonb_build_object(
    'job_id', v_job_id,
    'medicos_processados', v_medicos,
    'medicos_com_drift', v_drift_qtd,
    'drift_total_cents', v_drift_total,
    'hash_global', v_hash,
    'status', v_status,
    'duracao_ms', EXTRACT(MILLISECONDS FROM (now() - v_inicio))::int
  );
EXCEPTION WHEN OTHERS THEN
  UPDATE public.financeiro_reconciliacao_jobs SET
    finalizado_em = now(),
    status = 'erro',
    detalhes = jsonb_build_object('erro', SQLERRM)
  WHERE id = v_job_id;
  RETURN jsonb_build_object('status', 'erro', 'erro', SQLERRM, 'job_id', v_job_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_reconciliar_global(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_reconciliar_global(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_observabilidade_financeira()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN jsonb_build_object(
    'kpis', (SELECT to_jsonb(k) FROM public.vw_financeiro_obs_kpis k),
    'movimentos_recentes', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM (
        SELECT seq, ocorrido_em, conta, conta_ref_id, direcao, valor_cents, bucket, ref_type, ref_id, origem, hash_atual
        FROM public.financeiro_movimentos
        ORDER BY seq DESC LIMIT 50
      ) m
    ), '[]'::jsonb),
    'alertas_abertos', COALESCE((
      SELECT jsonb_agg(to_jsonb(a))
      FROM (
        SELECT id, tipo, severidade, payload, medico_id, created_at
        FROM public.financeiro_alertas
        WHERE resolvido_em IS NULL
        ORDER BY created_at DESC LIMIT 50
      ) a
    ), '[]'::jsonb),
    'reconciliacoes', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM (
        SELECT id, iniciado_em, finalizado_em, duracao_ms, origem, medicos_processados, medicos_com_drift, drift_total_cents, hash_global, status
        FROM public.financeiro_reconciliacao_jobs
        ORDER BY iniciado_em DESC LIMIT 30
      ) r
    ), '[]'::jsonb),
    'drift_atual', COALESCE((
      SELECT jsonb_agg(to_jsonb(d))
      FROM (
        SELECT medico_id, saldo_ledger_cents, saldo_snapshot_cents, drift_cents, qtd_movimentos, qtd_snapshot, ultimo_mov_em
        FROM public.vw_financeiro_drift
        WHERE drift_cents <> 0
        ORDER BY ABS(drift_cents) DESC LIMIT 50
      ) d
    ), '[]'::jsonb),
    'volume_diario', COALESCE((
      SELECT jsonb_agg(to_jsonb(v))
      FROM (
        SELECT date_trunc('day', created_at)::date AS dia,
               COUNT(*) AS qtd,
               SUM(CASE WHEN direcao='credito' THEN valor_cents ELSE 0 END) AS creditos_cents,
               SUM(CASE WHEN direcao='debito' THEN valor_cents ELSE 0 END) AS debitos_cents
        FROM public.financeiro_movimentos
        WHERE created_at >= now() - interval '14 days'
        GROUP BY 1 ORDER BY 1 DESC
      ) v
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_observabilidade_financeira() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_observabilidade_financeira() TO authenticated;
