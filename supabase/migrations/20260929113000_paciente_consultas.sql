DROP POLICY IF EXISTS "Paciente cria consulta para si ou dependente" ON public.consultas;
DROP POLICY IF EXISTS "Paciente cancela própria consulta" ON public.consultas;
CREATE OR REPLACE FUNCTION public.paciente_cancelar_consulta(_consulta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; c public.consultas;
BEGIN
  SELECT id INTO p FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo';
  SELECT * INTO c FROM consultas WHERE id = _consulta_id AND paciente_id = p FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Consulta indisponível'; END IF;
  IF c.status = 'cancelada' THEN RETURN; END IF;
  IF c.status NOT IN ('agendada','confirmada','aguardando_pagamento') THEN RAISE EXCEPTION 'Consulta não pode ser cancelada neste status'; END IF;
  IF c.inicio < now() + interval '4 hours' THEN RAISE EXCEPTION 'Cancelamento exige 4 horas de antecedência'; END IF;
  UPDATE consultas SET status = 'cancelada', updated_at = now() WHERE id = c.id;
  UPDATE agenda_slots SET status = 'disponivel', reservado_por = NULL, reservado_por_consulta_id = NULL, reserva_expira_em = NULL
    WHERE id = c.slot_id AND reservado_por_consulta_id = c.id;
END; $$;
REVOKE ALL ON FUNCTION public.paciente_cancelar_consulta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.paciente_cancelar_consulta(uuid) TO authenticated;
