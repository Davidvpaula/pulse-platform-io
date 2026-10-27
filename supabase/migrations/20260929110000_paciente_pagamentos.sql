-- Simulação habilitada somente pelo preparador do banco Docker local.
CREATE SCHEMA IF NOT EXISTS pulse_private;
REVOKE ALL ON SCHEMA pulse_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS pulse_private.ambiente_local (id boolean PRIMARY KEY DEFAULT true CHECK (id), habilitado boolean NOT NULL DEFAULT false);
REVOKE ALL ON pulse_private.ambiente_local FROM PUBLIC, anon, authenticated;

-- O navegador nunca determina preço nem confirma pagamentos diretamente.
DROP POLICY IF EXISTS "paciente cria pagamento proprio" ON public.pagamentos;
DROP POLICY IF EXISTS "paciente atualiza pagamento proprio" ON public.pagamentos;
REVOKE EXECUTE ON FUNCTION public.criar_consulta_pos_pagamento(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_consulta_pos_pagamento(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consultas_pendentes_avaliacao() TO authenticated;

CREATE OR REPLACE FUNCTION public.paciente_checkout_local(_slot_id uuid, _tipo text, _referencia_id uuid, _motivo text DEFAULT NULL, _paciente_atendido_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; s public.agenda_slots; valor integer; ref_nome text; medico_nome text; resultado uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pulse_private.ambiente_local WHERE habilitado) THEN RAISE EXCEPTION 'Simulação indisponível'; END IF;
  SELECT id INTO p FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo' AND tipo_paciente = 'titular';
  IF p IS NULL THEN RAISE EXCEPTION 'Paciente ativo necessário'; END IF;
  SELECT * INTO s FROM agenda_slots WHERE id = _slot_id FOR UPDATE;
  IF s.id IS NULL OR s.status <> 'reservado' OR s.reservado_por IS DISTINCT FROM p OR s.reserva_expira_em IS NULL OR s.reserva_expira_em <= now() OR s.inicio <= now() THEN RAISE EXCEPTION 'Reserva indisponível ou expirada'; END IF;
  SELECT nome INTO medico_nome FROM medicos WHERE id = s.medico_id AND status = 'aprovado';
  IF medico_nome IS NULL THEN RAISE EXCEPTION 'Médico indisponível'; END IF;
  IF _paciente_atendido_id IS NOT NULL AND _paciente_atendido_id <> p AND NOT EXISTS (SELECT 1 FROM pacientes WHERE id = _paciente_atendido_id AND responsavel_id = p AND tipo_paciente = 'dependente' AND status_conta = 'ativo') THEN RAISE EXCEPTION 'Dependente inválido'; END IF;
  IF _tipo = 'especialidade' THEN
    SELECT me.preco_centavos, e.nome INTO valor, ref_nome FROM medico_especialidades me JOIN especialidades e ON e.id = me.especialidade_id WHERE me.medico_id = s.medico_id AND me.especialidade_id = _referencia_id AND me.ativo;
  ELSIF _tipo IN ('servico','pa') THEN
    SELECT valor_paciente_centavos, nome INTO valor, ref_nome FROM servicos_financeiros WHERE id = _referencia_id AND ativo;
  ELSE RAISE EXCEPTION 'Tipo de agendamento não suportado'; END IF;
  IF valor IS NULL OR valor < 0 THEN RAISE EXCEPTION 'Preço não configurado'; END IF;
  -- Repetir o checkout para a mesma reserva devolve a mesma cobrança pendente.
  SELECT id INTO resultado FROM pagamentos WHERE paciente_id = p AND provider = 'mock' AND status = 'pendente'
    AND metadata->>'slot_id' = s.id::text AND metadata->>'tipo' = _tipo AND metadata->>'referencia_id' = _referencia_id::text
    AND (metadata->>'paciente_atendido_id')::uuid IS NOT DISTINCT FROM _paciente_atendido_id LIMIT 1;
  IF resultado IS NOT NULL THEN RETURN resultado; END IF;
  INSERT INTO pagamentos (paciente_id, medico_id, valor_centavos, provider, metodo, status, metadata)
  VALUES (p, s.medico_id, valor, 'mock', 'simulado', 'pendente', jsonb_build_object(
    'simulated', true, 'slot_id', s.id, 'tipo', _tipo, 'referencia_id', _referencia_id, 'paciente_id', p,
    'medico_id', s.medico_id, 'paciente_atendido_id', _paciente_atendido_id, 'motivo', left(_motivo,500),
    'snapshot', jsonb_build_object('valor_bruto_centavos',valor,'referencia_nome',ref_nome,'medico_nome',medico_nome,
    'inicio',s.inicio,'fim',s.fim,'modalidade',s.modalidade,'duracao_minutos',extract(epoch from s.fim-s.inicio)/60))) RETURNING id INTO resultado;
  UPDATE pagamentos SET checkout_url = '/app/paciente/checkout/' || resultado WHERE id = resultado;
  RETURN resultado;
END; $$;

CREATE OR REPLACE FUNCTION public.paciente_confirmar_pagamento_local(_pagamento_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; pag public.pagamentos; s public.agenda_slots; resultado jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pulse_private.ambiente_local WHERE habilitado) THEN RAISE EXCEPTION 'Simulação indisponível'; END IF;
  SELECT id INTO p FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo';
  SELECT * INTO pag FROM pagamentos WHERE id = _pagamento_id AND paciente_id = p AND provider = 'mock' FOR UPDATE;
  IF pag.id IS NULL THEN RAISE EXCEPTION 'Pagamento indisponível'; END IF;
  IF pag.status = 'pago' AND pag.consulta_id IS NOT NULL THEN RETURN jsonb_build_object('ok',true,'consulta_id',pag.consulta_id); END IF;
  IF pag.status <> 'pendente' THEN RAISE EXCEPTION 'Pagamento não está pendente'; END IF;
  SELECT * INTO s FROM agenda_slots WHERE id = (pag.metadata->>'slot_id')::uuid FOR UPDATE;
  IF s.id IS NULL OR s.status <> 'reservado' OR s.reservado_por IS DISTINCT FROM p OR s.reserva_expira_em IS NULL OR s.reserva_expira_em <= now() OR s.inicio <= now() THEN RAISE EXCEPTION 'Reserva indisponível ou expirada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM medicos WHERE id = s.medico_id AND status = 'aprovado') THEN RAISE EXCEPTION 'Médico indisponível'; END IF;
  IF pag.metadata->>'paciente_atendido_id' IS NOT NULL AND (pag.metadata->>'paciente_atendido_id')::uuid <> p AND NOT EXISTS (SELECT 1 FROM pacientes WHERE id = (pag.metadata->>'paciente_atendido_id')::uuid AND responsavel_id = p AND status_conta = 'ativo') THEN RAISE EXCEPTION 'Dependente indisponível'; END IF;
  UPDATE pagamentos SET status = 'pago', metodo = 'simulado', paid_at = now(), provider_payment_id = 'local_' || id WHERE id = pag.id;
  resultado := public.criar_consulta_pos_pagamento(pag.id);
  IF (resultado->>'ok')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Falha ao criar consulta: %', resultado->>'erro'; END IF;
  RETURN resultado;
END; $$;

CREATE OR REPLACE FUNCTION public.paciente_cancelar_pagamento(_pagamento_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid; pag public.pagamentos;
BEGIN
  SELECT id INTO p FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo';
  SELECT * INTO pag FROM pagamentos WHERE id = _pagamento_id AND paciente_id = p FOR UPDATE;
  IF pag.id IS NULL THEN RAISE EXCEPTION 'Pagamento indisponível'; END IF;
  IF pag.status = 'cancelado' THEN RETURN; END IF;
  IF pag.status <> 'pendente' THEN RAISE EXCEPTION 'Somente pagamentos pendentes podem ser cancelados'; END IF;
  -- Cancelamento remoto depende do provedor e permanece fora desta etapa.
  IF pag.provider <> 'mock' THEN RAISE EXCEPTION 'Cancelamento depende do provedor de pagamentos'; END IF;
  UPDATE pagamentos SET status = 'cancelado', cancelled_at = now() WHERE id = pag.id;
  UPDATE agenda_slots SET status = 'disponivel', reservado_por = NULL, reserva_expira_em = NULL
    WHERE id = (pag.metadata->>'slot_id')::uuid AND status = 'reservado' AND reservado_por = p AND reservado_por_consulta_id IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.paciente_checkout_local(uuid,text,uuid,text,uuid), public.paciente_confirmar_pagamento_local(uuid), public.paciente_cancelar_pagamento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.paciente_checkout_local(uuid,text,uuid,text,uuid), public.paciente_confirmar_pagamento_local(uuid), public.paciente_cancelar_pagamento(uuid) TO authenticated;
