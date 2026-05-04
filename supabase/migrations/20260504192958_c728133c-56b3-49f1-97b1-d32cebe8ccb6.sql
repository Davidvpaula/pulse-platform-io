
DROP FUNCTION IF EXISTS public.fn_servico_slots_disponiveis(uuid, date);

CREATE OR REPLACE FUNCTION public.fn_servico_slots_disponiveis(
  _servico_id uuid,
  _data date
)
RETURNS TABLE(
  slot_id uuid,
  medico_id uuid,
  inicio timestamptz,
  fim timestamptz,
  modalidade text,
  total_vagas bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH medicos_servico AS (
    SELECT ms.medico_id
    FROM public.medico_servicos ms
    WHERE ms.servico_id = _servico_id
      AND ms.ativo = true
      AND ms.status = 'ativo'
  )
  SELECT
    s.id AS slot_id,
    s.medico_id,
    s.inicio,
    s.fim,
    s.modalidade::text,
    COUNT(*) OVER (PARTITION BY s.inicio) AS total_vagas
  FROM public.agenda_slots s
  JOIN medicos_servico mp ON s.medico_id = mp.medico_id
  WHERE s.servico_id = _servico_id
    AND s.status = 'disponivel'
    AND s.inicio::date >= _data
    AND s.inicio::date <= _data + interval '14 days'
    AND s.inicio > now()
  ORDER BY s.inicio, s.medico_id;
$$;
