
-- =========================================================
-- MÓDULO PERMISSÕES — Catálogo + Função interna + Auditoria
-- =========================================================

-- 1. permissions_catalog ----------------------------------
CREATE TABLE IF NOT EXISTS public.permissions_catalog (
  permission_key text PRIMARY KEY,
  modulo text NOT NULL,
  descricao text NOT NULL,
  risco text NOT NULL DEFAULT 'baixo' CHECK (risco IN ('baixo','medio','alto','critico')),
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Catalog leitura autenticados" ON public.permissions_catalog;
CREATE POLICY "Catalog leitura autenticados" ON public.permissions_catalog
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Catalog admin gerencia" ON public.permissions_catalog;
CREATE POLICY "Catalog admin gerencia" ON public.permissions_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2. function_permissions (defaults por função interna) ---
CREATE TABLE IF NOT EXISTS public.function_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcao_interna funcao_interna NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions_catalog(permission_key) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funcao_interna, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_funcperm_funcao ON public.function_permissions(funcao_interna);
ALTER TABLE public.function_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "FuncPerm leitura autenticados" ON public.function_permissions;
CREATE POLICY "FuncPerm leitura autenticados" ON public.function_permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "FuncPerm admin gerencia" ON public.function_permissions;
CREATE POLICY "FuncPerm admin gerencia" ON public.function_permissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
DROP TRIGGER IF EXISTS trg_funcperm_updated ON public.function_permissions;
CREATE TRIGGER trg_funcperm_updated BEFORE UPDATE ON public.function_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. permission_audit_logs --------------------------------
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('perfil','funcao','colaborador')),
  target_role app_role,
  target_funcao funcao_interna,
  target_user_id uuid,
  permission_key text,
  acao text NOT NULL,
  valor_antes jsonb,
  valor_depois jsonb,
  motivo text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_permaudit_target_user ON public.permission_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permaudit_created ON public.permission_audit_logs(created_at DESC);
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PermAudit admin le" ON public.permission_audit_logs;
CREATE POLICY "PermAudit admin le" ON public.permission_audit_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
DROP POLICY IF EXISTS "PermAudit admin insere" ON public.permission_audit_logs;
CREATE POLICY "PermAudit admin insere" ON public.permission_audit_logs
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 4. has_permission v2 (Admin > revoke individual > grant individual > função > role)
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  -- Admin tem tudo
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin')
  OR (
    -- Não pode haver revoke individual
    NOT EXISTS (
      SELECT 1 FROM public.permissoes_colaborador
      WHERE user_id=_user_id AND permission_key=_key AND efeito='revoke'
    )
    AND (
      -- grant individual
      EXISTS (
        SELECT 1 FROM public.permissoes_colaborador
        WHERE user_id=_user_id AND permission_key=_key AND efeito='grant'
      )
      -- OU função interna do colaborador concede
      OR EXISTS (
        SELECT 1
        FROM public.colaboradores c
        JOIN public.function_permissions fp ON fp.funcao_interna = c.funcao_interna
        WHERE c.user_id = _user_id
          AND fp.permission_key = _key
          AND fp.ativo = true
          AND c.status_conta = 'ativo'
      )
      -- OU permissão padrão do perfil/role
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.permissoes_perfil pp ON pp.role = ur.role
        WHERE ur.user_id=_user_id AND pp.permission_key=_key AND pp.ativo=true
      )
    )
  )
$$;

