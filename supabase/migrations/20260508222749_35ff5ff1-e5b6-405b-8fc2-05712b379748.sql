
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
  r_cf record;
  r_sq record;
  r_es record;
  r_med record;
  v_real record;
  v_esperado_pend bigint;
BEGIN
  FOR r_cf IN
    SELECT x.* FROM public.consultas_financeiro x
    JOIN public.pagamentos p ON p.consulta_id = x.consulta_id AND p.status = 'pago'
    WHERE x.status = 'valido' AND x.medico_id IS NOT NULL
      AND x.valor_medico_centavos > 0
      AND (p_medico_id IS NULL OR x.medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','cf:'||r_cf.id::text||':pendente',
      jsonb_build_object('conta','medico','conta_ref_id',r_cf.medico_id,
        'direcao','credito','valor_cents',r_cf.valor_medico_centavos,
        'ref_type','consulta','ref_id',r_cf.consulta_id,
        'bucket','pendente','ocorrido_em',r_cf.created_at,
        'origem','backfill','actor_user_id',v_actor));
    v_count_cf := v_count_cf + 1;
  END LOOP;

  FOR r_sq IN
    SELECT * FROM public.saques_medicos
    WHERE status IN ('solicitado','em_analise','correcao_solicitada','aprovado')
      AND valor_centavos > 0
      AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||r_sq.id::text||':pend_debito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','debito','valor_cents',r_sq.valor_centavos,
        'ref_type','retencao','ref_id',r_sq.id,
        'bucket','pendente','ocorrido_em',r_sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor));
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||r_sq.id::text||':retido_credito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','credito','valor_cents',r_sq.valor_centavos,
        'ref_type','retencao','ref_id',r_sq.id,
        'bucket','retido','ocorrido_em',r_sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor));
    v_count_saque_ret := v_count_saque_ret + 1;
  END LOOP;

  FOR r_sq IN
    SELECT * FROM public.saques_medicos
    WHERE status = 'pago' AND valor_centavos > 0
      AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||r_sq.id::text||':pend_debito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','debito','valor_cents',r_sq.valor_centavos,
        'ref_type','retencao','ref_id',r_sq.id,
        'bucket','pendente','ocorrido_em',r_sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor));
    PERFORM public.fn_registrar_movimento_idempotente('backfill','saque:'||r_sq.id::text||':sacado_credito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','credito','valor_cents',r_sq.valor_centavos,
        'ref_type','saque','ref_id',r_sq.id,
        'bucket','sacado','ocorrido_em',coalesce(r_sq.pago_em,r_sq.solicitado_em),
        'origem','backfill','actor_user_id',v_actor));
    v_count_saque_pago := v_count_saque_pago + 1;
  END LOOP;

  FOR r_es IN
    SELECT x.id AS cf_id, x.medico_id, x.consulta_id, x.valor_medico_centavos, x.updated_at
    FROM public.consultas_financeiro x
    WHERE x.status IN ('estornado','reembolsado','invalidado')
      AND x.medico_id IS NOT NULL AND x.valor_medico_centavos > 0
      AND (p_medico_id IS NULL OR x.medico_id = p_medico_id)
  LOOP
    PERFORM public.fn_registrar_movimento_idempotente('backfill','estorno:cf:'||r_es.cf_id::text,
      jsonb_build_object('conta','medico','conta_ref_id',r_es.medico_id,
        'direcao','debito','valor_cents',r_es.valor_medico_centavos,
        'ref_type','estorno','ref_id',r_es.consulta_id,
        'bucket','pendente','ocorrido_em',r_es.updated_at,
        'origem','backfill','actor_user_id',v_actor));
    v_count_estorno := v_count_estorno + 1;
  END LOOP;

  FOR r_med IN
    SELECT DISTINCT medico_id FROM public.consultas_financeiro
    WHERE medico_id IS NOT NULL AND (p_medico_id IS NULL OR medico_id = p_medico_id)
  LOOP
    v_medicos_processados := v_medicos_processados + 1;
    SELECT * INTO v_real FROM public.fn_medico_saldo_real(r_med.medico_id);

    SELECT
      coalesce(sum(CASE WHEN x.status='valido' THEN x.valor_medico_centavos ELSE 0 END),0)
      - coalesce(sum(CASE WHEN x.status IN ('estornado','reembolsado','invalidado') THEN x.valor_medico_centavos ELSE 0 END),0)
      - coalesce((SELECT sum(valor_centavos) FROM public.saques_medicos
                  WHERE medico_id=r_med.medico_id
                    AND status IN ('solicitado','em_analise','correcao_solicitada','aprovado','pago')),0)
    INTO v_esperado_pend
    FROM public.consultas_financeiro x
    WHERE x.medico_id = r_med.medico_id
    AND EXISTS (SELECT 1 FROM public.pagamentos p WHERE p.consulta_id = x.consulta_id AND p.status='pago');

    IF v_esperado_pend IS DISTINCT FROM v_real.pendente_cents THEN
      v_drift_total := v_drift_total + 1;
      v_drift_detail := v_drift_detail || jsonb_build_object(
        'medico_id', r_med.medico_id,
        'esperado_pendente', v_esperado_pend,
        'real_pendente', v_real.pendente_cents,
        'real_sacado', v_real.sacado_cents);
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
    'executado_em', now());

  IF v_drift_total > 0 THEN
    INSERT INTO public.financeiro_backfill_log(executado_por,dry_run,ok,relatorio,erro)
    VALUES (v_actor,p_dry_run,false,v_relatorio,'BACKFILL_DRIFT');
    RAISE EXCEPTION 'BACKFILL_DRIFT: % médicos com divergência. Detalhe: %', v_drift_total, v_drift_detail;
  END IF;

  INSERT INTO public.financeiro_backfill_log(executado_por,dry_run,ok,relatorio)
  VALUES (v_actor,p_dry_run,true,v_relatorio) RETURNING id INTO v_log_id;

  IF p_dry_run THEN
    RAISE EXCEPTION 'DRY_RUN_OK::%', v_relatorio::text;
  END IF;

  RETURN jsonb_build_object('ok', true, 'log_id', v_log_id, 'relatorio', v_relatorio);
END;
$$;
