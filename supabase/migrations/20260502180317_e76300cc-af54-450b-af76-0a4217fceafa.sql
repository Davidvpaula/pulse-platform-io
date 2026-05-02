
-- Drop existing functions that may have incompatible signatures
DROP FUNCTION IF EXISTS public.admin_consulta_forcar_confirmacao(uuid, text);
DROP FUNCTION IF EXISTS public.admin_consulta_cancelar(uuid, text);
DROP FUNCTION IF EXISTS public.admin_consulta_marcar_realizada(uuid, text);
DROP FUNCTION IF EXISTS public.admin_consulta_reenviar_link(uuid);
DROP FUNCTION IF EXISTS public.forcar_status_consulta(uuid, consulta_status, text);
DROP FUNCTION IF EXISTS public.admin_agendamentos_overview(date, text);

-- 1. has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. admin_agendamentos_overview
CREATE OR REPLACE FUNCTION public.admin_agendamentos_overview(
  _data date DEFAULT CURRENT_DATE,
  _periodo text DEFAULT 'dia'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inicio timestamptz; _fim timestamptz;
  _kpis jsonb; _intel jsonb;
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado: requer perfil admin'; END IF;
  _inicio := _data::timestamptz;
  _fim := (_data + interval '1 day')::timestamptz;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'agendada', COUNT(*) FILTER (WHERE status = 'agendada'),
    'confirmada', COUNT(*) FILTER (WHERE status = 'confirmada'),
    'em_andamento', COUNT(*) FILTER (WHERE status = 'em_andamento'),
    'concluida', COUNT(*) FILTER (WHERE status = 'concluida'),
    'cancelada', COUNT(*) FILTER (WHERE status = 'cancelada'),
    'no_show', COUNT(*) FILTER (WHERE status = 'no_show'),
    'aguardando_pagamento', COUNT(*) FILTER (WHERE status = 'aguardando_pagamento')
  ) INTO _kpis FROM consultas WHERE inicio >= _inicio AND inicio < _fim;

  _intel := jsonb_build_object(
    'pacientes_sem_confirmar_24h', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('consulta_id', c.id, 'paciente_nome', p.nome_completo, 'inicio', c.inicio)), '[]'::jsonb)
      FROM consultas c JOIN pacientes p ON p.id = c.paciente_id
      WHERE c.inicio >= _inicio AND c.inicio < _fim AND c.status = 'agendada' AND c.confirmada_em IS NULL AND c.inicio <= now() + interval '24 hours'
    ),
    'risco_no_show', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('consulta_id', c.id, 'paciente_nome', p.nome_completo, 'no_shows', sub.cnt)), '[]'::jsonb)
      FROM consultas c JOIN pacientes p ON p.id = c.paciente_id
      JOIN (SELECT paciente_id, COUNT(*) as cnt FROM consultas WHERE status = 'no_show' GROUP BY paciente_id HAVING COUNT(*) >= 2) sub ON sub.paciente_id = c.paciente_id
      WHERE c.inicio >= _inicio AND c.inicio < _fim AND c.status IN ('agendada','confirmada')
    ),
    'medicos_sobrecarregados_dia', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('medico_id', c.medico_id, 'nome', m.nome, 'qtd', COUNT(*))), '[]'::jsonb)
      FROM consultas c JOIN medicos m ON m.id = c.medico_id
      WHERE c.inicio >= _inicio AND c.inicio < _fim AND c.status NOT IN ('cancelada','no_show')
      GROUP BY c.medico_id, m.nome HAVING COUNT(*) >= 8
    ),
    'sugerir_abrir_agenda', '[]'::jsonb
  );

  RETURN jsonb_build_object('kpis', _kpis, 'inteligencia', _intel);
END;
$$;

-- 3. admin_consulta_forcar_confirmacao
CREATE FUNCTION public.admin_consulta_forcar_confirmacao(_consulta_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _old consulta_status;
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT status INTO _old FROM consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  UPDATE consultas SET status = 'confirmada', confirmada_em = now(), confirmada_por = _uid, updated_at = now() WHERE id = _consulta_id;
  INSERT INTO consulta_status_log (id, consulta_id, status_anterior, status_novo, actor_id, motivo) VALUES (gen_random_uuid(), _consulta_id, _old, 'confirmada', _uid, _motivo);
  INSERT INTO consultas_auditoria (id, consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo) VALUES (gen_random_uuid(), _consulta_id, _uid, 'forcar_confirmacao', 'status', _old::text, 'confirmada', _motivo);
END;
$$;

-- 4. admin_consulta_cancelar
CREATE FUNCTION public.admin_consulta_cancelar(_consulta_id uuid, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _old consulta_status; _slot uuid;
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT status, slot_id INTO _old, _slot FROM consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF _old = 'cancelada' THEN RAISE EXCEPTION 'Consulta já cancelada'; END IF;
  UPDATE consultas SET status = 'cancelada', updated_at = now() WHERE id = _consulta_id;
  IF _slot IS NOT NULL THEN UPDATE agenda_slots SET status = 'livre' WHERE id = _slot; END IF;
  INSERT INTO consulta_status_log (id, consulta_id, status_anterior, status_novo, actor_id, motivo) VALUES (gen_random_uuid(), _consulta_id, _old, 'cancelada', _uid, _motivo);
  INSERT INTO consultas_auditoria (id, consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo) VALUES (gen_random_uuid(), _consulta_id, _uid, 'cancelar', 'status', _old::text, 'cancelada', _motivo);
END;
$$;

-- 5. admin_consulta_marcar_realizada
CREATE FUNCTION public.admin_consulta_marcar_realizada(_consulta_id uuid, _observacao text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _old consulta_status;
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT status INTO _old FROM consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  UPDATE consultas SET status = 'concluida', updated_at = now() WHERE id = _consulta_id;
  INSERT INTO consulta_status_log (id, consulta_id, status_anterior, status_novo, actor_id, motivo) VALUES (gen_random_uuid(), _consulta_id, _old, 'concluida', _uid, COALESCE(_observacao, 'Marcada como concluída pelo admin'));
  INSERT INTO consultas_auditoria (id, consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, observacao) VALUES (gen_random_uuid(), _consulta_id, _uid, 'marcar_realizada', 'status', _old::text, 'concluida', _observacao);
END;
$$;

-- 6. forcar_status_consulta
CREATE FUNCTION public.forcar_status_consulta(_consulta_id uuid, _novo_status consulta_status, _motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _old consulta_status;
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT status INTO _old FROM consultas WHERE id = _consulta_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  UPDATE consultas SET status = _novo_status, updated_at = now() WHERE id = _consulta_id;
  INSERT INTO consulta_status_log (id, consulta_id, status_anterior, status_novo, actor_id, motivo) VALUES (gen_random_uuid(), _consulta_id, _old, _novo_status, _uid, _motivo);
  INSERT INTO consultas_auditoria (id, consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo) VALUES (gen_random_uuid(), _consulta_id, _uid, 'forcar_status', 'status', _old::text, _novo_status::text, _motivo);
END;
$$;

-- 7. admin_consulta_reenviar_link
CREATE FUNCTION public.admin_consulta_reenviar_link(_consulta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF NOT has_role(_uid, 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM consultas WHERE id = _consulta_id) THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  UPDATE consultas SET link_enviado_em = now(), link_enviado_por = _uid, updated_at = now() WHERE id = _consulta_id;
  INSERT INTO consultas_auditoria (id, consulta_id, actor_id, acao, observacao) VALUES (gen_random_uuid(), _consulta_id, _uid, 'reenviar_link', 'Link marcado como reenviado pelo admin');
END;
$$;
