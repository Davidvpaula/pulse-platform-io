-- Add foreign key from medico_comissao_override.medico_id to medicos.id
ALTER TABLE public.medico_comissao_override
  ADD CONSTRAINT fk_medico_comissao_override_medico
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE CASCADE;

-- Add foreign key from medico_comissao_override.servico_id to servicos_financeiros.id (if not exists)
ALTER TABLE public.medico_comissao_override
  ADD CONSTRAINT fk_medico_comissao_override_servico
  FOREIGN KEY (servico_id) REFERENCES public.servicos_financeiros(id) ON DELETE SET NULL;