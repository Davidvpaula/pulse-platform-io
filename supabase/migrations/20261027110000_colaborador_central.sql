INSERT INTO public.permissions_catalog(permission_key,modulo,descricao,risco)
VALUES ('agenda.confirmar','agenda','Confirmar consultas agendadas','medio') ON CONFLICT(permission_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.colaborador_operacional_ativo()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM colaboradores WHERE user_id=auth.uid() AND status_conta='ativo' AND removido_em IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.colaborador_operacional_ativo() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_operacional_ativo() TO authenticated;

CREATE OR REPLACE FUNCTION public.colaborador_dashboard(_inicio timestamptz,_fim timestamptz,_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE agenda jsonb; financeiro jsonb; fila jsonb; ver_pacientes boolean := has_permission(auth.uid(),'pacientes.ver');
BEGIN
  IF NOT colaborador_operacional_ativo() THEN RAISE EXCEPTION 'Colaborador ativo necessário' USING ERRCODE='42501'; END IF;
  IF _inicio IS NULL OR _fim IS NULL OR _fim <= _inicio OR _fim-_inicio > interval '26 hours' OR _offset < 0 OR _offset IS NULL THEN RAISE EXCEPTION 'Período inválido'; END IF;
  IF has_permission(auth.uid(),'agenda.ver_todas') THEN
    SELECT jsonb_build_object('total',count(*),'concluidas',count(*) FILTER(WHERE status='concluida'),
      'ativas',count(*) FILTER(WHERE status NOT IN ('concluida','cancelada','no_show')),
      'urgentes',count(*) FILTER(WHERE status IN ('agendada','confirmada') AND inicio BETWEEN now() AND now()+interval '30 minutes'))
      INTO agenda FROM consultas WHERE inicio>=_inicio AND inicio<_fim;
    SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO fila FROM (
      SELECT c.id,c.inicio,c.status,c.modalidade,m.nome AS medico_nome,
        CASE WHEN ver_pacientes THEN coalesce(atendido.nome_completo,p.nome_completo,'Paciente') ELSE 'Paciente' END AS paciente_nome,
        CASE WHEN ver_pacientes THEN c.paciente_id END AS paciente_id
      FROM consultas c JOIN medicos m ON m.id=c.medico_id LEFT JOIN pacientes p ON p.id=c.paciente_id
      LEFT JOIN pacientes atendido ON atendido.id=c.paciente_atendido_id
      WHERE c.inicio>=_inicio AND c.inicio<_fim AND c.status NOT IN ('concluida','cancelada','no_show')
      ORDER BY c.inicio,c.id LIMIT 50 OFFSET _offset
    ) q;
  END IF;
  IF has_permission(auth.uid(),'financeiro.ver') THEN
    SELECT jsonb_build_object('quantidade',count(*),'valor_centavos',coalesce(sum(valor_centavos),0)) INTO financeiro
      FROM pagamentos WHERE status IN ('pendente','processando');
  END IF;
  RETURN jsonb_build_object('agenda',agenda,'financeiro',financeiro,'fila',coalesce(fila,'[]'::jsonb));
END; $$;

CREATE OR REPLACE FUNCTION public.colaborador_alterar_consulta(_consulta_id uuid,_status public.consulta_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.consultas; chave text;
BEGIN
  chave := CASE _status WHEN 'confirmada' THEN 'agenda.confirmar' WHEN 'cancelada' THEN 'agenda.cancelar' END;
  IF chave IS NULL OR NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'agenda.ver_todas') OR NOT has_permission(auth.uid(),chave) THEN RAISE EXCEPTION 'Sem permissão para esta ação' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM consultas WHERE id=_consulta_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF c.status=_status THEN RETURN; END IF;
  IF (_status='confirmada' AND c.status<>'agendada') OR (_status='cancelada' AND c.status NOT IN ('agendada','confirmada','aguardando_pagamento')) THEN RAISE EXCEPTION 'Transição de status inválida'; END IF;
  UPDATE consultas SET status=_status,updated_at=now() WHERE id=c.id;
  IF _status='cancelada' THEN
    UPDATE agenda_slots SET status='disponivel',reservado_por=NULL,reservado_por_consulta_id=NULL,reserva_expira_em=NULL
      WHERE id=c.slot_id AND reservado_por_consulta_id=c.id;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.colaborador_dashboard(timestamptz,timestamptz,integer),public.colaborador_alterar_consulta(uuid,public.consulta_status) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_dashboard(timestamptz,timestamptz,integer),public.colaborador_alterar_consulta(uuid,public.consulta_status) TO authenticated;
