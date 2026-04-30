-- ============================================================
-- AUDITORIA: Repasse global e exceções por médico
-- ============================================================

-- RPC para o front passar o motivo opcional via SET LOCAL
CREATE OR REPLACE FUNCTION public.set_audit_motivo(p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SET LOCAL precisa de literal; usamos perform set_config
  PERFORM set_config('app.audit_motivo', COALESCE(p_motivo, ''), true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_audit_motivo(text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_audit_motivo(text) TO authenticated;

-- Helper interno: lê motivo da sessão
CREATE OR REPLACE FUNCTION public._get_audit_motivo()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v text;
BEGIN
  BEGIN
    v := current_setting('app.audit_motivo', true);
  EXCEPTION WHEN OTHERS THEN
    v := NULL;
  END;
  IF v IS NULL OR length(trim(v)) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v;
END;
$$;

-- ============================================================
-- Trigger: app_settings (repasse global)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_repasse_global()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_plat numeric;
  v_new_plat numeric;
  v_old_med  numeric;
  v_new_med  numeric;
BEGIN
  IF NEW.key <> 'financeiro.comissao_padrao_pct' THEN
    RETURN NEW;
  END IF;

  v_new_plat := COALESCE((NEW.value)::text::numeric, 0);
  v_old_plat := CASE WHEN TG_OP = 'UPDATE'
                     THEN COALESCE((OLD.value)::text::numeric, NULL)
                     ELSE NULL END;

  -- só registra se realmente mudou
  IF TG_OP = 'UPDATE' AND v_old_plat IS NOT DISTINCT FROM v_new_plat THEN
    RETURN NEW;
  END IF;

  v_new_med := round(100 - v_new_plat, 2);
  v_old_med := CASE WHEN v_old_plat IS NULL THEN NULL ELSE round(100 - v_old_plat, 2) END;

  INSERT INTO public.financeiro_auditoria (
    entidade, entidade_id, acao, actor_id,
    valor_anterior, valor_novo, motivo, payload
  ) VALUES (
    'repasse_global',
    NULL,
    CASE WHEN TG_OP = 'INSERT' THEN 'criado' ELSE 'atualizado' END,
    auth.uid(),
    v_old_med::text,
    v_new_med::text,
    public._get_audit_motivo(),
    jsonb_build_object(
      'plataforma_anterior_pct', v_old_plat,
      'plataforma_novo_pct', v_new_plat,
      'medico_anterior_pct', v_old_med,
      'medico_novo_pct', v_new_med,
      'setting_key', NEW.key
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_repasse_global ON public.app_settings;
CREATE TRIGGER trg_audit_repasse_global
AFTER INSERT OR UPDATE ON public.app_settings
FOR EACH ROW
WHEN (NEW.key = 'financeiro.comissao_padrao_pct')
EXECUTE FUNCTION public.fn_audit_repasse_global();

-- ============================================================
-- Trigger: medico_comissao_override
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_audit_override_medico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao text;
  v_old_med numeric;
  v_new_med numeric;
  v_med_id uuid;
  v_serv_id uuid;
  v_ativo boolean;
  v_motivo_override text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criado';
    v_old_med := NULL;
    v_new_med := round(100 - NEW.comissao_pct, 2);
    v_med_id := NEW.medico_id;
    v_serv_id := NEW.servico_id;
    v_ativo := NEW.ativo;
    v_motivo_override := NEW.motivo;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_med := round(100 - OLD.comissao_pct, 2);
    v_new_med := round(100 - NEW.comissao_pct, 2);
    v_med_id := NEW.medico_id;
    v_serv_id := NEW.servico_id;
    v_ativo := NEW.ativo;
    v_motivo_override := NEW.motivo;

    -- só ativo mudou? classifica como ativado/desativado
    IF OLD.comissao_pct IS NOT DISTINCT FROM NEW.comissao_pct
       AND OLD.motivo IS NOT DISTINCT FROM NEW.motivo
       AND OLD.servico_id IS NOT DISTINCT FROM NEW.servico_id
       AND OLD.ativo IS DISTINCT FROM NEW.ativo
    THEN
      v_acao := CASE WHEN NEW.ativo THEN 'ativado' ELSE 'desativado' END;
    ELSIF OLD.comissao_pct IS NOT DISTINCT FROM NEW.comissao_pct
       AND OLD.motivo IS NOT DISTINCT FROM NEW.motivo
       AND OLD.servico_id IS NOT DISTINCT FROM NEW.servico_id
       AND OLD.ativo IS NOT DISTINCT FROM NEW.ativo
    THEN
      RETURN NEW; -- nada relevante mudou
    ELSE
      v_acao := 'editado';
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'removido';
    v_old_med := round(100 - OLD.comissao_pct, 2);
    v_new_med := NULL;
    v_med_id := OLD.medico_id;
    v_serv_id := OLD.servico_id;
    v_ativo := OLD.ativo;
    v_motivo_override := OLD.motivo;
  END IF;

  INSERT INTO public.financeiro_auditoria (
    entidade, entidade_id, acao, actor_id,
    valor_anterior, valor_novo, motivo, payload
  ) VALUES (
    'comissao_override',
    COALESCE(NEW.id, OLD.id),
    v_acao,
    auth.uid(),
    v_old_med::text,
    v_new_med::text,
    public._get_audit_motivo(),
    jsonb_build_object(
      'medico_id', v_med_id,
      'servico_id', v_serv_id,
      'ativo', v_ativo,
      'motivo_override', v_motivo_override
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_override_medico_iud ON public.medico_comissao_override;
CREATE TRIGGER trg_audit_override_medico_iud
AFTER INSERT OR UPDATE OR DELETE ON public.medico_comissao_override
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_override_medico();

-- ============================================================
-- Índices para a listagem do histórico
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fin_audit_repasse_entidade_data
  ON public.financeiro_auditoria (entidade, created_at DESC)
  WHERE entidade IN ('repasse_global', 'comissao_override');

CREATE INDEX IF NOT EXISTS idx_fin_audit_payload_medico
  ON public.financeiro_auditoria USING GIN ((payload));