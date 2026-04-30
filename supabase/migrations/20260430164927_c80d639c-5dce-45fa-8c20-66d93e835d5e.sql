-- ============================================================
-- MÓDULO ADMIN > AGENDAMENTOS
-- (permissões já existem em permissoes_perfil/permissoes_colaborador)
-- ============================================================

-- 1) RPC: admin_agendamentos_overview
CREATE OR REPLACE FUNCTION public.admin_agendamentos_overview(
  _data date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  _periodo text DEFAULT 'dia'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inicio timestamptz;
  v_fim timestamptz;
  v_kpis jsonb;
  v_alertas jsonb;
  v_inteligencia jsonb;
BEGIN
  IF NOT (
    has_role(v_uid, 'admin'::app_role)
    OR has_permission(v_uid, 'consultas.ver_tudo')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para ver agendamentos';
  END IF;

  IF _periodo = 'semana' THEN
    v_inicio := date_trunc('week', _data::timestamptz);
    v_fim := v_inicio + interval '7 days';
  ELSIF _periodo = 'mes' THEN
    v_inicio := date_trunc('month', _data::timestamptz);
    v_fim := v_inicio + interval '1 month';
  ELSE
    v_inicio := _data::timestamptz;
    v_fim := v_inicio + interval '1 day';
  END IF;

  SELECT jsonb_build_object(
    'total',               count(*),
    'agendadas',           count(*) FILTER (WHERE status = 'agendada'),
    'aguardando_pagamento',count(*) FILTER (WHERE status = 'aguardando_pagamento'),
    'confirmadas',         count(*) FILTER (WHERE status = 'confirmada'),
    'em_andamento',        count(*) FILTER (WHERE status = 'em_andamento'),
    'concluidas',          count(*) FILTER (WHERE status = 'concluida'),
    'canceladas',          count(*) FILTER (WHERE status = 'cancelada'),
    'no_show',             count(*) FILTER (WHERE status = 'no_show'),
    'faturamento_centavos',COALESCE(sum(valor_centavos) FILTER (WHERE status IN ('confirmada','em_andamento','concluida')), 0)
  )
  INTO v_kpis
  FROM public.consultas
  WHERE inicio >= v_inicio AND inicio < v_fim;

  SELECT jsonb_build_object(
    'sem_confirmacao_proximas', (
      SELECT count(*) FROM public.consultas
      WHERE status = 'agendada'
        AND inicio BETWEEN now() AND now() + interval '24 hours'
    ),
    'sem_link_online', (
      SELECT count(*) FROM public.consultas c
      WHERE c.modalidade = 'online'
        AND c.status IN ('agendada','confirmada')
        AND c.inicio BETWEEN now() AND now() + interval '24 hours'
        AND (c.link_sala IS NULL OR c.link_sala = '')
    ),
    'em_andamento_atrasadas', (
      SELECT count(*) FROM public.consultas
      WHERE status = 'em_andamento' AND fim < now()
    ),
    'medico_sem_link_padrao_com_consultas', (
      SELECT count(DISTINCT c.medico_id) FROM public.consultas c
      JOIN public.medicos m ON m.id = c.medico_id
      WHERE c.modalidade = 'online'
        AND c.status IN ('agendada','confirmada')
        AND c.inicio >= now()
        AND (m.link_sala_padrao IS NULL OR m.link_sala_padrao = '')
    ),
    'pagamentos_pendentes', (
      SELECT count(*) FROM public.consultas
      WHERE status = 'aguardando_pagamento' AND inicio >= now()
    )
  )
  INTO v_alertas;

  SELECT jsonb_build_object(
    'pacientes_sem_confirmar_24h', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'consulta_id', c.id,
        'paciente', p.nome_completo,
        'medico', m.nome,
        'inicio', c.inicio
      ) ORDER BY c.inicio), '[]'::jsonb)
      FROM public.consultas c
      JOIN public.pacientes p ON p.id = c.paciente_id
      JOIN public.medicos m   ON m.id = c.medico_id
      WHERE c.status = 'agendada'
        AND c.inicio BETWEEN now() AND now() + interval '24 hours'
    ),
    'risco_no_show', (
      SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'inicio')), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'consulta_id', c.id,
          'paciente', p.nome_completo,
          'inicio', c.inicio,
          'no_shows', (SELECT count(*) FROM public.consultas c2
                       WHERE c2.paciente_id = c.paciente_id AND c2.status = 'no_show')
        ) AS x
        FROM public.consultas c
        JOIN public.pacientes p ON p.id = c.paciente_id
        WHERE c.status IN ('agendada','confirmada')
          AND c.inicio >= now()
          AND (SELECT count(*) FROM public.consultas c2
               WHERE c2.paciente_id = c.paciente_id AND c2.status = 'no_show') >= 2
        LIMIT 10
      ) y
    ),
    'medicos_sobrecarregados_dia', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'medico_id', medico_id, 'nome', nome, 'qtd', qtd
      ) ORDER BY qtd DESC), '[]'::jsonb)
      FROM (
        SELECT m.id AS medico_id, m.nome, count(*) AS qtd
        FROM public.consultas c
        JOIN public.medicos m ON m.id = c.medico_id
        WHERE c.inicio::date = _data
          AND c.status IN ('agendada','confirmada','em_andamento')
        GROUP BY m.id, m.nome
        HAVING count(*) >= 12
      ) z
    ),
    'sugerir_abrir_agenda', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'especialidade_id', especialidade_id, 'nome', nome,
        'slots_livres', slots_livres, 'demanda', demanda
      )), '[]'::jsonb)
      FROM (
        SELECT e.id AS especialidade_id, e.nome,
               (SELECT count(*) FROM public.agenda_slots s
                JOIN public.medico_especialidades me ON me.medico_id = s.medico_id
                WHERE me.especialidade_id = e.id
                  AND s.status = 'disponivel'
                  AND s.inicio BETWEEN now() AND now() + interval '7 days') AS slots_livres,
               (SELECT count(*) FROM public.consultas c
                WHERE c.especialidade_id = e.id
                  AND c.inicio BETWEEN now() AND now() + interval '7 days') AS demanda
        FROM public.especialidades e
        WHERE e.ativo = true
      ) w
      WHERE demanda > 0 AND slots_livres < demanda
    )
  )
  INTO v_inteligencia;

  RETURN jsonb_build_object(
    'periodo', _periodo,
    'data', _data,
    'inicio', v_inicio,
    'fim', v_fim,
    'kpis', v_kpis,
    'alertas', v_alertas,
    'inteligencia', v_inteligencia
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_agendamentos_overview(date, text) TO authenticated;

-- 2) helper auditoria
CREATE OR REPLACE FUNCTION public._log_consulta_audit(
  _consulta_id uuid, _acao text, _campo text,
  _val_ant text, _val_novo text, _motivo text, _payload jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.consultas_auditoria
    (consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo, payload)
  VALUES
    (_consulta_id, auth.uid(), _acao, _campo, _val_ant, _val_novo, _motivo, _payload);
$$;

-- 3) cancelar
CREATE OR REPLACE FUNCTION public.admin_consulta_cancelar(_consulta_id uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status_ant consulta_status; v_slot uuid;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'consultas.cancelar')) THEN
    RAISE EXCEPTION 'Sem permissão para cancelar consultas';
  END IF;
  SELECT status, slot_id INTO v_status_ant, v_slot FROM public.consultas WHERE id=_consulta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF v_status_ant IN ('cancelada','concluida') THEN
    RAISE EXCEPTION 'Consulta já está % e não pode ser cancelada', v_status_ant;
  END IF;
  UPDATE public.consultas SET status='cancelada', updated_at=now() WHERE id=_consulta_id;
  IF v_slot IS NOT NULL THEN
    UPDATE public.agenda_slots
    SET status='disponivel', reservado_por_consulta_id=NULL, reserva_expira_em=NULL, updated_at=now()
    WHERE id=v_slot;
  END IF;
  PERFORM public._log_consulta_audit(_consulta_id,'cancelar','status',
    v_status_ant::text,'cancelada',_motivo, jsonb_build_object('slot_liberado',v_slot));
  RETURN jsonb_build_object('ok',true);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_consulta_cancelar(uuid, text) TO authenticated;

