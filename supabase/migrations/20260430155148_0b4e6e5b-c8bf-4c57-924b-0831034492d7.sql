-- 1) Converter consultas presenciais em online
UPDATE public.consultas
   SET modalidade = 'online'::consulta_modalidade,
       updated_at = now()
 WHERE modalidade = 'presencial';

-- 2) Converter slots presenciais em online
UPDATE public.agenda_slots
   SET modalidade = 'online'::consulta_modalidade,
       updated_at = now()
 WHERE modalidade = 'presencial';

-- 3) Preencher link_sala em consultas online sem link, usando link_sala_padrao do médico
UPDATE public.consultas c
   SET link_sala = m.link_sala_padrao,
       updated_at = now()
  FROM public.medicos m
 WHERE c.medico_id = m.id
   AND c.modalidade = 'online'
   AND (c.link_sala IS NULL OR c.link_sala = '')
   AND m.link_sala_padrao IS NOT NULL
   AND length(trim(m.link_sala_padrao)) > 0;