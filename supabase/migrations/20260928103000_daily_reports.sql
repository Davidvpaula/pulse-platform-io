CREATE OR REPLACE FUNCTION public.relatorios_consultas_diarias(
 p_inicio timestamptz, p_fim timestamptz, p_medico_id uuid DEFAULT NULL,
 p_especialidade text DEFAULT NULL, p_canal text DEFAULT NULL, p_status text DEFAULT NULL,
 p_empresa_id uuid DEFAULT NULL
) RETURNS TABLE(dia date,total_consultas integer,concluidas integer,no_show integer,canceladas integer,receita_centavos bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT has_permission(auth.uid(),'relatorios.ver') THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
 RETURN QUERY
 WITH base AS (
   SELECT (c.inicio AT TIME ZONE 'America/Sao_Paulo')::date d,c.status::text s
   FROM consultas c LEFT JOIN medicos m ON m.id=c.medico_id
   WHERE c.inicio>=p_inicio AND c.inicio<p_fim
    AND (p_medico_id IS NULL OR c.medico_id=p_medico_id)
    AND (p_especialidade IS NULL OR m.especialidade=p_especialidade)
    AND (p_canal IS NULL OR c.canal_origem::text=p_canal)
    AND (p_status IS NULL OR c.status::text=p_status)
    AND (p_empresa_id IS NULL OR c.empresa_id=p_empresa_id)
 ), receitas AS (
   SELECT (cf.data_consulta AT TIME ZONE 'America/Sao_Paulo')::date d,sum(cf.valor_bruto_centavos)::bigint valor
   FROM consultas_financeiro cf JOIN consultas c ON c.id=cf.consulta_id LEFT JOIN medicos m ON m.id=cf.medico_id
   WHERE cf.data_consulta>=p_inicio AND cf.data_consulta<p_fim AND cf.status='valido'
    AND (p_medico_id IS NULL OR cf.medico_id=p_medico_id)
    AND (p_especialidade IS NULL OR m.especialidade=p_especialidade)
    AND (p_empresa_id IS NULL OR cf.empresa_id=p_empresa_id)
    AND (p_canal IS NULL OR c.canal_origem::text=p_canal)
    AND (p_status IS NULL OR c.status::text=p_status)
   GROUP BY 1
 ) SELECT b.d,count(*)::integer,count(*) FILTER(WHERE b.s='concluida')::integer,
    count(*) FILTER(WHERE b.s='no_show')::integer,count(*) FILTER(WHERE b.s='cancelada')::integer,
    coalesce(max(r.valor),0)::bigint FROM base b LEFT JOIN receitas r ON r.d=b.d GROUP BY b.d ORDER BY b.d;
END $$;
REVOKE ALL ON FUNCTION public.relatorios_consultas_diarias(timestamptz,timestamptz,uuid,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.relatorios_consultas_diarias(timestamptz,timestamptz,uuid,text,text,text,uuid) TO authenticated;
