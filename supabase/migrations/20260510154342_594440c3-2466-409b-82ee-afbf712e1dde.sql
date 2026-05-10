
-- ============================================================
-- F1.1C — FKs estruturais financeiras + índices
-- Pré-condição: F1.1B já anulou as 2 órfãs em pagamentos.medico_id
-- ============================================================

-- pagamentos.paciente_id -> pacientes(id)
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.pagamentos VALIDATE CONSTRAINT pagamentos_paciente_id_fkey;
CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente_id ON public.pagamentos(paciente_id);

-- pagamentos.medico_id -> medicos(id)
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.pagamentos VALIDATE CONSTRAINT pagamentos_medico_id_fkey;
CREATE INDEX IF NOT EXISTS idx_pagamentos_medico_id ON public.pagamentos(medico_id);

-- pagamentos.empresa_id -> empresas(id)
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.pagamentos VALIDATE CONSTRAINT pagamentos_empresa_id_fkey;
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa_id ON public.pagamentos(empresa_id);

-- pagamentos.servico_id -> servicos_financeiros(id)
ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_servico_id_fkey
  FOREIGN KEY (servico_id) REFERENCES public.servicos_financeiros(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.pagamentos VALIDATE CONSTRAINT pagamentos_servico_id_fkey;
CREATE INDEX IF NOT EXISTS idx_pagamentos_servico_id ON public.pagamentos(servico_id);

-- cobrancas_links.paciente_id -> pacientes(id)
ALTER TABLE public.cobrancas_links
  ADD CONSTRAINT cobrancas_links_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.cobrancas_links VALIDATE CONSTRAINT cobrancas_links_paciente_id_fkey;
CREATE INDEX IF NOT EXISTS idx_cobrancas_links_paciente_id ON public.cobrancas_links(paciente_id);

-- cobrancas_links.consulta_id -> consultas(id)
ALTER TABLE public.cobrancas_links
  ADD CONSTRAINT cobrancas_links_consulta_id_fkey
  FOREIGN KEY (consulta_id) REFERENCES public.consultas(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.cobrancas_links VALIDATE CONSTRAINT cobrancas_links_consulta_id_fkey;
CREATE INDEX IF NOT EXISTS idx_cobrancas_links_consulta_id ON public.cobrancas_links(consulta_id);

-- cobrancas_links.servico_id -> servicos_financeiros(id)
ALTER TABLE public.cobrancas_links
  ADD CONSTRAINT cobrancas_links_servico_id_fkey
  FOREIGN KEY (servico_id) REFERENCES public.servicos_financeiros(id) ON DELETE SET NULL NOT VALID;
ALTER TABLE public.cobrancas_links VALIDATE CONSTRAINT cobrancas_links_servico_id_fkey;
CREATE INDEX IF NOT EXISTS idx_cobrancas_links_servico_id ON public.cobrancas_links(servico_id);

-- fechamentos_mensais.medico_id -> medicos(id)
ALTER TABLE public.fechamentos_mensais
  ADD CONSTRAINT fechamentos_mensais_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.fechamentos_mensais VALIDATE CONSTRAINT fechamentos_mensais_medico_id_fkey;
CREATE INDEX IF NOT EXISTS idx_fechamentos_mensais_medico_id ON public.fechamentos_mensais(medico_id);

-- ROLLBACK (manual, por coluna):
-- ALTER TABLE public.pagamentos DROP CONSTRAINT pagamentos_paciente_id_fkey; DROP INDEX public.idx_pagamentos_paciente_id;
-- ALTER TABLE public.pagamentos DROP CONSTRAINT pagamentos_medico_id_fkey;   DROP INDEX public.idx_pagamentos_medico_id;
-- ALTER TABLE public.pagamentos DROP CONSTRAINT pagamentos_empresa_id_fkey;  DROP INDEX public.idx_pagamentos_empresa_id;
-- ALTER TABLE public.pagamentos DROP CONSTRAINT pagamentos_servico_id_fkey;  DROP INDEX public.idx_pagamentos_servico_id;
-- ALTER TABLE public.cobrancas_links DROP CONSTRAINT cobrancas_links_paciente_id_fkey; DROP INDEX public.idx_cobrancas_links_paciente_id;
-- ALTER TABLE public.cobrancas_links DROP CONSTRAINT cobrancas_links_consulta_id_fkey; DROP INDEX public.idx_cobrancas_links_consulta_id;
-- ALTER TABLE public.cobrancas_links DROP CONSTRAINT cobrancas_links_servico_id_fkey;  DROP INDEX public.idx_cobrancas_links_servico_id;
-- ALTER TABLE public.fechamentos_mensais DROP CONSTRAINT fechamentos_mensais_medico_id_fkey; DROP INDEX public.idx_fechamentos_mensais_medico_id;
