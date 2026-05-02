
-- Fix overly permissive INSERT on medico_saldo_crescimento
DROP POLICY IF EXISTS "medico_saldo_system_insert" ON public.medico_saldo_crescimento;
CREATE POLICY "medico_saldo_system_insert" ON public.medico_saldo_crescimento
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR medico_id IN (SELECT id FROM public.medicos WHERE user_id = auth.uid())
  );

-- Fix overly permissive INSERT on impulsionamento_conversoes
DROP POLICY IF EXISTS "conversoes_system_insert" ON public.impulsionamento_conversoes;
CREATE POLICY "conversoes_system_insert" ON public.impulsionamento_conversoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Revoke anon execution on new security definer functions
REVOKE EXECUTE ON FUNCTION public.creditar_saldo_consulta() FROM anon;
REVOKE EXECUTE ON FUNCTION public.debitar_saldo_campanha() FROM anon;
REVOKE EXECUTE ON FUNCTION public.verificar_premium_conquistado(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.registrar_conversao_impulsionamento(uuid,uuid,uuid,uuid,uuid) FROM anon;
