
-- Drop e recria com tipo correto
DROP FUNCTION IF EXISTS public.integracoes_dashboard();

CREATE OR REPLACE FUNCTION public.integracoes_dashboard()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'conectadas',
    (SELECT count(*) FROM integracoes_config WHERE status = 'conectado' AND ativo = true),
    'simuladas',
    (SELECT count(*) FROM integracoes_config WHERE modo_simulado = true AND ativo = true),
    'erros',
    (SELECT count(*) FROM integracoes_config WHERE status = 'erro'),
    'eventos_pendentes',
    (SELECT count(*) FROM event_queue WHERE status IN ('pending', 'processing')),
    'pendencias_criticas',
    (SELECT count(*) FROM integracoes_pendencias WHERE prioridade = 'critica' AND status = 'aberta')
  );
$$;

-- Reprocessar evento com falha
CREATE OR REPLACE FUNCTION public.event_reprocessar(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE event_queue
  SET status = 'pending',
      attempts = 0,
      error_message = NULL,
      scheduled_for = now(),
      updated_at = now()
  WHERE id = p_event_id
    AND status IN ('failed', 'cancelled');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado ou não está em status reprocessável';
  END IF;
END;
$$;
