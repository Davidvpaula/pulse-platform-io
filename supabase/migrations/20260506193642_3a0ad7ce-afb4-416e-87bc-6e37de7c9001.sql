
-- Drop the version WITHOUT p_revisado (has p_origem in 5th position, p_actor in 6th)
DROP FUNCTION IF EXISTS public.auditoria_listar(
  timestamp with time zone,
  timestamp with time zone,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  text,
  integer,
  integer
);
