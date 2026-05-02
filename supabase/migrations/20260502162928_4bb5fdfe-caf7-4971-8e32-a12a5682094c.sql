-- Add obrigatorio column to treinamentos_modulos
ALTER TABLE public.treinamentos_modulos
  ADD COLUMN IF NOT EXISTS obrigatorio boolean NOT NULL DEFAULT false;