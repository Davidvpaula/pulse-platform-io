
CREATE OR REPLACE FUNCTION public.fn_recalcular_score_operacional(p_data date DEFAULT current_date)
RETURNS TABLE(medicos_processados int, duracao_ms int, data_referencia date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz := clock_timestamp();
  v_count int := 0;
  v_janela_inicio date := p_data - INTERVAL '30 days';
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      c.medico_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE c.status = 'concluida')::int AS concluidas,
      COUNT(*) FILTER (WHERE c.status = 'no_show')::int AS no_show,
      COUNT(*) FILTER (WHERE c.status = 'cancelada')::int AS canceladas,
      COUNT(*) FILTER (
        WHERE c.status = 'cancelada'
          AND c.cancelada_em IS NOT NULL
          AND c.data_hora_inicio - c.cancelada_em < INTERVAL '24 hours'
      )::int AS cancelada_tarde,
      COUNT(*) FILTER (
        WHERE c.status IN ('concluida','em_andamento')
          AND EXISTS (
            SELECT 1 FROM consulta_status_log l
            WHERE l.consulta_id = c.id
              AND l.status_novo = 'em_andamento'
              AND l.created_at <= c.data_hora_inicio + INTERVAL '10 minutes'
          )
      )::int AS pontuais,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (
          (SELECT MIN(l.created_at) FROM consulta_status_log l
            WHERE l.consulta_id = c.id AND l.status_novo = 'em_andamento')
          - c.data_hora_inicio
        )) / 60
      ) FILTER (WHERE c.status IN ('concluida','em_andamento')), 0)::numeric AS atraso_medio_min
    FROM consultas c
    WHERE c.data_hora_inicio::date BETWEEN v_janela_inicio AND p_data
    GROUP BY c.medico_id
  LOOP
    BEGIN
      DECLARE
        v_pont_rate numeric := 0;
        v_noshow_rate numeric := 0;
        v_canc_tarde_rate numeric := 0;
        v_score_pont numeric;
        v_score_canc numeric;
        v_score_ns numeric;
        v_score_resposta numeric := 100;
        v_score_uso numeric := 100;
        v_score_doc numeric := 100;
        v_score_total numeric;
      BEGIN
        IF (r.concluidas + r.no_show) > 0 THEN
          v_pont_rate := r.pontuais::numeric / GREATEST(r.concluidas + r.no_show, 1);
        END IF;
        IF r.total > 0 THEN
          v_noshow_rate := r.no_show::numeric / r.total;
          v_canc_tarde_rate := r.cancelada_tarde::numeric / r.total;
        END IF;

        v_score_pont := GREATEST(0, LEAST(100,
          (v_pont_rate * 100) - LEAST(GREATEST(r.atraso_medio_min,0), 60) * 0.8
        ));
        v_score_ns := GREATEST(0, LEAST(100, 100 - (v_noshow_rate * 200)));
        v_score_canc := GREATEST(0, LEAST(100, 100 - (v_canc_tarde_rate * 200)));

        v_score_total := ROUND((
          v_score_pont * 0.30 +
          v_score_ns * 0.25 +
          v_score_canc * 0.15 +
          v_score_resposta * 0.10 +
          v_score_uso * 0.10 +
          v_score_doc * 0.10
        ), 2);

        INSERT INTO medico_score_operacional (
          medico_id, score_pontualidade, score_cancelamento, score_no_show,
          score_resposta, score_uso_sistema, score_documentacao, score_total,
          detalhes, updated_at
        ) VALUES (
          r.medico_id,
          ROUND(v_score_pont, 2),
          ROUND(v_score_canc, 2),
          ROUND(v_score_ns, 2),
          v_score_resposta,
          v_score_uso,
          v_score_doc,
          v_score_total,
          jsonb_build_object(
            'data_referencia', p_data,
            'janela_dias', 30,
            'total_consultas', r.total,
            'concluidas', r.concluidas,
            'no_show', r.no_show,
            'canceladas', r.canceladas,
            'cancelada_tarde', r.cancelada_tarde,
            'pontuais', r.pontuais,
            'pontualidade_pct', ROUND(v_pont_rate * 100, 2),
            'atraso_medio_min', ROUND(r.atraso_medio_min, 2)
          ),
          now()
        )
        ON CONFLICT (medico_id) DO UPDATE SET
          score_pontualidade = EXCLUDED.score_pontualidade,
          score_cancelamento = EXCLUDED.score_cancelamento,
          score_no_show = EXCLUDED.score_no_show,
          score_total = EXCLUDED.score_total,
          detalhes = EXCLUDED.detalhes,
          updated_at = now();

        v_count := v_count + 1;
      END;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  BEGIN
    INSERT INTO observabilidade_eventos (modulo, tipo, payload)
    VALUES ('operacao', 'noc.score_recalculado', jsonb_build_object(
      'data_referencia', p_data,
      'medicos_processados', v_count,
      'duracao_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_inicio))::int
    ));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY SELECT v_count, EXTRACT(MILLISECOND FROM (clock_timestamp() - v_inicio))::int, p_data;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_recalcular_score_operacional(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_recalcular_score_operacional(date) TO service_role;

DO $$ BEGIN
  PERFORM cron.unschedule('noc_score_operacional_diario');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'noc_score_operacional_diario',
  '0 7 * * *',
  $$ SELECT public.fn_recalcular_score_operacional(current_date); $$
);
