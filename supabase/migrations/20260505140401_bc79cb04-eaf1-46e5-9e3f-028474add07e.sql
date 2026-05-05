-- Remove a policy com recursão
DROP POLICY IF EXISTS "Paciente cria assinatura propria" ON public.assinaturas;

-- Função SECURITY DEFINER para verificar se o paciente pode criar a assinatura
CREATE OR REPLACE FUNCTION public.pode_criar_assinatura_paciente(
  _user_id uuid,
  _paciente_id uuid,
  _plano_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pacientes p WHERE p.id = _paciente_id AND p.user_id = _user_id
  )
  AND EXISTS (
    SELECT 1 FROM planos pl WHERE pl.id = _plano_id AND pl.created_by = _user_id AND pl.nivel = 'paciente_custom'
  );
$$;

-- Recria a policy usando a função
CREATE POLICY "Paciente cria assinatura propria"
ON public.assinaturas
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND pode_criar_assinatura_paciente(auth.uid(), paciente_id, plano_id)
);