-- Permitir leitura pública de servicos_financeiros ativos
-- Necessário para a página pública de Atendimento Imediato e listagem de serviços
CREATE POLICY "Leitura publica servicos ativos"
  ON public.servicos_financeiros
  FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