-- 4) trocar médico
CREATE OR REPLACE FUNCTION public.admin_consulta_trocar_medico(
  _consulta_id uuid, _novo_medico_id uuid, _novo_slot_id uuid, _motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_medico_ant uuid; v_slot_ant uuid;
  v_slot_inicio timestamptz; v_slot_fim timestamptz;
  v_slot_status slot_status; v_slot_medico uuid; v_link_sala text;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'consultas.trocar_medico')) THEN
    RAISE EXCEPTION 'Sem permissão para trocar médico';
  END IF;
  SELECT medico_id, slot_id INTO v_medico_ant, v_slot_ant
  FROM public.consultas WHERE id=_consulta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;

  SELECT inicio, fim, status, medico_id INTO v_slot_inicio, v_slot_fim, v_slot_status, v_slot_medico
  FROM public.agenda_slots WHERE id=_novo_slot_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Novo slot não encontrado'; END IF;
  IF v_slot_medico <> _novo_medico_id THEN RAISE EXCEPTION 'Slot não pertence ao novo médico'; END IF;
  IF v_slot_status <> 'disponivel' THEN RAISE EXCEPTION 'Slot não está disponível'; END IF;

  SELECT link_sala_padrao INTO v_link_sala FROM public.medicos WHERE id=_novo_medico_id;

  IF v_slot_ant IS NOT NULL THEN
    UPDATE public.agenda_slots
    SET status='disponivel', reservado_por_consulta_id=NULL, reserva_expira_em=NULL, updated_at=now()
    WHERE id=v_slot_ant;
  END IF;
  UPDATE public.agenda_slots
  SET status='reservado', reservado_por_consulta_id=_consulta_id, updated_at=now()
  WHERE id=_novo_slot_id;

  UPDATE public.consultas
  SET medico_id=_novo_medico_id, slot_id=_novo_slot_id,
      inicio=v_slot_inicio, fim=v_slot_fim,
      link_sala=COALESCE(v_link_sala, link_sala), updated_at=now()
  WHERE id=_consulta_id;

  PERFORM public._log_consulta_audit(_consulta_id,'trocar_medico','medico_id',
    v_medico_ant::text, _novo_medico_id::text, _motivo,
    jsonb_build_object('slot_anterior',v_slot_ant,'novo_slot',_novo_slot_id));
  RETURN jsonb_build_object('ok',true,'novo_inicio',v_slot_inicio);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_consulta_trocar_medico(uuid, uuid, uuid, text) TO authenticated;

