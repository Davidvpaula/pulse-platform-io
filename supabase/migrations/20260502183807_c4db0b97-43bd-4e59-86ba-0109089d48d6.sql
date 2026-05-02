
-- 1. Adicionar novos valores ao enum status_conta_paciente
ALTER TYPE public.status_conta_paciente ADD VALUE IF NOT EXISTS 'banido';
ALTER TYPE public.status_conta_paciente ADD VALUE IF NOT EXISTS 'pendente';

-- 2. Adicionar coluna bloqueado_ate
ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS bloqueado_ate timestamptz NULL;

-- 3. Recriar RPC alterar_status_conta_paciente com suporte a banido/pendente/bloqueio temporário
CREATE OR REPLACE FUNCTION public.alterar_status_conta_paciente(
  _paciente_id uuid,
  _novo_status status_conta_paciente,
  _motivo text,
  _observacao text DEFAULT NULL,
  _bloqueado_ate timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_pac record;
  v_perm_key text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mín. 3 caracteres)';
  END IF;

  v_perm_key := CASE _novo_status
    WHEN 'suspenso'  THEN 'pacientes.suspender'
    WHEN 'bloqueado' THEN 'pacientes.bloquear'
    WHEN 'banido'    THEN 'pacientes.banir'
    WHEN 'ativo'     THEN 'pacientes.reativar'
    WHEN 'pendente'  THEN 'pacientes.suspender'
  END;

  IF NOT public.has_permission(v_uid, v_perm_key) THEN
    RAISE EXCEPTION 'Sem permissão para % conta de paciente', _novo_status
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pac FROM public.pacientes WHERE id = _paciente_id FOR UPDATE;
  IF v_pac IS NULL THEN
    RAISE EXCEPTION 'Paciente não encontrado';
  END IF;
  IF v_pac.status_conta = _novo_status THEN
    RAISE EXCEPTION 'Paciente já está com status %', _novo_status;
  END IF;

  UPDATE public.pacientes
     SET status_conta = _novo_status,
         status_motivo = _motivo,
         status_observacao = _observacao,
         status_alterado_por = v_uid,
         status_alterado_em = now(),
         bloqueado_ate = CASE
           WHEN _novo_status = 'bloqueado' THEN _bloqueado_ate
           ELSE NULL
         END,
         updated_at = now()
   WHERE id = _paciente_id;

  INSERT INTO public.pacientes_auditoria
    (paciente_id, actor_id, acao, status_anterior, status_novo, motivo, observacao, payload)
  VALUES
    (_paciente_id, v_uid,
     'status:' || _novo_status::text,
     v_pac.status_conta, _novo_status, _motivo, _observacao,
     CASE WHEN _bloqueado_ate IS NOT NULL
       THEN jsonb_build_object('bloqueado_ate', _bloqueado_ate)
       ELSE NULL
     END);

  RETURN jsonb_build_object('ok', true, 'paciente_id', _paciente_id, 'status', _novo_status);
END;
$$;
