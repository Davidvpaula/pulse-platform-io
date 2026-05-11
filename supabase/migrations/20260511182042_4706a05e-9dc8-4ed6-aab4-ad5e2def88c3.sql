ALTER TABLE public.especialidades ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 999;

WITH ranked AS (
  SELECT id, (row_number() OVER (ORDER BY nome) * 10)::int AS new_ordem
  FROM public.especialidades
)
UPDATE public.especialidades e
SET ordem = r.new_ordem
FROM ranked r
WHERE e.id = r.id;

CREATE INDEX IF NOT EXISTS idx_especialidades_ordem ON public.especialidades (ordem, nome);