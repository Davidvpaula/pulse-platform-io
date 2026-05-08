## Teste de envio sandbox WhatsApp

Disparar a edge function `whatsapp-test-send` para o número **5511985045280** com o template `hello_world` e relatar o resultado.

## Passos

1. Chamar a function via `supabase--curl_edge_functions`:
   - `POST /whatsapp-test-send`
   - Body: `{ "to": "5511985045280" }`
   - Authorization: token da sessão atual (você está logado como admin no preview).

2. Ler o JSON de resposta e mostrar:
   - `ok` (true/false)
   - `http_status` retornado pela Meta
   - `wa_message_id`
   - `meta_request_id`
   - Se houver erro: código + mensagem da Meta (ex.: `131030` se o número não estiver na lista de destinatários autorizados).

3. Buscar logs com `supabase--edge_function_logs` da `whatsapp-test-send` para confirmar o ciclo completo (request → resposta Meta → request_id).

## Resultado esperado

- ✅ **Sucesso**: `wa_message_id` no formato `wamid.HBg...`, mensagem `hello_world` chega no seu WhatsApp em segundos.
- ❌ **Erro 131030**: número ainda não autorizado no painel sandbox da Meta — você precisa adicionar `+55 11 98504-5280` em "To" → "Manage phone number list" e confirmar via código SMS/WhatsApp.
- ❌ **Erro 401/403**: token inválido ou expirado.
- ❌ **Erro 190**: token expirado (sandbox expira em 24h por padrão).

Sem alteração de código nesta etapa — apenas execução do teste.
