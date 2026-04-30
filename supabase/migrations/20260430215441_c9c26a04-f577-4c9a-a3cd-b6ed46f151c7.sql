-- =========================================================
-- SEED: Serviços da plataforma + vínculos + agenda (MVP)
-- Idempotente: pode rodar várias vezes sem duplicar.
-- =========================================================

-- 1) Garante link de sala em médicos aprovados (necessário para slots online)
UPDATE public.medicos
   SET link_sala_padrao = COALESCE(link_sala_padrao, 'https://meet.jit.si/clinica-' || left(id::text, 8))
 WHERE status = 'aprovado'
   AND link_sala_padrao IS NULL;

-- 2) Cria 5 serviços da plataforma (slug é UNIQUE quando preenchido)
INSERT INTO public.servicos_financeiros
  (nome, slug, descricao, descricao_publica, tipo, modelo, comissao_pct,
   duracao_min, valor_paciente_centavos, prioridade, especialidade_id, ativo, ordem, icone)
SELECT v.nome, v.slug, v.descricao, v.descricao_publica, 'consulta'::servico_financeiro_tipo,
       'percentual'::servico_financeiro_modelo, v.comissao_pct,
       v.duracao_min, v.valor_centavos, v.prioridade,
       (SELECT id FROM public.especialidades WHERE slug = v.esp_slug LIMIT 1),
       true, v.ordem, v.icone
  FROM (VALUES
    ('Atendimento Imediato Clínico',  'atendimento-imediato',     'Consulta urgente com clínico geral disponível agora.', 'Fale com um clínico em minutos, 24/7.',           'clinica-geral', 40.00, 15, 8900,  10, 1, 'Zap'),
    ('Consulta Pediátrica Online',    'pediatria-online',         'Consulta de pediatria por telemedicina.',              'Acompanhe a saúde do seu filho sem sair de casa.', 'pediatria',     38.00, 30, 14900, 50, 2, 'Baby'),
    ('Cardiologia · Avaliação',       'cardiologia-avaliacao',    'Primeira avaliação cardiológica.',                     'Avaliação completa com cardiologista certificado.', 'cardiologia',  35.00, 40, 24900, 60, 3, 'HeartPulse'),
    ('Saúde Mental · Acolhimento',    'saude-mental-acolhimento', 'Sessão de acolhimento psiquiátrico/psicológico.',     'Conversa segura com profissional de saúde mental.', 'psiquiatria',  42.00, 50, 19900, 70, 4, 'Brain'),
    ('Check-up Preventivo',            'checkup-preventivo',       'Avaliação clínica geral preventiva.',                  'Cuide da sua saúde antes que apareça problema.',    'clinica-geral', 38.00, 30, 12900, 80, 5, 'ClipboardCheck')
  ) AS v(nome, slug, descricao, descricao_publica, esp_slug, comissao_pct, duracao_min, valor_centavos, prioridade, ordem, icone)
WHERE NOT EXISTS (SELECT 1 FROM public.servicos_financeiros sf WHERE sf.slug = v.slug);

-- 3) Marca o "Atendimento Imediato Clínico" como o serviço público de PA
INSERT INTO public.app_settings (key, value)
VALUES (
  'atendimento_imediato.servico_id',
  to_jsonb((SELECT id::text FROM public.servicos_financeiros WHERE slug = 'atendimento-imediato' LIMIT 1))
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4) Vincula TODOS os médicos aprovados aos 5 serviços (medico_servicos)
INSERT INTO public.medico_servicos (medico_id, servico_id, ativo, status, aderido_em)
SELECT m.id, sf.id, true, 'ativo'::medico_servico_status, now()
  FROM public.medicos m
 CROSS JOIN public.servicos_financeiros sf
 WHERE m.status = 'aprovado'
   AND sf.slug IN ('atendimento-imediato','pediatria-online','cardiologia-avaliacao','saude-mental-acolhimento','checkup-preventivo')
ON CONFLICT (medico_id, servico_id) DO UPDATE
   SET ativo = true, status = 'ativo'::medico_servico_status, desativado_em = NULL;

-- 5) Gera slots para os próximos 7 dias úteis, de 09h às 17h
--    Mistura: 3 slots particulares + 3 slots de serviço (rotacionando) por médico/dia.
DO $$
DECLARE
  v_med RECORD;
  v_dia DATE;
  v_servicos UUID[];
  v_count_servicos INT;
  v_slot_idx INT;
  v_inicio TIMESTAMPTZ;
  v_dur INT;
  v_servico_id UUID;
BEGIN
  SELECT array_agg(id ORDER BY ordem)
    INTO v_servicos
    FROM public.servicos_financeiros
   WHERE ativo = true
     AND slug IN ('atendimento-imediato','pediatria-online','cardiologia-avaliacao','saude-mental-acolhimento','checkup-preventivo');
  v_count_servicos := COALESCE(array_length(v_servicos, 1), 0);

  FOR v_med IN SELECT id FROM public.medicos WHERE status='aprovado' AND link_sala_padrao IS NOT NULL LOOP
    FOR v_dia IN SELECT (CURRENT_DATE + i)::date FROM generate_series(1, 9) i LOOP
      -- Pula sábado (6) e domingo (0)
      CONTINUE WHEN extract(dow FROM v_dia) IN (0, 6);

      FOR v_slot_idx IN 0..7 LOOP
        v_inicio := (v_dia::timestamp + time '09:00') + (v_slot_idx * interval '1 hour');
        v_inicio := v_inicio AT TIME ZONE 'America/Sao_Paulo';

        -- Alterna: índices pares = particular (NULL), ímpares = serviço da plataforma
        IF v_slot_idx % 2 = 0 THEN
          v_servico_id := NULL;
          v_dur := 30;
        ELSE
          v_servico_id := v_servicos[((v_slot_idx / 2) % v_count_servicos) + 1];
          SELECT duracao_min INTO v_dur FROM public.servicos_financeiros WHERE id = v_servico_id;
        END IF;

        -- Evita duplicar (constraint chk_slot_periodo + indexes)
        IF NOT EXISTS (
          SELECT 1 FROM public.agenda_slots
           WHERE medico_id = v_med.id
             AND inicio = v_inicio
        ) THEN
          INSERT INTO public.agenda_slots (medico_id, inicio, fim, modalidade, status, servico_id)
          VALUES (
            v_med.id,
            v_inicio,
            v_inicio + (v_dur || ' minutes')::interval,
            'online'::consulta_modalidade,
            'disponivel'::slot_status,
            v_servico_id
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- 6) Resumo
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT 'servicos_financeiros' tbl, count(*)::text v FROM public.servicos_financeiros
    UNION ALL SELECT 'medico_servicos ativos', count(*)::text FROM public.medico_servicos WHERE ativo=true
    UNION ALL SELECT 'slots particulares (futuro)', count(*)::text FROM public.agenda_slots WHERE servico_id IS NULL AND inicio > now()
    UNION ALL SELECT 'slots serviço plataforma (futuro)', count(*)::text FROM public.agenda_slots WHERE servico_id IS NOT NULL AND inicio > now()
  LOOP
    RAISE NOTICE '% = %', r.tbl, r.v;
  END LOOP;
END $$;
