-- 1) Adiciona origem 'sistema' para threads automáticas
ALTER TYPE public.internal_thread_origem ADD VALUE IF NOT EXISTS 'sistema';

-- 2) Recria marcar_pagamento_falho com cancelamento de consulta + notificação
CREATE OR REPLACE FUNCTION public.marcar_pagamento_falho(
  _provider_session_id text,
  _motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pag record;
  v_consulta record;
  v_thread_id uuid;
BEGIN
  -- Atualiza pagamento
  UPDATE public.pagamentos
     SET status = 'falhou',
         cancelled_at = now(),
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('motivo_falha', COALESCE(_motivo, 'unknown')),
         updated_at = now()
   WHERE provider_session_id = _provider_session_id
     AND status IN ('pendente','processando')
   RETURNING * INTO v_pag;

  IF v_pag IS NULL THEN RETURN; END IF;

  -- Cancela consulta vinculada
  SELECT * INTO v_consulta
    FROM public.consultas
   WHERE id = v_pag.consulta_id
     AND status = 'aguardando_pagamento'
   FOR UPDATE;

  IF v_consulta IS NOT NULL THEN
    UPDATE public.consultas
       SET status = 'cancelada', updated_at = now()
     WHERE id = v_consulta.id;

    -- Libera slot
    IF v_consulta.slot_id IS NOT NULL THEN
      UPDATE public.agenda_slots
         SET status = 'disponivel',
             reservado_por = NULL,
             reserva_expira_em = NULL,
             updated_at = now()
       WHERE id = v_consulta.slot_id;
    END IF;

    -- Cria thread interna de notificação
    INSERT INTO public.internal_threads (
      assunto, origem, status, prioridade, participantes,
      paciente_id, agendamento_id, created_by
    ) VALUES (
      'Pagamento falhou — consulta cancelada',
      'sistema',
      'aberta',
      'alta',
      ARRAY[v_consulta.paciente_id]::uuid[],
      v_consulta.paciente_id,
      v_consulta.id,
      v_consulta.paciente_id
    ) RETURNING id INTO v_thread_id;

    INSERT INTO public.internal_messages (thread_id, author_id, content)
    VALUES (
      v_thread_id,
      v_consulta.paciente_id,
      'O pagamento da sua consulta não foi aprovado. O horário foi liberado. Você pode reagendar a qualquer momento.'
    );
  END IF;
END;
$$;