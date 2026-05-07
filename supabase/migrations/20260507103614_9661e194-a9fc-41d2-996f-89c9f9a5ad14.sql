
-- 1. Create enum for tipo_paciente
DO $$ BEGIN
  CREATE TYPE public.tipo_paciente AS ENUM ('titular', 'dependente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Alter pacientes: make user_id nullable, add new columns
ALTER TABLE public.pacientes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parentesco TEXT,
  ADD COLUMN IF NOT EXISTS tipo_paciente public.tipo_paciente NOT NULL DEFAULT 'titular';

CREATE INDEX IF NOT EXISTS idx_pacientes_responsavel_id ON public.pacientes(responsavel_id);

-- 3. Create dependente_consentimentos table
CREATE TABLE IF NOT EXISTS public.dependente_consentimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  dependente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo_consentimento TEXT NOT NULL DEFAULT 'cadastro_dependente',
  aceite BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT,
  texto_termo_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dependente_consentimentos ENABLE ROW LEVEL SECURITY;

-- 4. RLS for dependente_consentimentos
-- Titular can view consents for their dependents
CREATE POLICY "titular_view_consentimentos"
  ON public.dependente_consentimentos FOR SELECT
  TO authenticated
  USING (
    responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  );

-- Titular can create consents for their dependents
CREATE POLICY "titular_insert_consentimentos"
  ON public.dependente_consentimentos FOR INSERT
  TO authenticated
  WITH CHECK (
    responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  );

-- 5. RLS on pacientes for dependentes visibility
-- We need a new SELECT policy so titulares can also see their dependentes.
-- Existing policies let user see own row (user_id = auth.uid()).
-- Add policy for dependentes of the logged-in titular.
CREATE POLICY "titular_view_dependentes"
  ON public.pacientes FOR SELECT
  TO authenticated
  USING (
    responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  );

-- Titular can insert dependentes (tipo_paciente = 'dependente', responsavel_id = their paciente id)
CREATE POLICY "titular_insert_dependentes"
  ON public.pacientes FOR INSERT
  TO authenticated
  WITH CHECK (
    tipo_paciente = 'dependente'
    AND user_id IS NULL
    AND responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  );

-- Titular can update their own dependentes
CREATE POLICY "titular_update_dependentes"
  ON public.pacientes FOR UPDATE
  TO authenticated
  USING (
    tipo_paciente = 'dependente'
    AND responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tipo_paciente = 'dependente'
    AND responsavel_id IN (
      SELECT id FROM public.pacientes WHERE user_id = auth.uid()
    )
  );
