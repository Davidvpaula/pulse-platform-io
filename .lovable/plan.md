## Fase 8 — Edge Functions (Observabilidade + Fail-Closed)

Implementa as 4 edge functions novas e adiciona gates de segurança fail-closed nas existentes, **sem secrets reais** e mantendo `sandbox` como padrão absoluto.

### 1. Helper compartilhado

`supabase/functions/_shared/observabilidade.ts`
- `logEvento(admin, { modulo, evento, severity, conversation_id?, metadata? })` → insere em `observabilidade_eventos` (best-effort, nunca lança).
- `getWhatsappModo(admin)` → lê `app_settings.whatsapp.modo` (default `sandbox`).
- `getWabaHealth(admin)` → último registro de `meta_waba_health` (default `pending_credentials`).
- `canSendReal(admin)` → true só se `modo='producao'` AND `health.status='ok'` AND secrets META presentes. Caso contrário retorna `{ ok:false, reason }`.

Reutilizado por todas as 4 edges abaixo.

### 2. Novas Edge Functions

**`meta-health-check`** (POST, admin/supervisor)
- Sem secrets → retorna `pending_credentials`, grava em `meta_waba_health` (status `pending_credentials`) e em `observabilidade_eventos` (info).
- Com secrets → faz GET `graph.facebook.com/v19.0/{phone_number_id}` para validar token/qualidade. Atualiza `meta_waba_health`.
- Fail-closed: qualquer erro vira `status='error'`, log severity `error`.

**`meta-template-sync`** (POST, admin)
- Dry-run sempre que sem secrets: retorna lista vazia + `dry_run: true`, registra em `meta_template_sync_log` com status `dry_run`.
- Com secrets: GET `/{waba_id}/message_templates`, faz upsert em tabela existente de templates (sem alterar) e grava log.
- Nunca apaga templates locais.

**`observabilidade-ingest`** (POST, autenticado)
- Body validado: `{ modulo, evento, severity, conversation_id?, metadata? }`.
- Insere em `observabilidade_eventos` via service role.
- Rate-limit leve (memória in-process) para evitar flood.

**`observabilidade-export`** (GET, requer permissão `observabilidade.exportar`)
- Valida `has_permission(user, 'observabilidade.exportar')` via RPC.
- Query params: `from`, `to`, `modulo?`, `severity?`, `limit` (max 10k).
- Retorna CSV streaming com headers `Content-Type: text/csv` + `Content-Disposition: attachment`.
- Loga export em `observabilidade_eventos` (severity `info`, modulo `observabilidade`).

### 3. Ajustes Fail-Closed (mínimos, sem quebrar Fase 4-7)

**`whatsapp-enviar`** — adicionar gate no início, depois da auth:
```
const modo = await getWhatsappModo(admin);
const canReal = await canSendReal(admin);
if (modo !== 'producao' || !canReal.ok) {
  // mock_sent: persiste mensagem com status='mock_sent', NÃO chama Graph API
  await logEvento(admin, { modulo:'whatsapp', evento:'mock_sent', severity:'info', conversation_id, metadata:{ reason: canReal.reason ?? modo }});
  return jsonResp({ ok:true, mock_sent:true, reason: canReal.reason ?? `modo=${modo}` });
}
// resto do código real permanece intocado
```
- Janela 24h, templates, instances: tudo preservado.
- Se `META_TOKEN` ausente → continua retornando 503 (já fail-closed hoje), mas também loga em observabilidade.

**`whatsapp-webhook`** — apenas adicionar `logEvento` para eventos críticos (`message_failed`, `template_rejected`, `phone_quality_drop`). Sem mudar parsing/roteamento.

**`ai-assistant`** (Fase 6) — wrap try/catch existente: loga `latencia_ms`, `tokens`, `erro` em `observabilidade_eventos` (modulo `ia_assistente`). Comportamento funcional intacto.

**`ai-avatar-reply`** (Fase 7) — idem: loga decisão final (`replied`, `blocked`, `handoff`, `low_confidence`), latência e custo. Não altera lógica de `ai_avatar_should_reply`.

### 4. Validações Pós-Implementação

1. `curl meta-health-check` sem secrets → `{ status:'pending_credentials' }` + linha em `meta_waba_health` + evento info.
2. `curl whatsapp-enviar` em sandbox → `{ mock_sent:true }`, sem chamada Graph, mensagem persistida com status `mock_sent`, evento logado.
3. Forçar `app_settings.whatsapp.modo='producao'` SEM health ok → ainda `mock_sent` (fail-closed por health).
4. `observabilidade-ingest` com payload válido → 200 + linha gravada.
5. `observabilidade-export` sem permissão → 403; com permissão → CSV.
6. `ai-assistant` e `ai-avatar-reply` continuam respondendo normalmente; logs de latência aparecem.
7. Build TS limpo (sem editar `types.ts`).

### 5. Fora de escopo (proibido nesta etapa)

- Pedir secrets `META_*` reais.
- Alterar transporte/parsing do webhook.
- Mexer em Inbox, templates locais, RLS.
- Frontend cockpit (próxima etapa).

### Arquivos

Novos:
- `supabase/functions/_shared/observabilidade.ts`
- `supabase/functions/meta-health-check/index.ts`
- `supabase/functions/meta-template-sync/index.ts`
- `supabase/functions/observabilidade-ingest/index.ts`
- `supabase/functions/observabilidade-export/index.ts`

Editados (gates mínimos + logs):
- `supabase/functions/whatsapp-enviar/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/ai-avatar-reply/index.ts`

Após sua aprovação, executo tudo em sequência e reporto resultados de validação antes de seguir para o cockpit admin.