
-- ============================================================
-- FRENTE 1 — Fundação financeira / Ledger base
-- ============================================================

CREATE TABLE public.financeiro_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ocorrido_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conta text NOT NULL CHECK (conta IN ('paciente','medico','plataforma','empresa','retencao')),
  conta_ref_id uuid,
  direcao text NOT NULL CHECK (direcao IN ('credito','debito')),
  valor_cents bigint NOT NULL CHECK (valor_cents > 0),
  moeda text NOT NULL DEFAULT 'BRL',
  ref_type text NOT NULL CHECK (ref_type IN ('pagamento','consulta','liberacao','saque','estorno','chargeback','ajuste_manual','taxa','backfill','retencao')),
  ref_id uuid,
  bucket text NOT NULL DEFAULT 'disponivel' CHECK (bucket IN ('disponivel','pendente','retido','sacado','plataforma','outros')),
  idempotency_key text NOT NULL UNIQUE,
  origem text NOT NULL,
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash_anterior text,
  hash_atual text NOT NULL,
  seq bigserial NOT NULL
);

CREATE INDEX idx_finmov_conta ON public.financeiro_movimentos (conta, conta_ref_id, ocorrido_em);
CREATE INDEX idx_finmov_ref ON public.financeiro_movimentos (ref_type, ref_id);
CREATE INDEX idx_finmov_seq ON public.financeiro_movimentos (seq);

ALTER TABLE public.financeiro_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin reads movimentos"
  ON public.financeiro_movimentos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.fn_finmov_block_mutations()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'financeiro_movimentos é append-only (operação % bloqueada)', TG_OP;
END;
$$;

CREATE TRIGGER trg_finmov_no_update BEFORE UPDATE ON public.financeiro_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_finmov_block_mutations();
CREATE TRIGGER trg_finmov_no_delete BEFORE DELETE ON public.financeiro_movimentos
  FOR EACH ROW EXECUTE FUNCTION public.fn_finmov_block_mutations();


CREATE TABLE public.financeiro_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  key text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, key)
);
ALTER TABLE public.financeiro_idempotency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads idempotency" ON public.financeiro_idempotency FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_finidemp_no_update BEFORE UPDATE ON public.financeiro_idempotency
  FOR EACH ROW EXECUTE FUNCTION public.fn_finmov_block_mutations();
CREATE TRIGGER trg_finidemp_no_delete BEFORE DELETE ON public.financeiro_idempotency
  FOR EACH ROW EXECUTE FUNCTION public.fn_finmov_block_mutations();


CREATE TABLE public.financeiro_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','ok','erro')),
  tentativas int NOT NULL DEFAULT 0,
  proxima_tentativa_em timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX idx_finoutbox_status ON public.financeiro_outbox (status, proxima_tentativa_em);
ALTER TABLE public.financeiro_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads outbox" ON public.financeiro_outbox FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.financeiro_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('drift_saldo','movimento_orfao','hash_quebrado','backfill_inconsistente')),
  severidade text NOT NULL DEFAULT 'medio' CHECK (severidade IN ('baixo','medio','alto','critico')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  medico_id uuid,
  resolvido_em timestamptz,
  resolvido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_finalertas_aberto ON public.financeiro_alertas (resolvido_em, tipo) WHERE resolvido_em IS NULL;
ALTER TABLE public.financeiro_alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads alertas" ON public.financeiro_alertas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates alertas" ON public.financeiro_alertas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.financeiro_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  executado_por uuid,
  dry_run boolean NOT NULL,
  ok boolean NOT NULL,
  relatorio jsonb NOT NULL DEFAULT '{}'::jsonb,
  erro text
);
ALTER TABLE public.financeiro_backfill_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads backfill log" ON public.financeiro_backfill_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


INSERT INTO public.app_settings (key, value)
VALUES ('financeiro.dias_liberacao_repasse', to_jsonb(14))
ON CONFLICT (key) DO NOTHING;


-- ---------- Funções ----------

CREATE OR REPLACE FUNCTION public.fn_finmov_hash(p_hash_anterior text, p_payload jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(coalesce(p_hash_anterior,'') || '|' || (p_payload::text), 'UTF8')), 'hex');
$$;


