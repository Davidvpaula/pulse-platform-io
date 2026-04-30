-- =====================================================
-- 1) Estende enum medico_status
-- =====================================================
DO $$ BEGIN
  ALTER TYPE public.medico_status ADD VALUE IF NOT EXISTS 'suspenso';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.medico_status ADD VALUE IF NOT EXISTS 'bloqueado';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- 2) Novas colunas em medicos
-- =====================================================
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS suspenso_ate timestamptz,
  ADD COLUMN IF NOT EXISTS suspenso_indeterminado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspensao_motivo text,
  ADD COLUMN IF NOT EXISTS suspensao_observacao text,
  ADD COLUMN IF NOT EXISTS suspensao_aplicada_por uuid,
  ADD COLUMN IF NOT EXISTS suspensao_aplicada_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo text,
  ADD COLUMN IF NOT EXISTS bloqueio_observacao text,
  ADD COLUMN IF NOT EXISTS bloqueio_aplicado_por uuid,
  ADD COLUMN IF NOT EXISTS bloqueio_aplicado_em timestamptz,
  ADD COLUMN IF NOT EXISTS analise_observacao text,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid;

-- =====================================================
-- 3) Helper: estende auditoria com observacao genérica
-- =====================================================
ALTER TABLE public.medicos_auditoria
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- =====================================================
-- 4) RPCs de transição de status
-- =====================================================
CREATE OR REPLACE FUNCTION public.medico_colocar_em_analise(
  _id uuid, _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE public.medicos SET status='em_analise',
         analise_observacao=_observacao, updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,observacao)
  VALUES(_id,v_uid,'em_analise',v_old::medico_status,'em_analise',_observacao);
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.medico_aprovar(
  _id uuid, _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE public.medicos SET status='aprovado',
         aprovado_em=now(), aprovado_por=v_uid,
         motivo_reprovacao=NULL,
         suspenso_ate=NULL, suspenso_indeterminado=false,
         suspensao_motivo=NULL, suspensao_observacao=NULL,
         suspensao_aplicada_por=NULL, suspensao_aplicada_em=NULL,
         bloqueio_motivo=NULL, bloqueio_observacao=NULL,
         bloqueio_aplicado_por=NULL, bloqueio_aplicado_em=NULL,
         updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,observacao)
  VALUES(_id,v_uid,'aprovado',v_old::medico_status,'aprovado',_observacao);
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.medico_reprovar(
  _id uuid, _motivo text, _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo de reprovação é obrigatório'; END IF;
  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE public.medicos SET status='reprovado',
         motivo_reprovacao=_motivo, updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,motivo,observacao)
  VALUES(_id,v_uid,'reprovado',v_old::medico_status,'reprovado',_motivo,_observacao);
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.medico_suspender(
  _id uuid, _motivo text, _observacao text DEFAULT NULL,
  _ate timestamptz DEFAULT NULL, _indeterminado boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo da suspensão é obrigatório'; END IF;
  IF NOT _indeterminado AND (_ate IS NULL OR _ate <= now()) THEN
    RAISE EXCEPTION 'Data de término deve ser futura, ou marque como indeterminada'; END IF;

  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;
  IF v_old = 'bloqueado' THEN
    RAISE EXCEPTION 'Médico já está bloqueado — desbloqueie antes de suspender'; END IF;

  UPDATE public.medicos SET status='suspenso',
         suspenso_ate = CASE WHEN _indeterminado THEN NULL ELSE _ate END,
         suspenso_indeterminado = _indeterminado,
         suspensao_motivo=_motivo,
         suspensao_observacao=_observacao,
         suspensao_aplicada_por=v_uid,
         suspensao_aplicada_em=now(),
         updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,motivo,observacao,payload)
  VALUES(_id,v_uid,'suspenso',v_old::medico_status,'suspenso',_motivo,_observacao,
         jsonb_build_object('ate',_ate,'indeterminado',_indeterminado));
  RETURN jsonb_build_object('ok',true,'ate',_ate,'indeterminado',_indeterminado);
END $$;

