-- 1) Não recalcular snapshot ao virar 'concluida' — apenas garantir existência
CREATE OR REPLACE FUNCTION public._financeiro_gerar_snapshot(_consulta_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  c RECORD; v RECORD; v_servico_nome text; v_plat integer; v_med integer;
  v_existe boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.consultas_financeiro
     WHERE consulta_id = _consulta_id
  ) INTO v_existe;
  -- Se snapshot já existe (gravado no INSERT), NUNCA recalcular.
  IF v_existe THEN RETURN; END IF;

  -- Fallback: snapshot ausente (consulta antiga). Cria com base no estado atual.
  SELECT * INTO c FROM public.consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO v FROM public.fn_resolver_comissao(c.medico_id, c.servico_id, c.valor_centavos);
  v_plat := v.valor_plataforma_centavos;
  v_med  := v.valor_medico_centavos;

  IF c.servico_id IS NOT NULL THEN
    SELECT nome INTO v_servico_nome FROM public.servicos_financeiros WHERE id = c.servico_id;
  END IF;

  INSERT INTO public.consultas_financeiro (
    consulta_id, medico_id, paciente_id, empresa_id, servico_id, servico_nome_snapshot,
    data_consulta, valor_bruto_centavos, modelo_aplicado, comissao_pct_aplicada,
    valor_plataforma_centavos, valor_medico_centavos, status, origem_regra
  ) VALUES (
    c.id, c.medico_id, c.paciente_id, c.empresa_id, c.servico_id, v_servico_nome,
    c.inicio, c.valor_centavos, v.modelo, v.comissao_pct, v_plat, v_med, 'valido', v.origem_regra
  )
  ON CONFLICT (consulta_id) DO NOTHING;

  UPDATE public.consultas
     SET valor_snapshot_centavos    = COALESCE(valor_snapshot_centavos, c.valor_centavos),
         comissao_snapshot_centavos = COALESCE(comissao_snapshot_centavos, v_plat),
         snapshot_at                = COALESCE(snapshot_at, now())
   WHERE id = c.id;
END;
$function$;


-- 2) Reforçar guard em consultas: também bloquear valor_centavos e servico_id após snapshot
CREATE OR REPLACE FUNCTION public.fn_consulta_snapshot_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF OLD.snapshot_at IS NOT NULL THEN
    IF NEW.snapshot_at                  IS DISTINCT FROM OLD.snapshot_at
    OR NEW.valor_snapshot_centavos      IS DISTINCT FROM OLD.valor_snapshot_centavos
    OR NEW.comissao_snapshot_centavos   IS DISTINCT FROM OLD.comissao_snapshot_centavos
    OR NEW.comissao_percentual_snapshot IS DISTINCT FROM OLD.comissao_percentual_snapshot
    OR NEW.valor_centavos               IS DISTINCT FROM OLD.valor_centavos
    OR NEW.servico_id                   IS DISTINCT FROM OLD.servico_id THEN
      RAISE EXCEPTION 'Snapshot financeiro da consulta % é imutável (campo congelado alterado)', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;


-- 3) Guard de imutabilidade em consultas_financeiro
CREATE OR REPLACE FUNCTION public.fn_consultas_financeiro_imutavel()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF OLD.status = 'valido' THEN
    IF NEW.valor_bruto_centavos      IS DISTINCT FROM OLD.valor_bruto_centavos
    OR NEW.modelo_aplicado           IS DISTINCT FROM OLD.modelo_aplicado
    OR NEW.comissao_pct_aplicada     IS DISTINCT FROM OLD.comissao_pct_aplicada
    OR NEW.valor_plataforma_centavos IS DISTINCT FROM OLD.valor_plataforma_centavos
    OR NEW.valor_medico_centavos     IS DISTINCT FROM OLD.valor_medico_centavos
    OR NEW.servico_id                IS DISTINCT FROM OLD.servico_id
    OR NEW.medico_id                 IS DISTINCT FROM OLD.medico_id
    OR NEW.paciente_id               IS DISTINCT FROM OLD.paciente_id
    OR NEW.origem_regra              IS DISTINCT FROM OLD.origem_regra
    OR NEW.servico_nome_snapshot     IS DISTINCT FROM OLD.servico_nome_snapshot
    OR NEW.data_consulta             IS DISTINCT FROM OLD.data_consulta THEN
      RAISE EXCEPTION 'Snapshot financeiro (consultas_financeiro %) é imutável', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_consultas_financeiro_imutavel ON public.consultas_financeiro;
CREATE TRIGGER trg_consultas_financeiro_imutavel
BEFORE UPDATE ON public.consultas_financeiro
FOR EACH ROW EXECUTE FUNCTION public.fn_consultas_financeiro_imutavel();