CREATE OR REPLACE FUNCTION public.fn_registrar_movimento_idempotente(
  p_scope text, p_key text, p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.financeiro_idempotency%ROWTYPE;
  v_lock_key bigint;
  v_hash_anterior text;
  v_hash_atual text;
  v_canonical jsonb;
  v_id uuid;
  v_conta text;
  v_conta_ref uuid;
BEGIN
  IF p_scope IS NULL OR p_key IS NULL OR p_payload IS NULL THEN
    RAISE EXCEPTION 'fn_registrar_movimento_idempotente: scope/key/payload obrigatórios';
  END IF;

  v_lock_key := ('x' || substr(md5(p_scope || ':' || p_key), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_existing FROM public.financeiro_idempotency
  WHERE scope = p_scope AND key = p_key;
  IF FOUND THEN
    RETURN jsonb_build_object('idempotente', true, 'result', v_existing.result);
  END IF;

  v_conta := p_payload->>'conta';
  v_conta_ref := NULLIF(p_payload->>'conta_ref_id','')::uuid;

  SELECT hash_atual INTO v_hash_anterior
  FROM public.financeiro_movimentos
  WHERE CASE WHEN v_conta = 'medico' AND v_conta_ref IS NOT NULL
             THEN conta = 'medico' AND conta_ref_id = v_conta_ref
             ELSE NOT (conta = 'medico' AND conta_ref_id IS NOT NULL)
        END
  ORDER BY seq DESC LIMIT 1;

  v_canonical := jsonb_build_object(
    'scope', p_scope, 'key', p_key,
    'conta', v_conta, 'conta_ref_id', v_conta_ref,
    'direcao', p_payload->>'direcao',
    'valor_cents', (p_payload->>'valor_cents')::bigint,
    'ref_type', p_payload->>'ref_type',
    'ref_id', p_payload->>'ref_id',
    'bucket', coalesce(p_payload->>'bucket','disponivel')
  );

  v_hash_atual := public.fn_finmov_hash(v_hash_anterior, v_canonical);

  INSERT INTO public.financeiro_movimentos (
    ocorrido_em, conta, conta_ref_id, direcao, valor_cents, moeda,
    ref_type, ref_id, bucket, idempotency_key, origem, actor_user_id,
    metadata, hash_anterior, hash_atual
  ) VALUES (
    coalesce((p_payload->>'ocorrido_em')::timestamptz, now()),
    v_conta, v_conta_ref,
    p_payload->>'direcao',
    (p_payload->>'valor_cents')::bigint,
    coalesce(p_payload->>'moeda','BRL'),
    p_payload->>'ref_type',
    NULLIF(p_payload->>'ref_id','')::uuid,
    coalesce(p_payload->>'bucket','disponivel'),
    p_scope || ':' || p_key,
    coalesce(p_payload->>'origem','desconhecido'),
    NULLIF(p_payload->>'actor_user_id','')::uuid,
    coalesce(p_payload->'metadata','{}'::jsonb),
    v_hash_anterior, v_hash_atual
  ) RETURNING id INTO v_id;

  INSERT INTO public.financeiro_idempotency (scope, key, result, result_hash)
  VALUES (p_scope, p_key, jsonb_build_object('movimento_id', v_id, 'hash', v_hash_atual), v_hash_atual);

  RETURN jsonb_build_object('idempotente', false, 'result', jsonb_build_object('movimento_id', v_id, 'hash', v_hash_atual));
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_medico_saldo_real(p_medico_id uuid)
RETURNS TABLE (
  disponivel_cents bigint, pendente_cents bigint, retido_cents bigint,
  sacado_cents bigint, total_movimentos bigint, ultimo_movimento_em timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  WITH agg AS (
    SELECT bucket,
      sum(CASE WHEN direcao='credito' THEN valor_cents ELSE -valor_cents END) AS saldo
    FROM public.financeiro_movimentos
    WHERE conta='medico' AND conta_ref_id=p_medico_id
    GROUP BY bucket
  )
  SELECT
    coalesce((SELECT saldo FROM agg WHERE bucket='disponivel'),0)::bigint,
    coalesce((SELECT saldo FROM agg WHERE bucket='pendente'),0)::bigint,
    coalesce((SELECT saldo FROM agg WHERE bucket='retido'),0)::bigint,
    coalesce((SELECT saldo FROM agg WHERE bucket='sacado'),0)::bigint,
    (SELECT count(*) FROM public.financeiro_movimentos WHERE conta='medico' AND conta_ref_id=p_medico_id)::bigint,
    (SELECT max(ocorrido_em) FROM public.financeiro_movimentos WHERE conta='medico' AND conta_ref_id=p_medico_id);
$$;


CREATE OR REPLACE FUNCTION public.fn_validar_hash_chain(p_medico_id uuid, p_limit int DEFAULT 1000)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  r record;
  v_prev text := NULL;
BEGIN
  FOR r IN
    SELECT hash_anterior, hash_atual FROM public.financeiro_movimentos
    WHERE conta='medico' AND conta_ref_id=p_medico_id
    ORDER BY seq ASC LIMIT p_limit
  LOOP
    IF r.hash_anterior IS DISTINCT FROM v_prev THEN
      RETURN false;
    END IF;
    v_prev := r.hash_atual;
  END LOOP;
  RETURN true;
END;
$$;


CREATE MATERIALIZED VIEW public.mv_medico_saldo AS
WITH base AS (
  SELECT conta_ref_id AS medico_id, bucket,
    sum(CASE WHEN direcao='credito' THEN valor_cents ELSE -valor_cents END) AS saldo
  FROM public.financeiro_movimentos
  WHERE conta='medico' AND conta_ref_id IS NOT NULL
  GROUP BY conta_ref_id, bucket
)
SELECT
  m.id AS medico_id,
  coalesce(sum(saldo) FILTER (WHERE bucket='disponivel'),0)::bigint AS disponivel_cents,
  coalesce(sum(saldo) FILTER (WHERE bucket='pendente'),0)::bigint AS pendente_cents,
  coalesce(sum(saldo) FILTER (WHERE bucket='retido'),0)::bigint AS retido_cents,
  coalesce(sum(saldo) FILTER (WHERE bucket='sacado'),0)::bigint AS sacado_cents,
  (SELECT count(*) FROM public.financeiro_movimentos f WHERE f.conta='medico' AND f.conta_ref_id=m.id)::bigint AS total_movimentos,
  now() AS atualizado_em
FROM public.medicos m
LEFT JOIN base b ON b.medico_id = m.id
GROUP BY m.id;

CREATE UNIQUE INDEX mv_medico_saldo_pk ON public.mv_medico_saldo (medico_id);


CREATE OR REPLACE FUNCTION public.fn_reconciliar_saldo_medico(p_medico_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_real record;
  v_mv record;
  v_chain_ok boolean;
  v_diff jsonb := '{}'::jsonb;
  v_alerta_id uuid;
BEGIN
  SELECT * INTO v_real FROM public.fn_medico_saldo_real(p_medico_id);
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_medico_saldo;
  SELECT * INTO v_mv FROM public.mv_medico_saldo WHERE medico_id = p_medico_id;

  IF v_mv.medico_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'medico_sem_linha_na_mv');
  END IF;

  IF v_mv.disponivel_cents IS DISTINCT FROM v_real.disponivel_cents
     OR v_mv.pendente_cents IS DISTINCT FROM v_real.pendente_cents
     OR v_mv.retido_cents IS DISTINCT FROM v_real.retido_cents
     OR v_mv.sacado_cents IS DISTINCT FROM v_real.sacado_cents THEN
    v_diff := jsonb_build_object(
      'mv', jsonb_build_object('disponivel',v_mv.disponivel_cents,'pendente',v_mv.pendente_cents,'retido',v_mv.retido_cents,'sacado',v_mv.sacado_cents),
      'real', jsonb_build_object('disponivel',v_real.disponivel_cents,'pendente',v_real.pendente_cents,'retido',v_real.retido_cents,'sacado',v_real.sacado_cents)
    );
    INSERT INTO public.financeiro_alertas(tipo,severidade,payload,medico_id)
    VALUES ('drift_saldo','alto',v_diff,p_medico_id) RETURNING id INTO v_alerta_id;
  END IF;

  v_chain_ok := public.fn_validar_hash_chain(p_medico_id, 1000);
  IF NOT v_chain_ok THEN
    INSERT INTO public.financeiro_alertas(tipo,severidade,payload,medico_id)
    VALUES ('hash_quebrado','critico',jsonb_build_object('medico_id',p_medico_id),p_medico_id);
  END IF;

  RETURN jsonb_build_object(
    'ok',(v_diff='{}'::jsonb AND v_chain_ok),
    'diff',v_diff,'hash_chain_ok',v_chain_ok,'alerta_id',v_alerta_id
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.fn_backfill_financeiro(
  p_dry_run boolean DEFAULT true, p_medico_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count_cf int := 0;
  v_count_saque_ret int := 0;
  v_count_saque_pago int := 0;
  v_count_estorno int := 0;
  v_medicos_processados int := 0;
  v_drift_total int := 0;
  v_drift_detail jsonb := '[]'::jsonb;
  v_relatorio jsonb;
  v_log_id uuid;
  v_actor uuid := auth.uid();
  cf record;
  sq record;
  pg record;
  m record;
  v_real record;
  v_esperado_pend bigint;
BEGIN
  -- consultas_financeiro válidas → crédito pendente
  FOR cf IN
    SELECT cf.* FROM public.consultas_financeiro cf
    JOIN public.pagamentos p ON p.consulta_id = cf.consulta_id AND p.status = 'pago'
    WHERE cf.status = 'valido' AND cf.medico_id IS NOT NULL
      AND cf.valor_medico_centavos > 0
      AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','cf:'||cf.id::text||':pendente',
      jsonb_build_object(
        'conta','medico','conta_ref_id',cf.medico_id,
        'direcao','credito','valor_cents',cf.valor_medico_centavos,
        'ref_type','consulta','ref_id',cf.consulta_id,
        'bucket','pendente','ocorrido_em',cf.created_at,
        'origem','backfill','actor_user_id',v_actor,
        'metadata',jsonb_build_object('valor_bruto',cf.valor_bruto_centavos,'plataforma',cf.valor_plataforma_centavos)
      ));
    v_count_cf := v_count_cf + 1;
  END LOOP;

  -- Saques pendentes/aprovados → débito pendente (sem crédito retido para simplificar; saldo "retido" deriva)
  FOR sq IN
    SELECT * FROM public.saques_medicos
    WHERE status IN ('solicitado','em_analise','correcao_solicitada','aprovado')
      AND valor_centavos > 0
      AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||sq.id::text||':pend_debito',
      jsonb_build_object(
        'conta','medico','conta_ref_id',sq.medico_id,
        'direcao','debito','valor_cents',sq.valor_centavos,
        'ref_type','retencao','ref_id',sq.id,
        'bucket','pendente','ocorrido_em',sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor
      ));
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||sq.id::text||':retido_credito',
      jsonb_build_object(
        'conta','medico','conta_ref_id',sq.medico_id,
        'direcao','credito','valor_cents',sq.valor_centavos,
        'ref_type','retencao','ref_id',sq.id,
        'bucket','retido','ocorrido_em',sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor
      ));
    v_count_saque_ret := v_count_saque_ret + 1;
  END LOOP;

  -- Saques pagos → débito pendente + crédito sacado
  FOR sq IN
    SELECT * FROM public.saques_medicos
    WHERE status = 'pago' AND valor_centavos > 0
      AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||sq.id::text||':pend_debito',
      jsonb_build_object(
        'conta','medico','conta_ref_id',sq.medico_id,
        'direcao','debito','valor_cents',sq.valor_centavos,
        'ref_type','retencao','ref_id',sq.id,
        'bucket','pendente','ocorrido_em',sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor
      ));
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||sq.id::text||':sacado_credito',
      jsonb_build_object(
        'conta','medico','conta_ref_id',sq.medico_id,
        'direcao','credito','valor_cents',sq.valor_centavos,
        'ref_type','saque','ref_id',sq.id,
        'bucket','sacado','ocorrido_em',coalesce(sq.pago_em,sq.solicitado_em),
        'origem','backfill','actor_user_id',v_actor
      ));
    v_count_saque_pago := v_count_saque_pago + 1;
  END LOOP;

  -- Estornos
  FOR pg IN
    SELECT cf.id AS cf_id, cf.medico_id, cf.consulta_id, cf.valor_medico_centavos, cf.updated_at
    FROM public.consultas_financeiro cf
    WHERE cf.status IN ('estornado','reembolsado','invalidado')
      AND cf.medico_id IS NOT NULL AND cf.valor_medico_centavos > 0
      AND (p_medico_id IS NULL OR cf.medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','estorno:cf:'||pg.cf_id::text,
      jsonb_build_object(
        'conta','medico','conta_ref_id',pg.medico_id,
        'direcao','debito','valor_cents',pg.valor_medico_centavos,
        'ref_type','estorno','ref_id',pg.consulta_id,
        'bucket','pendente','ocorrido_em',pg.updated_at,
        'origem','backfill','actor_user_id',v_actor
      ));
    v_count_estorno := v_count_estorno + 1;
  END LOOP;

  -- Validação de drift por médico
  FOR m IN
    SELECT DISTINCT medico_id FROM public.consultas_financeiro
    WHERE medico_id IS NOT NULL AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    v_medicos_processados := v_medicos_processados + 1;
    SELECT * INTO v_real FROM public.fn_medico_saldo_real(m.medico_id);

    SELECT
      coalesce(sum(CASE WHEN cf.status='valido' THEN cf.valor_medico_centavos ELSE 0 END),0)
      - coalesce(sum(CASE WHEN cf.status IN ('estornado','reembolsado','invalidado') THEN cf.valor_medico_centavos ELSE 0 END),0)
      - coalesce((SELECT sum(valor_centavos) FROM public.saques_medicos
                  WHERE medico_id=m.medico_id
                    AND status IN ('solicitado','em_analise','correcao_solicitada','aprovado','pago')),0)
    INTO v_esperado_pend
    FROM public.consultas_financeiro cf
    WHERE cf.medico_id = m.medico_id
    AND EXISTS (SELECT 1 FROM public.pagamentos p WHERE p.consulta_id = cf.consulta_id AND p.status='pago');

    IF v_esperado_pend IS DISTINCT FROM v_real.pendente_cents THEN
      v_drift_total := v_drift_total + 1;
      v_drift_detail := v_drift_detail || jsonb_build_object(
        'medico_id', m.medico_id,
        'esperado_pendente', v_esperado_pend,
        'real_pendente', v_real.pendente_cents,
        'real_sacado', v_real.sacado_cents
      );
    END IF;
  END LOOP;

  v_relatorio := jsonb_build_object(
    'consultas_financeiro_creditadas', v_count_cf,
    'saques_em_retencao', v_count_saque_ret,
    'saques_pagos', v_count_saque_pago,
    'estornos', v_count_estorno,
    'medicos_processados', v_medicos_processados,
    'drift_total', v_drift_total,
    'drift_detail', v_drift_detail,
    'dry_run', p_dry_run,
    'executado_em', now()
  );

  IF v_drift_total > 0 THEN
    INSERT INTO public.financeiro_backfill_log(executado_por,dry_run,ok,relatorio,erro)
    VALUES (v_actor,p_dry_run,false,v_relatorio,'BACKFILL_DRIFT');
    RAISE EXCEPTION 'BACKFILL_DRIFT: % médicos com divergência. Detalhe: %', v_drift_total, v_drift_detail;
  END IF;

  INSERT INTO public.financeiro_backfill_log(executado_por,dry_run,ok,relatorio)
  VALUES (v_actor,p_dry_run,true,v_relatorio) RETURNING id INTO v_log_id;

  IF p_dry_run THEN
    -- Em dry_run, abortamos para não persistir
    RAISE EXCEPTION 'DRY_RUN_OK::%', v_relatorio::text;
  END IF;

  RETURN jsonb_build_object('ok', true, 'log_id', v_log_id, 'relatorio', v_relatorio);
END;
$$;


-- Wrapper para dry_run (captura a exceção e retorna o relatório)
CREATE OR REPLACE FUNCTION public.fn_backfill_financeiro_dry_run(p_medico_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg text;
  v_json jsonb;
BEGIN
  BEGIN
    PERFORM public.fn_backfill_financeiro(true, p_medico_id);
    RETURN jsonb_build_object('ok', false, 'motivo', 'dry_run_nao_abortou');
  EXCEPTION WHEN OTHERS THEN
    v_msg := SQLERRM;
    IF v_msg LIKE 'DRY_RUN_OK::%' THEN
      v_json := substr(v_msg, length('DRY_RUN_OK::')+1)::jsonb;
      RETURN jsonb_build_object('ok', true, 'dry_run', true, 'relatorio', v_json);
    END IF;
    RETURN jsonb_build_object('ok', false, 'erro', v_msg);
  END;
END;
$$;


REVOKE ALL ON FUNCTION public.fn_registrar_movimento_idempotente(text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_backfill_financeiro(boolean,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_backfill_financeiro_dry_run(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reconciliar_saldo_medico(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_medico_saldo_real(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_validar_hash_chain(uuid,int) TO authenticated;
