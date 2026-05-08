## Fase 6 — IA Assistiva (Copiloto)

Objetivo: adicionar uma camada de IA **assistiva** (sugere/resume/alerta) ao Inbox da Fase 5, sem autonomia, sem tocar no Avatar autônomo (Fase 7) já existente, sem alterar webhook/Fase 4/Fase 5.

### Estado atual já verificado

- Já existe `ai_settings` (singular, do **IA Avatar autônomo**), `ai_logs`, `ai_handoff_rules`, edge function `ai-respond` e página `/app/admin/comunicacao/ia-avatar`. **Nada disso será tocado.**
- `LOVABLE_API_KEY` já está configurado e em uso pelo `ai-respond`.
- Fase 5 entregue: presença, fila, SLA, status operacional, typing, claim/resolver, painel Operação.
- Inbox tem painel direito modular onde encaixar o painel IA.

### Arquitetura proposta (SAFE/FREEZE)

```text
                     Inbox (Fase 5)
                          │
        ┌─────────────────┴─────────────────┐
        │  ConversationAiPanel (lateral)    │
        │   Resumo • Intenção • Risco       │
        │   Sugestões • Score • Auditoria   │
        └─────────────────┬─────────────────┘
                          │  invoke
                ┌─────────▼──────────┐
                │ edge: ai-assistant │  (ações: summarize | suggest_reply
                └─────────┬──────────┘   | classify_intent | detect_urgency
                          │                | detect_risk | suggest_department)
                ┌─────────▼──────────┐
                │ _shared/ai-providers.ts │  AIProvider interface
                │  - LovableProvider  │
                │  - (futuros)        │
                └─────────┬──────────┘
                          │
                  ai_audit_logs (sempre)
                  conversation_ai_* (cache)
```

Decisão importante: **não reaproveitar `ai_settings`** (é do Avatar). Será criada `ai_assistant_settings` separada — evita acoplar duas semânticas distintas.

### 1. Migration — novas tabelas

- `ai_assistant_settings` (singleton): `enabled`, `provider`, `model`, `temperature`, `max_tokens`, `auto_summary`, `auto_intent_detection`, `auto_urgency_detection`, `auto_reply_suggestion`, `daily_token_budget`, `created_by`.
- `ai_prompts`: `nome`, `tipo` (`summary|reply|intent|urgency|risk|department`), `system_prompt`, `versao`, `ativo`. Único `(tipo, ativo=true)`.
- `conversation_ai_summaries`: `conversation_id`, `summary`, `summary_type` (`short|operational|points|sentiment`), `last_message_id` (cache invalidation), `provider`, `model`, `generated_by`, `created_at`.
- `conversation_ai_intents`: `conversation_id`, `detected_intent`, `confidence`, `provider`, `created_at` (uma linha vigente por conversa, mais histórico).
- `conversation_ai_risk_analysis`: `conversation_id`, `risk_level` (`baixo|medio|alto|critico`), `signals jsonb`, `score numeric`, `requires_supervisor`, `created_at`.
- `ai_audit_logs`: `conversation_id`, `action`, `provider`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_cents`, `latency_ms`, `prompt_hash`, `response_excerpt`, `accepted_by_user` (`true|false|null`), `actor_id`, `created_at`.

RLS: leitura para quem tem `ia.assistiva.usar` ou `ver_todas`; escrita só via edge (service role) ou supervisor.

### 2. Permissões novas

`ia.assistiva.usar`, `ia.assistiva.supervisionar`, `ia.assistiva.configurar`, `ia.assistiva.metricas`, `ia.assistiva.prompts`. Adicionar em `roleTemplates.ts`:
- Admin: todas
- Colaborador ilimitado: `usar`
- Colaborador limitado: `usar` (opt-in via setting)
- Médico: nenhuma

### 3. Edge function `ai-assistant`

Arquivo único `supabase/functions/ai-assistant/index.ts` + `_shared/ai-providers.ts`.

Body: `{ action, conversation_id, options? }` onde `action ∈ {summarize, suggest_reply, classify_intent, detect_urgency, detect_risk, suggest_department}`.

Fluxo:
1. `auth.getUser()` (não getClaims) → valida + checa `has_permission(ia.assistiva.usar)`.
2. Lê `ai_assistant_settings`. Se `enabled=false` → 403.
3. Verifica orçamento diário (`SUM(input+output) HOJE < daily_token_budget`).
4. Carrega prompt vigente em `ai_prompts` por `tipo`.
5. Carrega últimas N mensagens da conversa (limite ~30, contexto ~3 KB).
6. Chama `AIProvider.<metodo>()`. Provider default = **LovableProvider** (Lovable AI Gateway, modelo `google/gemini-3-flash-preview` por padrão; configurável).
7. Persiste resultado em `conversation_ai_*` (cache) + sempre em `ai_audit_logs`.
8. Retorna JSON compacto + id do log (para o front marcar `accepted_by_user`).

Cache: `summarize` reusa último summary se `last_message_id` igual (sem nova msg). `classify_intent` regenera no máx. 1×/5min ou após N msgs novas. Debounce no front.

### 4. Adapter `_shared/ai-providers.ts`

```ts
interface AIProvider {
  summarize(messages, opts): Promise<{ summary, tokens, latency }>;
  suggestReply(messages, opts);
  classifyIntent(messages, opts);
  detectUrgency(messages, opts);
  detectRisk(messages, opts);
  suggestDepartment(messages, opts);
}
```

Implementação concreta inicial: `LovableProvider` (chama `https://ai.gateway.lovable.dev/v1/chat/completions` com `Lovable-API-Key` header). Estrutura preparada para `OpenAIProvider`/`AnthropicProvider` futuros sem refator.

