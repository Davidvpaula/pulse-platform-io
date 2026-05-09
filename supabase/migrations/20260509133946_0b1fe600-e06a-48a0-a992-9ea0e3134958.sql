
-- Patch fn_alertas_operacionais_scan: usar (evento, metadata)
CREATE OR REPLACE FUNCTION public.fn_alertas_operacionais_scan()
RETURNS TABLE (regra text, emitidos int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz := clock_timestamp();
  v_pa int := 0; v_md int := 0; v_in int := 0; v_ns int := 0; v_ct int := 0;
  r RECORD; v_aid uuid;
BEGIN
  BEGIN
    FOR r IN SELECT c.id, c.medico_id, c.paciente_id, c.inicio,
                    EXTRACT(EPOCH FROM (now() - c.inicio))/60 AS atraso_min
               FROM consultas c
              WHERE c.status='confirmada'
                AND c.inicio < now() - INTERVAL '20 minutes'
                AND c.inicio > now() - INTERVAL '6 hours'
                AND NOT EXISTS (SELECT 1 FROM consulta_status_log l
                                WHERE l.consulta_id=c.id AND l.status_novo='em_andamento')
    LOOP
      v_aid := fn_emitir_alerta_operacional('paciente_aguardando','aviso',
        'paciente_aguardando:'||r.id::text,'Paciente aguardando início',
        format('Consulta com %s min de atraso', round(r.atraso_min)),30,
        jsonb_build_object('atraso_min', round(r.atraso_min)),
        r.id, r.medico_id, r.paciente_id);
      IF v_aid IS NOT NULL THEN v_pa:=v_pa+1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    FOR r IN SELECT c.id, c.medico_id, c.paciente_id, c.inicio,
                    EXTRACT(EPOCH FROM (now() - c.inicio))/60 AS atraso_min
               FROM consultas c
              WHERE c.status='confirmada'
                AND c.inicio < now() - INTERVAL '15 minutes'
                AND c.inicio > now() - INTERVAL '6 hours'
                AND NOT EXISTS (SELECT 1 FROM consulta_status_log l
                                WHERE l.consulta_id=c.id AND l.status_novo='em_andamento')
    LOOP
      v_aid := fn_emitir_alerta_operacional('medico_atrasado','aviso',
        'medico_atrasado:'||r.medico_id::text||':'||to_char(r.inicio,'YYYYMMDDHH24MI'),
        'Médico atrasado',
        format('Início previsto há %s min', round(r.atraso_min)),30,
        jsonb_build_object('atraso_min', round(r.atraso_min), 'consulta_id', r.id),
        r.id, r.medico_id, r.paciente_id);
      IF v_aid IS NOT NULL THEN v_md:=v_md+1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    FOR r IN SELECT c.id, c.medico_id, c.paciente_id, c.inicio,
                    (SELECT MIN(l.created_at) FROM consulta_status_log l
                      WHERE l.consulta_id=c.id AND l.status_novo='em_andamento') AS inicio_real
               FROM consultas c
              WHERE c.status IN ('em_andamento','concluida')
                AND c.inicio > now() - INTERVAL '24 hours'
    LOOP
      IF r.inicio_real IS NOT NULL
         AND EXTRACT(EPOCH FROM (r.inicio_real - r.inicio))/60 > 15 THEN
        v_aid := fn_emitir_alerta_operacional('inicio_atrasado','info',
          'inicio_atrasado:'||r.id::text,'Consulta iniciada com atraso',
          format('Início real %s min após o previsto',
                 round(EXTRACT(EPOCH FROM (r.inicio_real - r.inicio))/60)),60,
          jsonb_build_object('atraso_inicio_min',
            round(EXTRACT(EPOCH FROM (r.inicio_real - r.inicio))/60)),
          r.id, r.medico_id, r.paciente_id);
        IF v_aid IS NOT NULL THEN v_in:=v_in+1; END IF;
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    FOR r IN SELECT medico_id, COUNT(*)::int AS qtd FROM consultas
              WHERE status='no_show' AND inicio > now() - INTERVAL '24 hours'
              GROUP BY medico_id HAVING COUNT(*) > 3
    LOOP
      v_aid := fn_emitir_alerta_operacional('excesso_no_show','critico',
        'excesso_no_show:'||r.medico_id::text||':'||to_char(now(),'YYYYMMDD'),
        'Excesso de no-show (24h)',
        format('%s no-shows nas últimas 24h', r.qtd),360,
        jsonb_build_object('qtd', r.qtd), NULL, r.medico_id, NULL);
      IF v_aid IS NOT NULL THEN v_ns:=v_ns+1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    FOR r IN SELECT c.medico_id, COUNT(*)::int AS qtd FROM consultas c
        JOIN LATERAL (SELECT MIN(created_at) AS cancelada_em FROM consulta_status_log
                       WHERE consulta_id=c.id AND status_novo='cancelada') lc ON TRUE
       WHERE c.status='cancelada' AND lc.cancelada_em IS NOT NULL
         AND c.inicio - lc.cancelada_em < INTERVAL '24 hours'
         AND lc.cancelada_em > now() - INTERVAL '24 hours'
       GROUP BY c.medico_id HAVING COUNT(*) > 3
    LOOP
      v_aid := fn_emitir_alerta_operacional('excesso_cancelamento_tardio','aviso',
        'excesso_cancelamento_tardio:'||r.medico_id::text||':'||to_char(now(),'YYYYMMDD'),
        'Excesso de cancelamentos tardios (24h)',
        format('%s cancelamentos com <24h', r.qtd),360,
        jsonb_build_object('qtd', r.qtd), NULL, r.medico_id, NULL);
      IF v_aid IS NOT NULL THEN v_ct:=v_ct+1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  BEGIN
    INSERT INTO observabilidade_eventos (modulo, evento, metadata)
    VALUES ('operacao','operacao.alertas_scan', jsonb_build_object(
      'paciente_aguardando',v_pa,'medico_atrasado',v_md,
      'inicio_atrasado',v_in,'excesso_no_show',v_ns,
      'excesso_cancelamento_tardio',v_ct,
      'total',v_pa+v_md+v_in+v_ns+v_ct,
      'duracao_ms', EXTRACT(MILLISECOND FROM (clock_timestamp()-v_inicio))::int
    ));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY VALUES
    ('paciente_aguardando',v_pa),('medico_atrasado',v_md),
    ('inicio_atrasado',v_in),('excesso_no_show',v_ns),
    ('excesso_cancelamento_tardio',v_ct);
END $$;

-- Patch evento bus em fn_recalcular_score_operacional (apenas o INSERT final)
CREATE OR REPLACE FUNCTION public.fn_recalcular_score_operacional(p_data date DEFAULT current_date)
RETURNS TABLE(medicos_processados int, duracao_ms int, data_referencia date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz := clock_timestamp();
  v_count int := 0;
  v_janela_inicio date := p_data - INTERVAL '30 days';
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.medico_id,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE c.status='concluida')::int AS concluidas,
           COUNT(*) FILTER (WHERE c.status='no_show')::int AS no_show,
           COUNT(*) FILTER (WHERE c.status='cancelada')::int AS canceladas,
           COUNT(*) FILTER (WHERE c.status='cancelada' AND EXISTS (
             SELECT 1 FROM consulta_status_log lc
              WHERE lc.consulta_id=c.id AND lc.status_novo='cancelada'
                AND c.inicio - lc.created_at < INTERVAL '24 hours'))::int AS cancelada_tarde,
           COUNT(*) FILTER (WHERE c.status IN ('concluida','em_andamento') AND EXISTS (
             SELECT 1 FROM consulta_status_log l
              WHERE l.consulta_id=c.id AND l.status_novo='em_andamento'
                AND l.created_at <= c.inicio + INTERVAL '10 minutes'))::int AS pontuais,
           COALESCE(AVG(
             EXTRACT(EPOCH FROM (
               (SELECT MIN(l.created_at) FROM consulta_status_log l
                 WHERE l.consulta_id=c.id AND l.status_novo='em_andamento') - c.inicio
             ))/60
           ) FILTER (WHERE c.status IN ('concluida','em_andamento')),0)::numeric AS atraso_medio_min
      FROM consultas c
     WHERE c.inicio::date BETWEEN v_janela_inicio AND p_data
     GROUP BY c.medico_id
  LOOP
    BEGIN
      DECLARE
        v_pont_rate numeric:=0; v_noshow_rate numeric:=0; v_canc_tarde_rate numeric:=0;
        v_score_pont numeric; v_score_canc numeric; v_score_ns numeric;
        v_score_total numeric;
      BEGIN
        IF (r.concluidas+r.no_show)>0 THEN
          v_pont_rate := r.pontuais::numeric/GREATEST(r.concluidas+r.no_show,1);
        END IF;
        IF r.total>0 THEN
          v_noshow_rate := r.no_show::numeric/r.total;
          v_canc_tarde_rate := r.cancelada_tarde::numeric/r.total;
        END IF;
        v_score_pont := GREATEST(0,LEAST(100,(v_pont_rate*100) - LEAST(GREATEST(r.atraso_medio_min,0),60)*0.8));
        v_score_ns := GREATEST(0,LEAST(100,100-(v_noshow_rate*200)));
        v_score_canc := GREATEST(0,LEAST(100,100-(v_canc_tarde_rate*200)));
        v_score_total := ROUND((v_score_pont*0.30+v_score_ns*0.25+v_score_canc*0.15+100*0.30),2);

        INSERT INTO medico_score_operacional (
          medico_id, score_pontualidade, score_cancelamento, score_no_show,
          score_resposta, score_uso_sistema, score_documentacao, score_total,
          detalhes, updated_at
        ) VALUES (
          r.medico_id,
          ROUND(v_score_pont,2), ROUND(v_score_canc,2), ROUND(v_score_ns,2),
          100, 100, 100, v_score_total,
          jsonb_build_object('data_referencia',p_data,'janela_dias',30,
            'total_consultas',r.total,'concluidas',r.concluidas,'no_show',r.no_show,
            'canceladas',r.canceladas,'cancelada_tarde',r.cancelada_tarde,
            'pontuais',r.pontuais,'pontualidade_pct',ROUND(v_pont_rate*100,2),
            'atraso_medio_min',ROUND(r.atraso_medio_min,2)),
          now()
        )
        ON CONFLICT (medico_id) DO UPDATE SET
          score_pontualidade=EXCLUDED.score_pontualidade,
          score_cancelamento=EXCLUDED.score_cancelamento,
          score_no_show=EXCLUDED.score_no_show,
          score_total=EXCLUDED.score_total,
          detalhes=EXCLUDED.detalhes, updated_at=now();
        v_count := v_count+1;
      END;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  BEGIN
    INSERT INTO observabilidade_eventos (modulo, evento, metadata)
    VALUES ('operacao','noc.score_recalculado', jsonb_build_object(
      'data_referencia',p_data,'medicos_processados',v_count,
      'duracao_ms', EXTRACT(MILLISECOND FROM (clock_timestamp()-v_inicio))::int));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY SELECT v_count, EXTRACT(MILLISECOND FROM (clock_timestamp()-v_inicio))::int, p_data;
END $$;
