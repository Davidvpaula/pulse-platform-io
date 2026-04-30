-- ============================================================
-- RETORNOS GRATUITOS pós-consulta
-- ============================================================

CREATE TYPE public.retorno_status AS ENUM ('disponivel', 'usado', 'expirado', 'cancelado');

CREATE TABLE public.retornos_gratuitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  medico_id uuid NOT NULL,
  especialidade_id uuid,
  consulta_origem_id uuid NOT NULL UNIQUE, -- 1 retorno por consulta concluída
  consulta_uso_id uuid,
  valido_ate timestamptz NOT NULL,
  status public.retorno_status NOT NULL DEFAULT 'disponivel',
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_retornos_paciente_status ON public.retornos_gratuitos(paciente_id, status);
CREATE INDEX idx_retornos_medico ON public.retornos_gratuitos(medico_id);

CREATE TRIGGER trg_retornos_updated_at
  BEFORE UPDATE ON public.retornos_gratuitos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.retornos_gratuitos ENABLE ROW LEVEL SECURITY;

-- Paciente vê os próprios vouchers
CREATE POLICY "Paciente vê próprios retornos" ON public.retornos_gratuitos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = paciente_id AND p.user_id = auth.uid()));

-- Médico vê e cria vouchers das suas consultas
CREATE POLICY "Médico vê próprios retornos" ON public.retornos_gratuitos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Médico cria retorno própria consulta" ON public.retornos_gratuitos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.consultas c
       WHERE c.id = consulta_origem_id
         AND c.medico_id = retornos_gratuitos.medico_id
    )
  );

CREATE POLICY "Médico atualiza próprios retornos" ON public.retornos_gratuitos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admin gerencia retornos" ON public.retornos_gratuitos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Secretaria vê retornos" ON public.retornos_gratuitos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'secretaria'));

-- ============================================================
-- RPC: agendar retorno gratuito usando um voucher
-- ============================================================
CREATE OR REPLACE FUNCTION public.agendar_retorno_gratuito(
  _slot_id uuid,
  _voucher_id uuid,
  _motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_paciente_id uuid;
  v_voucher record;
  v_slot record;
  v_consulta_id uuid;
  v_especialidade_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  SELECT id INTO v_paciente_id FROM public.pacientes WHERE user_id = v_uid LIMIT 1;
  IF v_paciente_id IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;

  -- Bloqueia o voucher
  SELECT * INTO v_voucher
    FROM public.retornos_gratuitos
   WHERE id = _voucher_id
   FOR UPDATE;

  IF v_voucher IS NULL THEN
    RAISE EXCEPTION 'Voucher de retorno não encontrado';
  END IF;
  IF v_voucher.paciente_id <> v_paciente_id THEN
    RAISE EXCEPTION 'Voucher não pertence a este paciente';
  END IF;
  IF v_voucher.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Voucher não está disponível (status: %)', v_voucher.status;
  END IF;
  IF v_voucher.valido_ate < now() THEN
    UPDATE public.retornos_gratuitos SET status = 'expirado' WHERE id = v_voucher.id;
    RAISE EXCEPTION 'Voucher expirado em %', to_char(v_voucher.valido_ate, 'DD/MM/YYYY');
  END IF;

  -- Bloqueia o slot
  SELECT * INTO v_slot FROM public.agenda_slots WHERE id = _slot_id FOR UPDATE;
  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'Horário não encontrado';
  END IF;
  IF v_slot.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Este horário não está mais disponível';
  END IF;
  IF v_slot.medico_id <> v_voucher.medico_id THEN
    RAISE EXCEPTION 'O retorno gratuito é válido apenas com o mesmo médico';
  END IF;

  v_especialidade_id := COALESCE(v_voucher.especialidade_id, (
    SELECT especialidade_id FROM public.medico_especialidades
     WHERE medico_id = v_slot.medico_id AND ativo = true
     ORDER BY created_at ASC LIMIT 1
  ));

  INSERT INTO public.consultas (
    paciente_id, medico_id, especialidade_id, slot_id,
    inicio, fim, modalidade, status, motivo, valor_centavos
  ) VALUES (
    v_paciente_id, v_slot.medico_id, v_especialidade_id, v_slot.id,
    v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'confirmada', NULLIF(trim(coalesce(_motivo, 'Retorno gratuito')), ''), 0
  ) RETURNING id INTO v_consulta_id;

  UPDATE public.agenda_slots
     SET status = 'bloqueado',
         reservado_por_consulta_id = v_consulta_id,
         updated_at = now()
   WHERE id = v_slot.id;

  UPDATE public.retornos_gratuitos
     SET status = 'usado',
         consulta_uso_id = v_consulta_id,
         updated_at = now()
   WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'consulta_id', v_consulta_id,
    'voucher_id', v_voucher.id
  );
END;
$$;