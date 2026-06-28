
-- MEDICOS: restrict anon to safe columns only
REVOKE SELECT ON public.medicos FROM anon;
GRANT SELECT (
  id, nome, tratamento, especialidade, crm, bio, foto_url,
  link_sala_padrao, created_at, status
) ON public.medicos TO anon;

CREATE POLICY "Medicos aprovados leitura publica restrita"
  ON public.medicos FOR SELECT
  TO anon, authenticated
  USING (status = 'aprovado'::medico_status);

-- SERVICOS_FINANCEIROS: restrict anon to safe columns only
REVOKE SELECT ON public.servicos_financeiros FROM anon;
GRANT SELECT (
  id, slug, nome, tipo, descricao_publica, duracao_min,
  valor_paciente_centavos, prioridade, ativo, icone, imagem_url,
  subtitulo, destacar_na_home
) ON public.servicos_financeiros TO anon;

CREATE POLICY "Servicos ativos leitura publica restrita"
  ON public.servicos_financeiros FOR SELECT
  TO anon, authenticated
  USING (ativo = true);
