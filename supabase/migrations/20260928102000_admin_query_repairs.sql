-- Restaura somente helpers de leitura dependentes de auth.uid() usados por RLS.
GRANT EXECUTE ON FUNCTION public.get_titular_paciente_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_empresa_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_paciente_da_conversa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_medico_da_conversa(uuid) TO authenticated;

-- Relatórios com checagem explícita de papel/capacidade no corpo.
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT oid::regprocedure AS signature FROM pg_proc
    WHERE pronamespace='public'::regnamespace AND proname IN
    ('relatorios_executivo','relatorios_clinica','relatorios_financeiro','relatorios_financeiro_snapshot')
  LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.signature); END LOOP;
END $$;

-- NOT VALID conserva eventuais registros históricos órfãos; novas escritas exigem vínculo válido.
ALTER TABLE public.consultas ADD CONSTRAINT consultas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) NOT VALID;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id) NOT VALID;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) NOT VALID;
ALTER TABLE public.planos_auditoria ADD CONSTRAINT planos_auditoria_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) NOT VALID;

CREATE OR REPLACE FUNCTION public.admin_agendamentos_overview(_data date DEFAULT CURRENT_DATE, _periodo text DEFAULT 'dia')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inicio_periodo timestamptz; fim_periodo timestamptz; kpis jsonb; inteligencia jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  inicio_periodo := _data::timestamp AT TIME ZONE 'America/Sao_Paulo';
  fim_periodo := (_data + CASE _periodo WHEN 'semana' THEN 7 WHEN 'mes' THEN 30 ELSE 1 END)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  SELECT jsonb_build_object('total',count(*),
    'agendada',count(*) FILTER(WHERE status='agendada'), 'confirmada',count(*) FILTER(WHERE status='confirmada'),
    'em_andamento',count(*) FILTER(WHERE status='em_andamento'), 'concluida',count(*) FILTER(WHERE status='concluida'),
    'cancelada',count(*) FILTER(WHERE status='cancelada'), 'no_show',count(*) FILTER(WHERE status='no_show'),
    'aguardando_pagamento',count(*) FILTER(WHERE status='aguardando_pagamento'))
  INTO kpis FROM consultas WHERE inicio >= inicio_periodo AND inicio < fim_periodo;
  inteligencia := jsonb_build_object(
    'pacientes_sem_confirmar_24h', (SELECT coalesce(jsonb_agg(jsonb_build_object('consulta_id',c.id,'paciente_nome',p.nome_completo,'inicio',c.inicio)),'[]')
      FROM consultas c JOIN pacientes p ON p.id=c.paciente_id WHERE c.inicio>=inicio_periodo AND c.inicio<fim_periodo AND c.status='agendada' AND c.confirmada_em IS NULL AND c.inicio<=now()+interval '24 hours'),
    'risco_no_show', (SELECT coalesce(jsonb_agg(jsonb_build_object('consulta_id',c.id,'paciente_nome',p.nome_completo,'no_shows',s.cnt)),'[]')
      FROM consultas c JOIN pacientes p ON p.id=c.paciente_id JOIN (SELECT paciente_id,count(*) cnt FROM consultas WHERE status='no_show' GROUP BY paciente_id HAVING count(*)>=2) s ON s.paciente_id=c.paciente_id
      WHERE c.inicio>=inicio_periodo AND c.inicio<fim_periodo AND c.status IN ('agendada','confirmada')),
    'medicos_sobrecarregados_dia', (SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM (
      SELECT c.medico_id,m.nome,count(*) qtd FROM consultas c JOIN medicos m ON m.id=c.medico_id
      WHERE c.inicio>=inicio_periodo AND c.inicio<fim_periodo AND c.status NOT IN ('cancelada','no_show')
      GROUP BY c.medico_id,m.nome HAVING count(*)>=8) s),
    'sugerir_abrir_agenda','[]'::jsonb);
  RETURN jsonb_build_object('kpis',kpis,'inteligencia',inteligencia);
END $$;

NOTIFY pgrst, 'reload schema';
