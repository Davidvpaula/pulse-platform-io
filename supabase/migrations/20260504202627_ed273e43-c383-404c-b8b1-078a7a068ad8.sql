
-- Allow paciente to INSERT plano with nivel = paciente_custom
CREATE POLICY "Paciente cria plano personalizado"
ON public.planos
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND nivel = 'paciente_custom'::plano_nivel
);

-- Allow paciente to SELECT their own custom plans (for duplicate check etc)
CREATE POLICY "Paciente ve planos custom proprios"
ON public.planos
FOR SELECT
USING (
  created_by = auth.uid()
  AND nivel = 'paciente_custom'::plano_nivel
);

-- Audit trigger: log plano creation in planos_auditoria
CREATE OR REPLACE FUNCTION public.fn_audit_plano_criado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO planos_auditoria (plano_id, acao, valor_novo, actor_id)
  VALUES (NEW.id, 'criacao', NEW.nome, NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_plano_criado ON public.planos;
CREATE TRIGGER trg_audit_plano_criado
AFTER INSERT ON public.planos
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_plano_criado();
