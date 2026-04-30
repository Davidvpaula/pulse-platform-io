
-- 1) ENUMS
DO $$ BEGIN
  CREATE TYPE public.empresa_tipo AS ENUM ('contratante','clinica_parceira','saude_ocupacional','indicadora','hibrida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.empresa_porte AS ENUM ('mei','pequena','media','grande');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.empresa_modelo_financeiro AS ENUM ('por_colaborador','por_consulta','plano_fixo','hibrido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.empresa_contrato_status AS ENUM ('ativo','suspenso','encerrado','rascunho');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.empresa_fatura_status AS ENUM ('em_aberto','paga','atrasada','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.empresa_funcionario_status AS ENUM ('ativo','desligado','licenca','suspenso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) EXTENDER public.empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS tipo_empresa public.empresa_tipo NOT NULL DEFAULT 'contratante',
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS segmento text,
  ADD COLUMN IF NOT EXISTS porte public.empresa_porte,
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_email text,
  ADD COLUMN IF NOT EXISTS responsavel_telefone text,
  ADD COLUMN IF NOT EXISTS modelo_financeiro public.empresa_modelo_financeiro NOT NULL DEFAULT 'por_consulta',
  ADD COLUMN IF NOT EXISTS valor_colaborador_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_consulta_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plano_mensal_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS limite_consultas_mes integer,
  ADD COLUMN IF NOT EXISTS contrato_status public.empresa_contrato_status NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS contrato_inicio date,
  ADD COLUMN IF NOT EXISTS contrato_renovacao date,
  ADD COLUMN IF NOT EXISTS dia_fechamento integer NOT NULL DEFAULT 1;

-- 3) MODULOS POR EMPRESA
CREATE TABLE IF NOT EXISTS public.empresas_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  modulo_key text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, modulo_key)
);
CREATE INDEX IF NOT EXISTS idx_empresas_modulos_empresa ON public.empresas_modulos(empresa_id);

-- 4) HISTÓRICO DE CONTRATOS
CREATE TABLE IF NOT EXISTS public.empresas_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  status public.empresa_contrato_status NOT NULL DEFAULT 'ativo',
  modelo_financeiro public.empresa_modelo_financeiro NOT NULL DEFAULT 'por_consulta',
  data_inicio date NOT NULL,
  data_fim date,
  data_renovacao date,
  valor_colaborador_centavos integer NOT NULL DEFAULT 0,
  valor_consulta_centavos integer NOT NULL DEFAULT 0,
  plano_mensal_centavos integer NOT NULL DEFAULT 0,
  limite_consultas_mes integer,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_empresas_contratos_empresa ON public.empresas_contratos(empresa_id);

-- 5) FUNCIONÁRIOS DA EMPRESA
CREATE TABLE IF NOT EXISTS public.empresas_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  email text,
  telefone text,
  setor text,
  cargo text,
  matricula text,
  status public.empresa_funcionario_status NOT NULL DEFAULT 'ativo',
  data_admissao date,
  data_desligamento date,
  importado_em timestamptz,
  origem text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emp_func_empresa ON public.empresas_funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_emp_func_paciente ON public.empresas_funcionarios(paciente_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_func_empresa_cpf
  ON public.empresas_funcionarios(empresa_id, cpf) WHERE cpf IS NOT NULL;

-- 6) FATURAS
CREATE TABLE IF NOT EXISTS public.empresas_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contrato_id uuid REFERENCES public.empresas_contratos(id) ON DELETE SET NULL,
  competencia_mes integer NOT NULL CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano integer NOT NULL CHECK (competencia_ano BETWEEN 2020 AND 2100),
  vencimento date NOT NULL,
  valor_total_centavos integer NOT NULL DEFAULT 0,
  qtd_funcionarios integer NOT NULL DEFAULT 0,
  qtd_consultas integer NOT NULL DEFAULT 0,
  status public.empresa_fatura_status NOT NULL DEFAULT 'em_aberto',
  pago_em timestamptz,
  observacoes text,
  detalhamento jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, competencia_ano, competencia_mes)
);
CREATE INDEX IF NOT EXISTS idx_emp_fat_empresa ON public.empresas_faturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_emp_fat_status ON public.empresas_faturas(status);

-- 7) AUDITORIA
CREATE TABLE IF NOT EXISTS public.empresas_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_emp_aud_empresa ON public.empresas_auditoria(empresa_id);

-- 8) TRIGGERS updated_at
DO $$ BEGIN
  CREATE TRIGGER trg_empresas_modulos_uat BEFORE UPDATE ON public.empresas_modulos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_empresas_contratos_uat BEFORE UPDATE ON public.empresas_contratos
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_empresas_funcionarios_uat BEFORE UPDATE ON public.empresas_funcionarios
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_empresas_faturas_uat BEFORE UPDATE ON public.empresas_faturas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9) RLS
ALTER TABLE public.empresas_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_auditoria ENABLE ROW LEVEL SECURITY;

