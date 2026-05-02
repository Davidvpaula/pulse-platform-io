
CREATE OR REPLACE FUNCTION public.consultas_pendentes_avaliacao()
RETURNS TABLE (
  consulta_id uuid,
  medico_id uuid,
  medico_nome text,
  especialidade_nome text,
  concluida_em timestamptz
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
    c.updated_at AS concluida_em
  FROM public.consultas c
  JOIN public.medicos m ON m.id = c.medico_id
  JOIN public.profiles p ON p.id = m.user_id
  WHERE c.paciente_id = auth.uid()
    AND c.status = 'concluida'
    AND NOT EXISTS (
      SELECT 1 FROM public.avaliacoes_medicas a WHERE a.consulta_id = c.id
    )
  ORDER BY c.updated_at DESC
  LIMIT 5;
$$;
