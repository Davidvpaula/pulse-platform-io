-- Empresa pode inserir funcionários na própria empresa
CREATE POLICY "Empresa insere seus funcionarios"
ON public.empresas_funcionarios
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'empresa'::app_role)
  AND is_empresa_owner(empresa_id)
);

-- Empresa pode atualizar funcionários da própria empresa
CREATE POLICY "Empresa atualiza seus funcionarios"
ON public.empresas_funcionarios
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'empresa'::app_role)
  AND is_empresa_owner(empresa_id)
)
WITH CHECK (
  has_role(auth.uid(), 'empresa'::app_role)
  AND is_empresa_owner(empresa_id)
);

-- Empresa pode remover funcionários da própria empresa
CREATE POLICY "Empresa remove seus funcionarios"
ON public.empresas_funcionarios
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'empresa'::app_role)
  AND is_empresa_owner(empresa_id)
);

-- Corrigir RPC get_empresa_id_do_usuario para resolver corretamente
-- Antes: buscava paciente_id = _user_id (errado, pois _user_id é auth.users.id)
-- Agora: busca pacientes.user_id = _user_id, depois usa pacientes.id ou pacientes.empresa_id
CREATE OR REPLACE FUNCTION public.get_empresa_id_do_usuario(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Caminho 1: pacientes.empresa_id direto
    (SELECT p.empresa_id FROM public.pacientes p WHERE p.user_id = _user_id AND p.empresa_id IS NOT NULL LIMIT 1),
    -- Caminho 2: via empresas_funcionarios.paciente_id = pacientes.id
    (SELECT ef.empresa_id FROM public.empresas_funcionarios ef
     JOIN public.pacientes p ON p.id = ef.paciente_id
     WHERE p.user_id = _user_id LIMIT 1)
  )
$$;