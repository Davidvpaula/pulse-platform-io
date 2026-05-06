
-- Remove FK antiga (profiles)
ALTER TABLE public.propostas_empresa_medico
  DROP CONSTRAINT propostas_empresa_medico_medico_id_fkey;

-- Cria FK nova (medicos)
ALTER TABLE public.propostas_empresa_medico
  ADD CONSTRAINT propostas_empresa_medico_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE CASCADE;
