
-- 1. Policy INSERT em planos_auditoria para admin
CREATE POLICY "Admin insere auditoria planos"
ON public.planos_auditoria
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- 2. Policy INSERT em planos_auditoria para colaboradores
CREATE POLICY "Colaborador insere auditoria planos"
ON public.planos_auditoria
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores
    WHERE user_id = auth.uid()
      AND status_conta = 'ativo'
  )
);

-- 3. Trigger de auditoria automática para propostas_empresa_medico
CREATE OR REPLACE FUNCTION public.trg_propostas_empresa_medico_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  _acao text;
  _payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _acao := 'proposta_criada';
    _payload := to_jsonb(NEW);
    INSERT INTO public.planos_auditoria (plano_id, acao, payload, actor_id)
    VALUES (NEW.plano_id, _acao, _payload, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    _acao := 'proposta_atualizada';
    _payload := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW),
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(OLD) -> key IS DISTINCT FROM value
      )
    );
    INSERT INTO public.planos_auditoria (plano_id, acao, campo, valor_anterior, valor_novo, payload, actor_id)
    VALUES (
      COALESCE(NEW.plano_id, OLD.plano_id),
      _acao,
      'status',
      OLD.status,
      NEW.status,
      _payload,
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _acao := 'proposta_removida';
    _payload := to_jsonb(OLD);
    INSERT INTO public.planos_auditoria (plano_id, acao, payload, actor_id)
    VALUES (OLD.plano_id, _acao, _payload, auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_propostas_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.propostas_empresa_medico
FOR EACH ROW
EXECUTE FUNCTION public.trg_propostas_empresa_medico_auditoria();
