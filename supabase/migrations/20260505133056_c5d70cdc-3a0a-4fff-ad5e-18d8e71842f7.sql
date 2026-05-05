
ALTER TABLE public.planos
  ADD CONSTRAINT planos_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(user_id)
  ON DELETE SET NULL;
