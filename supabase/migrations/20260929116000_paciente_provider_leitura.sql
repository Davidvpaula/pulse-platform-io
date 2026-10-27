-- Somente o nome do provedor; nenhuma chave ou configuração privada é exposta.
CREATE POLICY "Usuario consulta provedor de pagamento" ON public.app_settings
FOR SELECT TO authenticated USING (key = 'pagamentos_provider');