Saída estruturada via `response_format: json_object` + schemas Zod no edge.

### 5. Componentes UI novos

- `src/components/comunicacao/ai/ConversationAiPanel.tsx` — painel colapsável com abas: **Resumo / Intenção / Risco / Sugestões / Auditoria**. Botões "Gerar resumo", "Sugerir resposta".
- `ConversationAiSummary.tsx` — resumo curto + operacional + pontos.
- `ConversationAiReplySuggestion.tsx` — gera 1–3 sugestões; botão "Usar" copia para o `draft` do Inbox via callback (NUNCA envia direto). Marca `accepted_by_user=true` no log.
- `ConversationAiRiskBadge.tsx` — badge visual (baixo/médio/alto/crítico).
- `ConversationAiIntentBadge.tsx` — badge intenção + sugestão de setor.
- `useConversationAi.ts` (hook) — orquestra invoke + cache local + realtime das novas tabelas.

### 6. Integração no Inbox.tsx (mínima)

Apenas:
- Importar `ConversationAiPanel` e renderizar dentro do painel direito (após `ConversationQueuePanel`), gated por permissão `ia.assistiva.usar` E `ai_assistant_settings.enabled`.
- Adicionar `ConversationAiIntentBadge` e `ConversationAiRiskBadge` no header e (compactos) na lista lateral, lendo do cache `conversation_ai_*`.
- Botão "Aplicar sugestão" injeta texto no `draft` (estado já existente). **Nada envia automaticamente.**
- Sem alterar `enviar()`, webhook, templates, presença, claim/resolve.

### 7. Páginas Admin

- `src/pages/app/admin/AdminAiAssistant.tsx` em `/app/admin/ia-assistiva` — toggle global, provider/modelo, switches de auto-features, orçamento diário, link para prompts.
- `src/pages/app/admin/AdminAiPrompts.tsx` em `/app/admin/ia-assistiva/prompts` — CRUD de `ai_prompts` com versionamento.
- `src/pages/app/admin/AdminAiDashboard.tsx` em `/app/admin/ia-assistiva/operacao` — métricas: tokens/custo por dia/atendente/conversa/modelo, % sugestões aceitas, alertas de risco recentes, falhas.

Adicionar entrada de menu Admin → "IA Assistiva" via `menuCatalog.ts` (gated por `ia.assistiva.configurar` / `metricas`).

### 8. Segurança / Custos

- Toda chamada passa pelo edge → `LOVABLE_API_KEY` server-side (já existe).
- Auditoria 100%: todo invoke gera linha em `ai_audit_logs` com tokens e custo estimado.
- Hard-stop: se `daily_token_budget` excedido, edge retorna 402-like e UI mostra aviso.
- Debounce cliente: máx. 1 chamada por ação por conversa a cada 10s.
- Sem auto-execução em `INSERT` de mensagens (sem trigger). Auto-features (auto_summary etc.) ficam atrás de toggle e só rodam quando atendente abre conversa, não a cada mensagem.

### 9. Realtime

Canal único por conversa ativa: `ai-${conversationId}` ouvindo `conversation_ai_summaries/intents/risk_analysis`. Sem subscription global.

### 10. Fora do escopo (Fase 7)

IA respondendo, IA Avatar autônoma, voz, ligação, prescrição, automações autônomas, integração Feegow.

### Critérios de aceite

- Admin liga/desliga IA assistiva; provider/modelo configuráveis.
- Atendente clica "Gerar resumo" e vê resumo persistido.
- "Sugerir resposta" preenche `draft` mas **não envia**.
- Badges de intenção, risco e urgência aparecem na conversa.
- Toda interação gera linha em `ai_audit_logs` (com aceite/recusa).
- Dashboard admin mostra custos e métricas.
- Inbox/Fase 4/Fase 5/webhook/Avatar autônomo intactos.
- Build e TS limpos. RLS preservada.

### Arquivos

**Novos**
- Migration: tabelas + RLS + permissões + seeds de `ai_prompts` + uma linha default em `ai_assistant_settings(enabled=false)`.
- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/_shared/ai-providers.ts`
- `src/components/comunicacao/ai/{ConversationAiPanel,ConversationAiSummary,ConversationAiReplySuggestion,ConversationAiRiskBadge,ConversationAiIntentBadge}.tsx`
- `src/hooks/useConversationAi.ts`
- `src/pages/app/admin/{AdminAiAssistant,AdminAiPrompts,AdminAiDashboard}.tsx`

**Editados (mínimo)**
- `src/pages/app/comunicacao/Inbox.tsx` — montar painel + badges (sem mexer em handlers de envio).
- `src/lib/permissions/roleTemplates.ts` — registrar 5 permissões.
- `src/lib/menu/menuCatalog.ts` — itens admin.
- `src/App.tsx` — 3 rotas admin.

**NÃO editar**: `whatsapp-webhook`, `whatsapp-enviar`, `whatsapp-template-send`, `ai-respond`, `ai_settings` (Avatar), Fase 5 RPCs, IA Avatar UI.