-- 5. Dashboard RPC ----------------------------------------
CREATE OR REPLACE FUNCTION public.permissoes_dashboard()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r jsonb;
BEGIN
  IF NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'colaboradores_ativos', (SELECT count(*) FROM colaboradores WHERE status_conta='ativo'),
    'pendentes_convite',    (SELECT count(*) FROM colaboradores WHERE status_conta='pendente_convite'),
    'suspensos',            (SELECT count(*) FROM colaboradores WHERE status_conta='suspenso'),
    'bloqueados',           (SELECT count(*) FROM colaboradores WHERE status_conta='bloqueado'),
    'com_supervisor',       (SELECT count(DISTINCT c.user_id) FROM colaboradores c
                             WHERE c.status_conta='ativo' AND (
                               c.funcao_interna='supervisor'
                               OR EXISTS (SELECT 1 FROM permissoes_colaborador pc
                                          WHERE pc.user_id=c.user_id AND pc.efeito='grant'
                                            AND pc.permission_key LIKE 'supervisor.%')
                             )),
    'com_financeiro',       (SELECT count(DISTINCT c.user_id) FROM colaboradores c
                             WHERE c.status_conta='ativo' AND (
                               c.funcao_interna='financeiro'
                               OR EXISTS (SELECT 1 FROM permissoes_colaborador pc
                                          WHERE pc.user_id=c.user_id AND pc.efeito='grant'
                                            AND pc.permission_key LIKE 'financeiro.%')
                             )),
    'com_whatsapp',         (SELECT count(DISTINCT c.user_id) FROM colaboradores c
                             WHERE c.status_conta='ativo' AND EXISTS (
                               SELECT 1 FROM function_permissions fp
                               WHERE fp.funcao_interna=c.funcao_interna AND fp.ativo=true
                                 AND fp.permission_key LIKE 'comunicacao.%'
                             )),
    'alteracoes_24h',       (SELECT count(*) FROM permission_audit_logs WHERE created_at > now()-interval '24 hours'),
    'total_permissoes',     (SELECT count(*) FROM permissions_catalog)
  ) INTO r;
  RETURN r;
END $$;

