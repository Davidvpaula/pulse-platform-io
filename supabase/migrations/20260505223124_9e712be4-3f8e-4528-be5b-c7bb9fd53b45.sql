CREATE POLICY "Authenticated users can read active refund policies"
ON public.politica_reembolso
FOR SELECT
TO authenticated
USING (ativo = true);