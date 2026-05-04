
-- 1. Função security definer para resolver empresa_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_empresa_id_do_usuario(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.empresas_funcionarios
  WHERE paciente_id = _user_id
  LIMIT 1
$$;

-- 2. FIX RLS Empresa: substituir policy genérica por escopo correto
DROP POLICY IF EXISTS "Empresa vê consultas dos colaboradores" ON public.consultas;
CREATE POLICY "Empresa vê consultas dos colaboradores"
  ON public.consultas
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'empresa'::app_role)
    AND empresa_id = get_empresa_id_do_usuario(auth.uid())
  );

-- 3. FIX RLS Paciente UPDATE: restringir apenas status para cancelamento
DROP POLICY IF EXISTS "Paciente cancela própria consulta" ON public.consultas;

-- Nova policy: paciente só pode UPDATE status (e só para cancelar)
CREATE POLICY "Paciente cancela própria consulta"
  ON public.consultas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pacientes p
      WHERE p.id = consultas.paciente_id AND p.user_id = auth.uid()
    )
    AND status = 'cancelada'
  );

-- 4. Remover policy SELECT duplicada de agenda_slots
DROP POLICY IF EXISTS "Médico vê próprios slots" ON public.agenda_slots;
