-- SECURITY INVOKER: leitura e agregação preservam RLS, inclusive a distribuição de conversas e o vínculo do médico.
CREATE OR REPLACE FUNCTION public.paciente_historico_pagina(_paciente_id uuid,_area text,_pagina integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE resultado jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT colaborador_sessao_permitida() OR
     NOT (has_permission(auth.uid(),'pacientes.ver') OR has_role(auth.uid(),'medico')) THEN
    RAISE EXCEPTION 'Sem permissão para consultar histórico' USING ERRCODE='42501';
  END IF;
  IF _pagina IS NULL OR _pagina<0 OR _pagina>1000000 THEN RAISE EXCEPTION 'Página inválida'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pacientes WHERE id=_paciente_id) THEN RAISE EXCEPTION 'Paciente indisponível'; END IF;
  CASE _area
  WHEN 'consultas' THEN
    IF NOT (has_permission(auth.uid(),'agenda.ver_todas') OR has_role(auth.uid(),'medico')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT c.id,c.inicio,c.fim,c.status,c.modalidade,c.valor_centavos,c.medico_id,c.link_sala,c.link_enviado_em,m.nome AS medico_nome FROM consultas c LEFT JOIN medicos m ON m.id=c.medico_id WHERE c.paciente_id=_paciente_id OR c.paciente_atendido_id=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY inicio DESC,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY inicio DESC,id) FROM pagina p),'[]'::jsonb),
      'resumo',(SELECT jsonb_build_object('total',count(*),'concluidas',count(*) FILTER(WHERE status='concluida'),'canceladas',count(*) FILTER(WHERE status='cancelada'),'ausencias',count(*) FILTER(WHERE status='no_show')) FROM registros)) INTO resultado;
  WHEN 'pagamentos' THEN
    IF NOT (has_permission(auth.uid(),'financeiro.ver')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT id,consulta_id,valor_centavos,status,metodo,created_at,paid_at,valor_reembolsado_centavos FROM pagamentos WHERE paciente_id=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY created_at DESC,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM pagina p),'[]'::jsonb),
      'resumo',(SELECT jsonb_build_object('totalGasto',coalesce(sum(valor_centavos) FILTER(WHERE status IN ('pago','reembolsado','reembolsado_parcial')),0),'pendentes',count(*) FILTER(WHERE status IN ('pendente','processando')),'falhos',count(*) FILTER(WHERE status='falhou'),'totalReembolsado',coalesce(sum(valor_reembolsado_centavos),0)) FROM registros)) INTO resultado;
  WHEN 'reembolsos' THEN
    IF NOT (has_permission(auth.uid(),'financeiro.ver')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT r.id,r.consulta_id,r.valor_centavos,r.status,r.motivo,r.created_at FROM reembolsos r LEFT JOIN pagamentos pg ON pg.id=r.pagamento_id LEFT JOIN consultas c ON c.id=r.consulta_id WHERE coalesce(pg.paciente_id,c.paciente_id)=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY created_at DESC,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM pagina p),'[]'::jsonb),
      'resumo','{}'::jsonb) INTO resultado;
  WHEN 'planos' THEN
    IF NOT (has_permission(auth.uid(),'financeiro.ver')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT a.id,a.plano_id,a.status,a.ciclo,a.valor_cobrado_centavos,a.data_inicio,a.proxima_cobranca,a.created_at,p.nome AS plano_nome FROM assinaturas a LEFT JOIN planos p ON p.id=a.plano_id WHERE a.paciente_id=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY created_at DESC,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM pagina p),'[]'::jsonb),
      'resumo','{}'::jsonb) INTO resultado;
  WHEN 'comunicacao' THEN
    IF NOT (has_permission(auth.uid(),'comunicacao.ver_inbox')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT id,contact_phone,contact_name,status,channel,last_message_at,last_message_preview,unread_count,tags FROM conversations WHERE patient_id=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY last_message_at DESC NULLS LAST,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY last_message_at DESC NULLS LAST,id) FROM pagina p),'[]'::jsonb),
      'resumo','{}'::jsonb) INTO resultado;
  WHEN 'auditoria' THEN
    IF NOT (has_permission(auth.uid(),'auditoria.ver')) THEN RAISE EXCEPTION 'Sem permissão para esta área' USING ERRCODE='42501'; END IF;
    WITH registros AS MATERIALIZED (SELECT id,acao,status_anterior,status_novo,motivo,observacao,payload,created_at,actor_id FROM pacientes_auditoria WHERE paciente_id=_paciente_id),
      pagina AS (SELECT * FROM registros ORDER BY created_at DESC,id LIMIT 50 OFFSET (_pagina::bigint*50))
    SELECT jsonb_build_object('total',(SELECT count(*) FROM registros),
      'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY created_at DESC,id) FROM pagina p),'[]'::jsonb),
      'resumo','{}'::jsonb) INTO resultado;
  ELSE RAISE EXCEPTION 'Área inválida';
  END CASE;
  RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.paciente_historico_pagina(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.paciente_historico_pagina(uuid,text,integer) TO authenticated;
