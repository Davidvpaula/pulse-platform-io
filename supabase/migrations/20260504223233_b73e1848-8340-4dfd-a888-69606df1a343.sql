CREATE OR REPLACE FUNCTION public.liberar_reservas_expiradas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_rec record;
BEGIN
  -- 1) Identificar slots expirados
  FOR v_rec IN
    SELECT s.id AS slot_id,
           s.reservado_por_consulta_id AS consulta_id,
           c.paciente_id
      FROM public.agenda_slots s
      LEFT JOIN public.consultas c ON c.id = s.reservado_por_consulta_id
     WHERE s.status = 'reservado'
       AND s.reserva_expira_em IS NOT NULL
       AND s.reserva_expira_em < now()
  LOOP
    -- 2) Libera o slot
    UPDATE public.agenda_slots
       SET status = 'disponivel',
           reservado_por = NULL,
           reserva_expira_em = NULL,
           reservado_por_consulta_id = NULL,
           updated_at = now()
     WHERE id = v_rec.slot_id;

    -- 3) Cancela consulta aguardando pagamento
    IF v_rec.consulta_id IS NOT NULL THEN
      UPDATE public.consultas
         SET status = 'cancelada', updated_at = now()
       WHERE id = v_rec.consulta_id
         AND status = 'aguardando_pagamento';

      -- 4) Cancela pagamentos pendentes/processando
      UPDATE public.pagamentos
         SET status = 'cancelado',
             cancelled_at = now(),
             metadata = COALESCE(metadata, '{}'::jsonb) || '{"motivo_falha":"reserva_expirada"}'::jsonb,
             updated_at = now()
       WHERE consulta_id = v_rec.consulta_id
         AND status IN ('pendente', 'processando');

      -- 5) Notifica paciente via thread interna
      IF v_rec.paciente_id IS NOT NULL THEN
        DECLARE
          v_thread_id uuid;
        BEGIN
          INSERT INTO public.internal_threads (
            assunto, origem, status, prioridade, participantes,
            paciente_id, agendamento_id, created_by
          ) VALUES (
            'Reserva expirada — pagamento não concluído',
            'sistema',
            'aberta',
            'normal',
            ARRAY[v_rec.paciente_id]::uuid[],
            v_rec.paciente_id,
            v_rec.consulta_id,
            v_rec.paciente_id
          ) RETURNING id INTO v_thread_id;

          INSERT INTO public.internal_messages (thread_id, author_id, content)
          VALUES (
            v_thread_id,
            v_rec.paciente_id,
            'Sua reserva expirou porque o pagamento não foi concluído a tempo. O horário foi liberado e você pode reagendar a qualquer momento.'
          );
        END;
      END IF;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;