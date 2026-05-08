## FASE 5 — Central Operacional Multiatendente (SAFE/FREEZE)

Evolução incremental sobre o que já existe. **Não recriar** RPCs, audit log, transferência, lock, permissões, prioridade ou status que já estão em produção.

### Estado atual (reaproveitar)

- `conversations`: já tem `assigned_to`, `assigned_sector`, `priority` (baixa/normal/alta/urgente), `status` (aberta/em_atendimento/pendente/fechada/arquivada), `locked_by/locked_at`, `first_response_at`, `closed_at/closed_by`, `unread_count`.
- RPCs prontas: `assumir_conversa`, `liberar_conversa`, `transferir_conversa`.
- Tabelas prontas: `conversation_assignments` (histórico de transferência), `conversation_audit_log`, `internal_notes`.
- Componentes prontos: `TransferirConversaDialog`, `AuditLogDrawer`, `LockBadge`, `Janela24hMeta`, `EnviarTemplateDialog`.
- Permissões já cadastradas: `comunicacao.ver_inbox`, `ver_todas`, `ver_atribuidas`, `responder`, `transferir`, `finalizar`, `inbox.assumir`, `inbox.encerrar`, `usar_templates`, `ver_metricas`.
- Rota `/app/comunicacao/metricas` (página existe mas vazia).

### O que falta (entregáveis Fase 5)

#### 1. Migration única (aditiva, sem quebrar nada)
- Tabela **`communication_departments`**: id, nome, slug (unique), descricao, ativo, ordem, created_at.
- Tabela **`communication_queues`**: id, nome, slug, department_id (FK), descricao, prioridade_padrao (enum existente), sla_minutos (int, default 60), ativo, created_at.
- Tabela **`queue_members`**: queue_id, user_id, role (atendente|supervisor) — define quem opera em cada fila. (PK composta)
- Em **`conversations`** adicionar (nullable, com defaults seguros): `department_id uuid`, `queue_id uuid`, `sla_due_at timestamptz`, `resolved_at timestamptz`, `resolved_by uuid`. Índices em `queue_id`, `department_id`, `sla_due_at`.
- Tabela **`attendant_presence`**: user_id PK, status (online|ocupado|ausente|offline), last_seen_at, current_conversation_id. RLS: usuário lê/escreve seu próprio registro; admin/supervisor leem todos.
- Tabela **`conversation_typing`**: conversation_id, user_id, is_typing, updated_at (PK composta). Realtime habilitado. Limpeza por timestamp (sem cron — filtro por `updated_at > now() - 8s`).
- **Não** criar enum novo de status — reaproveitar `aberta/em_atendimento/pendente/fechada`. Adicionar valor `aguardando_paciente` ao enum `conversation_status` (não destrutivo).
- **Não** criar `conversation_transfers` — `conversation_assignments` já existe; só passar a usar consistentemente em `transferir_conversa` (insert no histórico).

#### 2. RPCs novas (e ajuste mínimo nas existentes)
- `claim_conversation(p_conversation_id)` — **alias** finíssimo para `assumir_conversa` (mantém nome do plano sem duplicar lógica).
- `update_conversation_status(p_conversation_id, p_status)` — valida transição permitida + permissão, grava em `conversation_audit_log`. Atalho: `resolver_conversa` seta `resolved_at/resolved_by` e status = `fechada`.
- `update_conversation_priority(p_conversation_id, p_priority)` — exige `comunicacao.inbox.alterar_prioridade`; recalcula `sla_due_at`.
- `set_conversation_queue(p_conversation_id, p_queue_id)` — atribui fila/setor + recalcula `sla_due_at = now() + queue.sla_minutos`.
- `update_attendant_presence(p_status, p_current_conversation_id)` — upsert leve, chamada a cada 30s pelo client.
- `set_typing(p_conversation_id, p_is_typing)` — upsert; expiração lógica via filtro temporal.
- `transferir_conversa` (existente) — patch para também inserir em `conversation_assignments` (histórico real).

#### 3. Permissões novas (registrar sem quebrar templates)
- `comunicacao.inbox.supervisionar` (admin/supervisor)
- `comunicacao.inbox.resolver`
- `comunicacao.inbox.alterar_prioridade`
- `comunicacao.filas.gerenciar`
- `comunicacao.setores.gerenciar`
- `comunicacao.metricas.operacionais`

Adicionar nos `roleTemplates` apropriados (admin = todas; colaborador ilimitado = resolver+alterar_prioridade; colaborador limitado = nenhuma extra).

