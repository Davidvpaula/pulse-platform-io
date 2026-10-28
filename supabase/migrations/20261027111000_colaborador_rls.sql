CREATE OR REPLACE FUNCTION public.colaborador_sessao_permitida()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT has_role(auth.uid(),'admin') OR NOT EXISTS (
   SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role::text IN ('secretaria','supervisor','colaborador')
 ) OR colaborador_operacional_ativo();
$$;
CREATE OR REPLACE FUNCTION public.colaborador_capacidade(_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT has_role(auth.uid(),'admin') OR NOT EXISTS (
   SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role::text IN ('secretaria','supervisor','colaborador')
 ) OR (colaborador_operacional_ativo() AND has_permission(auth.uid(),_key));
$$;
REVOKE ALL ON FUNCTION public.colaborador_sessao_permitida(), public.colaborador_capacidade(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.colaborador_sessao_permitida(), public.colaborador_capacidade(text) TO authenticated;

-- Acesso mínimo de identidade permanece disponível para apresentar o bloqueio.
-- Políticas restritivas limitam as políticas permissivas legadas baseadas em role.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity AND c.relname NOT IN ('user_roles','colaboradores','profiles')
  LOOP
    EXECUTE format('CREATE POLICY colaborador_sessao_ativa ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.colaborador_sessao_permitida())) WITH CHECK ((SELECT public.colaborador_sessao_permitida()))',t.relname);
  END LOOP;
END $$;
CREATE POLICY colaborador_pacientes_leitura ON public.pacientes AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('pacientes.ver')));
CREATE POLICY colaborador_consultas_leitura ON public.consultas AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('agenda.ver_todas')));
CREATE POLICY colaborador_pagamentos_leitura ON public.pagamentos AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('financeiro.ver')));
CREATE POLICY colaborador_documentos_leitura ON public.documentos_paciente AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('pacientes.ver_documentos')));
CREATE POLICY colaborador_pacientes_edicao ON public.pacientes AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT colaborador_capacidade('pacientes.editar'))) WITH CHECK ((SELECT colaborador_capacidade('pacientes.editar')));
-- Transições da central passam a validar ação e estado na RPC.
DROP POLICY IF EXISTS "Secretaria atualiza consultas" ON public.consultas;
DROP POLICY IF EXISTS "Supervisor atualiza consultas com permissao" ON public.consultas;
