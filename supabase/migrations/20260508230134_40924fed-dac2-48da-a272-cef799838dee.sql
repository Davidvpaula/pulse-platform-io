
-- ============================================================
-- Frente 2 — Plugar fluxos no ledger (observer-only)
-- ============================================================

-- 1) Atualiza fn_backfill_financeiro para usar scope 'producao'
--    (mesmo scope dos triggers => idempotência compartilhada)
CREATE OR REPLACE FUNCTION public.fn_backfill_financeiro(p_dry_run boolean DEFAULT true, p_medico_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    PERFORM public.fn_registrar_movimento_idempotente('producao','cf:'||r_cf.id::text||':pendente',
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
    PERFORM public.fn_registrar_movimento_idempotente('producao','saque:'||r_sq.id::text||':pend_debito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','debito','valor_cents',r_sq.valor_centavos,
        'ref_type','retencao','ref_id',r_sq.id,
        'bucket','pendente','ocorrido_em',r_sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor));
    PERFORM public.fn_registrar_movimento_idempotente('producao','saque:'||r_sq.id::text||':retido_credito',
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
    PERFORM public.fn_registrar_movimento_idempotente('producao','saque:'||r_sq.id::text||':pend_debito',
      jsonb_build_object('conta','medico','conta_ref_id',r_sq.medico_id,
        'direcao','debito','valor_cents',r_sq.valor_centavos,
        'ref_type','retencao','ref_id',r_sq.id,
        'bucket','pendente','ocorrido_em',r_sq.solicitado_em,
        'origem','backfill','actor_user_id',v_actor));
    PERFORM public.fn_registrar_movimento_idempotente('producao','saque:'||r_sq.id::text||':sacado_credito',
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
    PERFORM public.fn_registrar_movimento_idempotente('producao','estorno:cf:'||r_es.cf_id::text,
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
$function$;

-- 2) Helper: registra alerta sem propagar erro
CREATE OR REPLACE FUNCTION public.fn_finmov_alert_silent(p_medico uuid, p_tipo text, p_msg text, p_meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  BEGIN
    INSERT INTO public.financeiro_alertas (medico_id, tipo, severidade, mensagem, metadata)
    VALUES (p_medico, p_tipo, 'alta', p_msg, p_meta);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- 3) Trigger sobre consultas_financeiro (CRÉDITO + ESTORNO observer)
CREATE OR REPLACE FUNCTION public.trg_finmov_consultas_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_pago boolean := false;
BEGIN
  -- proteção total: jamais quebrar UX
  BEGIN
    IF NEW.medico_id IS NULL OR COALESCE(NEW.valor_medico_centavos,0) <= 0 THEN
      RETURN NEW;
    END IF;

    -- Crédito: status virou 'valido' E existe pagamento pago
    IF NEW.status = 'valido'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'valido') THEN
      SELECT EXISTS (
        SELECT 1 FROM public.pagamentos p
        WHERE p.consulta_id = NEW.consulta_id AND p.status = 'pago'
      ) INTO v_pago;
      IF v_pago THEN
        PERFORM public.fn_registrar_movimento_idempotente(
          'producao','cf:'||NEW.id::text||':pendente',
          jsonb_build_object(
            'conta','medico','conta_ref_id',NEW.medico_id,
            'direcao','credito','valor_cents',NEW.valor_medico_centavos,
            'ref_type','consulta','ref_id',NEW.consulta_id,
            'bucket','pendente','ocorrido_em',NEW.created_at,
            'origem','trigger_cf'));
      END IF;
    END IF;

    -- Estorno: status virou estornado/reembolsado/invalidado
    IF NEW.status IN ('estornado','reembolsado','invalidado')
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','estorno:cf:'||NEW.id::text,
        jsonb_build_object(
          'conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','debito','valor_cents',NEW.valor_medico_centavos,
          'ref_type','estorno','ref_id',NEW.consulta_id,
          'bucket','pendente','ocorrido_em',NEW.updated_at,
          'origem','trigger_cf'));
    END IF;

  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_finmov_alert_silent(NEW.medico_id,'trigger_cf_falhou', SQLERRM,
      jsonb_build_object('cf_id',NEW.id,'consulta_id',NEW.consulta_id,'status',NEW.status));
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finmov_cf ON public.consultas_financeiro;
CREATE TRIGGER trg_finmov_cf
AFTER INSERT OR UPDATE ON public.consultas_financeiro
FOR EACH ROW EXECUTE FUNCTION public.trg_finmov_consultas_financeiro();

-- 4) Trigger captura tardia: quando pagamento muda para 'pago',
--    registra créditos pendentes para CFs já existentes (cobre processar_pagamento_confirmado)
CREATE OR REPLACE FUNCTION public.trg_finmov_pagamentos_capture()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r_cf record;
BEGIN
  BEGIN
    IF NEW.status = 'pago' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'pago')
       AND NEW.consulta_id IS NOT NULL THEN
      FOR r_cf IN
        SELECT * FROM public.consultas_financeiro
        WHERE consulta_id = NEW.consulta_id
          AND status='valido' AND medico_id IS NOT NULL
          AND valor_medico_centavos > 0
      LOOP
        PERFORM public.fn_registrar_movimento_idempotente(
          'producao','cf:'||r_cf.id::text||':pendente',
          jsonb_build_object(
            'conta','medico','conta_ref_id',r_cf.medico_id,
            'direcao','credito','valor_cents',r_cf.valor_medico_centavos,
            'ref_type','consulta','ref_id',r_cf.consulta_id,
            'bucket','pendente','ocorrido_em',r_cf.created_at,
            'origem','trigger_pag'));
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_finmov_alert_silent(NULL,'trigger_pag_falhou', SQLERRM,
      jsonb_build_object('pagamento_id',NEW.id,'consulta_id',NEW.consulta_id));
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finmov_pag ON public.pagamentos;
CREATE TRIGGER trg_finmov_pag
AFTER INSERT OR UPDATE OF status ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.trg_finmov_pagamentos_capture();

