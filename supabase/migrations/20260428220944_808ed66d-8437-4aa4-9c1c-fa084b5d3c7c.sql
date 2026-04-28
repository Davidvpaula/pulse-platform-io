-- ─────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TYPE public.consulta_status AS ENUM (
  'agendada','aguardando_pagamento','confirmada','em_andamento',
  'concluida','cancelada','no_show'
);

CREATE TYPE public.consulta_modalidade AS ENUM ('online','presencial');

CREATE TYPE public.slot_status AS ENUM ('disponivel','reservado','bloqueado');

CREATE TYPE public.sexo_biologico AS ENUM ('feminino','masculino','intersexo','nao_informado');

-- ─────────────────────────────────────────────────────────────────────────
-- ESPECIALIDADES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Especialidades ativas públicas" ON public.especialidades
  FOR SELECT TO anon, authenticated USING (ativo = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia especialidades" ON public.especialidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_especialidades_upd
  BEFORE UPDATE ON public.especialidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- MEDICO_ESPECIALIDADES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.medico_especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  especialidade_id uuid NOT NULL REFERENCES public.especialidades(id) ON DELETE RESTRICT,
  preco_centavos integer NOT NULL DEFAULT 0,
  duracao_minutos integer NOT NULL DEFAULT 30,
  modalidades public.consulta_modalidade[] NOT NULL DEFAULT '{online}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(medico_id, especialidade_id)
);
ALTER TABLE public.medico_especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vínculos ativos visíveis a autenticados" ON public.medico_especialidades
  FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Vínculos ativos públicos" ON public.medico_especialidades
  FOR SELECT TO anon USING (ativo = true);
CREATE POLICY "Médico gerencia próprios vínculos" ON public.medico_especialidades
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));
CREATE POLICY "Admin gerencia vínculos" ON public.medico_especialidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_medesp_upd
  BEFORE UPDATE ON public.medico_especialidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PACIENTES (perfil clínico, 1↔1 com auth.users)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  data_nascimento date,
  sexo public.sexo_biologico NOT NULL DEFAULT 'nao_informado',
  alergias text,
  condicoes_cronicas text,
  medicamentos_uso text,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  empresa_id uuid,
  matricula_empresa text,
  observacoes_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprio cadastro" ON public.pacientes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Paciente atualiza próprio cadastro" ON public.pacientes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Paciente cria próprio cadastro" ON public.pacientes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin gerencia pacientes" ON public.pacientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Secretaria vê pacientes" ON public.pacientes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'secretaria'));

CREATE TRIGGER trg_pacientes_upd
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_pacientes_empresa ON public.pacientes(empresa_id);

-- ─────────────────────────────────────────────────────────────────────────
-- AGENDA_SLOTS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.agenda_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  modalidade public.consulta_modalidade NOT NULL DEFAULT 'online',
  status public.slot_status NOT NULL DEFAULT 'disponivel',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_periodo CHECK (fim > inicio)
);
ALTER TABLE public.agenda_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Slots disponíveis públicos a autenticados" ON public.agenda_slots
  FOR SELECT TO authenticated USING (status = 'disponivel');
CREATE POLICY "Médico vê próprios slots" ON public.agenda_slots
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));
CREATE POLICY "Médico gerencia próprios slots" ON public.agenda_slots
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));
CREATE POLICY "Secretaria gerencia slots" ON public.agenda_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'secretaria'))
  WITH CHECK (public.has_role(auth.uid(),'secretaria'));
CREATE POLICY "Admin gerencia slots" ON public.agenda_slots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_slots_upd
  BEFORE UPDATE ON public.agenda_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_slots_medico_inicio ON public.agenda_slots(medico_id, inicio);

-- ─────────────────────────────────────────────────────────────────────────
-- CONSULTAS
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE RESTRICT,
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE RESTRICT,
  especialidade_id uuid REFERENCES public.especialidades(id) ON DELETE SET NULL,
  slot_id uuid REFERENCES public.agenda_slots(id) ON DELETE SET NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  modalidade public.consulta_modalidade NOT NULL DEFAULT 'online',
  status public.consulta_status NOT NULL DEFAULT 'agendada',
  valor_centavos integer NOT NULL DEFAULT 0,
  motivo text,
  link_sala text,
  empresa_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_consulta_periodo CHECK (fim > inicio)
);
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares (security definer) para evitar recursão
CREATE OR REPLACE FUNCTION public.is_medico_da_consulta(_consulta_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultas c
    JOIN public.medicos m ON m.id = c.medico_id
    WHERE c.id = _consulta_id AND m.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_paciente_da_consulta(_consulta_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consultas c
    JOIN public.pacientes p ON p.id = c.paciente_id
    WHERE c.id = _consulta_id AND p.user_id = auth.uid()
  )
$$;

CREATE POLICY "Paciente vê próprias consultas" ON public.consultas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Médico vê próprias consultas" ON public.consultas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));
CREATE POLICY "Secretaria vê consultas" ON public.consultas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'secretaria'));
CREATE POLICY "Admin vê consultas" ON public.consultas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Empresa vê consultas dos colaboradores" ON public.consultas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'empresa')
    AND empresa_id IS NOT NULL
  );

CREATE POLICY "Paciente cria consulta para si" ON public.consultas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Secretaria cria consultas" ON public.consultas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'secretaria'));
CREATE POLICY "Admin cria consultas" ON public.consultas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Médico atualiza próprias consultas" ON public.consultas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));
CREATE POLICY "Paciente cancela própria consulta" ON public.consultas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = paciente_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = paciente_id AND p.user_id = auth.uid()));
CREATE POLICY "Secretaria atualiza consultas" ON public.consultas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'secretaria'))
  WITH CHECK (public.has_role(auth.uid(),'secretaria'));