-- Helper: o usuário é o "dono" da empresa? (perfil empresa)
CREATE OR REPLACE FUNCTION public.is_empresa_owner(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pacientes p
    WHERE p.user_id = auth.uid() AND p.empresa_id = _empresa_id
  )
$$;

-- empresas: políticas adicionais para a role empresa e staff com permissão
DROP POLICY IF EXISTS "Empresa ve propria empresa" ON public.empresas;
CREATE POLICY "Empresa ve propria empresa" ON public.empresas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa') AND public.is_empresa_owner(id));

DROP POLICY IF EXISTS "Staff ve empresas com permissao" ON public.empresas;
CREATE POLICY "Staff ve empresas com permissao" ON public.empresas
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'empresas.ver'));

-- empresas_modulos
CREATE POLICY "Admin gerencia modulos" ON public.empresas_modulos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff ve modulos com permissao" ON public.empresas_modulos
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'empresas.ver'));
CREATE POLICY "Empresa ve seus modulos" ON public.empresas_modulos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa') AND public.is_empresa_owner(empresa_id));

-- empresas_contratos
CREATE POLICY "Admin gerencia contratos" ON public.empresas_contratos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff ve contratos com permissao" ON public.empresas_contratos
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'empresas.ver_financeiro'));
CREATE POLICY "Empresa ve seus contratos" ON public.empresas_contratos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa') AND public.is_empresa_owner(empresa_id));

-- empresas_funcionarios
CREATE POLICY "Admin gerencia funcionarios empresa" ON public.empresas_funcionarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff ve funcionarios empresa" ON public.empresas_funcionarios
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'empresas.ver'));
CREATE POLICY "Empresa ve seus funcionarios" ON public.empresas_funcionarios
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa') AND public.is_empresa_owner(empresa_id));

-- empresas_faturas
CREATE POLICY "Admin gerencia faturas" ON public.empresas_faturas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff ve faturas com permissao" ON public.empresas_faturas
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(),'empresas.ver_financeiro'));
CREATE POLICY "Empresa ve suas faturas" ON public.empresas_faturas
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'empresa') AND public.is_empresa_owner(empresa_id));

-- empresas_auditoria
CREATE POLICY "Admin ve auditoria empresas" ON public.empresas_auditoria
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff ve auditoria empresas" ON public.empresas_auditoria
  FOR SELECT TO authenticated USING (public.has_permission(auth.uid(),'empresas.ver'));

