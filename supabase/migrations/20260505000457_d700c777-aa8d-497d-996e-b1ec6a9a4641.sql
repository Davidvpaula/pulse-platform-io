
DROP FUNCTION IF EXISTS public.criar_consulta_com_reserva(uuid, uuid, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.criar_consulta_com_reserva(uuid, uuid, text, text, text, text, date, public.sexo_biologico, text);
DROP FUNCTION IF EXISTS public.fn_servico_reservar_slot(uuid, timestamptz);
