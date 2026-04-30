
-- Estender pagamentos existente
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS paciente_id uuid,
  ADD COLUMN IF NOT EXISTS medico_id uuid,
  ADD COLUMN IF NOT EXISTS empresa_id uuid,
  ADD COLUMN IF NOT EXISTS servico_id uuid,
  ADD COLUMN IF NOT EXISTS gateway text,
  ADD COLUMN IF NOT EXISTS gateway_ref text,
  ADD COLUMN IF NOT EXISTS valor_bruto_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_gateway_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_imposto_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_reembolsado_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_vencimento date,
  ADD COLUMN IF NOT EXISTS data_pagamento timestamptz,
  ADD COLUMN IF NOT EXISTS responsavel_cobranca uuid,
  ADD COLUMN IF NOT EXISTS observacoes_internas text,
  ADD COLUMN IF NOT EXISTS comprovante_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_pagamentos_paciente ON public.pagamentos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_medico ON public.pagamentos(medico_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON public.pagamentos(empresa_id);

-- Policies adicionais (admin já tem via tabela existente)
DROP POLICY IF EXISTS "Staff ve pagamentos com permissao" ON public.pagamentos;
CREATE POLICY "Staff ve pagamentos com permissao" ON public.pagamentos FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'financeiro.ver'));
DROP POLICY IF EXISTS "Staff cobra com permissao" ON public.pagamentos;
CREATE POLICY "Staff cobra com permissao" ON public.pagamentos FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(),'financeiro.cobrar'));
DROP POLICY IF EXISTS "Medico ve proprios pagamentos" ON public.pagamentos;
CREATE POLICY "Medico ve proprios pagamentos" ON public.pagamentos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = pagamentos.medico_id AND m.user_id = auth.uid()));
DROP POLICY IF EXISTS "Empresa ve pagamentos da empresa" ON public.pagamentos;
CREATE POLICY "Empresa ve pagamentos da empresa" ON public.pagamentos FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa'::app_role) AND empresa_id IS NOT NULL AND is_empresa_owner(empresa_id));

-- cobrancas_links
CREATE TABLE IF NOT EXISTS public.cobrancas_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid, consulta_id uuid, servico_id uuid,
  pagamento_id uuid REFERENCES public.pagamentos(id) ON DELETE SET NULL,
  descricao text NOT NULL, valor_centavos integer NOT NULL DEFAULT 0,
  vencimento date, url text,
  status public.cobranca_link_status NOT NULL DEFAULT 'ativo',
  enviado_canal text, enviado_em timestamptz, observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.cobrancas_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia links" ON public.cobrancas_links FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve links com permissao" ON public.cobrancas_links FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'financeiro.ver'));
CREATE POLICY "Staff cria links com permissao" ON public.cobrancas_links FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(),'financeiro.cobrar'));
CREATE TRIGGER trg_cob_links_upd BEFORE UPDATE ON public.cobrancas_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- gateways_config
CREATE TABLE IF NOT EXISTS public.gateways_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.gateway_tipo NOT NULL, nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  ambiente text NOT NULL DEFAULT 'sandbox',
  configuracao jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gateways_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia gateways" ON public.gateways_config FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_gateways_upd BEFORE UPDATE ON public.gateways_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- financeiro_auditoria
CREATE TABLE IF NOT EXISTS public.financeiro_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL, entidade_id uuid, acao text NOT NULL,
  actor_id uuid, valor_anterior text, valor_novo text,
  motivo text, observacao text, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_aud_entidade ON public.financeiro_auditoria(entidade, entidade_id);
ALTER TABLE public.financeiro_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin ve auditoria fin" ON public.financeiro_auditoria FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Staff ve auditoria fin com permissao" ON public.financeiro_auditoria FOR SELECT TO authenticated
  USING (has_permission(auth.uid(),'financeiro.ver'));

-- Estender reembolsos
ALTER TABLE public.reembolsos
  ADD COLUMN IF NOT EXISTS status public.reembolso_status NOT NULL DEFAULT 'solicitado',
  ADD COLUMN IF NOT EXISTS tipo public.reembolso_tipo NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS pagamento_id uuid,
  ADD COLUMN IF NOT EXISTS analisado_por uuid,
  ADD COLUMN IF NOT EXISTS decidido_em timestamptz,
  ADD COLUMN IF NOT EXISTS snapshot_estornado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_reembolsos_upd BEFORE UPDATE ON public.reembolsos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Staff cria reembolsos" ON public.reembolsos FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(),'financeiro.reembolsar'));
CREATE POLICY "Staff atualiza reembolsos com permissao" ON public.reembolsos FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(),'financeiro.aprovar_reembolso'))
  WITH CHECK (has_permission(auth.uid(),'financeiro.aprovar_reembolso'));