-- 10) Helpers / RPCs
CREATE OR REPLACE FUNCTION public.registrar_auditoria_empresa(
  _empresa_id uuid, _acao text, _campo text DEFAULT NULL, _valor_anterior text DEFAULT NULL,
  _valor_novo text DEFAULT NULL, _motivo text DEFAULT NULL, _observacao text DEFAULT NULL,
  _payload jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.empresas_auditoria
    (empresa_id, actor_id, acao, campo, valor_anterior, valor_novo, motivo, observacao, payload)
  VALUES (_empresa_id, auth.uid(), _acao, _campo, _valor_anterior, _valor_novo, _motivo, _observacao, _payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Toggle de módulo
CREATE OR REPLACE FUNCTION public.empresa_toggle_modulo(_empresa_id uuid, _modulo_key text, _ativo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT has_role(v_uid,'admin') THEN
    RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;

  INSERT INTO public.empresas_modulos (empresa_id, modulo_key, ativo, updated_by)
  VALUES (_empresa_id, _modulo_key, _ativo, v_uid)
  ON CONFLICT (empresa_id, modulo_key)
  DO UPDATE SET ativo = EXCLUDED.ativo, updated_by = v_uid, updated_at = now();

  PERFORM public.registrar_auditoria_empresa(
    _empresa_id, 'modulo:'|| (CASE WHEN _ativo THEN 'ativado' ELSE 'desativado' END),
    _modulo_key, NULL, _ativo::text, NULL, NULL, NULL);

  RETURN jsonb_build_object('ok', true);
END $$;

-- Visão geral da empresa
CREATE OR REPLACE FUNCTION public.empresa_visao_geral(_empresa_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inicio_mes timestamptz := date_trunc('month', now());
  v_fim_mes timestamptz := (date_trunc('month', now()) + interval '1 month');
  v_kpis jsonb; v_alertas jsonb;
BEGIN
  IF NOT (has_role(v_uid,'admin')
          OR public.has_permission(v_uid,'empresas.ver')
          OR (has_role(v_uid,'empresa') AND public.is_empresa_owner(_empresa_id))) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;

  SELECT jsonb_build_object(
    'funcionarios_total', (SELECT count(*) FROM public.empresas_funcionarios WHERE empresa_id=_empresa_id),
    'funcionarios_ativos', (SELECT count(*) FROM public.empresas_funcionarios WHERE empresa_id=_empresa_id AND status='ativo'),
    'consultas_mes', (SELECT count(*) FROM public.consultas WHERE empresa_id=_empresa_id AND inicio >= v_inicio_mes AND inicio < v_fim_mes),
    'consultas_concluidas_mes', (SELECT count(*) FROM public.consultas WHERE empresa_id=_empresa_id AND status='concluida' AND inicio >= v_inicio_mes AND inicio < v_fim_mes),
    'faturamento_mes_centavos', (SELECT coalesce(sum(valor_total_centavos),0) FROM public.empresas_faturas
       WHERE empresa_id=_empresa_id AND competencia_ano=extract(year from now())::int AND competencia_mes=extract(month from now())::int),
    'fatura_em_aberto_centavos', (SELECT coalesce(sum(valor_total_centavos),0) FROM public.empresas_faturas
       WHERE empresa_id=_empresa_id AND status IN ('em_aberto','atrasada')),
    'inadimplente', EXISTS (SELECT 1 FROM public.empresas_faturas
       WHERE empresa_id=_empresa_id AND status='atrasada')
  ) INTO v_kpis;

  WITH a AS (
    SELECT 'destructive'::text tone, 'Faturas atrasadas' titulo,
           count(*)::text || ' fatura(s) em atraso' descricao
      FROM public.empresas_faturas
     WHERE empresa_id=_empresa_id AND status='atrasada'
    HAVING count(*) > 0
    UNION ALL
    SELECT 'warning','Empresa sem uso no mês',
           'Nenhuma consulta registrada no mês corrente'
     WHERE NOT EXISTS (SELECT 1 FROM public.consultas
       WHERE empresa_id=_empresa_id AND inicio >= v_inicio_mes AND inicio < v_fim_mes)
    UNION ALL
    SELECT 'info','Acima do limite contratado',
           'Consultas no mês ultrapassaram o limite do plano'
      FROM public.empresas e
     WHERE e.id=_empresa_id AND e.limite_consultas_mes IS NOT NULL
       AND (SELECT count(*) FROM public.consultas WHERE empresa_id=_empresa_id
              AND inicio >= v_inicio_mes AND inicio < v_fim_mes) > e.limite_consultas_mes
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('tone',tone,'titulo',titulo,'desc',descricao)), '[]'::jsonb)
    INTO v_alertas FROM a;

  RETURN jsonb_build_object('kpis', v_kpis, 'alertas', v_alertas);
END $$;

-- Visão geral agregada (lista) — usada pelo Admin para colorir/contar empresas
CREATE OR REPLACE FUNCTION public.admin_empresas_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inicio_mes timestamptz := date_trunc('month', now());
  v_fim_mes timestamptz := (date_trunc('month', now()) + interval '1 month');
BEGIN
  IF NOT (has_role(v_uid,'admin') OR public.has_permission(v_uid,'empresas.ver')) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    FROM (
      SELECT
        e.id, e.razao_social, e.nome_fantasia, e.cnpj, e.tipo_empresa, e.ativo,
        e.contrato_status, e.modelo_financeiro, e.limite_consultas_mes,
        (SELECT count(*) FROM public.empresas_funcionarios f WHERE f.empresa_id=e.id AND f.status='ativo') AS funcionarios,
        (SELECT count(*) FROM public.consultas c WHERE c.empresa_id=e.id AND c.inicio >= v_inicio_mes AND c.inicio < v_fim_mes) AS consultas_mes,
        (SELECT coalesce(sum(valor_total_centavos),0) FROM public.empresas_faturas fa
            WHERE fa.empresa_id=e.id AND fa.competencia_ano=extract(year from now())::int AND fa.competencia_mes=extract(month from now())::int) AS faturamento_mes_centavos,
        EXISTS(SELECT 1 FROM public.empresas_faturas fa WHERE fa.empresa_id=e.id AND fa.status='atrasada') AS inadimplente
      FROM public.empresas e
      ORDER BY e.razao_social
    ) t
  );
END $$;

-- Permissões padrão para staff (concede só pra admin por padrão; granularidade caso a caso já existente)
INSERT INTO public.permissoes_perfil (role, permission_key, ativo)
VALUES
  ('admin','empresas.ver',true),
  ('admin','empresas.criar',true),
  ('admin','empresas.editar',true),
  ('admin','empresas.ver_financeiro',true),
  ('admin','empresas.gerenciar_funcionarios',true)
ON CONFLICT DO NOTHING;

REVOKE ALL ON FUNCTION public.empresa_toggle_modulo(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresa_toggle_modulo(uuid,text,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.empresa_visao_geral(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.empresa_visao_geral(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_empresas_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_empresas_overview() TO authenticated;
REVOKE ALL ON FUNCTION public.registrar_auditoria_empresa(uuid,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria_empresa(uuid,text,text,text,text,text,text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.is_empresa_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_empresa_owner(uuid) TO authenticated;