-- 6. SEED catálogo ----------------------------------------
INSERT INTO public.permissions_catalog(permission_key,modulo,descricao,risco,ordem) VALUES
-- Agenda
('agenda.ver_propria','Agenda','Ver própria agenda','baixo',10),
('agenda.ver_todas','Agenda','Ver agenda de todos','medio',11),
('agenda.criar','Agenda','Criar agendamentos','medio',12),
('agenda.remarcar','Agenda','Remarcar agendamentos','medio',13),
('agenda.cancelar','Agenda','Cancelar agendamentos','alto',14),
('agenda.trocar_medico','Agenda','Trocar médico de uma consulta','alto',15),
-- Pacientes
('pacientes.ver','Pacientes','Ver pacientes','baixo',20),
('pacientes.criar','Pacientes','Criar paciente','medio',21),
('pacientes.editar','Pacientes','Editar paciente','medio',22),
('pacientes.suspender','Pacientes','Suspender paciente','alto',23),
('pacientes.bloquear','Pacientes','Bloquear paciente','alto',24),
('pacientes.ver_documentos','Pacientes','Ver documentos clínicos','alto',25),
('pacientes.ver_financeiro','Pacientes','Ver financeiro do paciente','medio',26),
-- Médicos
('medicos.ver','Médicos','Ver lista de médicos','baixo',30),
('medicos.aprovar','Médicos','Aprovar cadastro de médico','critico',31),
('medicos.suspender','Médicos','Suspender médico','critico',32),
('medicos.bloquear','Médicos','Bloquear médico','critico',33),
('medicos.editar_comissao','Médicos','Editar comissão do médico','critico',34),
('medicos.ver_financeiro','Médicos','Ver financeiro do médico','alto',35),
-- Empresas
('empresas.ver','Empresas','Ver empresas','baixo',40),
('empresas.criar','Empresas','Criar empresa','medio',41),
('empresas.editar','Empresas','Editar empresa','medio',42),
('empresas.ver_financeiro','Empresas','Ver financeiro da empresa','alto',43),
('empresas.ver_relatorios','Empresas','Ver relatórios da empresa','medio',44),
('empresas.gerenciar_funcionarios','Empresas','Gerenciar funcionários','medio',45),
-- Financeiro
('financeiro.ver','Financeiro','Ver financeiro','medio',50),
('financeiro.cobrar','Financeiro','Gerar cobrança','medio',51),
('financeiro.cancelar_cobranca','Financeiro','Cancelar cobrança','alto',52),
('financeiro.reembolsar','Financeiro','Realizar reembolso','critico',53),
('financeiro.aprovar_reembolso','Financeiro','Aprovar reembolso','critico',54),
('financeiro.editar_comissao','Financeiro','Editar comissão','critico',55),
('financeiro.servicos_gerenciar','Financeiro','Gerenciar serviços/preços','alto',56),
('financeiro.exportar','Financeiro','Exportar dados financeiros','alto',57),
('financeiro.repasse_gerenciar','Financeiro','Gerenciar repasses','critico',58),
-- Comunicação
('comunicacao.ver_inbox','Comunicação','Acessar inbox','baixo',60),
('comunicacao.ver_atribuidas','Comunicação','Ver conversas atribuídas a si','baixo',61),
('comunicacao.ver_todas','Comunicação','Ver todas as conversas','alto',62),
('comunicacao.responder','Comunicação','Responder mensagens','baixo',63),
('comunicacao.transferir','Comunicação','Transferir conversas','medio',64),
('comunicacao.finalizar','Comunicação','Finalizar conversas','medio',65),
('comunicacao.usar_templates','Comunicação','Usar templates','baixo',66),
('comunicacao.configurar_templates','Comunicação','Configurar templates','medio',67),
('comunicacao.configurar_bot','Comunicação','Configurar bot','alto',68),
('comunicacao.configurar_ia','Comunicação','Configurar IA','alto',69),
('comunicacao.configurar_automacoes','Comunicação','Configurar automações','alto',70),
('comunicacao.ver_metricas','Comunicação','Ver métricas de comunicação','medio',71),
-- Integrações
('integracoes.ver','Integrações','Ver integrações','medio',80),
('integracoes.configurar_feegow','Integrações','Configurar Feegow','critico',81),
('integracoes.configurar_whatsapp','Integrações','Configurar WhatsApp','critico',82),
('integracoes.configurar_google','Integrações','Configurar Google','critico',83),
('integracoes.configurar_pagamentos','Integrações','Configurar pagamentos','critico',84),
('integracoes.configurar_ia','Integrações','Configurar IA Provider','critico',85),
('integracoes.ver_logs','Integrações','Ver logs técnicos','alto',86),
('integracoes.reprocessar_eventos','Integrações','Reprocessar eventos','alto',87),
-- Relatórios
('relatorios.ver','Relatórios','Acessar relatórios','medio',90),
('relatorios.ver_financeiro','Relatórios','Ver relatórios financeiros','alto',91),
('relatorios.ver_operacional','Relatórios','Ver relatórios operacionais','medio',92),
('relatorios.ver_medicos','Relatórios','Ver relatórios de médicos','medio',93),
('relatorios.ver_empresas','Relatórios','Ver relatórios de empresas','medio',94),
('relatorios.exportar','Relatórios','Exportar relatórios','alto',95),
-- Auditoria
('auditoria.ver','Auditoria','Ver auditoria','alto',100),
('auditoria.ver_criticos','Auditoria','Ver eventos críticos','critico',101),
('auditoria.exportar','Auditoria','Exportar auditoria','critico',102),
('auditoria.marcar_revisado','Auditoria','Marcar como revisado','alto',103),
-- Configurações
('configuracoes.ver','Configurações','Ver configurações','medio',110),
('configuracoes.editar','Configurações','Editar configurações','alto',111),
('configuracoes.parametros_globais','Configurações','Parâmetros globais','critico',112),
-- Supervisor (capacidades extras)
('supervisor.fila_geral','Supervisor','Ver fila geral da equipe','medio',120),
('supervisor.conversas_equipe','Supervisor','Ver conversas da equipe','alto',121),
('supervisor.redistribuir','Supervisor','Redistribuir tarefas','medio',122),
('supervisor.aprovar_excecoes','Supervisor','Aprovar exceções','alto',123),
('supervisor.ver_produtividade','Supervisor','Ver produtividade da equipe','medio',124),
('supervisor.pendencias_feegow','Supervisor','Ver pendências Feegow','medio',125),
-- Colaboradores (gestão)
('colaboradores.ver','Colaboradores','Ver colaboradores','medio',130),
('colaboradores.criar','Colaboradores','Criar colaborador','alto',131),
('colaboradores.editar','Colaboradores','Editar colaborador','alto',132),
('colaboradores.alterar_permissoes','Colaboradores','Alterar permissões','critico',133),
('colaboradores.suspender','Colaboradores','Suspender colaborador','critico',134),
('colaboradores.bloquear','Colaboradores','Bloquear colaborador','critico',135)
ON CONFLICT (permission_key) DO UPDATE SET
  modulo=EXCLUDED.modulo, descricao=EXCLUDED.descricao, risco=EXCLUDED.risco, ordem=EXCLUDED.ordem;

