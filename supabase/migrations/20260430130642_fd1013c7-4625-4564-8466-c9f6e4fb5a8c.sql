CREATE OR REPLACE FUNCTION public.trocar_medico_consulta(
  _consulta_id uuid,
  _novo_slot_id uuid,
  _motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_consulta record;
  v_novo_slot record;
  v_novo_preco int;
  v_novo_link text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'secretaria')
  ) THEN
    RAISE EXCEPTION 'Apenas admin ou secretaria pode trocar o médico de uma consulta';
  END IF;

  SELECT * INTO v_consulta FROM public.consultas WHERE id = _consulta_id FOR UPDATE;
  IF v_consulta IS NULL THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;
  IF v_consulta.status IN ('cancelada', 'concluida') THEN
    RAISE EXCEPTION 'Não é possível trocar o médico de uma consulta % ', v_consulta.status;
  END IF;

  SELECT * INTO v_novo_slot FROM public.agenda_slots WHERE id = _novo_slot_id FOR UPDATE;
  IF v_novo_slot IS NULL THEN
    RAISE EXCEPTION 'Novo horário não encontrado';
  END IF;
  IF v_novo_slot.status <> 'disponivel' THEN
    RAISE EXCEPTION 'Novo horário não está disponível (status: %)', v_novo_slot.status;
  END IF;
  IF v_novo_slot.medico_id = v_consulta.medico_id THEN
    RAISE EXCEPTION 'O novo horário já é do mesmo médico';
  END IF;

  -- Recalcula preço pela especialidade da consulta no novo médico (se houver)
  IF v_consulta.especialidade_id IS NOT NULL THEN
    SELECT preco_centavos INTO v_novo_preco
      FROM public.medico_especialidades
     WHERE medico_id = v_novo_slot.medico_id
       AND especialidade_id = v_consulta.especialidade_id
       AND ativo = true
     LIMIT 1;
  END IF;
  v_novo_preco := COALESCE(v_novo_preco, v_consulta.valor_centavos);

  -- Novo link de sala (apenas se for online)
  IF v_novo_slot.modalidade = 'online' THEN
    SELECT link_sala_padrao INTO v_novo_link
      FROM public.medicos WHERE id = v_novo_slot.medico_id;
  END IF;

  -- Libera o slot antigo (se existir)
  IF v_consulta.slot_id IS NOT NULL THEN
    UPDATE public.agenda_slots
       SET status = 'disponivel',
           reserva_expira_em = NULL,
           reservado_por_consulta_id = NULL,
           updated_at = now()
     WHERE id = v_consulta.slot_id;
  END IF;

  -- Ocupa o novo slot
  UPDATE public.agenda_slots
     SET status = 'bloqueado',
         reservado_por_consulta_id = _consulta_id,
         reserva_expira_em = NULL,
         updated_at = now()
   WHERE id = v_novo_slot.id;

  -- Atualiza a consulta
  UPDATE public.consultas
     SET medico_id = v_novo_slot.medico_id,
         slot_id = v_novo_slot.id,
         inicio = v_novo_slot.inicio,
         fim = v_novo_slot.fim,
         modalidade = v_novo_slot.modalidade,
         valor_centavos = v_novo_preco,
         link_sala = CASE
                       WHEN v_novo_slot.modalidade = 'online' THEN v_novo_link
                       ELSE NULL
                     END,
         updated_at = now()
   WHERE id = _consulta_id;

  -- Log auditoria de status (mesmo status, mas com motivo)
  INSERT INTO public.consulta_status_log (consulta_id, status_anterior, status_novo, actor_id, motivo)
  VALUES (
    _consulta_id, v_consulta.status, v_consulta.status, v_uid,
    COALESCE(NULLIF(trim(_motivo), ''), 'Troca de profissional')
  );

  RETURN jsonb_build_object(
    'consulta_id', _consulta_id,
    'novo_medico_id', v_novo_slot.medico_id,
    'novo_slot_id', v_novo_slot.id,
    'novo_valor_centavos', v_novo_preco,
    'novo_link_sala', v_novo_link
  );
END;
$$;