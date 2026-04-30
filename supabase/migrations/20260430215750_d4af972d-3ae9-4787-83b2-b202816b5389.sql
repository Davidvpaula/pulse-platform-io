-- =========================================================
-- FIX: fn_resolver_comissao + fn_consulta_snapshot_financeiro
-- =========================================================

-- 1) fn_resolver_comissao: qualificar colunas e inverter semântica
CREATE OR REPLACE FUNCTION public.fn_resolver_comissao(
  _medico_id uuid, _servico_id uuid, _valor_bruto_centavos int
) RETURNS TABLE(
  modelo public.servico_financeiro_modelo,
  comissao_pct numeric(5,2),
  valor_medico_centavos int,
  valor_plataforma_centavos int,
  origem_regra text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pct numeric(5,2);          -- % da PLATAFORMA
  v_modelo public.servico_financeiro_modelo;
  v_fixo int;
  v_origem text;
BEGIN
  -- Prioridade 1: override específico médico+serviço
  IF _servico_id IS NOT NULL THEN
    SELECT mco.comissao_pct INTO v_pct
      FROM public.medico_comissao_override mco
     WHERE mco.medico_id = _medico_id
       AND mco.servico_id = _servico_id
       AND mco.ativo = true
     LIMIT 1;
    IF v_pct IS NOT NULL THEN
      v_modelo := 'percentual';
      v_origem := 'override_servico';
    END IF;
  END IF;

  -- Prioridade 2: override geral do médico (particular)
  IF v_pct IS NULL THEN
    SELECT mco.comissao_pct INTO v_pct
      FROM public.medico_comissao_override mco
     WHERE mco.medico_id = _medico_id
       AND mco.servico_id IS NULL
       AND mco.ativo = true
     LIMIT 1;
    IF v_pct IS NOT NULL THEN
      v_modelo := 'percentual';
      v_origem := 'override_global_medico';
    END IF;
  END IF;

  -- Prioridade 3: configuração do serviço da plataforma
  IF v_pct IS NULL AND _servico_id IS NOT NULL THEN
    SELECT s.modelo, s.comissao_pct, s.valor_fixo_centavos
      INTO v_modelo, v_pct, v_fixo
      FROM public.servicos_financeiros s
     WHERE s.id = _servico_id;
    IF v_modelo IS NOT NULL THEN
      v_origem := 'servico';
    END IF;
  END IF;

  -- Prioridade 4: fallback global
  IF v_modelo IS NULL THEN
    SELECT (value)::text::numeric INTO v_pct
      FROM public.app_settings
     WHERE key = 'financeiro.comissao_padrao_pct';
    IF v_pct IS NULL THEN v_pct := 50; END IF;
    v_modelo := 'percentual';
    v_origem := 'global';
  END IF;

  -- Cálculo: comissao_pct é % da PLATAFORMA
  IF v_modelo = 'valor_fixo' THEN
    -- valor_fixo é o que a PLATAFORMA cobra (taxa fixa). Médico recebe o resto.
    valor_plataforma_centavos := COALESCE(v_fixo, 0);
    valor_medico_centavos := GREATEST(0, _valor_bruto_centavos - valor_plataforma_centavos);
    comissao_pct := NULL;
  ELSE
    valor_plataforma_centavos := ROUND(_valor_bruto_centavos * v_pct / 100.0)::int;
    valor_medico_centavos := _valor_bruto_centavos - valor_plataforma_centavos;
    comissao_pct := v_pct;
  END IF;

  modelo := v_modelo;
  origem_regra := v_origem;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_resolver_comissao(uuid,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_resolver_comissao(uuid,uuid,int) TO authenticated;

-- =========================================================
-- 2) Trigger: salvar PARTE DA PLATAFORMA em comissao_snapshot
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_consulta_snapshot_financeiro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_valor_bruto int;
  v_servico_nome text;
  r record;
BEGIN
  IF NEW.servico_id IS NOT NULL THEN
    SELECT valor_paciente_centavos, nome
      INTO v_valor_bruto, v_servico_nome
      FROM public.servicos_financeiros WHERE id = NEW.servico_id;
  END IF;
  v_valor_bruto := COALESCE(v_valor_bruto, NEW.valor_centavos, 0);

  SELECT * INTO r FROM public.fn_resolver_comissao(NEW.medico_id, NEW.servico_id, v_valor_bruto);

  INSERT INTO public.consultas_financeiro(
    consulta_id, medico_id, paciente_id, empresa_id, servico_id, servico_nome_snapshot,
    data_consulta, valor_bruto_centavos, modelo_aplicado, comissao_pct_aplicada,
    valor_plataforma_centavos, valor_medico_centavos, status, origem_regra
  ) VALUES (
    NEW.id, NEW.medico_id, NEW.paciente_id, NEW.empresa_id, NEW.servico_id, v_servico_nome,
    NEW.inicio, v_valor_bruto, r.modelo, r.comissao_pct,
    r.valor_plataforma_centavos, r.valor_medico_centavos, 'valido', r.origem_regra
  ) ON CONFLICT (consulta_id) DO NOTHING;

  UPDATE public.consultas
     SET valor_snapshot_centavos = v_valor_bruto,
         -- comissao_snapshot_centavos = parte que a PLATAFORMA fica
         comissao_snapshot_centavos = r.valor_plataforma_centavos,
         snapshot_at = now()
   WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 3) Recalcula snapshots já gravados (com base no que foi aplicado)
-- =========================================================
-- Em consultas_financeiro: troca papéis valor_medico <-> valor_plataforma
-- somente quando modelo='percentual' (valor_fixo já estava certo no campo da plataforma).
UPDATE public.consultas_financeiro
   SET valor_plataforma_centavos = ROUND(valor_bruto_centavos * comissao_pct_aplicada / 100.0)::int,
       valor_medico_centavos = valor_bruto_centavos
                              - ROUND(valor_bruto_centavos * comissao_pct_aplicada / 100.0)::int
 WHERE modelo_aplicado = 'percentual'
   AND comissao_pct_aplicada IS NOT NULL;

-- Em consultas: comissao_snapshot deve refletir parte da plataforma
UPDATE public.consultas c
   SET comissao_snapshot_centavos = cf.valor_plataforma_centavos
  FROM public.consultas_financeiro cf
 WHERE cf.consulta_id = c.id
   AND c.comissao_snapshot_centavos IS DISTINCT FROM cf.valor_plataforma_centavos;
