-- 1) app_settings: valida apenas a key de repasse global
CREATE OR REPLACE FUNCTION public.fn_validar_repasse_global()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_pct numeric;
BEGIN
  IF NEW.key <> 'financeiro.comissao_padrao_pct' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_pct := (NEW.value)::text::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Repasse global deve ser numérico (recebido: %)', NEW.value
      USING ERRCODE = 'check_violation';
  END;

  IF v_pct IS NULL OR v_pct < 0 OR v_pct > 100 THEN
    RAISE EXCEPTION 'Repasse global inválido: % (deve estar entre 0 e 100)', v_pct
      USING ERRCODE = 'check_violation';
  END IF;

  v_pct := round(v_pct, 2);
  NEW.value := to_jsonb(v_pct);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_repasse_global ON public.app_settings;
CREATE TRIGGER trg_validar_repasse_global
BEFORE INSERT OR UPDATE ON public.app_settings
FOR EACH ROW
WHEN (NEW.key = 'financeiro.comissao_padrao_pct')
EXECUTE FUNCTION public.fn_validar_repasse_global();

-- 2) medico_comissao_override
CREATE OR REPLACE FUNCTION public.fn_validar_override_pct()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.comissao_pct IS NULL THEN
    RAISE EXCEPTION 'Percentual de repasse é obrigatório.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.comissao_pct < 0 OR NEW.comissao_pct > 100 THEN
    RAISE EXCEPTION 'Percentual de repasse inválido: % (deve estar entre 0 e 100)', NEW.comissao_pct
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.comissao_pct := round(NEW.comissao_pct, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_override_pct ON public.medico_comissao_override;
CREATE TRIGGER trg_validar_override_pct
BEFORE INSERT OR UPDATE ON public.medico_comissao_override
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_override_pct();

-- 3) servicos_financeiros (modelo percentual)
CREATE OR REPLACE FUNCTION public.fn_validar_servico_pct()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.modelo = 'percentual' THEN
    IF NEW.comissao_pct IS NULL THEN
      RAISE EXCEPTION 'Serviço percentual exige comissao_pct.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.comissao_pct < 0 OR NEW.comissao_pct > 100 THEN
      RAISE EXCEPTION 'Comissão do serviço inválida: % (deve estar entre 0 e 100)', NEW.comissao_pct
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.comissao_pct := round(NEW.comissao_pct, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_servico_pct ON public.servicos_financeiros;
CREATE TRIGGER trg_validar_servico_pct
BEFORE INSERT OR UPDATE ON public.servicos_financeiros
FOR EACH ROW
EXECUTE FUNCTION public.fn_validar_servico_pct();