-- Allow any authenticated user to read ranking_config (it's public configuration, not sensitive)
CREATE POLICY "ranking_config_authenticated_select"
ON public.ranking_config
FOR SELECT
TO authenticated
USING (true);