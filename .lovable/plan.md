
# OAuth Google Calendar + Meet por Médico

## Situação atual
- A tela `MedicoConfiguracoes.tsx` tem uma seção "Google Meet" com um campo de **link fixo** e um badge "Não conectado" para Google Calendar (estático, sem lógica real).
- A tabela `medicos` tem `link_sala_padrao` (texto) para o link fixo.
- Não existe nenhuma infraestrutura OAuth per-user no banco nem no backend.

## O que será implementado

### 1. Migração de banco (nova tabela `medico_google_tokens`)

Tabela para armazenar tokens OAuth de cada médico:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| medico_id | uuid FK medicos.id UNIQUE | 1 token por médico |
| access_token | text | Token criptografado |
| refresh_token | text | Para renovação automática |
| token_expiry | timestamptz | Quando o access_token expira |
| scopes | text | Escopos autorizados |
| google_email | text | Email Google conectado |
| created_at / updated_at | timestamptz | Auditoria |

RLS: médico só lê/atualiza o próprio registro.

### 2. Edge function `google-oauth` (2 rotas)

**POST /google-oauth** com `action`:

- `action: "get-auth-url"` -- Gera a URL de consentimento OAuth com escopos `calendar.events` + `calendar.readonly`. Retorna URL para o frontend redirecionar.
- `action: "exchange-code"` -- Recebe o `code` do callback OAuth, troca por access_token + refresh_token via Google, salva na tabela `medico_google_tokens`.
- `action: "disconnect"` -- Revoga o token no Google e deleta o registro.
- `action: "status"` -- Retorna se está conectado e qual email.

**Nota**: As credenciais OAuth (Client ID + Client Secret) do Google Cloud Console do projeto serão necessárias como secrets. Seguindo a regra do projeto, deixaremos as rotas prontas mas **não pediremos os secrets agora** -- ativação na etapa final de integração.

### 3. Edge function `google-create-meet` 

Chamada ao criar/confirmar consulta:
- Busca o token do médico em `medico_google_tokens`
- Refresha se expirado
- Cria evento no Google Calendar com `conferenceData` (Google Meet automático)
- Retorna o link do Meet gerado
- Salva o link na consulta (`consultas.link_sala`)

### 4. UI -- Seção Google Meet em `MedicoConfiguracoes.tsx`

Substituir a seção atual estática por:

- **Não conectado**: Botão "Conectar Google Calendar" que inicia o fluxo OAuth
- **Conectado**: Mostra email conectado, badge verde, botão "Desconectar"
- **Tipo de link**: Muda de select para toggle "Fixo / Dinâmico (Google Calendar)"
  - Fixo: campo de texto (como hoje)
  - Dinâmico: indica que será gerado automaticamente por consulta
- **Callback route**: Rota `/medico/google-callback` para receber o code do OAuth

### 5. Lógica de consulta -- link dinâmico

No fluxo de criação de consulta:
- Se o médico tem token Google válido e tipo "dinâmico": chama `google-create-meet`
- Senão: usa `link_sala_padrao` fixo (comportamento atual)

## Arquitetura do fluxo

```text
Médico clica "Conectar"
  -> Frontend chama edge fn "google-oauth" (get-auth-url)
  -> Redireciona para Google Consent Screen
  -> Google redireciona para /medico/google-callback?code=xxx
  -> Frontend chama edge fn "google-oauth" (exchange-code)
  -> Tokens salvos em medico_google_tokens
  -> Badge "Conectado" aparece

Consulta criada/confirmada:
  -> Backend verifica se médico tem token Google
  -> Se sim: cria evento Calendar + Meet link
  -> Salva link_sala na consulta
```

## Detalhes de segurança
- Tokens armazenados server-side (edge functions), nunca expostos ao frontend
- RLS garante isolamento por médico
- Refresh automático no backend antes de criar evento

## Secrets necessários (para etapa de integração final)
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

## Arquivos afetados
- **Nova migração**: tabela `medico_google_tokens` + RLS
- **Nova edge function**: `supabase/functions/google-oauth/index.ts`
- **Nova edge function**: `supabase/functions/google-create-meet/index.ts`
- **Editar**: `src/pages/app/medico/MedicoConfiguracoes.tsx` (seção Google Meet)
- **Nova rota**: página de callback OAuth em `src/pages/app/medico/MedicoGoogleCallback.tsx`
- **Editar**: Router (App.tsx) para adicionar a rota de callback
