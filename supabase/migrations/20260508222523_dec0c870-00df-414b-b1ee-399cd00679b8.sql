
-- Limpa movimentos/idempotency do médico de teste, bypassando o trigger append-only
CREATE OR REPLACE FUNCTION public._test_purge_medico(p_medico_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SET LOCAL session_replication_role = 'replica';
  DELETE FROM public.financeiro_idempotency
   WHERE key IN (SELECT split_part(idempotency_key, ':', 2) FROM public.financeiro_movimentos
                  WHERE conta='medico' AND conta_ref_id=p_medico_id);
  DELETE FROM public.financeiro_idempotency WHERE scope='test';
  DELETE FROM public.financeiro_movimentos WHERE conta='medico' AND conta_ref_id=p_medico_id;
END;
$$;

-- Tenta UPDATE; retorna TRUE se foi bloqueado (esperado), FALSE se passou
CREATE OR REPLACE FUNCTION public._test_try_update_movimento(p_medico_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  -- garante existência de pelo menos um movimento
  PERFORM public.fn_registrar_movimento_idempotente(
    'test', 'append:' || gen_random_uuid()::text,
    jsonb_build_object('conta','medico','conta_ref_id',p_medico_id,'direcao','credito',
                       'valor_cents',1,'ref_type','consulta','bucket','pendente','origem','test'));
  SELECT id INTO v_id FROM public.financeiro_movimentos
  WHERE conta='medico' AND conta_ref_id=p_medico_id ORDER BY seq DESC LIMIT 1;
  BEGIN
    UPDATE public.financeiro_movimentos SET valor_cents = valor_cents + 1 WHERE id = v_id;
    RETURN false;
  EXCEPTION WHEN OTHERS THEN
    RETURN true;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public._test_try_delete_movimento(p_medico_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.financeiro_movimentos
  WHERE conta='medico' AND conta_ref_id=p_medico_id ORDER BY seq DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN true; END IF;
  BEGIN
    DELETE FROM public.financeiro_movimentos WHERE id = v_id;
    RETURN false;
  EXCEPTION WHEN OTHERS THEN
    RETURN true;
  END;
END;
$$;

-- Executor de SQL muito restrito: SOMENTE SELECTs simples; usado pelos testes via service role
CREATE OR REPLACE FUNCTION public._test_exec_sql(q text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF q !~* '^\s*SELECT' THEN
    RAISE EXCEPTION '_test_exec_sql: apenas SELECT permitido';
  END IF;
  EXECUTE 'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (' || q || ') t' INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public._test_purge_medico(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._test_try_update_movimento(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._test_try_delete_movimento(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._test_exec_sql(text) FROM PUBLIC, anon, authenticated;
