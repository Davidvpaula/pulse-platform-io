
-- Drop existing functions with old return type
DROP FUNCTION IF EXISTS public.medico_colocar_em_analise(uuid, text);
DROP FUNCTION IF EXISTS public.medico_aprovar(uuid, text);
DROP FUNCTION IF EXISTS public.medico_reprovar(uuid, text, text);
DROP FUNCTION IF EXISTS public.medico_suspender(uuid, text, text, timestamptz, boolean);
DROP FUNCTION IF EXISTS public.medico_bloquear(uuid, text, text);
DROP FUNCTION IF EXISTS public.medico_reativar(uuid, text);

-- ============================================================
-- RPC: medico_colocar_em_analise
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_colocar_em_analise(
  _id uuid,
  _observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'em_analise',
        analise_observacao = COALESCE(_observacao, analise_observacao),
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, observacao)
  VALUES (_id, auth.uid(), 'em_analise', _old, 'em_analise', _observacao);
END;
$$;

-- ============================================================
-- RPC: medico_aprovar
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_aprovar(
  _id uuid,
  _observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'aprovado',
        motivo_reprovacao = NULL,
        aprovado_em = now(),
        aprovado_por = auth.uid(),
        suspenso_ate = NULL,
        suspenso_indeterminado = false,
        suspensao_motivo = NULL,
        suspensao_observacao = NULL,
        suspensao_aplicada_por = NULL,
        suspensao_aplicada_em = NULL,
        bloqueio_motivo = NULL,
        bloqueio_observacao = NULL,
        bloqueio_aplicado_por = NULL,
        bloqueio_aplicado_em = NULL,
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, observacao)
  VALUES (_id, auth.uid(), 'aprovar', _old, 'aprovado', _observacao);
END;
$$;

-- ============================================================
-- RPC: medico_reprovar
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_reprovar(
  _id uuid,
  _motivo text,
  _observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'reprovado',
        motivo_reprovacao = _motivo,
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, motivo, observacao)
  VALUES (_id, auth.uid(), 'reprovar', _old, 'reprovado', _motivo, _observacao);
END;
$$;

-- ============================================================
-- RPC: medico_suspender
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_suspender(
  _id uuid,
  _motivo text,
  _observacao text DEFAULT NULL,
  _ate timestamptz DEFAULT NULL,
  _indeterminado boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'suspenso',
        suspensao_motivo = _motivo,
        suspensao_observacao = _observacao,
        suspenso_ate = _ate,
        suspenso_indeterminado = _indeterminado,
        suspensao_aplicada_por = auth.uid(),
        suspensao_aplicada_em = now(),
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, motivo, observacao, payload)
  VALUES (_id, auth.uid(), 'suspender', _old, 'suspenso', _motivo, _observacao,
    jsonb_build_object('ate', _ate, 'indeterminado', _indeterminado));
END;
$$;

-- ============================================================
-- RPC: medico_bloquear
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_bloquear(
  _id uuid,
  _motivo text,
  _observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'bloqueado',
        bloqueio_motivo = _motivo,
        bloqueio_observacao = _observacao,
        bloqueio_aplicado_por = auth.uid(),
        bloqueio_aplicado_em = now(),
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, motivo, observacao)
  VALUES (_id, auth.uid(), 'bloquear', _old, 'bloqueado', _motivo, _observacao);
END;
$$;

-- ============================================================
-- RPC: medico_reativar
-- ============================================================
CREATE OR REPLACE FUNCTION public.medico_reativar(
  _id uuid,
  _justificativa text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old medico_status;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  SELECT status INTO _old FROM medicos WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE medicos
    SET status = 'aprovado',
        suspenso_ate = NULL,
        suspenso_indeterminado = false,
        suspensao_motivo = NULL,
        suspensao_observacao = NULL,
        suspensao_aplicada_por = NULL,
        suspensao_aplicada_em = NULL,
        bloqueio_motivo = NULL,
        bloqueio_observacao = NULL,
        bloqueio_aplicado_por = NULL,
        bloqueio_aplicado_em = NULL,
        aprovado_em = now(),
        aprovado_por = auth.uid(),
        updated_at = now()
  WHERE id = _id;

  INSERT INTO medicos_auditoria (medico_id, actor_id, acao, status_anterior, status_novo, motivo, observacao)
  VALUES (_id, auth.uid(), 'reativar', _old, 'aprovado', _justificativa, _justificativa);
END;
$$;
