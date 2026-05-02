
DROP FUNCTION IF EXISTS public.financeiro_pagamento_confirmar(uuid);
DROP FUNCTION IF EXISTS public.financeiro_pagamento_cancelar(uuid, text);

CREATE OR REPLACE FUNCTION public.financeiro_pagamento_confirmar(_pagamento_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  SELECT status INTO _old_status FROM pagamentos WHERE id = _pagamento_id;
  IF _old_status IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF _old_status <> 'pendente' THEN RAISE EXCEPTION 'Pagamento não está pendente (status atual: %)', _old_status; END IF;

  UPDATE pagamentos
  SET status = 'pago', paid_at = now(), data_pagamento = now(),
      metodo = COALESCE(metodo, 'manual'), updated_at = now()
  WHERE id = _pagamento_id;

  INSERT INTO consultas_auditoria (id, consulta_id, acao, descricao, autor_id, created_at)
  SELECT gen_random_uuid(), p.consulta_id, 'pagamento_confirmado',
         'Pagamento ' || _pagamento_id || ' confirmado manualmente pelo admin',
         auth.uid(), now()
  FROM pagamentos p WHERE p.id = _pagamento_id AND p.consulta_id IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.financeiro_pagamento_confirmar(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.financeiro_pagamento_cancelar(_pagamento_id uuid, _motivo text DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores';
  END IF;

  SELECT status INTO _old_status FROM pagamentos WHERE id = _pagamento_id;
  IF _old_status IS NULL THEN RAISE EXCEPTION 'Pagamento não encontrado'; END IF;
  IF _old_status NOT IN ('pendente', 'pago') THEN RAISE EXCEPTION 'Pagamento não pode ser cancelado (status: %)', _old_status; END IF;

  UPDATE pagamentos
  SET status = 'cancelado', cancelled_at = now(),
      observacoes_internas = COALESCE(observacoes_internas || E'\n', '') || '[CANCEL] ' || COALESCE(_motivo, ''),
      updated_at = now()
  WHERE id = _pagamento_id;

  INSERT INTO consultas_auditoria (id, consulta_id, acao, descricao, autor_id, created_at)
  SELECT gen_random_uuid(), p.consulta_id, 'pagamento_cancelado',
         'Pagamento ' || _pagamento_id || ' cancelado. Motivo: ' || COALESCE(_motivo, 'N/A'),
         auth.uid(), now()
  FROM pagamentos p WHERE p.id = _pagamento_id AND p.consulta_id IS NOT NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.financeiro_pagamento_cancelar(uuid, text) FROM anon;