-- 5) reenviar link
CREATE OR REPLACE FUNCTION public.admin_consulta_reenviar_link(_consulta_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_link text; v_medico uuid;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'consultas.reenviar_link')) THEN
    RAISE EXCEPTION 'Sem permissão para reenviar link';
  END IF;
  SELECT link_sala, medico_id INTO v_link, v_medico FROM public.consultas WHERE id=_consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF v_link IS NULL OR v_link = '' THEN
    SELECT link_sala_padrao INTO v_link FROM public.medicos WHERE id=v_medico;
    IF v_link IS NULL OR v_link = '' THEN
      RAISE EXCEPTION 'Médico não tem link de sala padrão configurado';
    END IF;
    UPDATE public.consultas SET link_sala=v_link, updated_at=now() WHERE id=_consulta_id;
  END IF;
  UPDATE public.consultas
  SET link_enviado_por=v_uid, link_enviado_em=now(), updated_at=now()
  WHERE id=_consulta_id;
  PERFORM public._log_consulta_audit(_consulta_id,'reenviar_link','link_sala',
    NULL, v_link, NULL, jsonb_build_object('reenviado_em', now()));
  RETURN jsonb_build_object('ok',true,'link',v_link);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_consulta_reenviar_link(uuid) TO authenticated;

-- 6) forçar confirmação (usa permission consultas.forcar_status)
CREATE OR REPLACE FUNCTION public.admin_consulta_forcar_confirmacao(_consulta_id uuid, _motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status_ant consulta_status;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'consultas.forcar_status')) THEN
    RAISE EXCEPTION 'Sem permissão para forçar confirmação';
  END IF;
  SELECT status INTO v_status_ant FROM public.consultas WHERE id=_consulta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF v_status_ant NOT IN ('agendada','aguardando_pagamento') THEN
    RAISE EXCEPTION 'Consulta não pode ser confirmada (status atual: %)', v_status_ant;
  END IF;
  UPDATE public.consultas
  SET status='confirmada', confirmada_por=v_uid, confirmada_em=now(), updated_at=now()
  WHERE id=_consulta_id;
  PERFORM public._log_consulta_audit(_consulta_id,'forcar_confirmacao','status',
    v_status_ant::text,'confirmada',_motivo,NULL);
  RETURN jsonb_build_object('ok',true);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_consulta_forcar_confirmacao(uuid, text) TO authenticated;

-- 7) marcar realizada (concluida)
CREATE OR REPLACE FUNCTION public.admin_consulta_marcar_realizada(_consulta_id uuid, _observacao text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_status_ant consulta_status;
BEGIN
  IF NOT (has_role(v_uid,'admin'::app_role) OR has_permission(v_uid,'consultas.forcar_status')) THEN
    RAISE EXCEPTION 'Sem permissão para marcar como realizada';
  END IF;
  SELECT status INTO v_status_ant FROM public.consultas WHERE id=_consulta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF v_status_ant IN ('cancelada','concluida') THEN
    RAISE EXCEPTION 'Consulta já está %', v_status_ant;
  END IF;
  UPDATE public.consultas SET status='concluida', updated_at=now() WHERE id=_consulta_id;
  PERFORM public._log_consulta_audit(_consulta_id,'marcar_realizada','status',
    v_status_ant::text,'concluida',_observacao,NULL);
  RETURN jsonb_build_object('ok',true);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_consulta_marcar_realizada(uuid, text) TO authenticated;