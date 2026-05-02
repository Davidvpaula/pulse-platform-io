
-- Remove legacy duplicate marketing tables (both empty, no code references)
DROP TABLE IF EXISTS public.marketing_eventos;
DROP TABLE IF EXISTS public.marketing_campanhas;