CREATE OR REPLACE FUNCTION public.medico_bloquear(
  _id uuid, _motivo text, _observacao text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo do bloqueio é obrigatório'; END IF;
  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;

  UPDATE public.medicos SET status='bloqueado',
         bloqueio_motivo=_motivo,
         bloqueio_observacao=_observacao,
         bloqueio_aplicado_por=v_uid,
         bloqueio_aplicado_em=now(),
         updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,motivo,observacao)
  VALUES(_id,v_uid,'bloqueado',v_old::medico_status,'bloqueado',_motivo,_observacao);
  RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.medico_reativar(
  _id uuid, _justificativa text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old text;
BEGIN
  IF NOT public.has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  IF _justificativa IS NULL OR length(trim(_justificativa)) < 3 THEN
    RAISE EXCEPTION 'Justificativa de reativação é obrigatória'; END IF;
  SELECT status::text INTO v_old FROM public.medicos WHERE id=_id FOR UPDATE;
  IF v_old IS NULL THEN RAISE EXCEPTION 'Médico não encontrado'; END IF;
  IF v_old NOT IN ('suspenso','bloqueado') THEN
    RAISE EXCEPTION 'Médico não está suspenso nem bloqueado'; END IF;

  UPDATE public.medicos SET status='aprovado',
         suspenso_ate=NULL, suspenso_indeterminado=false,
         suspensao_motivo=NULL, suspensao_observacao=NULL,
         suspensao_aplicada_por=NULL, suspensao_aplicada_em=NULL,
         bloqueio_motivo=NULL, bloqueio_observacao=NULL,
         bloqueio_aplicado_por=NULL, bloqueio_aplicado_em=NULL,
         updated_at=now()
   WHERE id=_id;

  INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,motivo,observacao)
  VALUES(_id,v_uid,'reativado',v_old::medico_status,'aprovado',_justificativa,NULL);
  RETURN jsonb_build_object('ok',true);
END $$;

-- =====================================================
-- 5) Helper de acesso efetivo + lazy auto-reativação
-- =====================================================
CREATE OR REPLACE FUNCTION public.medico_acesso_efetivo(_medico_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  SELECT status, suspenso_ate, suspenso_indeterminado
    INTO v FROM public.medicos WHERE id=_medico_id FOR UPDATE;
  IF v IS NULL THEN RETURN 'desconhecido'; END IF;

  -- Lazy: se suspensão expirou, reativa automaticamente
  IF v.status='suspenso' AND v.suspenso_indeterminado=false
     AND v.suspenso_ate IS NOT NULL AND v.suspenso_ate <= now() THEN
    UPDATE public.medicos SET status='aprovado',
           suspenso_ate=NULL, suspenso_indeterminado=false,
           suspensao_motivo=NULL, suspensao_observacao=NULL,
           suspensao_aplicada_por=NULL, suspensao_aplicada_em=NULL,
           updated_at=now()
     WHERE id=_medico_id;
    INSERT INTO public.medicos_auditoria(medico_id,actor_id,acao,status_anterior,status_novo,motivo)
    VALUES(_medico_id,NULL,'reativado_auto','suspenso','aprovado','Suspensão expirada automaticamente');
    RETURN 'aprovado';
  END IF;
  RETURN v.status::text;
END $$;

-- =====================================================
-- 6) Trigger lazy em agenda_slots
-- =====================================================
CREATE OR REPLACE FUNCTION public.agenda_slot_bloqueia_medico_inativo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  v_status := public.medico_acesso_efetivo(NEW.medico_id);
  IF v_status = 'bloqueado' THEN
    RAISE EXCEPTION 'Médico bloqueado não pode oferecer novos horários' USING ERRCODE='check_violation';
  ELSIF v_status = 'suspenso' THEN
    RAISE EXCEPTION 'Médico suspenso não pode oferecer novos horários' USING ERRCODE='check_violation';
  ELSIF v_status NOT IN ('aprovado') THEN
    RAISE EXCEPTION 'Médico não está aprovado (status: %)', v_status USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_agenda_slot_bloqueia_medico_inativo ON public.agenda_slots;
CREATE TRIGGER trg_agenda_slot_bloqueia_medico_inativo
  BEFORE INSERT ON public.agenda_slots
  FOR EACH ROW EXECUTE FUNCTION public.agenda_slot_bloqueia_medico_inativo();

-- =====================================================
-- 7) Índices
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_medicos_status ON public.medicos(status);
CREATE INDEX IF NOT EXISTS idx_medicos_suspenso_ate ON public.medicos(suspenso_ate)
  WHERE suspenso_ate IS NOT NULL;