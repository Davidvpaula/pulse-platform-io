
-- =========================================================
-- NOC Frente A — Eventos & Métricas Operacionais (observer)
-- =========================================================

-- 1) Trigger silencioso de eventos operacionais em consultas
CREATE OR REPLACE FUNCTION public.trg_noc_consulta_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento text;
  v_sev    severity_evento := 'info';
  v_meta   jsonb;
  v_atraso_min int;
BEGIN
  -- Apenas em UPDATE de status
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  v_atraso_min := GREATEST(0, EXTRACT(EPOCH FROM (now() - NEW.inicio))/60)::int;

  IF NEW.status = 'em_andamento' THEN
    v_evento := 'consulta.iniciada';
    IF v_atraso_min > 10 THEN v_sev := 'warn'; END IF;
  ELSIF NEW.status = 'concluida' THEN
    v_evento := 'consulta.concluida';
  ELSIF NEW.status = 'no_show' THEN
    v_evento := 'consulta.no_show';
    v_sev := 'warn';
  ELSIF NEW.status = 'cancelada' THEN
    -- Cancelada perto do horário (<2h) classifica como 'tarde'
    IF NEW.inicio - now() < interval '2 hours' AND NEW.inicio > now() - interval '24 hours' THEN
      v_evento := 'consulta.cancelada_tarde';
      v_sev := 'warn';
    ELSE
      v_evento := 'consulta.cancelada';
    END IF;
  ELSE
    RETURN NEW; -- demais transições não geram evento NOC
  END IF;

  v_meta := jsonb_build_object(
    'consulta_id',  NEW.id,
    'medico_id',    NEW.medico_id,
    'paciente_id',  NEW.paciente_id,
    'modalidade',   NEW.modalidade,
    'inicio',       NEW.inicio,
    'fim',          NEW.fim,
    'status_antes', OLD.status,
    'status_novo',  NEW.status,
    'atraso_min',   v_atraso_min,
    'canal',        NEW.canal_origem
  );

  BEGIN
    INSERT INTO public.observabilidade_eventos(modulo, evento, severity, metadata)
    VALUES ('operacao', v_evento, v_sev, v_meta);
  EXCEPTION WHEN OTHERS THEN
    -- silencioso: NUNCA quebra o fluxo da consulta
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_noc_consulta_evento ON public.consultas;
CREATE TRIGGER trg_noc_consulta_evento
AFTER UPDATE ON public.consultas
FOR EACH ROW EXECUTE FUNCTION public.trg_noc_consulta_evento();

-- 2) Função de métricas diárias
CREATE OR REPLACE FUNCTION public.fn_metricas_operacionais_dia(p_dia date DEFAULT current_date)
RETURNS TABLE(
  dia date,
  total_consultas int,
  concluidas int,
  no_show int,
  canceladas int,
  cancelada_tarde int,
  iniciadas int,
  taxa_conclusao numeric,
  taxa_no_show numeric,
  taxa_cancelamento numeric,
  pontualidade_pct numeric,
  atraso_medio_min numeric,
  duracao_media_min numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.*,
      (SELECT min(csl.created_at) FROM consulta_status_log csl
        WHERE csl.consulta_id = c.id AND csl.status_novo = 'em_andamento') AS inicio_real,
      (SELECT min(csl.created_at) FROM consulta_status_log csl
        WHERE csl.consulta_id = c.id AND csl.status_novo = 'concluida') AS fim_real
    FROM consultas c
    WHERE c.inicio::date = p_dia
  ),
  agg AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status='concluida')::int AS concl,
      count(*) FILTER (WHERE status='no_show')::int AS ns,
      count(*) FILTER (WHERE status='cancelada')::int AS canc,
      count(*) FILTER (WHERE status='cancelada' AND updated_at > inicio - interval '2 hours')::int AS canc_tarde,
      count(*) FILTER (WHERE inicio_real IS NOT NULL)::int AS ini,
      count(*) FILTER (WHERE inicio_real IS NOT NULL AND inicio_real <= inicio + interval '5 minutes')::int AS pontuais,
      avg(GREATEST(0, EXTRACT(EPOCH FROM (inicio_real - inicio))/60))
        FILTER (WHERE inicio_real IS NOT NULL) AS atr_med,
      avg(EXTRACT(EPOCH FROM (fim_real - inicio_real))/60)
        FILTER (WHERE inicio_real IS NOT NULL AND fim_real IS NOT NULL) AS dur_med
    FROM base
  )
  SELECT
    p_dia,
    total,
    concl, ns, canc, canc_tarde, ini,
    CASE WHEN total>0 THEN round(100.0*concl/total,2) ELSE 0 END,
    CASE WHEN total>0 THEN round(100.0*ns/total,2) ELSE 0 END,
    CASE WHEN total>0 THEN round(100.0*canc/total,2) ELSE 0 END,
    CASE WHEN ini>0   THEN round(100.0*pontuais/ini,2) ELSE 0 END,
    round(coalesce(atr_med,0),2),
    round(coalesce(dur_med,0),2)
  FROM agg;
