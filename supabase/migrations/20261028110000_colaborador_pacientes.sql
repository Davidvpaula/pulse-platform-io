CREATE OR REPLACE FUNCTION public.colaborador_listar_pacientes(_busca text DEFAULT '', _status text DEFAULT 'todos', _offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE resultado jsonb; termo text:=lower(trim(coalesce(_busca,'')));
  ver_agenda boolean; ver_financeiro boolean;
BEGIN
  IF NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'pacientes.ver') THEN
    RAISE EXCEPTION 'Sem permissão para consultar pacientes' USING ERRCODE='42501';
  END IF;
  IF _offset IS NULL OR _offset<0 OR length(termo)>200 OR _status IS NULL OR _status NOT IN ('todos','ativo','suspenso','bloqueado','banido','pendente') THEN
    RAISE EXCEPTION 'Filtros inválidos';
  END IF;
  ver_agenda:=has_permission(auth.uid(),'agenda.ver_todas');
  ver_financeiro:=has_permission(auth.uid(),'financeiro.ver');
  WITH filtrados AS MATERIALIZED (
    SELECT p.id,p.nome_completo,p.cpf,p.empresa_id,p.status_conta,p.created_at
    FROM pacientes p
    WHERE (_status='todos' OR p.status_conta::text=_status)
      AND (termo='' OR strpos(lower(coalesce(p.nome_completo,'')),termo)>0 OR p.id::text=termo
        OR (regexp_replace(termo,'[^0-9]','','g')<>'' AND termo ~ '^[0-9. /-]+$'
          AND strpos(regexp_replace(coalesce(p.cpf,''),'[^0-9]','','g'),regexp_replace(termo,'[^0-9]','','g'))>0))
  ), pagina AS (
    SELECT * FROM filtrados ORDER BY created_at DESC,id LIMIT 50 OFFSET _offset
  )
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrados),'pacientes',coalesce((
    SELECT jsonb_agg(to_jsonb(item) ORDER BY item.created_at DESC,item.id) FROM (
      SELECT p.*,
        CASE WHEN ver_agenda THEN (SELECT count(*) FROM consultas c WHERE coalesce(c.paciente_atendido_id,c.paciente_id)=p.id) END AS consultas_count,
        CASE WHEN ver_financeiro THEN EXISTS(SELECT 1 FROM pagamentos pg LEFT JOIN consultas c ON c.id=pg.consulta_id
          WHERE pg.status IN ('pendente','processando') AND coalesce(pg.paciente_id,c.paciente_id)=p.id) END AS tem_pgto_pendente
      FROM pagina p
    ) item
  ),'[]'::jsonb)) INTO resultado;
  RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.colaborador_listar_pacientes(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_listar_pacientes(text,text,integer) TO authenticated;
