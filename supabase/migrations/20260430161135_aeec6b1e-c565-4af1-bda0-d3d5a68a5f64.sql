-- =====================================================
-- 1) Novos campos em consultas
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.consulta_canal AS ENUM ('app','empresa','manual_admin','manual_secretaria','retorno','api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS canal_origem public.consulta_canal NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS responsavel_agendamento_id uuid,
  ADD COLUMN IF NOT EXISTS confirmada_em timestamptz,
  ADD COLUMN IF NOT EXISTS confirmada_por uuid,
  ADD COLUMN IF NOT EXISTS link_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS link_enviado_por uuid;

-- =====================================================
-- 2) Tabela de auditoria genérica de consultas
-- =====================================================
CREATE TABLE IF NOT EXISTS public.consultas_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL,
  actor_id uuid,
  acao text NOT NULL,
  campo text,
  valor_anterior text,
  valor_novo text,
  motivo text,
  observacao text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consultas_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve auditoria consultas"
  ON public.consultas_auditoria FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Staff ve auditoria com permissao"
  ON public.consultas_auditoria FOR SELECT TO authenticated
  USING (
    (public.has_role(auth.uid(),'secretaria') OR public.has_role(auth.uid(),'supervisor'))
    AND public.has_permission(auth.uid(),'consultas.ver_tudo')
  );

CREATE POLICY "Medico ve auditoria proprias consultas"
  ON public.consultas_auditoria FOR SELECT TO authenticated
  USING (public.is_medico_da_consulta(consulta_id));

CREATE POLICY "Paciente ve auditoria proprias consultas"
  ON public.consultas_auditoria FOR SELECT TO authenticated
  USING (public.is_paciente_da_consulta(consulta_id));

-- =====================================================
-- 3) Helper de auditoria
-- =====================================================
CREATE OR REPLACE FUNCTION public.registrar_auditoria_consulta(
  _consulta_id uuid,
  _acao text,
  _campo text DEFAULT NULL,
  _valor_anterior text DEFAULT NULL,
  _valor_novo text DEFAULT NULL,
  _motivo text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _payload jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.consultas_auditoria
    (consulta_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo, observacao, payload)
  VALUES
    (_consulta_id, auth.uid(), _acao, _campo, _valor_anterior, _valor_novo, _motivo, _observacao, _payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- =====================================================
-- 4) RPC: forçar status (admin/secretaria/supervisor)
-- =====================================================
CREATE OR REPLACE FUNCTION public.forcar_status_consulta(
  _consulta_id uuid,
  _novo_status public.consulta_status,
  _motivo text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_consulta record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo)) < 3 THEN
    RAISE EXCEPTION 'Motivo é obrigatório para alterar status manualmente';
  END IF;
  IF NOT public.has_permission(v_uid,'consultas.forcar_status') THEN
    RAISE EXCEPTION 'Sem permissão para alterar status manualmente' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_consulta FROM public.consultas WHERE id = _consulta_id FOR UPDATE;
  IF v_consulta IS NULL THEN RAISE EXCEPTION 'Consulta não encontrada'; END IF;
  IF v_consulta.status = _novo_status THEN
    RAISE EXCEPTION 'Consulta já está com status %', _novo_status;
  END IF;

  UPDATE public.consultas
     SET status = _novo_status,
         confirmada_em  = CASE WHEN _novo_status = 'confirmada' THEN now() ELSE confirmada_em END,
         confirmada_por = CASE WHEN _novo_status = 'confirmada' THEN v_uid ELSE confirmada_por END,
         updated_at = now()
   WHERE id = _consulta_id;

  PERFORM public.registrar_auditoria_consulta(
    _consulta_id, 'status:forcar', 'status',
    v_consulta.status::text, _novo_status::text,
    _motivo, NULL, NULL
  );

  RETURN jsonb_build_object('ok', true, 'consulta_id', _consulta_id, 'status', _novo_status);
END $$;

-- =====================================================
-- 5) RPC: marcar reenvio de link
-- =====================================================
CREATE OR REPLACE FUNCTION public.marcar_reenvio_link_consulta(
  _consulta_id uuid,
  _canal text DEFAULT 'whatsapp'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
  IF NOT public.has_permission(v_uid,'consultas.reenviar_link') THEN
    RAISE EXCEPTION 'Sem permissão para reenviar link' USING ERRCODE = '42501';
  END IF;

  UPDATE public.consultas
     SET link_enviado_em = now(),
         link_enviado_por = v_uid,
         updated_at = now()
   WHERE id = _consulta_id;

  PERFORM public.registrar_auditoria_consulta(
    _consulta_id, 'link:reenviado', 'link_sala', NULL, NULL,
    'Reenvio manual', NULL, jsonb_build_object('canal', _canal)
  );

  RETURN jsonb_build_object('ok', true);
END $$;

-- =====================================================
-- 6) Permission keys padrão
-- =====================================================
INSERT INTO public.permissoes_perfil (role, permission_key, ativo) VALUES
  ('secretaria','consultas.ver_tudo',true),
  ('secretaria','consultas.reagendar',true),
  ('secretaria','consultas.cancelar',true),
  ('secretaria','consultas.trocar_medico',true),
  ('secretaria','consultas.forcar_status',true),
  ('secretaria','consultas.reenviar_link',true),
  ('supervisor','consultas.ver_tudo',true),
  ('supervisor','consultas.reagendar',true),
  ('supervisor','consultas.cancelar',true),
  ('supervisor','consultas.trocar_medico',true),
  ('supervisor','consultas.forcar_status',true),
  ('supervisor','consultas.reenviar_link',true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7) Índices para o dashboard
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_consultas_inicio_status ON public.consultas(inicio, status);
CREATE INDEX IF NOT EXISTS idx_consultas_medico_inicio ON public.consultas(medico_id, inicio);
CREATE INDEX IF NOT EXISTS idx_consultas_empresa_inicio ON public.consultas(empresa_id, inicio) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamentos_status_paid ON public.pagamentos(status, paid_at);
CREATE INDEX IF NOT EXISTS idx_consultas_auditoria_consulta ON public.consultas_auditoria(consulta_id, created_at DESC);

-- =====================================================
-- 8) Política UPDATE para staff com permissão (consultas)
-- =====================================================
DO $$ BEGIN
  CREATE POLICY "Supervisor atualiza consultas com permissao"
    ON public.consultas FOR UPDATE TO authenticated
    USING (public.has_role(auth.uid(),'supervisor') AND public.has_permission(auth.uid(),'consultas.reagendar'))
    WITH CHECK (public.has_role(auth.uid(),'supervisor') AND public.has_permission(auth.uid(),'consultas.reagendar'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Supervisor ve consultas"
    ON public.consultas FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(),'supervisor') AND public.has_permission(auth.uid(),'consultas.ver_tudo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;