$$;

REVOKE ALL ON FUNCTION public.fn_metricas_operacionais_dia(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_metricas_operacionais_dia(date) TO authenticated;

-- 3) Views NOC (acesso restrito via RLS na função wrapper / leitura admin)
CREATE OR REPLACE VIEW public.vw_noc_consultas_em_andamento AS
SELECT
  c.id, c.medico_id, m.nome AS medico_nome,
  c.paciente_id, p.nome_completo AS paciente_nome,
  c.inicio, c.fim, c.modalidade, c.status,
  GREATEST(0, EXTRACT(EPOCH FROM (now() - c.inicio))/60)::int AS minutos_em_andamento
FROM consultas c
JOIN medicos m ON m.id = c.medico_id
JOIN pacientes p ON p.id = c.paciente_id
WHERE c.status = 'em_andamento'
ORDER BY c.inicio;

CREATE OR REPLACE VIEW public.vw_noc_fila_paciente AS
SELECT
  c.id, c.medico_id, m.nome AS medico_nome,
  c.paciente_id, p.nome_completo AS paciente_nome,
  c.inicio, c.modalidade, c.status,
  EXTRACT(EPOCH FROM (c.inicio - now()))/60 AS minutos_para_inicio
FROM consultas c
JOIN medicos m ON m.id = c.medico_id
JOIN pacientes p ON p.id = c.paciente_id
WHERE c.status IN ('confirmada','agendada')
  AND c.inicio BETWEEN now() - interval '15 minutes' AND now() + interval '2 hours'
ORDER BY c.inicio;

CREATE OR REPLACE VIEW public.vw_noc_atrasos_ativos AS
SELECT
  c.id, c.medico_id, m.nome AS medico_nome,
  c.paciente_id, p.nome_completo AS paciente_nome,
  c.inicio, c.modalidade, c.status,
  EXTRACT(EPOCH FROM (now() - c.inicio))/60 AS minutos_atraso
FROM consultas c
JOIN medicos m ON m.id = c.medico_id
JOIN pacientes p ON p.id = c.paciente_id
WHERE c.status IN ('confirmada','agendada')
  AND c.inicio < now() - interval '10 minutes'
  AND c.inicio > now() - interval '4 hours'
ORDER BY c.inicio;

CREATE OR REPLACE VIEW public.vw_noc_medicos_online AS
SELECT ap.user_id, ap.status, ap.last_seen_at, ap.current_conversation_id
FROM attendant_presence ap
WHERE ap.status IN ('online','ocupado')
  AND ap.last_seen_at >= now() - interval '90 seconds';

-- Restringir acesso (admin + supervisor)
REVOKE ALL ON public.vw_noc_consultas_em_andamento FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.vw_noc_fila_paciente FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.vw_noc_atrasos_ativos FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.vw_noc_medicos_online FROM PUBLIC, anon, authenticated;

-- Wrappers seguros para leitura
CREATE OR REPLACE FUNCTION public.fn_noc_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'em_andamento', (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM vw_noc_consultas_em_andamento x),
    'fila',         (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM vw_noc_fila_paciente x),
    'atrasos',      (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM vw_noc_atrasos_ativos x),
    'online',       (SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM vw_noc_medicos_online x),
    'metricas_hoje',(SELECT to_jsonb(m) FROM fn_metricas_operacionais_dia(current_date) m),
    'gerado_em',    now()
  ) INTO v;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_noc_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_noc_snapshot() TO authenticated;
