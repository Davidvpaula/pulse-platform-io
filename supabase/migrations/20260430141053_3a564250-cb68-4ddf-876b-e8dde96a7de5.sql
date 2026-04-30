CREATE OR REPLACE FUNCTION public.validar_e_aplicar_cupom(
  _pagamento_id uuid,
  _codigo text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_codigo text;
  v_cupom record;
  v_pag record;
  v_consulta record;
  v_valor_original int;
  v_desconto int := 0;
  v_final int;
  v_meta jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '28000';
  END IF;

  v_codigo := upper(regexp_replace(coalesce(_codigo,''), '\s+', '', 'g'));
  IF v_codigo = '' THEN
    RAISE EXCEPTION 'Informe um código de cupom.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF v_pag IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_pag.status <> 'pendente' THEN
    RAISE EXCEPTION 'Pagamento não pode mais ser alterado (status: %).', v_pag.status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_consulta FROM public.consultas WHERE id = v_pag.consulta_id;
  IF v_consulta IS NULL THEN
    RAISE EXCEPTION 'Consulta vinculada ao pagamento não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'secretaria')
    OR public.is_paciente_da_consulta(v_consulta.id)
  ) THEN
    RAISE EXCEPTION 'Sem permissão para aplicar cupom neste pagamento.' USING ERRCODE = '42501';
  END IF;

  IF (v_pag.metadata ? 'cupom') THEN
    RAISE EXCEPTION 'Já existe um cupom aplicado neste pagamento. Remova-o antes de aplicar outro.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_cupom FROM public.cupons WHERE codigo = v_codigo FOR UPDATE;
  IF v_cupom IS NULL THEN
    RAISE EXCEPTION 'Cupom não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_cupom.ativo THEN
    RAISE EXCEPTION 'Cupom inativo.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.valido_de IS NOT NULL AND v_cupom.valido_de > now() THEN
    RAISE EXCEPTION 'Cupom ainda não está válido.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.valido_ate IS NOT NULL AND v_cupom.valido_ate < now() THEN
    RAISE EXCEPTION 'Cupom expirado.' USING ERRCODE = '22023';
  END IF;
  IF v_cupom.uso_maximo IS NOT NULL AND v_cupom.uso_atual >= v_cupom.uso_maximo THEN
    RAISE EXCEPTION 'Cupom esgotou o limite de usos.' USING ERRCODE = '22023';
  END IF;

  IF v_cupom.escopo = 'medico' THEN
    IF v_cupom.medico_id IS NULL OR v_cupom.medico_id <> v_consulta.medico_id THEN
      RAISE EXCEPTION 'Cupom não vale para este médico.' USING ERRCODE = '22023';
    END IF;
  ELSIF v_cupom.escopo = 'especialidade' THEN
    IF v_cupom.especialidade_id IS NULL
       OR v_consulta.especialidade_id IS NULL
       OR v_cupom.especialidade_id <> v_consulta.especialidade_id THEN
      RAISE EXCEPTION 'Cupom não vale para esta especialidade.' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_valor_original := v_pag.valor_centavos;
  IF v_valor_original IS NULL OR v_valor_original <= 0 THEN
    RAISE EXCEPTION 'Pagamento sem valor para aplicar desconto.' USING ERRCODE = '22023';
  END IF;

  IF v_cupom.tipo = 'percentual' THEN
    v_desconto := round((v_valor_original::numeric * v_cupom.valor) / 100)::int;
  ELSE
    v_desconto := v_cupom.valor;
  END IF;
  v_desconto := greatest(0, least(v_desconto, v_valor_original));
  v_final := greatest(0, v_valor_original - v_desconto);

  v_meta := coalesce(v_pag.metadata, '{}'::jsonb) || jsonb_build_object(
    'cupom', jsonb_build_object(
      'cupom_id', v_cupom.id,
      'codigo', v_cupom.codigo,
      'nome', v_cupom.nome,
      'tipo', v_cupom.tipo,
      'escopo', v_cupom.escopo,
      'valor_original_centavos', v_valor_original,
      'desconto_centavos', v_desconto,
      'valor_final_centavos', v_final,
      'aplicado_em', now()
    )
  );

  UPDATE public.pagamentos
     SET valor_centavos = v_final,
         metadata = v_meta,
         updated_at = now()
   WHERE id = _pagamento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cupom_id', v_cupom.id,
    'codigo', v_cupom.codigo,
    'nome', v_cupom.nome,
    'tipo', v_cupom.tipo,
    'valor_original_centavos', v_valor_original,
    'desconto_centavos', v_desconto,
    'valor_final_centavos', v_final
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_cupom_pagamento(
  _pagamento_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pag record;
  v_consulta record;
  v_original int;
  v_meta jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id FOR UPDATE;
  IF v_pag IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_pag.status <> 'pendente' THEN
    RAISE EXCEPTION 'Pagamento não pode mais ser alterado.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_consulta FROM public.consultas WHERE id = v_pag.consulta_id;
  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'secretaria')
    OR (v_consulta IS NOT NULL AND public.is_paciente_da_consulta(v_consulta.id))
  ) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE = '42501';
  END IF;

  IF NOT (v_pag.metadata ? 'cupom') THEN
    RETURN jsonb_build_object('ok', true, 'noop', true);
  END IF;

  v_original := nullif((v_pag.metadata->'cupom'->>'valor_original_centavos'), '')::int;
  v_meta := v_pag.metadata - 'cupom';

  UPDATE public.pagamentos
     SET valor_centavos = coalesce(v_original, valor_centavos),
         metadata = v_meta,
         updated_at = now()
   WHERE id = _pagamento_id;

  RETURN jsonb_build_object('ok', true, 'valor_centavos', coalesce(v_original, v_pag.valor_centavos));
END;
$$;

DROP TRIGGER IF EXISTS trg_cupom_normaliza_codigo ON public.cupons;
CREATE TRIGGER trg_cupom_normaliza_codigo
BEFORE INSERT OR UPDATE ON public.cupons
FOR EACH ROW EXECUTE FUNCTION public.cupom_normaliza_codigo();