-- 7. SEED defaults por função interna ---------------------
-- Limpa e popula
DELETE FROM public.function_permissions;

-- Helper: inserir lote
DO $$
DECLARE
  keys text[];
BEGIN
  -- SECRETARIA: agenda + pacientes basicos + comunicacao basica
  keys := ARRAY['agenda.ver_todas','agenda.criar','agenda.remarcar','agenda.cancelar',
                'pacientes.ver','pacientes.criar','pacientes.editar',
                'comunicacao.ver_inbox','comunicacao.ver_atribuidas','comunicacao.responder',
                'comunicacao.usar_templates','comunicacao.finalizar',
                'medicos.ver','empresas.ver'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'secretaria'::funcao_interna, unnest(keys);

  -- SUPERVISOR: tudo da secretaria + supervisor.* + relatorios operacionais
  keys := ARRAY['agenda.ver_todas','agenda.criar','agenda.remarcar','agenda.cancelar','agenda.trocar_medico',
                'pacientes.ver','pacientes.criar','pacientes.editar','pacientes.suspender',
                'medicos.ver','empresas.ver','empresas.gerenciar_funcionarios',
                'comunicacao.ver_inbox','comunicacao.ver_todas','comunicacao.responder','comunicacao.transferir',
                'comunicacao.finalizar','comunicacao.usar_templates','comunicacao.ver_metricas',
                'supervisor.fila_geral','supervisor.conversas_equipe','supervisor.redistribuir',
                'supervisor.aprovar_excecoes','supervisor.ver_produtividade','supervisor.pendencias_feegow',
                'relatorios.ver','relatorios.ver_operacional',
                'colaboradores.ver'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'supervisor'::funcao_interna, unnest(keys);

  -- FINANCEIRO
  keys := ARRAY['financeiro.ver','financeiro.cobrar','financeiro.cancelar_cobranca','financeiro.reembolsar',
                'financeiro.servicos_gerenciar','financeiro.exportar','financeiro.repasse_gerenciar',
                'pacientes.ver','pacientes.ver_financeiro','medicos.ver','medicos.ver_financeiro',
                'empresas.ver','empresas.ver_financeiro',
                'relatorios.ver','relatorios.ver_financeiro','relatorios.exportar'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'financeiro'::funcao_interna, unnest(keys);

  -- COMERCIAL
  keys := ARRAY['empresas.ver','empresas.criar','empresas.editar','empresas.ver_relatorios',
                'empresas.gerenciar_funcionarios','pacientes.ver',
                'comunicacao.ver_inbox','comunicacao.ver_atribuidas','comunicacao.responder',
                'comunicacao.usar_templates','relatorios.ver','relatorios.ver_empresas'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'comercial'::funcao_interna, unnest(keys);

  -- ATENDIMENTO
  keys := ARRAY['comunicacao.ver_inbox','comunicacao.ver_atribuidas','comunicacao.responder',
                'comunicacao.usar_templates','comunicacao.finalizar','comunicacao.transferir',
                'pacientes.ver','agenda.ver_todas','agenda.criar','agenda.remarcar'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'atendimento'::funcao_interna, unnest(keys);

  -- SUPORTE
  keys := ARRAY['comunicacao.ver_inbox','comunicacao.ver_atribuidas','comunicacao.responder',
                'comunicacao.usar_templates','comunicacao.finalizar','pacientes.ver','medicos.ver',
                'integracoes.ver','integracoes.ver_logs'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'suporte'::funcao_interna, unnest(keys);

  -- GESTOR_OPERACIONAL
  keys := ARRAY['agenda.ver_todas','pacientes.ver','medicos.ver','empresas.ver',
                'colaboradores.ver','colaboradores.editar',
                'relatorios.ver','relatorios.ver_operacional','relatorios.ver_medicos','relatorios.exportar',
                'supervisor.fila_geral','supervisor.ver_produtividade','supervisor.pendencias_feegow',
                'auditoria.ver'];
  INSERT INTO public.function_permissions(funcao_interna,permission_key)
  SELECT 'gestor_operacional'::funcao_interna, unnest(keys);
END $$;

-- 8. SEED permissoes_perfil (5 roles base) ---------------
-- Médico
INSERT INTO public.permissoes_perfil(role,permission_key)
SELECT 'medico'::app_role, k FROM unnest(ARRAY[
  'agenda.ver_propria','pacientes.ver','pacientes.ver_documentos',
  'comunicacao.ver_atribuidas','comunicacao.responder','comunicacao.usar_templates',
  'medicos.ver_financeiro'
]) AS k
ON CONFLICT (role,permission_key) DO UPDATE SET ativo=true;

-- Paciente
INSERT INTO public.permissoes_perfil(role,permission_key)
SELECT 'paciente'::app_role, k FROM unnest(ARRAY[
  'agenda.ver_propria','agenda.criar','agenda.remarcar','agenda.cancelar'
]) AS k
ON CONFLICT (role,permission_key) DO UPDATE SET ativo=true;

-- Empresa
INSERT INTO public.permissoes_perfil(role,permission_key)
SELECT 'empresa'::app_role, k FROM unnest(ARRAY[
  'empresas.ver','empresas.gerenciar_funcionarios','empresas.ver_financeiro',
  'empresas.ver_relatorios','relatorios.ver','relatorios.ver_empresas'
]) AS k
ON CONFLICT (role,permission_key) DO UPDATE SET ativo=true;

-- 9. RPC: permissoes do colaborador (efetivas + origem) --
CREATE OR REPLACE FUNCTION public.permissoes_efetivas(_user_id uuid)
RETURNS TABLE(
  permission_key text,
  modulo text,
  descricao text,
  risco text,
  permitido boolean,
  origem text -- 'admin' | 'revoke_individual' | 'grant_individual' | 'funcao' | 'role' | 'nenhum'
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    pc.permission_key, pc.modulo, pc.descricao, pc.risco,
    public.has_permission(_user_id, pc.permission_key) AS permitido,
    CASE
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id=_user_id AND role='admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM permissoes_colaborador WHERE user_id=_user_id AND permission_key=pc.permission_key AND efeito='revoke') THEN 'revoke_individual'
      WHEN EXISTS (SELECT 1 FROM permissoes_colaborador WHERE user_id=_user_id AND permission_key=pc.permission_key AND efeito='grant') THEN 'grant_individual'
      WHEN EXISTS (
        SELECT 1 FROM colaboradores c
        JOIN function_permissions fp ON fp.funcao_interna=c.funcao_interna
        WHERE c.user_id=_user_id AND fp.permission_key=pc.permission_key AND fp.ativo=true
      ) THEN 'funcao'
      WHEN EXISTS (
        SELECT 1 FROM user_roles ur JOIN permissoes_perfil pp ON pp.role=ur.role
        WHERE ur.user_id=_user_id AND pp.permission_key=pc.permission_key AND pp.ativo=true
      ) THEN 'role'
      ELSE 'nenhum'
    END AS origem
  FROM permissions_catalog pc
  ORDER BY pc.modulo, pc.ordem;
$$;