#### 4. UI — Inbox (extensão cirúrgica)
- **Filtros novos** na coluna esquerda: dropdown `Setor`, `Fila`, toggles `Minhas conversas / Sem responsável / SLA vencido / Janela 24h expirada / Resolvidas`.
- **Badges no item da lista**: setor, fila, prioridade colorida, SLA (verde/amarelo/vermelho via `<ConversationSlaBadge/>`).
- **Header da conversa ativa**: avatar do responsável + `<AttendantPresenceBadge/>`, dropdown de status operacional, botão "Resolver" (verde), botão "Transferir" (já existe).
- **Indicador de digitação** ("Fulano está digitando…") dentro do scroll de mensagens, escutando `conversation_typing` via realtime.
- **Painel direito**: novo card "Operação" mostrando setor, fila, SLA, prioridade (cada um editável conforme permissão).

#### 5. UI — Página nova
- **`/app/admin/comunicacao/operacao`** (`AdminComunicacaoOperacao.tsx`): KPIs operacionais + tabelas:
  - Conversas abertas / sem responsável / SLA vencido (3 cards).
  - Tempo médio 1ª resposta, tempo médio resolução, atendentes online.
  - Tabela "Por atendente" (conversas em aberto, resolvidas hoje, SLA vencido).
  - Tabela "Por setor / fila".
  - Lista de transferências recentes (de `conversation_assignments`).
- Roteamento: adicionar em `App.tsx` com guard `comunicacao.metricas.operacionais` ou `admin`.
- Adicionar item no menu Admin → Comunicação → Operação.

#### 6. Componentes novos
- `src/components/comunicacao/ConversationSlaBadge.tsx` (calcula tone a partir de `sla_due_at`).
- `src/components/comunicacao/AttendantPresenceBadge.tsx` (bolinha + label, lê `attendant_presence`).
- `src/components/comunicacao/ConversationQueuePanel.tsx` (card lateral: setor/fila/prioridade/SLA com edição inline).
- `src/components/comunicacao/TypingIndicator.tsx` (escuta realtime `conversation_typing`).
- `src/components/comunicacao/StatusOperacionalSelect.tsx` (dropdown de status com permissão).
- **Reusar** `TransferirConversaDialog` e `AuditLogDrawer` existentes (sem duplicar).

#### 7. Hooks
- `useAttendantPresence()` — heartbeat 30s + cleanup no unload.
- `useConversationTyping(conversationId)` — debounce 2s no draft, realtime pub.
- `useOperacaoMetricas()` — queries agregadas para a página Admin (cache 30s).

#### 8. Realtime (sem inflar subscriptions)
- Reusar canal já existente de `conversations`/`messages` no Inbox.
- Adicionar 2 novos canais cirúrgicos: `attendant_presence` (escopo: page de admin) e `conversation_typing` (escopo: conversa ativa apenas).

### Não fazer (reservado para Fase 6+)
- IA assistiva, distribuição automática, sugestões de resposta, chatbot autônomo, sincronização templates Meta, integração Feegow.
- WebSocket próprio — usar realtime nativo Lovable Cloud.

### Arquivos afetados

**Criar:**
- `supabase/migrations/<novo>.sql`
- `src/components/comunicacao/ConversationSlaBadge.tsx`
- `src/components/comunicacao/AttendantPresenceBadge.tsx`
- `src/components/comunicacao/ConversationQueuePanel.tsx`
- `src/components/comunicacao/TypingIndicator.tsx`
- `src/components/comunicacao/StatusOperacionalSelect.tsx`
- `src/hooks/useAttendantPresence.ts`
- `src/hooks/useConversationTyping.ts`
- `src/hooks/useOperacaoMetricas.ts`
- `src/pages/app/admin/AdminComunicacaoOperacao.tsx`

**Editar (cirúrgico):**
- `src/pages/app/comunicacao/Inbox.tsx` (filtros, badges, painel direito, dropdown status, typing)
- `src/lib/permissions/constants.ts` + `roleTemplates.ts` (5 permissões novas)
- `src/lib/menu/menuCatalog.ts` (item Admin → Operação)
- `src/App.tsx` (rota nova)

### Critérios de aceite
1. Conversa nova nasce sem responsável, em fila padrão (se setor configurado), com `sla_due_at` calculado.
2. Atendente autorizado assume conversa via `claim_conversation` (alias para `assumir_conversa`).
3. Lock impede dois atendentes simultâneos (já validado na Fase Estabilidade).
4. Admin/supervisor transfere via dialog existente; transferência grava em `conversation_assignments` + `conversation_audit_log`.
5. Atendente comum só vê conversas atribuídas a ele OU em filas das quais é membro (RLS em queue_members).
6. Status pode mudar para `aguardando_paciente` / `fechada` com auditoria.
7. Prioridade alterável por quem tem `inbox.alterar_prioridade`; SLA recalcula.
8. Badge SLA exibe tom correto (verde / amarelo / vermelho).
9. Presença atualiza a cada 30s e some após desconexão.
10. Typing indicator aparece e desaparece sem flicker.
11. Página `/app/admin/comunicacao/operacao` exibe KPIs e tabelas reais.
12. Webhook, envio WhatsApp, janela 24h e templates Meta da Fase 4 **intactos**.
13. Build + TS limpos. RLS preservada. Sem regressões no Inbox.
