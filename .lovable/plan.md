# Frente A — Push: Consulta → Google Calendar do médico

Apenas espelho operacional. Operação interna continua sendo fonte da verdade. Falha no Google nunca quebra a consulta.

## 1. Migração

### Tabela `consulta_google_event`
- `consulta_id uuid PK` (FK → `consultas.id` ON DELETE CASCADE) — chave única garante idempotência.
- `medico_id uuid NOT NULL`
- `google_event_id text` (nullable até primeiro upsert ok)
- `calendar_id text NOT NULL DEFAULT 'primary'`
- `sync_status text NOT NULL DEFAULT 'pending'` — `pending | synced | failed | deleted | skipped`
- `last_synced_at timestamptz`
- `last_error text`
- `attempts int NOT NULL DEFAULT 0`
- `created_at`, `updated_at` (trigger padrão).

### RLS
- Service role: tudo.
- Médico dono (`medico_id` casa com seu `medicos.id`): SELECT only (para UI de status/“ressincronizar” no futuro).
- Sem INSERT/UPDATE/DELETE pelo cliente — só edge function.

### Index
- `idx_cge_status` em `(sync_status)` parcial onde status ≠ 'synced' (para retry futuro).

## 2. Edge function `google-calendar-sync`

`supabase/functions/google-calendar-sync/index.ts`, padrão das outras (CORS, JWT validation in-code, service role client).

### Input
```json
{ "action": "upsert" | "delete", "consulta_id": "uuid" }
```

### Quem chama
- Frontend autenticado (médico, colaborador, admin) ou service role (futuros crons).
- Validar JWT igual a `google-create-meet`.
- Para `action=upsert`: ler consulta + médico + paciente + serviço/especialidade via service role.
- Verifica que quem chama tem relação com a consulta (médico dono OU role admin/colaborador) — autorização simples.

### Lógica `upsert`
1. Carrega `consultas` + nomes (paciente, médico, especialidade/serviço).
2. Se status ∈ {`cancelada`, `no_show`} → delega para `delete` interno.
3. Carrega `medico_google_tokens`. Se não existe → marca `sync_status=skipped`, `last_error='medico sem Google conectado'`, retorna 200 com `skipped:true` (não é erro, médico simplesmente não conectou).
4. Refresh token se expirado (reuso da mesma rotina de `google-create-meet`; idealmente extraída para `_shared/google-auth.ts`).
5. Carrega linha de `consulta_google_event` por `consulta_id`.
6. Monta payload do evento:
   - `summary`: `"Consulta — {paciente_nome}"`
   - `description`: especialidade/serviço, modalidade, link interno (`https://<app>/app/medico/consultas?c={id}`), id da consulta. Se online com `link_sala` → inclui o link.
   - `start.dateTime` = `consultas.inicio`, `end.dateTime` = `consultas.fim`, `timeZone='America/Sao_Paulo'`.
   - **Não** cria conferenceData aqui (Meet é responsabilidade do `google-create-meet`). Se a consulta é online e ainda não tem `link_sala`, chama internamente o `google-create-meet` ANTES e depois faz o upsert (evento já entra com link Meet no description). Isso evita duplicar evento.
7. Se `google_event_id` existe → `PATCH /calendars/{calendar_id}/events/{eventId}`.
   - Se Google responder 404/410 → trata como “evento sumiu”, faz POST de novo e atualiza `google_event_id`.
8. Se não existe → `POST /calendars/{calendar_id}/events`.
9. Sucesso → upsert na tabela: `sync_status='synced'`, `google_event_id`, `last_synced_at=now()`, `last_error=null`, `attempts+1`.
10. Erro Google → `sync_status='failed'`, `last_error=<msg+status>`, `attempts+1`. **Retorna 200** com `success:false` para não quebrar quem chamou. Loga via `observabilidade-ingest` com `kind='google_sync_error'`.

