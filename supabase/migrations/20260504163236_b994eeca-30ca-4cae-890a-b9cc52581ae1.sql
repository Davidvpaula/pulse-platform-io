
-- 1. Policy SELECT pública na tabela medicos (somente aprovados)
CREATE POLICY "Médicos aprovados visíveis publicamente"
ON public.medicos
FOR SELECT
TO anon, authenticated
USING (status = 'aprovado');

-- 2. VIEW pública segura (exclui campos sensíveis)
CREATE OR REPLACE VIEW public.medicos_publicos
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.nome,
  m.especialidade,
  m.crm,
  m.link_sala_padrao,
  m.created_at,
  COALESCE(r.avaliacao_media, 0) AS avaliacao_media,
  COALESCE(r.total_avaliacoes, 0) AS total_avaliacoes,
  COALESCE(r.ranking_score, 0) AS ranking_score,
  CASE WHEN m.link_sala_padrao IS NOT NULL AND m.link_sala_padrao <> '' THEN true ELSE false END AS online
FROM public.medicos m
LEFT JOIN public.medico_ranking r ON r.medico_id = m.id
WHERE m.status = 'aprovado';
