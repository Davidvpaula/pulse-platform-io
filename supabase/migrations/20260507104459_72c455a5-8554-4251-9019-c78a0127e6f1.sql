
-- 1. Add paciente_atendido_id to consultas
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS paciente_atendido_id UUID REFERENCES public.pacientes(id);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente_atendido ON public.consultas(paciente_atendido_id);

-- 2. Update RLS: Paciente sees own + dependentes' consultations
DROP POLICY IF EXISTS "Paciente vê próprias consultas" ON public.consultas;
CREATE POLICY "Paciente vê próprias consultas"
  ON public.consultas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.user_id = auth.uid()
        AND (
          p.id = consultas.paciente_id
          OR p.id = (SELECT responsavel_id FROM public.pacientes WHERE id = consultas.paciente_atendido_id)
        )
    )
  );

-- 3. Update RLS: Paciente cancels own + dependentes' consultations
DROP POLICY IF EXISTS "Paciente cancela própria consulta" ON public.consultas;
CREATE POLICY "Paciente cancela própria consulta"
  ON public.consultas FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.user_id = auth.uid()
        AND (
          p.id = consultas.paciente_id
          OR p.id = (SELECT responsavel_id FROM public.pacientes WHERE id = consultas.paciente_atendido_id)
        )
    )
  )
  WITH CHECK (
    status = 'cancelada'::consulta_status
    AND EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.user_id = auth.uid()
        AND (
          p.id = consultas.paciente_id
          OR p.id = (SELECT responsavel_id FROM public.pacientes WHERE id = consultas.paciente_atendido_id)
        )
    )
  );

-- 4. Update RLS: Paciente creates consultation for self + dependentes
DROP POLICY IF EXISTS "Paciente cria consulta para si" ON public.consultas;
CREATE POLICY "Paciente cria consulta para si ou dependente"
  ON public.consultas FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pacientes p
      WHERE p.user_id = auth.uid()
        AND (
          p.id = consultas.paciente_id
          OR p.id = (SELECT responsavel_id FROM public.pacientes WHERE id = consultas.paciente_atendido_id)
        )
    )
  );

-- 5. Update criar_consulta_pos_pagamento to handle paciente_atendido_id
CREATE OR REPLACE FUNCTION public.criar_consulta_pos_pagamento(_pagamento_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pag record;
  v_slot record;
  v_paciente_id uuid;
  v_paciente_atendido_id uuid;
  v_consulta_id uuid;
  v_meta jsonb;
  v_tipo text;
  v_ref_id uuid;
  v_motivo text;
  v_canal public.consulta_canal;
  v_link_sala text;
  v_conv_id uuid;
BEGIN
  SELECT * INTO v_pag FROM public.pagamentos WHERE id = _pagamento_id;
  IF v_pag IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não encontrado');
  END IF;
  IF v_pag.status <> 'pago' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Pagamento não confirmado');
  END IF;

  IF v_pag.consulta_id IS NOT NULL THEN
    UPDATE public.consultas
    SET status = 'agendada', updated_at = now()
    WHERE id = v_pag.consulta_id AND status = 'aguardando_pagamento';
    
    UPDATE public.agenda_slots
    SET status = 'bloqueado', reserva_expira_em = NULL, updated_at = now()
    WHERE reservado_por_consulta_id = v_pag.consulta_id AND status = 'reservado';

    PERFORM public.create_conversation_for_consulta(v_pag.consulta_id);
    
    RETURN jsonb_build_object('ok', true, 'consulta_id', v_pag.consulta_id, 'ja_existia', true);
  END IF;

  v_meta := COALESCE(v_pag.metadata, '{}'::jsonb);
  v_tipo := v_meta->>'tipo';
  v_ref_id := (v_meta->>'referencia_id')::uuid;
  v_motivo := v_meta->>'motivo';

  IF v_tipo IS NULL OR v_ref_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Metadata de reserva incompleta no pagamento');
  END IF;

  SELECT * INTO v_slot FROM public.agenda_slots
  WHERE id = (v_meta->>'slot_id')::uuid
  FOR UPDATE;

  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Slot não encontrado');
  END IF;

  v_paciente_id := (v_meta->>'paciente_id')::uuid;
  
  -- NEW: read paciente_atendido_id from metadata (null = titular is the patient)
  IF v_meta ? 'paciente_atendido_id' AND v_meta->>'paciente_atendido_id' IS NOT NULL THEN
    v_paciente_atendido_id := (v_meta->>'paciente_atendido_id')::uuid;
  ELSE
    v_paciente_atendido_id := NULL;
  END IF;

  IF v_tipo = 'servico' THEN
    v_canal := 'servico_plataforma';
  ELSE
    v_canal := 'app';
  END IF;

  SELECT link_sala_padrao INTO v_link_sala FROM public.medicos WHERE id = v_slot.medico_id;

  INSERT INTO public.consultas (
    paciente_id, paciente_atendido_id, medico_id,
    especialidade_id, servico_id,
    slot_id, inicio, fim, modalidade,
    status, valor_centavos, motivo, canal_origem,
    link_sala
  ) VALUES (
    v_paciente_id, v_paciente_atendido_id, v_slot.medico_id,
    CASE WHEN v_tipo = 'especialidade' THEN v_ref_id ELSE NULL END,
    CASE WHEN v_tipo = 'servico' THEN v_ref_id ELSE NULL END,
    v_slot.id, v_slot.inicio, v_slot.fim, v_slot.modalidade,
    'agendada', v_pag.valor_centavos, NULLIF(trim(coalesce(v_motivo,'')), ''),
    v_canal,
    v_link_sala
  )
  RETURNING id INTO v_consulta_id;

  UPDATE public.agenda_slots
  SET status = 'bloqueado',
      reserva_expira_em = NULL,
      reservado_por_consulta_id = v_consulta_id,
      updated_at = now()
  WHERE id = v_slot.id;

  UPDATE public.pagamentos
  SET consulta_id = v_consulta_id
  WHERE id = _pagamento_id;

  v_conv_id := public.create_conversation_for_consulta(v_consulta_id);

  RETURN jsonb_build_object(
    'ok', true,
    'consulta_id', v_consulta_id,
    'link_sala', v_link_sala,
    'conversation_id', v_conv_id
  );
END;
$function$;
