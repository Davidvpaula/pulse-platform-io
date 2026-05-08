ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS avaliacao_dispensada_em timestamptz NULL;

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
    AND c.avaliacao_dispensada_em IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.avaliacoes_medicas a WHERE a.consulta_id = c.id
    )
  ORDER BY c.updated_at DESC
  LIMIT 5;
$$;

REVOKE EXECUTE ON FUNCTION public.consultas_pendentes_avaliacao() FROM anon;

CREATE OR REPLACE FUNCTION public.dispensar_avaliacao_consulta(p_consulta_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT pa.user_id INTO v_owner
  FROM public.consultas c
  JOIN public.pacientes pa ON pa.id = c.paciente_id
  WHERE c.id = p_consulta_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Consulta não encontrada';
  END IF;

  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.consultas
  SET avaliacao_dispensada_em = now()
  WHERE id = p_consulta_id
    AND avaliacao_dispensada_em IS NULL;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dispensar_avaliacao_consulta(uuid) FROM anon;