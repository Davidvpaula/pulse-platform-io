
-- Trigger function for auditing empresas_contratos changes
CREATE OR REPLACE FUNCTION public.fn_audit_empresas_contratos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_campos TEXT[] := ARRAY[
    'plano_id', 'status', 'modelo_financeiro',
    'valor_colaborador_centavos', 'valor_consulta_centavos', 'plano_mensal_centavos',
    'limite_consultas_mes', 'data_inicio', 'data_fim', 'data_renovacao', 'observacoes'
  ];
  v_campo TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
  v_acao TEXT;
  v_old_json JSONB;
  v_new_json JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.empresas_auditoria
      (empresa_id, actor_id, acao, campo, valor_anterior, valor_novo, payload)
    VALUES (
      NEW.empresa_id, v_actor, 'contrato_criado', NULL, NULL, NULL,
      jsonb_build_object(
        'contrato_id', NEW.id,
        'plano_id', NEW.plano_id,
        'status', NEW.status,
        'modelo_financeiro', NEW.modelo_financeiro,
        'data_inicio', NEW.data_inicio,
        'data_fim', NEW.data_fim
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.empresas_auditoria
      (empresa_id, actor_id, acao, campo, valor_anterior, valor_novo, payload)
    VALUES (
      OLD.empresa_id, v_actor, 'contrato_removido', NULL, NULL, NULL,
      jsonb_build_object('contrato_id', OLD.id, 'status', OLD.status)
    );
    RETURN OLD;
  END IF;

  -- UPDATE: log each changed field individually
  v_old_json := to_jsonb(OLD);
  v_new_json := to_jsonb(NEW);

  FOREACH v_campo IN ARRAY v_campos LOOP
    v_old_val := v_old_json ->> v_campo;
    v_new_val := v_new_json ->> v_campo;

    IF v_old_val IS DISTINCT FROM v_new_val THEN
      -- Determine a human-readable action name
      CASE v_campo
        WHEN 'plano_id' THEN v_acao := 'vinculo_plano_alterado';
        WHEN 'status' THEN v_acao := 'status_contrato_alterado';
        WHEN 'modelo_financeiro' THEN v_acao := 'modelo_financeiro_alterado';
        WHEN 'limite_consultas_mes' THEN v_acao := 'limite_consultas_alterado';
        ELSE v_acao := 'contrato_atualizado';
      END CASE;

      INSERT INTO public.empresas_auditoria
        (empresa_id, actor_id, acao, campo, valor_anterior, valor_novo, payload)
      VALUES (
        NEW.empresa_id, v_actor, v_acao, v_campo,
        COALESCE(v_old_val, '(vazio)'),
        COALESCE(v_new_val, '(vazio)'),
        jsonb_build_object('contrato_id', NEW.id)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Attach trigger
CREATE TRIGGER trg_audit_empresas_contratos
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas_contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_empresas_contratos();
