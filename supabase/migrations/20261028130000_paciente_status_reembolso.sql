INSERT INTO permissions_catalog(permission_key,modulo,descricao,risco) VALUES
('pacientes.banir','pacientes','Banir conta de paciente','alto'),
('pacientes.reativar','pacientes','Reativar conta de paciente','alto')
ON CONFLICT(permission_key) DO NOTHING;

DROP FUNCTION public.alterar_status_conta_paciente(uuid,public.status_conta_paciente,text,text);
CREATE OR REPLACE FUNCTION public.alterar_status_conta_paciente(_paciente_id uuid,_novo_status public.status_conta_paciente,_motivo text,_observacao text DEFAULT NULL,_bloqueado_ate timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pacientes; chave text;
BEGIN
  chave:=CASE _novo_status WHEN 'suspenso' THEN 'pacientes.suspender' WHEN 'bloqueado' THEN 'pacientes.bloquear'
    WHEN 'banido' THEN 'pacientes.banir' WHEN 'ativo' THEN 'pacientes.reativar' END;
  IF chave IS NULL OR NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'pacientes.ver') OR NOT has_permission(auth.uid(),chave) THEN
    RAISE EXCEPTION 'Sem permissão para alterar este status' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo))<3 OR length(_motivo)>1000 OR length(coalesce(_observacao,''))>5000 THEN RAISE EXCEPTION 'Informe motivo entre 3 e 1000 caracteres e observação de até 5000 caracteres'; END IF;
  IF _bloqueado_ate IS NOT NULL AND (_novo_status<>'bloqueado' OR _bloqueado_ate<=now()) THEN RAISE EXCEPTION 'Prazo de bloqueio deve ser futuro'; END IF;
  SELECT * INTO p FROM pacientes WHERE id=_paciente_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;
  IF p.status_conta=_novo_status THEN RAISE EXCEPTION 'Paciente já está com esse status'; END IF;
  IF p.status_conta='banido' AND _novo_status<>'ativo' THEN RAISE EXCEPTION 'Conta banida precisa ser reativada antes de outra alteração'; END IF;
  UPDATE pacientes SET status_conta=_novo_status,status_motivo=trim(_motivo),status_observacao=_observacao,
    status_alterado_por=auth.uid(),status_alterado_em=now(),updated_at=now(),
    bloqueado_ate=CASE WHEN _novo_status='bloqueado' THEN _bloqueado_ate END WHERE id=p.id;
  INSERT INTO pacientes_auditoria(paciente_id,actor_id,acao,status_anterior,status_novo,motivo,observacao,payload)
    VALUES(p.id,auth.uid(),'status:'||_novo_status::text,p.status_conta,_novo_status,trim(_motivo),_observacao,jsonb_build_object('bloqueado_ate',_bloqueado_ate));
  RETURN jsonb_build_object('ok',true,'paciente_id',p.id,'status',_novo_status);
END;
$$;
REVOKE ALL ON FUNCTION public.alterar_status_conta_paciente(uuid,public.status_conta_paciente,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.alterar_status_conta_paciente(uuid,public.status_conta_paciente,text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.paciente_solicitar_reembolso(_paciente_id uuid,_pagamento_id uuid,_tipo public.reembolso_tipo,_valor_centavos integer,_motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pagamentos; saldo bigint; comprometido bigint; valor bigint; resultado uuid;
BEGIN
  IF NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'pacientes.ver') OR NOT has_permission(auth.uid(),'financeiro.ver') OR NOT has_permission(auth.uid(),'pacientes.reembolsar') THEN
    RAISE EXCEPTION 'Sem permissão para solicitar reembolso' USING ERRCODE='42501';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo))<3 OR length(_motivo)>1000 OR _tipo IS NULL THEN RAISE EXCEPTION 'Informe tipo e motivo entre 3 e 1000 caracteres'; END IF;
  SELECT * INTO p FROM pagamentos WHERE id=_pagamento_id FOR UPDATE;
  IF p.id IS NULL OR p.status<>'pago' OR p.consulta_id IS NULL OR coalesce(p.paciente_id,(SELECT paciente_id FROM consultas WHERE id=p.consulta_id)) IS DISTINCT FROM _paciente_id THEN
    RAISE EXCEPTION 'Pagamento pago e vinculado a consulta deste paciente é necessário';
  END IF;
  IF EXISTS(SELECT 1 FROM reembolsos WHERE pagamento_id=p.id AND status IN ('solicitado','em_analise')) THEN RAISE EXCEPTION 'Já existe uma solicitação em análise para este pagamento'; END IF;
  SELECT coalesce(sum(valor_centavos),0) INTO comprometido FROM reembolsos WHERE pagamento_id=p.id AND status IN ('aprovado','concluido');
  saldo:=p.valor_centavos-greatest(coalesce(p.valor_reembolsado_centavos,0),comprometido);
  valor:=CASE WHEN _tipo='total' THEN saldo ELSE _valor_centavos END;
  IF valor IS NULL OR valor<=0 OR valor>saldo THEN RAISE EXCEPTION 'Valor excede o saldo disponível para reembolso'; END IF;
  INSERT INTO reembolsos(consulta_id,pagamento_id,valor_centavos,motivo,tipo,status,actor_id)
    VALUES(p.consulta_id,p.id,valor,trim(_motivo),_tipo,'solicitado',auth.uid()) RETURNING id INTO resultado;
  INSERT INTO pacientes_auditoria(paciente_id,actor_id,acao,motivo,payload)
    VALUES(_paciente_id,auth.uid(),'reembolso_solicitado',trim(_motivo),jsonb_build_object('reembolso_id',resultado,'pagamento_id',p.id,'valor_centavos',valor));
  RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.paciente_solicitar_reembolso(uuid,uuid,public.reembolso_tipo,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.paciente_solicitar_reembolso(uuid,uuid,public.reembolso_tipo,integer,text) TO authenticated;
DROP POLICY IF EXISTS "Staff cria reembolsos" ON public.reembolsos;
