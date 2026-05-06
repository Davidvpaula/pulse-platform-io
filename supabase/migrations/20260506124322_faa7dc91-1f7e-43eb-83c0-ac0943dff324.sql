
-- Adicionar campos NFe na tabela consultas
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS nfe_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfe_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nfe_snapshot jsonb DEFAULT NULL;

-- Índice para busca por status NFe
CREATE INDEX IF NOT EXISTS idx_consultas_nfe_status ON public.consultas(nfe_status) WHERE nfe_status IS NOT NULL;

-- Adicionar campo whatsapp_opt_in na tabela pacientes (se não existir)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='pacientes' AND column_name='whatsapp_opt_in') THEN
    ALTER TABLE public.pacientes ADD COLUMN whatsapp_opt_in boolean DEFAULT true;
  END IF;
END $$;
