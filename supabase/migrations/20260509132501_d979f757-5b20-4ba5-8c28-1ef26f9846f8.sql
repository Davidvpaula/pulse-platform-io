
-- ============================================================
-- Frente D — Parte A: Alertas Operacionais Determinísticos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.operacao_alertas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL,
  severidade      text NOT NULL CHECK (severidade IN ('info','aviso','critico')),
  titulo          text NOT NULL,
  descricao       text,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  alerta_key      text NOT NULL,
  consulta_id     uuid,
  medico_id       uuid,
  paciente_id     uuid,
  status          text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','reconhecido','resolvido','expirado')),
  responsavel_id  uuid,
  resolvido_em    timestamptz,
  resolucao_nota  text,
  cooldown_ate    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_operacao_alertas_key_aberto
  ON public.operacao_alertas (alerta_key) WHERE status = 'aberto';

CREATE INDEX IF NOT EXISTS ix_operacao_alertas_status_created
  ON public.operacao_alertas (status, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_operacao_alertas_severidade
  ON public.operacao_alertas (severidade, status);

ALTER TABLE public.operacao_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operacao_alertas_select_admin" ON public.operacao_alertas;
CREATE POLICY "operacao_alertas_select_admin"
  ON public.operacao_alertas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

DROP POLICY IF EXISTS "operacao_alertas_update_admin" ON public.operacao_alertas;
CREATE POLICY "operacao_alertas_update_admin"
  ON public.operacao_alertas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_operacao_alertas_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_operacao_alertas_touch ON public.operacao_alertas;
CREATE TRIGGER trg_operacao_alertas_touch BEFORE UPDATE ON public.operacao_alertas
FOR EACH ROW EXECUTE FUNCTION public.tg_operacao_alertas_touch();

-- ============================================================
-- Função emissora idempotente
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_emitir_alerta_operacional(
  p_tipo text,
  p_severidade text,
  p_alerta_key text,
  p_titulo text,
  p_descricao text DEFAULT NULL,
  p_cooldown_min int DEFAULT 30,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_consulta_id uuid DEFAULT NULL,
  p_medico_id uuid DEFAULT NULL,
  p_paciente_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_existing_open uuid;
  v_recent_resolved_cd timestamptz;
BEGIN
  -- já existe alerta aberto com mesma key?
  SELECT id INTO v_existing_open FROM operacao_alertas
   WHERE alerta_key = p_alerta_key AND status = 'aberto' LIMIT 1;
  IF v_existing_open IS NOT NULL THEN RETURN NULL; END IF;

  -- existe alerta resolvido recentemente cujo cooldown ainda não expirou?
  SELECT MAX(cooldown_ate) INTO v_recent_resolved_cd FROM operacao_alertas
   WHERE alerta_key = p_alerta_key AND status <> 'aberto';
  IF v_recent_resolved_cd IS NOT NULL AND v_recent_resolved_cd > now() THEN
    RETURN NULL;
  END IF;

  INSERT INTO operacao_alertas (
    tipo, severidade, titulo, descricao, payload, alerta_key,
    consulta_id, medico_id, paciente_id, cooldown_ate
  ) VALUES (
    p_tipo, p_severidade, p_titulo, p_descricao, COALESCE(p_payload,'{}'::jsonb), p_alerta_key,
    p_consulta_id, p_medico_id, p_paciente_id, now() + make_interval(mins => GREATEST(p_cooldown_min,1))
  ) RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.fn_emitir_alerta_operacional(text,text,text,text,text,int,jsonb,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_emitir_alerta_operacional(text,text,text,text,text,int,jsonb,uuid,uuid,uuid) TO service_role;

-- ============================================================
-- Scan determinístico (batch)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_alertas_operacionais_scan()
RETURNS TABLE (regra text, emitidos int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz := clock_timestamp();
  v_total int := 0;
  v_pa int := 0; v_md int := 0; v_in int := 0; v_ns int := 0; v_ct int := 0;
  r RECORD;
  v_aid uuid;
BEGIN
  -- Regra 1: paciente aguardando >20min (confirmada, sem em_andamento)
  BEGIN
    FOR r IN
      SELECT c.id, c.medico_id, c.paciente_id, c.data_hora_inicio,
             EXTRACT(EPOCH FROM (now() - c.data_hora_inicio))/60 AS atraso_min
        FROM consultas c
       WHERE c.status = 'confirmada'
         AND c.data_hora_inicio < now() - INTERVAL '20 minutes'
         AND c.data_hora_inicio > now() - INTERVAL '6 hours'
         AND NOT EXISTS (
           SELECT 1 FROM consulta_status_log l
            WHERE l.consulta_id = c.id AND l.status_novo = 'em_andamento'
         )
    LOOP
      v_aid := fn_emitir_alerta_operacional(
        'paciente_aguardando','aviso',
        'paciente_aguardando:'||r.id::text,
        'Paciente aguardando início',
        format('Consulta com %s min de atraso sem início registrado', round(r.atraso_min)),
        30,
        jsonb_build_object('atraso_min', round(r.atraso_min)),
        r.id, r.medico_id, r.paciente_id
      );
      IF v_aid IS NOT NULL THEN v_pa := v_pa + 1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Regra 2: médico atrasado >15min (mesma janela, severidade aviso, key por médico+slot)
  BEGIN
    FOR r IN
      SELECT c.id, c.medico_id, c.paciente_id, c.data_hora_inicio,
             EXTRACT(EPOCH FROM (now() - c.data_hora_inicio))/60 AS atraso_min
        FROM consultas c
       WHERE c.status = 'confirmada'
         AND c.data_hora_inicio < now() - INTERVAL '15 minutes'
         AND c.data_hora_inicio > now() - INTERVAL '6 hours'
         AND NOT EXISTS (
           SELECT 1 FROM consulta_status_log l
            WHERE l.consulta_id = c.id AND l.status_novo = 'em_andamento'
         )
    LOOP
      v_aid := fn_emitir_alerta_operacional(
        'medico_atrasado','aviso',
        'medico_atrasado:'||r.medico_id::text||':'||to_char(r.data_hora_inicio,'YYYYMMDDHH24MI'),
        'Médico atrasado',
        format('Início previsto há %s min sem registro de em_andamento', round(r.atraso_min)),
        30,
        jsonb_build_object('atraso_min', round(r.atraso_min), 'consulta_id', r.id),
        r.id, r.medico_id, r.paciente_id
      );
      IF v_aid IS NOT NULL THEN v_md := v_md + 1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Regra 3: consulta iniciada com atraso >15min (informativo)
  BEGIN
    FOR r IN
      SELECT c.id, c.medico_id, c.paciente_id, c.data_hora_inicio,
             (SELECT MIN(l.created_at) FROM consulta_status_log l
               WHERE l.consulta_id = c.id AND l.status_novo='em_andamento') AS inicio_real
        FROM consultas c
       WHERE c.status IN ('em_andamento','concluida')
         AND c.data_hora_inicio > now() - INTERVAL '24 hours'
    LOOP
      IF r.inicio_real IS NOT NULL
         AND EXTRACT(EPOCH FROM (r.inicio_real - r.data_hora_inicio))/60 > 15 THEN
        v_aid := fn_emitir_alerta_operacional(
          'inicio_atrasado','info',
          'inicio_atrasado:'||r.id::text,
          'Consulta iniciada com atraso',
          format('Início real %s min após o previsto',
                 round(EXTRACT(EPOCH FROM (r.inicio_real - r.data_hora_inicio))/60)),
          60,
          jsonb_build_object('atraso_inicio_min', round(EXTRACT(EPOCH FROM (r.inicio_real - r.data_hora_inicio))/60)),
          r.id, r.medico_id, r.paciente_id
        );
        IF v_aid IS NOT NULL THEN v_in := v_in + 1; END IF;
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Regra 4: excesso de no_show (>3 em 24h por médico)
  BEGIN
    FOR r IN
      SELECT medico_id, COUNT(*)::int AS qtd
        FROM consultas
       WHERE status = 'no_show'
         AND data_hora_inicio > now() - INTERVAL '24 hours'
       GROUP BY medico_id
      HAVING COUNT(*) > 3
    LOOP
      v_aid := fn_emitir_alerta_operacional(
        'excesso_no_show','critico',
        'excesso_no_show:'||r.medico_id::text||':'||to_char(now(),'YYYYMMDD'),
        'Excesso de no-show (24h)',
        format('%s no-shows nas últimas 24h', r.qtd),
        360,
        jsonb_build_object('qtd', r.qtd),
        NULL, r.medico_id, NULL
      );
      IF v_aid IS NOT NULL THEN v_ns := v_ns + 1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Regra 5: excesso de cancelamento tardio (>3 em 24h por médico)
  BEGIN
    FOR r IN
      SELECT medico_id, COUNT(*)::int AS qtd
        FROM consultas
       WHERE status = 'cancelada'
         AND cancelada_em IS NOT NULL
         AND data_hora_inicio - cancelada_em < INTERVAL '24 hours'
         AND cancelada_em > now() - INTERVAL '24 hours'
       GROUP BY medico_id
      HAVING COUNT(*) > 3
    LOOP
      v_aid := fn_emitir_alerta_operacional(
        'excesso_cancelamento_tardio','aviso',
        'excesso_cancelamento_tardio:'||r.medico_id::text||':'||to_char(now(),'YYYYMMDD'),
        'Excesso de cancelamentos tardios (24h)',
        format('%s cancelamentos com <24h de antecedência', r.qtd),
        360,
        jsonb_build_object('qtd', r.qtd),
        NULL, r.medico_id, NULL
      );
      IF v_aid IS NOT NULL THEN v_ct := v_ct + 1; END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  v_total := v_pa + v_md + v_in + v_ns + v_ct;

  -- Log no event bus
  BEGIN
    INSERT INTO observabilidade_eventos (modulo, tipo, payload)
    VALUES ('operacao','operacao.alertas_scan', jsonb_build_object(
      'paciente_aguardando', v_pa,
      'medico_atrasado', v_md,
      'inicio_atrasado', v_in,
      'excesso_no_show', v_ns,
      'excesso_cancelamento_tardio', v_ct,
      'total', v_total,
      'duracao_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_inicio))::int
    ));
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN QUERY VALUES
    ('paciente_aguardando', v_pa),
    ('medico_atrasado', v_md),
    ('inicio_atrasado', v_in),
    ('excesso_no_show', v_ns),
    ('excesso_cancelamento_tardio', v_ct);
END $$;

REVOKE ALL ON FUNCTION public.fn_alertas_operacionais_scan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_alertas_operacionais_scan() TO service_role;

-- Cron a cada 5 minutos
DO $$ BEGIN PERFORM cron.unschedule('noc_alertas_scan'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'noc_alertas_scan',
  '*/5 * * * *',
  $$ SELECT public.fn_alertas_operacionais_scan(); $$
);

-- ============================================================
-- Tabela noc_resumos_ia (Parte B será preenchida pela edge function)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.noc_resumos_ia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  janela_inicio   timestamptz NOT NULL,
  janela_fim      timestamptz NOT NULL,
  resumo          text NOT NULL,
  gargalos        jsonb NOT NULL DEFAULT '[]'::jsonb,
  sugestoes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  risco_geral     text NOT NULL DEFAULT 'baixo' CHECK (risco_geral IN ('baixo','medio','alto')),
  modelo          text,
  tokens_entrada  int,
  tokens_saida    int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_noc_resumos_ia_created ON public.noc_resumos_ia (created_at DESC);

ALTER TABLE public.noc_resumos_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "noc_resumos_ia_select_admin" ON public.noc_resumos_ia;
CREATE POLICY "noc_resumos_ia_select_admin"
  ON public.noc_resumos_ia FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
