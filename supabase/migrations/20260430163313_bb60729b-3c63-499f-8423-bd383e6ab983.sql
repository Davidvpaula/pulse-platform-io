
CREATE OR REPLACE FUNCTION public.admin_visao_geral(_periodo text DEFAULT 'mes')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim timestamptz := now();
  v_hoje_inicio timestamptz := date_trunc('day', now());
  v_hoje_fim timestamptz := v_hoje_inicio + interval '1 day';
  v_amanha_inicio timestamptz := v_hoje_inicio + interval '1 day';
  v_amanha_fim timestamptz := v_hoje_inicio + interval '2 day';
  v_result jsonb;
  v_kpis jsonb;
  v_pendencias jsonb;
  v_alertas jsonb;
  v_ultimos_agendamentos jsonb;
  v_ultimos_pacientes jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  v_inicio := CASE lower(coalesce(_periodo, 'mes'))
    WHEN 'hoje' THEN v_hoje_inicio
    WHEN 'semana' THEN date_trunc('week', now())
    WHEN 'mes' THEN date_trunc('month', now())
    ELSE date_trunc('month', now())
  END;

  SELECT jsonb_build_object(
    'pacientes_total', (SELECT count(*) FROM pacientes),
    'pacientes_periodo', (SELECT count(*) FROM pacientes WHERE created_at >= v_inicio AND created_at < v_fim),
    'medicos_ativos', (SELECT count(*) FROM medicos WHERE status = 'aprovado'),
    'medicos_pendentes', (SELECT count(*) FROM medicos WHERE status IN ('pendente','em_analise')),
    'empresas_total', (SELECT count(*) FROM empresas WHERE ativo = true),
    'agendamentos_periodo', (SELECT count(*) FROM consultas WHERE inicio >= v_inicio AND inicio < v_fim),
    'faturamento_periodo_centavos', (
      SELECT coalesce(sum(valor_centavos), 0)::bigint
      FROM pagamentos
      WHERE status = 'pago' AND coalesce(paid_at, updated_at) >= v_inicio AND coalesce(paid_at, updated_at) < v_fim
    ),
    'consultas_hoje', (SELECT count(*) FROM consultas WHERE inicio >= v_hoje_inicio AND inicio < v_hoje_fim),
    'consultas_em_andamento', (SELECT count(*) FROM consultas WHERE status = 'em_andamento'),
    'consultas_confirmadas_hoje', (SELECT count(*) FROM consultas WHERE status = 'confirmada' AND inicio >= v_hoje_inicio AND inicio < v_hoje_fim),
    'consultas_canceladas_hoje', (SELECT count(*) FROM consultas WHERE status = 'cancelada' AND inicio >= v_hoje_inicio AND inicio < v_hoje_fim),
    'consultas_concluidas_hoje', (SELECT count(*) FROM consultas WHERE status = 'concluida' AND inicio >= v_hoje_inicio AND inicio < v_hoje_fim)
  ) INTO v_kpis;

  SELECT jsonb_build_object(
    'confirmar_amanha', (SELECT count(*) FROM consultas WHERE status = 'agendada' AND inicio >= v_amanha_inicio AND inicio < v_amanha_fim),
    'aguardando_pagamento', (SELECT count(*) FROM consultas WHERE status = 'aguardando_pagamento'),
    'medicos_sem_sala', (SELECT count(*) FROM medicos WHERE status = 'aprovado' AND (link_sala_padrao IS NULL OR link_sala_padrao = '')),
    'medicos_pendentes', (SELECT count(*) FROM medicos WHERE status IN ('pendente','em_analise')),
    'colaboradores_pendentes', (SELECT count(*) FROM colaboradores WHERE status_conta = 'pendente_convite')
  ) INTO v_pendencias;

  WITH alertas_calc AS (
    SELECT 'destructive'::text AS tone, 'Médicos suspensos com consultas futuras' AS titulo,
           count(*)::text || ' médicos precisam de atenção' AS descricao
      FROM medicos m
      WHERE m.status IN ('suspenso','bloqueado')
        AND EXISTS (SELECT 1 FROM consultas c WHERE c.medico_id = m.id AND c.inicio > now() AND c.status NOT IN ('cancelada','concluida'))
      HAVING count(*) > 0
    UNION ALL
    SELECT 'warning', 'Cobranças pendentes',
           count(*)::text || ' consultas aguardando pagamento'
      FROM consultas WHERE status = 'aguardando_pagamento'
      HAVING count(*) > 0
    UNION ALL
    SELECT 'warning', 'Médicos sem sala padrão',
           count(*)::text || ' aprovados sem link de sala'
      FROM medicos WHERE status = 'aprovado' AND (link_sala_padrao IS NULL OR link_sala_padrao = '')
      HAVING count(*) > 0
    UNION ALL
    SELECT 'info', 'Médicos aguardando aprovação',
           count(*)::text || ' cadastros para revisar'
      FROM medicos WHERE status IN ('pendente','em_analise')
      HAVING count(*) > 0
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('tone',tone,'titulo',titulo,'desc',descricao)), '[]'::jsonb)
    INTO v_alertas FROM alertas_calc;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_ultimos_agendamentos
  FROM (
    SELECT c.id, c.inicio, c.status::text AS status, c.canal_origem::text AS canal,
           p.nome_completo AS paciente, m.nome AS medico
    FROM consultas c
    LEFT JOIN pacientes p ON p.id = c.paciente_id
    LEFT JOIN medicos m ON m.id = c.medico_id
    ORDER BY c.created_at DESC
    LIMIT 10
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_ultimos_pacientes
  FROM (
    SELECT p.id, p.nome_completo AS nome, p.status_conta::text AS status,
           p.created_at, e.razao_social AS empresa
    FROM pacientes p
    LEFT JOIN empresas e ON e.id = p.empresa_id
    ORDER BY p.created_at DESC
    LIMIT 5
  ) t;

  v_result := jsonb_build_object(
    'periodo', _periodo,
    'inicio', v_inicio,
    'fim', v_fim,
    'kpis', v_kpis,
    'pendencias', v_pendencias,
    'alertas', v_alertas,
    'ultimos_agendamentos', v_ultimos_agendamentos,
    'ultimos_pacientes', v_ultimos_pacientes
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_visao_geral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_visao_geral(text) TO authenticated;