ALTER TABLE public.fechamentos_mensais
  ADD COLUMN IF NOT EXISTS bloqueado_por uuid,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueio_motivo text;

-- Helper de log
CREATE OR REPLACE FUNCTION public._log_financeiro(
  _entidade text, _entidade_id uuid, _acao text,
  _valor_ant text DEFAULT NULL, _valor_novo text DEFAULT NULL,
  _motivo text DEFAULT NULL, _observacao text DEFAULT NULL, _payload jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  INSERT INTO public.financeiro_auditoria(entidade,entidade_id,acao,actor_id,valor_anterior,valor_novo,motivo,observacao,payload)
  VALUES (_entidade,_entidade_id,_acao,auth.uid(),_valor_ant,_valor_novo,_motivo,_observacao,_payload);
END $fn$;

-- Trigger estorno
CREATE OR REPLACE FUNCTION public._trg_reembolso_aplica_estorno()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_snap RECORD; v_ano int; v_mes int;
BEGIN
  IF NEW.status IN ('aprovado','concluido') AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.tipo = 'total' AND COALESCE(NEW.snapshot_estornado,false)=false THEN
    SELECT * INTO v_snap FROM public.consultas_financeiro
      WHERE consulta_id = NEW.consulta_id AND status = 'valido' LIMIT 1;
    IF FOUND THEN
      UPDATE public.consultas_financeiro
        SET status='estornado'::consulta_financeiro_status,
            valor_medico_centavos=0, valor_plataforma_centavos=0, updated_at=now()
        WHERE id = v_snap.id;
      v_ano := EXTRACT(YEAR FROM v_snap.data_consulta)::int;
      v_mes := EXTRACT(MONTH FROM v_snap.data_consulta)::int;
      UPDATE public.fechamentos_mensais f
        SET qtd_consultas = GREATEST(0, f.qtd_consultas - 1),
            valor_bruto_centavos = GREATEST(0, f.valor_bruto_centavos - v_snap.valor_bruto_centavos),
            valor_plataforma_centavos = GREATEST(0, f.valor_plataforma_centavos - v_snap.valor_plataforma_centavos),
            valor_medico_centavos = GREATEST(0, f.valor_medico_centavos - v_snap.valor_medico_centavos),
            updated_at=now()
        WHERE f.medico_id=v_snap.medico_id AND f.competencia_ano=v_ano
          AND f.competencia_mes=v_mes AND f.status='em_aberto';
      NEW.snapshot_estornado := true;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_reembolso_estorno BEFORE UPDATE ON public.reembolsos
  FOR EACH ROW EXECUTE FUNCTION public._trg_reembolso_aplica_estorno();

-- Dashboard
CREATE OR REPLACE FUNCTION public.financeiro_central_dashboard(_inicio date, _fim date, _empresa_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.ver')) THEN
    RAISE EXCEPTION 'Sem permissão financeira'; END IF;
  WITH base AS (
    SELECT * FROM public.pagamentos p
    WHERE (COALESCE(p.data_pagamento, p.paid_at, p.created_at)::date BETWEEN _inicio AND _fim)
      AND (_empresa_id IS NULL OR p.empresa_id = _empresa_id)
  ),
  reemb AS (SELECT r.* FROM public.reembolsos r WHERE r.created_at::date BETWEEN _inicio AND _fim),
  repasses AS (SELECT cf.* FROM public.consultas_financeiro cf
               WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status='valido')
  SELECT jsonb_build_object(
    'faturamento_total', COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status IN ('aprovado','pago')),0),
    'aprovados',         COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status IN ('aprovado','pago')),0),
    'aprovados_qtd',     COALESCE((SELECT count(*) FROM base WHERE status IN ('aprovado','pago')),0),
    'pendentes',         COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status='pendente'),0),
    'pendentes_qtd',     COALESCE((SELECT count(*) FROM base WHERE status='pendente'),0),
    'recusados',         COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status IN ('recusado','falhou')),0),
    'recusados_qtd',     COALESCE((SELECT count(*) FROM base WHERE status IN ('recusado','falhou')),0),
    'reembolsos_solicitados', COALESCE((SELECT count(*) FROM reemb WHERE status IN ('solicitado','em_analise')),0),
    'reembolsos_concluidos',  COALESCE((SELECT count(*) FROM reemb WHERE status IN ('aprovado','concluido')),0),
    'reembolsos_valor',  COALESCE((SELECT SUM(valor_centavos) FROM reemb WHERE status IN ('aprovado','concluido')),0),
    'valor_em_aberto',   COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status='pendente'),0),
    'valor_repassar',    COALESCE((SELECT SUM(valor_medico_centavos) FROM repasses),0),
    'receita_empresas',  COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status IN ('aprovado','pago') AND empresa_id IS NOT NULL),0),
    'receita_particular',COALESCE((SELECT SUM(COALESCE(valor_bruto_centavos,valor_centavos,0)) FROM base WHERE status IN ('aprovado','pago') AND empresa_id IS NULL),0)
  ) INTO v;
  RETURN v;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_pagamento_confirmar(_pagamento_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_old text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.cobrar')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT status::text INTO v_old FROM public.pagamentos WHERE id=_pagamento_id;
  UPDATE public.pagamentos SET status='aprovado'::pagamento_status,
    data_pagamento=COALESCE(data_pagamento,now()), paid_at=COALESCE(paid_at,now()),
    observacoes_internas=COALESCE(_observacao,observacoes_internas), updated_at=now()
    WHERE id=_pagamento_id;
  PERFORM public._log_financeiro('pagamento',_pagamento_id,'confirmar_manual',v_old,'aprovado',NULL,_observacao,NULL);
  RETURN _pagamento_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_pagamento_cancelar(_pagamento_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_old text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.cancelar_cobranca')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo))=0 THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  SELECT status::text INTO v_old FROM public.pagamentos WHERE id=_pagamento_id;
  UPDATE public.pagamentos SET status='cancelado'::pagamento_status, cancelled_at=now(), updated_at=now() WHERE id=_pagamento_id;
  PERFORM public._log_financeiro('pagamento',_pagamento_id,'cancelar',v_old,'cancelado',_motivo,NULL,NULL);
  RETURN _pagamento_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_reembolso_solicitar(
  _consulta_id uuid, _pagamento_id uuid, _tipo public.reembolso_tipo,
  _valor_centavos integer, _motivo text, _observacao text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.reembolsar')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.reembolsos(consulta_id,pagamento_id,tipo,valor_centavos,motivo,observacao,actor_id,status)
  VALUES (_consulta_id,_pagamento_id,_tipo,_valor_centavos,_motivo,_observacao,auth.uid(),'solicitado')
  RETURNING id INTO v_id;
  PERFORM public._log_financeiro('reembolso',v_id,'solicitar',NULL,'solicitado',_motivo,_observacao,
    jsonb_build_object('valor',_valor_centavos,'tipo',_tipo));
  RETURN v_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_reembolso_aprovar(_reembolso_id uuid, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_old text; v_pag uuid; v_val int; v_tipo public.reembolso_tipo;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.aprovar_reembolso')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT status::text, pagamento_id, valor_centavos, tipo INTO v_old, v_pag, v_val, v_tipo
    FROM public.reembolsos WHERE id=_reembolso_id;
  UPDATE public.reembolsos SET status='aprovado', analisado_por=auth.uid(), decidido_em=now(),
    observacao=COALESCE(_observacao,observacao) WHERE id=_reembolso_id;
  IF v_pag IS NOT NULL THEN
    UPDATE public.pagamentos
      SET status = CASE WHEN v_tipo='total' THEN 'reembolsado'::pagamento_status
                        ELSE 'reembolsado_parcial'::pagamento_status END,
          valor_reembolsado_centavos = COALESCE(valor_reembolsado_centavos,0) + v_val, updated_at=now()
      WHERE id=v_pag;
  END IF;
  PERFORM public._log_financeiro('reembolso',_reembolso_id,'aprovar',v_old,'aprovado',NULL,_observacao,NULL);
  RETURN _reembolso_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_reembolso_recusar(_reembolso_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_old text;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.aprovar_reembolso')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo))=0 THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  SELECT status::text INTO v_old FROM public.reembolsos WHERE id=_reembolso_id;
  UPDATE public.reembolsos SET status='recusado', analisado_por=auth.uid(), decidido_em=now(), observacao=_motivo
    WHERE id=_reembolso_id;
  PERFORM public._log_financeiro('reembolso',_reembolso_id,'recusar',v_old,'recusado',_motivo,NULL,NULL);
  RETURN _reembolso_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_link_criar(
  _paciente_id uuid, _descricao text, _valor_centavos integer,
  _vencimento date DEFAULT NULL, _servico_id uuid DEFAULT NULL,
  _consulta_id uuid DEFAULT NULL, _observacao text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.cobrar')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO public.cobrancas_links(paciente_id,descricao,valor_centavos,vencimento,servico_id,consulta_id,observacao,created_by)
  VALUES (_paciente_id,_descricao,_valor_centavos,_vencimento,_servico_id,_consulta_id,_observacao,auth.uid())
  RETURNING id INTO v_id;
  PERFORM public._log_financeiro('cobranca_link',v_id,'criar',NULL,'ativo',NULL,_observacao,jsonb_build_object('valor',_valor_centavos));
  RETURN v_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_link_cancelar(_link_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.cancelar_cobranca')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.cobrancas_links SET status='cancelado', observacao=_motivo, updated_at=now() WHERE id=_link_id;
  PERFORM public._log_financeiro('cobranca_link',_link_id,'cancelar',NULL,'cancelado',_motivo,NULL,NULL);
  RETURN _link_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_repasse_marcar_pago(_fechamento_id uuid, _comprovante_url text DEFAULT NULL, _observacao text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.repasse_gerenciar')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.fechamentos_mensais SET status='pago', pago_em=now(), pago_por=auth.uid(),
    comprovante_url=COALESCE(_comprovante_url,comprovante_url),
    observacao=COALESCE(_observacao,observacao) WHERE id=_fechamento_id;
  PERFORM public._log_financeiro('fechamento',_fechamento_id,'marcar_pago',NULL,'pago',NULL,_observacao,NULL);
  RETURN _fechamento_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_repasse_bloquear(_fechamento_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.repasse_gerenciar')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _motivo IS NULL OR length(trim(_motivo))=0 THEN RAISE EXCEPTION 'Motivo obrigatório'; END IF;
  UPDATE public.fechamentos_mensais SET status='bloqueado', bloqueado_em=now(),
    bloqueado_por=auth.uid(), bloqueio_motivo=_motivo WHERE id=_fechamento_id;
  PERFORM public._log_financeiro('fechamento',_fechamento_id,'bloquear',NULL,'bloqueado',_motivo,NULL,NULL);
  RETURN _fechamento_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_repasse_contestar(_fechamento_id uuid, _motivo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.repasse_gerenciar')
          OR EXISTS (SELECT 1 FROM public.medicos m JOIN public.fechamentos_mensais f ON f.medico_id=m.id
                     WHERE f.id=_fechamento_id AND m.user_id=auth.uid())) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.fechamentos_mensais SET status='contestado', observacao=_motivo WHERE id=_fechamento_id;
  PERFORM public._log_financeiro('fechamento',_fechamento_id,'contestar',NULL,'contestado',_motivo,NULL,NULL);
  RETURN _fechamento_id;
END $fn$;

CREATE OR REPLACE FUNCTION public.financeiro_relatorio_periodo(_inicio date, _fim date, _agrupar text DEFAULT 'medico')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_permission(auth.uid(),'financeiro.ver')) THEN
    RAISE EXCEPTION 'Sem permissão'; END IF;
  IF _agrupar = 'medico' THEN
    SELECT jsonb_agg(jsonb_build_object('id',medico_id,'nome',nome,'qtd',qtd,'bruto',bruto,'medico',medico,'plataforma',plataforma) ORDER BY bruto DESC)
    INTO v FROM (
      SELECT cf.medico_id, m.nome, count(*) qtd,
             SUM(cf.valor_bruto_centavos) bruto, SUM(cf.valor_medico_centavos) medico,
             SUM(cf.valor_plataforma_centavos) plataforma
      FROM public.consultas_financeiro cf JOIN public.medicos m ON m.id=cf.medico_id
      WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status='valido'
      GROUP BY cf.medico_id, m.nome
    ) t;
  ELSIF _agrupar = 'empresa' THEN
    SELECT jsonb_agg(jsonb_build_object('id',empresa_id,'nome',nome,'qtd',qtd,'bruto',bruto) ORDER BY bruto DESC)
    INTO v FROM (
      SELECT cf.empresa_id, COALESCE(e.razao_social,'Particular') nome, count(*) qtd,
             SUM(cf.valor_bruto_centavos) bruto
      FROM public.consultas_financeiro cf LEFT JOIN public.empresas e ON e.id=cf.empresa_id
      WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status='valido'
      GROUP BY cf.empresa_id, e.razao_social
    ) t;
  ELSE
    SELECT jsonb_agg(jsonb_build_object('id',especialidade_id,'nome',nome,'qtd',qtd,'bruto',bruto) ORDER BY bruto DESC)
    INTO v FROM (
      SELECT c.especialidade_id, esp.nome, count(*) qtd, SUM(cf.valor_bruto_centavos) bruto
      FROM public.consultas_financeiro cf
      JOIN public.consultas c ON c.id=cf.consulta_id
      LEFT JOIN public.especialidades esp ON esp.id=c.especialidade_id
      WHERE cf.data_consulta::date BETWEEN _inicio AND _fim AND cf.status='valido'
      GROUP BY c.especialidade_id, esp.nome
    ) t;
  END IF;
  RETURN COALESCE(v,'[]'::jsonb);
END $fn$;
