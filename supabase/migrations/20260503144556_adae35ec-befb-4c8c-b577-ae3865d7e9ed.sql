
DROP FUNCTION IF EXISTS public.consultas_pendentes_avaliacao();

CREATE OR REPLACE FUNCTION public.consultas_pendentes_avaliacao()
RETURNS TABLE(
  consulta_id uuid,
  medico_id uuid,
  medico_nome text,
  especialidade_nome text,
  concluida_em timestamptz,
  paciente_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS consulta_id,
    c.medico_id,
    p.nome AS medico_nome,
    (SELECT e.nome FROM public.medico_especialidades me2 JOIN public.especialidades e ON e.id = me2.especialidade_id WHERE me2.medico_id = c.medico_id AND me2.ativo = true LIMIT 1) AS especialidade_nome,
    c.updated_at AS concluida_em,
    c.paciente_id
  FROM public.consultas c
  JOIN public.medicos m ON m.id = c.medico_id
  JOIN public.profiles p ON p.id = m.user_id
  WHERE c.paciente_id IN (SELECT pa.id FROM public.pacientes pa WHERE pa.user_id = auth.uid())
    AND c.status = 'concluida'
    AND NOT EXISTS (
      SELECT 1 FROM public.avaliacoes_medicas a WHERE a.consulta_id = c.id
    )
  ORDER BY c.updated_at DESC
  LIMIT 5;
$$;

-- Security: Create SECURITY DEFINER RPC for ativar_premium_conquistado
CREATE OR REPLACE FUNCTION public.ativar_premium_conquistado()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_medico_id uuid;
  v_qualificado boolean;
BEGIN
  SELECT m.id INTO v_medico_id FROM public.medicos m WHERE m.user_id = auth.uid();
  IF v_medico_id IS NULL THEN
    RAISE EXCEPTION 'Médico não encontrado';
  END IF;
  
  v_qualificado := public.verificar_premium_conquistado(v_medico_id);
  IF NOT v_qualificado THEN
    RAISE EXCEPTION 'Você ainda não atingiu os requisitos mínimos para o Premium.';
  END IF;
  
  RETURN true;
END;
$$;

-- Separate ranking_config policies
DROP POLICY IF EXISTS ranking_config_admin_all ON public.ranking_config;
DROP POLICY IF EXISTS ranking_config_admin_select ON public.ranking_config;

CREATE POLICY ranking_config_admin_select ON public.ranking_config
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY ranking_config_admin_update ON public.ranking_config
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Restrict insere_clique to authenticated
DROP POLICY IF EXISTS insere_clique ON public.impulsionamento_cliques;
CREATE POLICY insere_clique ON public.impulsionamento_cliques
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Revoke anon from sensitive RPCs
REVOKE EXECUTE ON FUNCTION public.ativar_premium_conquistado() FROM anon;
REVOKE EXECUTE ON FUNCTION public.verificar_premium_conquistado(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalcular_ranking_todos() FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalcular_ranking_medico(uuid) FROM anon;
