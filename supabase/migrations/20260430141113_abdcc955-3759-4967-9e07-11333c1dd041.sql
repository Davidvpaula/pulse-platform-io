REVOKE ALL ON FUNCTION public.validar_e_aplicar_cupom(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remover_cupom_pagamento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_e_aplicar_cupom(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_cupom_pagamento(uuid) TO authenticated;