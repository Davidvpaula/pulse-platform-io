ALTER TABLE public.reembolsos
ADD CONSTRAINT reembolsos_consulta_id_fkey
FOREIGN KEY (consulta_id)
REFERENCES public.consultas(id);