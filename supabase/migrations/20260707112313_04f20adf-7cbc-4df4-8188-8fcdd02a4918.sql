
-- Restaura EXECUTE para anon/authenticated nas funções públicas legítimas
-- (chamadas pelas páginas /, /atendimento-imediato, /servicos, etc.)

GRANT EXECUTE ON FUNCTION public.public_home_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_pa_slots_disponiveis(date) TO anon, authenticated;
