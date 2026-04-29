REVOKE EXECUTE ON FUNCTION public.processar_pagamento_confirmado(text, text, pagamento_metodo, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.processar_pagamento_confirmado(text, text, pagamento_metodo, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.processar_pagamento_confirmado(text, text, pagamento_metodo, jsonb) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_processando(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_processando(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_processando(uuid, text, text) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_falho(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_falho(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.marcar_pagamento_falho(text, text) FROM authenticated;