-- 5) Trigger sobre saques_medicos (retenção / sacado / liberação)
CREATE OR REPLACE FUNCTION public.trg_finmov_saques()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_active text[] := ARRAY['solicitado','em_analise','correcao_solicitada','aprovado'];
  v_old_active boolean := false;
  v_new_active boolean := false;
BEGIN
  BEGIN
    IF NEW.medico_id IS NULL OR COALESCE(NEW.valor_centavos,0) <= 0 THEN
      RETURN NEW;
    END IF;

    v_new_active := NEW.status::text = ANY (v_active);
    IF TG_OP = 'UPDATE' THEN
      v_old_active := OLD.status::text = ANY (v_active);
    END IF;

    -- Saque entrou em retenção (debita pendente, credita retido)
    IF v_new_active AND (TG_OP='INSERT' OR NOT v_old_active) THEN
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':pend_debito',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','debito','valor_cents',NEW.valor_centavos,
          'ref_type','retencao','ref_id',NEW.id,
          'bucket','pendente','ocorrido_em',NEW.solicitado_em,
          'origem','trigger_saque'));
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':retido_credito',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','credito','valor_cents',NEW.valor_centavos,
          'ref_type','retencao','ref_id',NEW.id,
          'bucket','retido','ocorrido_em',NEW.solicitado_em,
          'origem','trigger_saque'));
    END IF;

    -- Saque pago (sai de retido para sacado)
    IF NEW.status::text = 'pago' AND (TG_OP='INSERT' OR OLD.status::text IS DISTINCT FROM 'pago') THEN
      -- Garantir lançamentos de retenção (caso INSERT direto como pago)
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':pend_debito',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','debito','valor_cents',NEW.valor_centavos,
          'ref_type','retencao','ref_id',NEW.id,
          'bucket','pendente','ocorrido_em',COALESCE(NEW.solicitado_em,NEW.pago_em),
          'origem','trigger_saque'));
      -- Debita retido + credita sacado
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':retido_debito',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','debito','valor_cents',NEW.valor_centavos,
          'ref_type','saque','ref_id',NEW.id,
          'bucket','retido','ocorrido_em',COALESCE(NEW.pago_em,NEW.solicitado_em),
          'origem','trigger_saque'));
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':sacado_credito',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','credito','valor_cents',NEW.valor_centavos,
          'ref_type','saque','ref_id',NEW.id,
          'bucket','sacado','ocorrido_em',COALESCE(NEW.pago_em,NEW.solicitado_em),
          'origem','trigger_saque'));
    END IF;

    -- Saque cancelado/recusado depois de ter entrado em retenção: estorna retenção
    IF NEW.status::text IN ('cancelado','recusado','rejeitado')
       AND TG_OP='UPDATE' AND v_old_active THEN
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':retido_debito_cancel',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','debito','valor_cents',NEW.valor_centavos,
          'ref_type','retencao','ref_id',NEW.id,
          'bucket','retido','ocorrido_em',COALESCE(NEW.recusado_em,NEW.updated_at),
          'origem','trigger_saque'));
      PERFORM public.fn_registrar_movimento_idempotente(
        'producao','saque:'||NEW.id::text||':pend_credito_cancel',
        jsonb_build_object('conta','medico','conta_ref_id',NEW.medico_id,
          'direcao','credito','valor_cents',NEW.valor_centavos,
          'ref_type','retencao','ref_id',NEW.id,
          'bucket','pendente','ocorrido_em',COALESCE(NEW.recusado_em,NEW.updated_at),
          'origem','trigger_saque'));
    END IF;

  EXCEPTION WHEN OTHERS THEN
    PERFORM public.fn_finmov_alert_silent(NEW.medico_id,'trigger_saque_falhou', SQLERRM,
      jsonb_build_object('saque_id',NEW.id,'status',NEW.status));
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finmov_sq ON public.saques_medicos;
CREATE TRIGGER trg_finmov_sq
AFTER INSERT OR UPDATE ON public.saques_medicos
FOR EACH ROW EXECUTE FUNCTION public.trg_finmov_saques();
