-- Fix: grant has_role to anon so RLS policies on especialidades work for visitors
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- Recreate medicos_publicos view with additional fields for enriched doctor cards
DROP VIEW IF EXISTS public.medicos_publicos;

CREATE VIEW public.medicos_publicos
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.nome,
  m.especialidade,
  m.crm,
  m.bio,
  m.foto_url,
  m.link_sala_padrao,
  m.created_at,
  COALESCE(r.avaliacao_media, 5.0) AS avaliacao_media,
  COALESCE(r.total_avaliacoes, 0) AS total_avaliacoes,
  COALESCE(r.ranking_score, 0) AS ranking_score,
  COALESCE(r.taxa_no_show, 0) AS taxa_no_show,
  COALESCE(r.fator_premium, 0) AS fator_premium,
  (m.link_sala_padrao IS NOT NULL) AS online
FROM public.medicos m
LEFT JOIN public.medico_ranking r ON r.medico_id = m.id
WHERE m.status = 'aprovado';