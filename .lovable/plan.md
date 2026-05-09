## Objetivo

Criar um teste **isolado e manual** de envio real via WhatsApp Cloud API (Meta) usando o número secundário de testes, sem tocar em sandbox, produção, webhook ou Inbox.

Já existe `supabase/functions/whatsapp-test-send/index.ts` que envia **template** (`hello_world`) via `v25.0`. Para o seu caso (mensagem `text` livre, `v21.0`, validação ponta-a-ponta) o caminho mais limpo é uma **nova edge function dedicada**, deixando a existente intacta.

---

## Escopo

### O que será feito
1. Nova edge function `whatsapp-cloud-test` (isolada, não toca nas demais).
2. Nova página admin `/app/admin/whatsapp-cloud-test` (acesso só admin) com:
   - Campo "Número destino" (E.164 sem `+`).
   - Campo "Mensagem" (default: `"Teste real da API WhatsApp Cloud - Lasmar"`).
   - Botão "Enviar teste real".
   - Painel de resposta crua da Meta (`http_status`, `wa_message_id`, `error.*`, `fbtrace_id`).
   - Tabela com últimos 20 envios feitos por essa página (lida da nova tabela de log).
3. Tabela de log dedicada `whatsapp_cloud_test_log` (não mistura com tabelas reais de mensagens/Inbox).
4. Item de menu admin "WhatsApp Cloud — Teste real".

### O que **NÃO** será feito (respeitando o pedido)
- ❌ Não altera `whatsapp.modo` (sandbox continua sandbox).
- ❌ Não altera `whatsapp-enviar`, `whatsapp-webhook`, Inbox, conversas, automações, templates.
- ❌ Não cria/processa webhook de status.
- ❌ Não toca em `mensagens`, `conversas`, `meta_waba_health`, `producao_*`.
- ❌ Não mexe em `whatsapp-test-send` existente.

---

## Edge function `whatsapp-cloud-test`

- `verify_jwt = false` (padrão Lovable) + validação manual em código.
- Requer Authorization Bearer + role `admin` (`has_role`).
- Lê secrets: `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`. Se faltar → 503 `not_configured`.
- Versão fixa: `GRAPH_API_VERSION = "v21.0"` (constante, conforme pedido).
- Body validado com Zod: `to` (10–15 dígitos), `message` (1–1000 chars).
- Chama `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages` com payload `type:text`.
- Loga em `whatsapp_cloud_test_log`: `enviado_por`, `to`, `message`, `http_status`, `wa_message_id`, `meta_request_id`, `error_code`, `error_message`, `raw_response`, `created_at`.
- Retorna JSON cru da Meta + metadata (status HTTP, request_id, wa_message_id, erros decompostos).

---

## Tabela `whatsapp_cloud_test_log`

```text
id              uuid pk
enviado_por     uuid (auth.uid)
to_number       text
message         text
http_status     int
wa_message_id   text null
meta_request_id text null
error_code      int null
error_message   text null
raw_response    jsonb
created_at      timestamptz default now()
```

- RLS ON.
- SELECT/INSERT permitidos só para `has_role(auth.uid(),'admin')`.
- Sem trigger, sem realtime, sem integração com observabilidade (mantém leve e isolado).

---

## Página `/app/admin/whatsapp-cloud-test`

- Protegida por `ProtectedRoute` + checagem `admin`.
- Banner amarelo: *"Ambiente de teste — não altera sandbox nem produção. Use apenas o número secundário de testes."*
- Form simples (input número + textarea mensagem + botão).
- Ao enviar: chama `supabase.functions.invoke("whatsapp-cloud-test", { body })`.
- Mostra resposta da Meta em `<pre>` formatado.
- Lista últimos 20 logs (com badge verde/vermelho por `http_status`).
- Sem dependência do Inbox/Conversas.

---

## Validação dos 6 objetivos

| Objetivo | Como valida |
|---|---|
| 1. Token permanente | Se 401/403 da Meta → token inválido/expirado. 200 → token OK. |
| 2. Envio real | `wa_message_id` presente + chega no celular. |
| 3. Status entregue | Visível no app WhatsApp do destinatário (✓✓). Webhook fica para fase futura. |
| 4. Logs | Tabela `whatsapp_cloud_test_log` + console da edge function. |
| 5. Resposta Meta | `raw_response` cru exibido no painel. |
| 6/7. Sem webhook/Inbox | Nada é tocado nesses módulos. |

---

## Arquivos previstos

- `supabase/migrations/<ts>_whatsapp_cloud_test_log.sql` — tabela + RLS.
- `supabase/functions/whatsapp-cloud-test/index.ts` — função nova.
- `src/pages/app/admin/AdminWhatsappCloudTest.tsx` — página nova.
- `src/App.tsx` — rota nova `/app/admin/whatsapp-cloud-test`.
- `src/lib/menu/menuCatalog.ts` — entrada de menu admin (se aplicável).

Nenhum outro arquivo é tocado.

---

## Checagens pós-deploy

1. Abrir página, enviar para o número secundário de testes.
2. Conferir `http_status=200` + `wa_message_id`.
3. Conferir mensagem chegando no WhatsApp do destinatário.
4. Conferir linha em `whatsapp_cloud_test_log`.
5. Confirmar que `whatsapp.modo` continua `sandbox` e Inbox segue intocado.