CREATE POLICY "Admin atualiza consultas" ON public.consultas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_consultas_upd
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_consultas_medico ON public.consultas(medico_id, inicio);
CREATE INDEX idx_consultas_paciente ON public.consultas(paciente_id, inicio);
CREATE INDEX idx_consultas_empresa ON public.consultas(empresa_id);

-- ─────────────────────────────────────────────────────────────────────────
-- PRONTUARIOS (estritamente médico+paciente+admin)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.prontuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL UNIQUE REFERENCES public.consultas(id) ON DELETE RESTRICT,
  queixa_principal text,
  historia_doenca text,
  exame_fisico text,
  hipotese_diagnostica text,
  conduta text,
  cid10 text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprio prontuário" ON public.prontuarios
  FOR SELECT TO authenticated USING (public.is_paciente_da_consulta(consulta_id));
CREATE POLICY "Médico vê prontuário das suas consultas" ON public.prontuarios
  FOR SELECT TO authenticated USING (public.is_medico_da_consulta(consulta_id));
CREATE POLICY "Admin vê prontuários" ON public.prontuarios
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Médico cria prontuário" ON public.prontuarios
  FOR INSERT TO authenticated WITH CHECK (public.is_medico_da_consulta(consulta_id));
CREATE POLICY "Médico edita prontuário" ON public.prontuarios
  FOR UPDATE TO authenticated
  USING (public.is_medico_da_consulta(consulta_id))
  WITH CHECK (public.is_medico_da_consulta(consulta_id));

CREATE TRIGGER trg_prontuarios_upd
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- PRESCRICOES
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.prescricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE RESTRICT,
  medicamentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  orientacoes text,
  validade_dias integer NOT NULL DEFAULT 30,
  assinatura_digital text,
  emitida_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprias prescrições" ON public.prescricoes
  FOR SELECT TO authenticated USING (public.is_paciente_da_consulta(consulta_id));
CREATE POLICY "Médico vê prescrições das suas consultas" ON public.prescricoes
  FOR SELECT TO authenticated USING (public.is_medico_da_consulta(consulta_id));
CREATE POLICY "Admin vê prescrições" ON public.prescricoes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Médico cria prescrição" ON public.prescricoes
  FOR INSERT TO authenticated WITH CHECK (public.is_medico_da_consulta(consulta_id));
CREATE POLICY "Médico edita prescrição" ON public.prescricoes
  FOR UPDATE TO authenticated
  USING (public.is_medico_da_consulta(consulta_id))
  WITH CHECK (public.is_medico_da_consulta(consulta_id));

CREATE TRIGGER trg_prescricoes_upd
  BEFORE UPDATE ON public.prescricoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- ANEXOS_CONSULTA
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.anexos_consulta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  tamanho_bytes bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anexos_consulta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê próprios anexos" ON public.anexos_consulta
  FOR SELECT TO authenticated USING (public.is_paciente_da_consulta(consulta_id));
CREATE POLICY "Médico vê anexos das suas consultas" ON public.anexos_consulta
  FOR SELECT TO authenticated USING (public.is_medico_da_consulta(consulta_id));
CREATE POLICY "Admin vê anexos" ON public.anexos_consulta
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Médico/paciente envia anexo" ON public.anexos_consulta
  FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND (public.is_medico_da_consulta(consulta_id) OR public.is_paciente_da_consulta(consulta_id))
  );

-- ─────────────────────────────────────────────────────────────────────────
-- CONSULTA_STATUS_LOG (auditoria imutável)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.consulta_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  status_anterior public.consulta_status,
  status_novo public.consulta_status NOT NULL,
  actor_id uuid,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consulta_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atendentes/paciente veem log" ON public.consulta_status_log
  FOR SELECT TO authenticated
  USING (
    public.is_medico_da_consulta(consulta_id)
    OR public.is_paciente_da_consulta(consulta_id)
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'secretaria')
  );

-- Trigger que registra mudanças de status automaticamente
CREATE OR REPLACE FUNCTION public.log_consulta_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.consulta_status_log (consulta_id, status_anterior, status_novo, actor_id)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.consulta_status_log (consulta_id, status_anterior, status_novo, actor_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consulta_status_log
  AFTER INSERT OR UPDATE OF status ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.log_consulta_status();

-- ─────────────────────────────────────────────────────────────────────────
-- STORAGE BUCKET PRIVADO + POLÍTICAS
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('consultas','consultas', false)
ON CONFLICT (id) DO NOTHING;

-- Convenção de path: {consulta_id}/{arquivo}
CREATE POLICY "Anexos de consulta - leitura" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'consultas'
    AND EXISTS (
      SELECT 1 FROM public.anexos_consulta a
      WHERE a.storage_path = name
        AND (
          public.is_medico_da_consulta(a.consulta_id)
          OR public.is_paciente_da_consulta(a.consulta_id)
          OR public.has_role(auth.uid(),'admin')
        )
    )
  );

CREATE POLICY "Anexos de consulta - upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'consultas'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Anexos de consulta - dono apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'consultas'
    AND owner = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- SEED ESPECIALIDADES
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.especialidades (nome, slug) VALUES
  ('Clínica Geral','clinica-geral'),
  ('Cardiologia','cardiologia'),
  ('Pediatria','pediatria'),
  ('Ginecologia','ginecologia'),
  ('Dermatologia','dermatologia'),
  ('Psiquiatria','psiquiatria'),
  ('Ortopedia','ortopedia'),
  ('Endocrinologia','endocrinologia')
ON CONFLICT (slug) DO NOTHING;