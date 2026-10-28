CREATE OR REPLACE FUNCTION public.colaborador_criar_agendamento(_slot_id uuid,_paciente_id uuid,_motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.agenda_slots; titular uuid; atendido uuid; esp uuid; valor integer; consulta uuid; sala text;
BEGIN
  IF NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'agenda.ver_todas') OR NOT has_permission(auth.uid(),'agenda.criar') OR NOT has_permission(auth.uid(),'pacientes.ver') THEN RAISE EXCEPTION 'Sem permissão para agendar' USING ERRCODE='42501'; END IF;
  SELECT coalesce(responsavel_id,id), CASE WHEN responsavel_id IS NOT NULL THEN id END INTO titular,atendido
    FROM pacientes WHERE id=_paciente_id AND status_conta='ativo';
  IF titular IS NULL OR NOT EXISTS(SELECT 1 FROM pacientes WHERE id=titular AND status_conta='ativo') THEN RAISE EXCEPTION 'Paciente ativo necessário'; END IF;
  SELECT * INTO s FROM agenda_slots WHERE id=_slot_id FOR UPDATE;
  IF s.id IS NULL OR s.status<>'disponivel' OR s.inicio<=now() THEN RAISE EXCEPTION 'Horário indisponível'; END IF;
  IF NOT EXISTS(SELECT 1 FROM medicos WHERE id=s.medico_id AND status='aprovado') THEN RAISE EXCEPTION 'Médico indisponível'; END IF;
  SELECT especialidade_id,preco_centavos INTO esp,valor FROM medico_especialidades WHERE medico_id=s.medico_id AND ativo ORDER BY created_at,id LIMIT 1;
  IF esp IS NULL OR valor IS NULL OR valor<0 THEN RAISE EXCEPTION 'Especialidade e preço precisam estar configurados'; END IF;
  SELECT link_sala_padrao INTO sala FROM medicos WHERE id=s.medico_id;
  INSERT INTO consultas(paciente_id,paciente_atendido_id,medico_id,especialidade_id,slot_id,inicio,fim,modalidade,status,valor_centavos,motivo,canal_origem,link_sala)
    VALUES(titular,atendido,s.medico_id,esp,s.id,s.inicio,s.fim,s.modalidade,'agendada',valor,left(_motivo,500),'manual_secretaria',CASE WHEN s.modalidade='online' THEN sala END) RETURNING id INTO consulta;
  UPDATE agenda_slots SET status='bloqueado',reservado_por=titular,reservado_por_consulta_id=consulta,reserva_expira_em=NULL WHERE id=s.id;
  PERFORM create_conversation_for_consulta(consulta);
  RETURN consulta;
END; $$;
REVOKE ALL ON FUNCTION public.colaborador_criar_agendamento(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_criar_agendamento(uuid,uuid,text) TO authenticated;
DROP POLICY IF EXISTS "Secretaria cria consultas" ON public.consultas;
