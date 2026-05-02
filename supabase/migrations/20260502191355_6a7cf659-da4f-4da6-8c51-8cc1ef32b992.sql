-- 1. Create a public-safe view without sensitive columns
CREATE OR REPLACE VIEW public.servicos_publicos AS
SELECT
  id,
  slug,
  nome,
  tipo,
  descricao_publica,
  duracao_min,
  valor_paciente_centavos,
  prioridade,
  ativo
FROM public.servicos_financeiros
WHERE ativo = true;

-- 2. Grant access to anon and authenticated
GRANT SELECT ON public.servicos_publicos TO anon, authenticated;

-- 3. Drop the overly permissive public policy on the base table
DROP POLICY IF EXISTS "Servicos publicos leitura" ON public.servicos_financeiros;