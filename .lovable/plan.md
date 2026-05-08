## Objetivo

Configurar integração mecânica da API oficial WhatsApp Meta em modo **sandbox/teste** para validar conectividade. Arquitetura preparada para trocar token/número/WABA no futuro **sem refatorar código** — basta atualizar secrets.

## Princípio de arquitetura (futuro-proof)

- Nada de token, phone_number_id ou verify_token no código — tudo via `Deno.env.get()`.
- Versão da Graph API isolada em constante (`GRAPH_API_VERSION = "v25.0"`).
- Endpoint montado dinamicamente: `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`.
- Quando trocarmos para produção: só atualizar os 3 secrets no painel Lovable Cloud. Zero deploy de código.

## Etapas

### 1. Cadastrar 3 secrets no Lovable Cloud

Via tool `add_secret` (você confirma os valores num form seguro — eu não toco nos valores aqui no chat):

- `META_WHATSAPP_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_VERIFY_TOKEN`

Observação: o projeto hoje usa `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` na função `whatsapp-enviar` (produção). Vou manter os novos secrets com prefixo `META_*` para deixar **explícito que são sandbox/teste**, sem colidir com a função de produção.

### 2. Criar edge function `whatsapp-test-send`

Caminho: `supabase/functions/whatsapp-test-send/index.ts`

Comportamento:

- **Auth obrigatório**: só usuário com role `admin` pode disparar (evita abuso e protege quota sandbox).
- Validar que os 3 secrets existem; se faltar algum, retorna `503` com lista do que falta (mensagem clara para troubleshooting).
- Aceita `POST { to: "5531999999999" }` — número de destino precisa estar autorizado no painel sandbox da Meta.
- Monta payload `hello_world` (template padrão sandbox, idioma `en_US`).
- Faz `POST` para `https://graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages` com `Bearer ${META_WHATSAPP_TOKEN}`.
- Retorna o JSON cru da Meta + status HTTP — útil pra debugar erros (token expirado, número não autorizado, etc.).
- Loga request_id da Meta no console pra rastrear no painel.
- CORS habilitado.

Sem deduplicação, sem audit log, sem opt-in LGPD — é só teste mecânico. A função de produção (`whatsapp-enviar`) já tem tudo isso.

### 3. Registrar no `supabase/config.toml`

Adicionar bloco `[functions.whatsapp-test-send]` somente se precisarmos de `verify_jwt` diferente do default. **Vamos manter o default** (verify_jwt = false) e validar JWT manualmente no código + checar role admin — padrão do projeto.

### 4. Validação manual

Após deploy, testo a function via `curl_edge_functions` enviando `{ "to": "<seu número autorizado no sandbox Meta>" }` e mostro:

- Resposta da Meta (com `messages[0].id`).
- Logs da edge function.
- Confirmação de que mensagem `hello_world` chegou no WhatsApp do número de teste.

### 5. NÃO faço nesta etapa (fica para "integração total" final)

- Webhook receptor (`whatsapp-webhook` já existe vazio — não mexo).
- Templates customizados.
- UI no painel admin pra disparar teste (se quiser, adiciono botão depois).
- Vincular ao módulo de Comunicação / Inbox.
- Trocar a função `whatsapp-enviar` para usar os novos secrets `META_*` (faremos quando promover sandbox → produção).

## Arquivos

**Novo:**
- `supabase/functions/whatsapp-test-send/index.ts`

**Sem alterações em:**
- `whatsapp-enviar` (produção, intocada)
- `whatsapp-webhook`
- Frontend
- Banco de dados / migrations

## Pergunta antes de implementar

Você tem **um número de WhatsApp autorizado no painel sandbox da Meta** pra receber o `hello_world` no teste? (Sandbox da Meta só envia pra números pré-autorizados na lista de "recipientes de teste".) Se sim, me passa no momento do teste — não preciso agora pra criar a função.
