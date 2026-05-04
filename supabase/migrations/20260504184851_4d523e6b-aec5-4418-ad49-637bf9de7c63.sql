CREATE OR REPLACE FUNCTION public.fn_pa_slots_disponiveis(
  _data date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  slot_id uuid,
  medico_id uuid,
  inicio timestamptz,
  fim timestamptz,
  modalidade text,
  total_vagas bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH pa_cfg AS (
    SELECT (value #>> '{}')::uuid AS servico_id
    FROM public.app_settings
    WHERE key = 'atendimento_imediato.servico_id'
    LIMIT 1
  ),
  medicos_pa AS (
    SELECT ms.medico_id
    FROM public.medico_servicos ms
    JOIN pa_cfg ON ms.servico_id = pa_cfg.servico_id
    WHERE ms.ativo = true AND ms.status = 'ativo'
  )
  SELECT
    s.id AS slot_id,
    s.medico_id,
    s.inicio,
    s.fim,
    s.modalidade::text,
    COUNT(*) OVER (PARTITION BY s.inicio) AS total_vagas
  FROM public.agenda_slots s
  JOIN medicos_pa mp ON s.medico_id = mp.medico_id
  JOIN pa_cfg ON s.servico_id = pa_cfg.servico_id
  WHERE s.status = 'disponivel'
    AND s.inicio::date = _data
    AND s.inicio > now()
  ORDER BY s.inicio, s.medico_id;
$$;

GRANT EXECUTE ON FUNCTION public.fn_pa_slots_disponiveis(date) TO anon, authenticated;