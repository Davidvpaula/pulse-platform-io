
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS feegow_vinculado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS feegow_vinculado_em timestamptz,
  ADD COLUMN IF NOT EXISTS feegow_especialidade_id integer,
  ADD COLUMN IF NOT EXISTS feegow_metadata jsonb;
