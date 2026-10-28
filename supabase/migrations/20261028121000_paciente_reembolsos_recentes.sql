CREATE OR REPLACE FUNCTION public.paciente_reembolsos_recentes(_paciente_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id),'[]'::jsonb) FROM (
    SELECT r.id,r.consulta_id,r.valor_centavos,r.status,r.motivo,r.created_at
    FROM reembolsos r LEFT JOIN pagamentos pg ON pg.id=r.pagamento_id LEFT JOIN consultas c ON c.id=r.consulta_id
    WHERE colaborador_operacional_ativo() AND has_permission(auth.uid(),'pacientes.ver') AND has_permission(auth.uid(),'financeiro.ver')
      AND coalesce(pg.paciente_id,c.paciente_id)=_paciente_id
    ORDER BY r.created_at DESC,r.id LIMIT 50
  ) r;
$$;
REVOKE ALL ON FUNCTION public.paciente_reembolsos_recentes(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.paciente_reembolsos_recentes(uuid) TO authenticated;
