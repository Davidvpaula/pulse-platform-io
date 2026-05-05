ALTER TABLE public.retornos_gratuitos
  ADD CONSTRAINT fk_retornos_paciente FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  ADD CONSTRAINT fk_retornos_medico FOREIGN KEY (medico_id) REFERENCES public.medicos(id),
  ADD CONSTRAINT fk_retornos_especialidade FOREIGN KEY (especialidade_id) REFERENCES public.especialidades(id),
  ADD CONSTRAINT fk_retornos_consulta_origem FOREIGN KEY (consulta_origem_id) REFERENCES public.consultas(id),
  ADD CONSTRAINT fk_retornos_consulta_uso FOREIGN KEY (consulta_uso_id) REFERENCES public.consultas(id);