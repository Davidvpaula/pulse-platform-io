-- Corrigir FK planos.medico_id para apontar a medicos(id) em vez de medicos(user_id)
-- Isso alinha a FK com as políticas RLS que já verificam m.id = planos.medico_id

ALTER TABLE public.planos DROP CONSTRAINT planos_medico_id_fkey;

ALTER TABLE public.planos 
  ADD CONSTRAINT planos_medico_id_fkey 
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE SET NULL;