### Lógica `delete`
1. Se não há linha em `consulta_google_event` ou `google_event_id` é null → marca `sync_status='deleted'` e retorna ok.
2. Senão → `DELETE /calendars/{calendar_id}/events/{eventId}`. 404/410 = considerado sucesso.
3. Sucesso → `sync_status='deleted'`, `last_synced_at=now()`, mantém `google_event_id` para auditoria.
4. Falha → `sync_status='failed'`, `last_error`, retorna 200 success:false.

### Idempotência
- Chave = `consulta_id`. Reenvio nunca cria 2 eventos: `INSERT ... ON CONFLICT (consulta_id) DO NOTHING` + leitura prévia.
- `requestId` Google não é usado aqui (é do conferenceData). Para evento puro a ausência de duplicação vem de a gente sempre consultar `google_event_id` antes.

### Permissões / config
- `supabase/config.toml`: NÃO precisa bloco — default `verify_jwt=false` + validação em código (igual aos vizinhos).

## 3. Hooks de chamada (frontend, mínimo invasivo)

Helper em `src/lib/googleCalendarSync.ts`:

```ts
export async function syncConsultaToGoogle(
  consultaId: string,
  action: 'upsert' | 'delete' = 'upsert'
) {
  try {
    await supabase.functions.invoke('google-calendar-sync', {
      body: { consulta_id: consultaId, action },
    });
  } catch (e) {
    console.warn('[google-sync] falhou silenciosamente', e);
  }
}
```

Plugar (fire-and-forget, sem await bloqueante na UI principal) nos pontos onde o status muda hoje:

- `AgendamentoConfirmar.tsx` — após criação da consulta pós-pagamento → `upsert`.
- `MedicoAgenda.tsx` — `iniciarConsulta` (após mudar para `confirmada`/`em_andamento`) → `upsert` (atualiza descrição/horário se houve drift).
- `FinalizarAtendimentoDialog` — após `concluida` → `upsert` (mantém histórico no Calendar; opcional, mas barato).
- Cancelamento (qualquer fluxo que seta `cancelada`/`no_show`) → `delete`. Ponto principal: telas de cancelamento da agenda do médico/colaborador. Mapear durante implementação.
- Reagendamento (futuro: hoje praticamente não existe mudança de horário; quando surgir, mesmo helper com `upsert`).

> Operação interna nunca depende do retorno. Se Google falha, consulta segue.

## 4. Observabilidade
- Erros gravados em `consulta_google_event.last_error`.
- Eventos resumidos enviados via `observabilidade-ingest` (`kind: 'google_sync'`, `meta: {action, success, status_code}`) — alimenta NOC sem precisar criar tela nova agora.

## 5. Teste mecânico (manual, sem UI nova)
1. Médico de teste com Google conectado.
2. Paciente cria consulta online → checa `consulta_google_event.sync_status='synced'` + evento aparece na conta Google do médico (com link Meet no description).
3. Reagendar (UPDATE manual via SQL em `consultas.inicio/fim` + chamar helper) → evento atualiza horário.
4. Cancelar consulta → evento some do Google Calendar; linha fica `sync_status='deleted'`.
5. Médico SEM Google conectado → consulta criada normalmente, linha fica `skipped`, nada quebra.
6. Forçar erro (revogar token na Google) → `sync_status='failed'`, consulta intacta.

## 6. Fora de escopo (próximas frentes)
- Frente B (freebusy / bloqueio de slots).
- Tela de status/“ressincronizar” em `MedicoConfiguracoes`.
- Card NOC dedicado a Google Sync.
- Cron de retry para `sync_status='failed'`.
- Two-way sync.
- Sincronização para paciente/colaborador.
- WhatsApp Meta (pausado).

## Ordem de execução
1. Migração `consulta_google_event` + RLS + index. (peço aprovação)
2. Extrair helper de refresh token Google para `_shared/google-auth.ts` e refatorar `google-create-meet` para usá-lo.
3. Criar `google-calendar-sync/index.ts`.
4. Criar `src/lib/googleCalendarSync.ts` e plugar nos 3-4 pontos de mudança de status.
5. Teste mecânico ponta a ponta com médico de teste.
