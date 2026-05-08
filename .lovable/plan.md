## Documento de revisão pré-implementação — Inbox Fase Estabilidade

**Não vai rodar nenhuma migração nem alterar código sem sua aprovação por etapa.** Abaixo está o raio-X completo do que pretendo mexer e os riscos.

## Princípio de desacoplamento (gravado como regra dura)

- ❌ Nunca hardcodar `phone_number_id` (incluindo `1133620486499574` do sandbox)
- ❌ Nunca hardcodar token, verify_token ou app_secret
- ✅ Toda function lê `whatsapp_instances.phone_number_id` para decidir caixa/origem
- ✅ Token vem **sempre** de `Deno.env.get("META_WHATSAPP_TOKEN")` (já é assim)
- ✅ Trocar sandbox → número oficial = atualizar 1 row em `whatsapp_instances` + rotacionar 3 secrets. Zero deploy de código.

Vou adicionar isso ao `mem://constraints/whatsapp-desacoplamento` quando você aprovar a implementação.

---

## ETAPA A — Schema mínimo (precisa aprovação separada)

### A.1 Tabelas a CRIAR (3 novas)

| Tabela | Propósito | Linhas críticas |
|---|---|---|
| `conversation_pacientes` | Vínculo N:N conversa↔paciente, auditável (mãe atendendo 3 filhos) | `confirmado_em` controla se libera prontuário |
| `conversation_meta_window` | Cache da janela de 24h Meta por conversa | atualizada por trigger |
| `conversation_audit_log` | Log imutável LGPD (quem viu/vinculou/transferiu) | append-only, sem UPDATE/DELETE |

Nada de DROP. Nada toca tabelas existentes salvo as colunas abaixo.

### A.2 Colunas a ADICIONAR em tabelas existentes

| Tabela | Coluna | Tipo | Default | Nullable |
|---|---|---|---|---|
| `conversations` | `locked_by` | uuid | null | sim |
| `conversations` | `locked_at` | timestamptz | null | sim |
| `conversations` | `bot_handoff_at` | timestamptz | null | sim |
| `conversations` | `first_response_at` | timestamptz | null | sim |
| `conversations` | `paciente_ativo_id` | uuid | null | sim |
| `whatsapp_instances` | `ai_active` | boolean | **false** | não |
| `whatsapp_instances` | `tenant_id` | uuid | null | sim (preparação multi-tenant futura) |

Todas são **aditivas e nullable**. Zero risco de quebrar SELECT/INSERT existente.

### A.3 Enums a ESTENDER (não recriar)

- `conversation_status` já tem `{aberta, em_atendimento, pendente, fechada, arquivada}` ✅ não precisa mexer
- `message_sender_type` já tem `{paciente, lead, bot, ia, colaborador, medico, sistema}` ✅ ok
- Nenhum enum novo precisa ser criado nesta fase

### A.4 Triggers a CRIAR

1. `trg_conversations_audit_lock` — registra em `conversation_audit_log` toda mudança de `locked_by`, `assigned_to`, `paciente_ativo_id`
2. `trg_messages_update_window` — quando `sender_type='paciente'`, atualiza `conversation_meta_window.last_inbound_at` e `window_expires_at = now() + 24h`
3. `trg_messages_update_conv` — atualiza `last_message_at`, `last_message_preview`, `unread_count++` (já parcialmente existe? checar)

### A.5 RPCs a CRIAR (todas SECURITY DEFINER, search_path=public)

- `assumir_conversa(p_conv uuid)` → seta lock, audita, falha se já lockada
- `liberar_conversa(p_conv uuid)` → libera lock (próprio atendente ou admin)
- `transferir_conversa(p_conv uuid, p_to_user uuid?, p_to_sector text?, p_reason text)`
- `vincular_paciente(p_conv uuid, p_paciente uuid, p_parentesco text, p_origem text)` → cria vínculo NÃO confirmado
- `confirmar_vinculo_paciente(p_vinculo_id uuid)` → libera leitura clínica
- `definir_paciente_ativo(p_conv uuid, p_paciente uuid)` → troca foco do atendimento

---

## ETAPA B — RLS (precisa aprovação separada)

### B.1 Políticas a ALTERAR/SUBSTITUIR

| Tabela | Política atual | Mudança proposta | Risco |
|---|---|---|---|
| `conversations` | "Staff ve todas conversations" | Restringir a `whatsapp_instance_id IN (caixas que user tem permissão)` | ⚠️ Médio — se mal calibrado, atendente para de ver conversas. Mitigado por feature flag `ENFORCE_INBOX_RLS_V2`. |
| `messages` | "Staff cria messages" | Bloquear envio se `conversations.locked_by != auth.uid()` (exceto admin) | Baixo |
| `conversations` | "Medico ve conversations vinculadas" | Adicionar: AND (consulta dentro de janela ±24h OU `assigned_to=self`) | Baixo |

### B.2 Políticas a CRIAR (tabelas novas)

- `conversation_pacientes`: admin tudo / staff vê das suas caixas / médico vê só dele / paciente nunca vê
- `conversation_meta_window`: read-only para quem vê a conversa
- `conversation_audit_log`: read admin + staff (próprias ações) / **INSERT só via trigger** (SECURITY DEFINER) / **sem UPDATE/DELETE para ninguém**

---

## ETAPA C — Edge functions (aprovação separada)

| Function | Tipo de mudança | Risco |
|---|---|---|
| `whatsapp-webhook` | **Refator pesado**: corrigir status `open→aberta`, coluna `content→body`, secrets `WHATSAPP_*→META_*`, identificar `whatsapp_instance_id` por `phone_number_id`, NÃO abrir prontuário automaticamente | 🔴 Alto se ligar webhook real antes de testar. Mitigação: deploy + smoke test com payload mock antes de configurar URL na Meta. |
| `whatsapp-enviar` | Refator: validar janela 24h, exigir template fora dela, ler `phone_number_id` da instance da conversa | 🟡 Médio. Mitigação: manter versão antiga em paralelo até validação. |
| `whatsapp-test-send` | **Não mexer** — está validado | Zero |
| `ai-respond` | Adicionar guard `if (!whatsapp_instances.ai_active) return early` — fica DESATIVADO por default | Zero (você pediu sem IA agora) |
| `inbox-transfer-cron` | Não mexer nesta fase | Zero |

Nenhuma function nova será criada nesta fase.

---

## Riscos consolidados

### 🔴 Quebra do Inbox atual
- **Onde**: refator do webhook + RLS v2 em `conversations`
- **Probabilidade**: média se aplicado de uma vez
- **Mitigação**:
  1. Webhook fica desabilitado na Meta até passar smoke test
  2. RLS v2 entra com feature flag `app_settings.inbox_rls_v2_enabled = false` por default; quando ativar, pode reverter em 1 UPDATE
  3. Política antiga não é dropada imediatamente — fica como `_legacy` por 1 release

### 🟡 LGPD
- **Risco**: prontuário sendo aberto antes da confirmação manual
- **Mitigação**:
  1. `vincular_paciente` cria registro com `confirmado_em IS NULL`
  2. Frontend só renderiza histórico clínico se `confirmado_em IS NOT NULL`
  3. Audit log obrigatório com user_id + IP (capturado via header `x-forwarded-for`)
  4. Política de leitura de `pacientes` via chat olha `conversation_pacientes.confirmado_em`
  5. Telefones compartilhados (mãe/filho) cobertos pelo modelo N:N — nunca assume "1 telefone = 1 paciente"

### 🟡 Atendente preso em conversa
- **Risco**: lock mal liberado deixa conversa travada
- **Mitigação**:
  1. Admin sempre pode forçar liberar
  2. `inbox-transfer-cron` (já existente) ganha lógica de auto-release após X minutos sem atividade (configurável)
  3. RPC `liberar_conversa` exposta no botão "Liberar" do header

### 🟢 Multi-tenant
- Adicionar coluna `tenant_id` nullable agora não muda nada hoje. Quando ligar, basta preencher + adicionar política. **Zero risco agora.**

### 🟢 Sandbox vs número oficial
- Toda referência de número/instância via FK para `whatsapp_instances`. Trocar instance ativa = `UPDATE whatsapp_instances SET phone_number_id='novo', business_account_id='novo' WHERE id=...` + atualizar 3 secrets. **Sem deploy de código.**

---

## Plano de rollback

### Para a migração de schema (Etapa A)
Reversal SQL pronto antes de aplicar:
```sql
-- Drop em ordem reversa
DROP TRIGGER ... ; DROP FUNCTION ... ;
DROP TABLE conversation_audit_log, conversation_meta_window, conversation_pacientes;
ALTER TABLE conversations DROP COLUMN locked_by, locked_at, bot_handoff_at, first_response_at, paciente_ativo_id;
ALTER TABLE whatsapp_instances DROP COLUMN ai_active, tenant_id;
```
Salvo em `.lovable/rollback/inbox-fase-estabilidade.sql` antes de aplicar a migração.

### Para RLS v2 (Etapa B)
- Política antiga renomeada com sufixo `_legacy`, não dropada
- Reverter = `DROP POLICY v2; ALTER POLICY _legacy RENAME TO original`

### Para edge functions (Etapa C)
- Git history do projeto já é o rollback (você pode usar "View History" e restaurar)
- Webhook real só é apontado pra produção depois do smoke test passar

---

## Ordem de aprovação proposta

Você aprova etapa por etapa. Eu paro e espero entre cada uma.

1. **Aprovação 1**: Etapa A (schema novo, sem mexer em RLS atual). Risco baixo.
2. **Aprovação 2**: Etapa C parcial — refator do `whatsapp-webhook` em modo "dry-run" (loga mas não escreve em produção, só smoke test). Risco controlado.
3. **Aprovação 3**: Frontend Inbox v2 lendo as novas colunas/tabelas (compatível com ambas estruturas). Risco baixo.
4. **Aprovação 4**: Refator `whatsapp-enviar` com janela 24h. Risco baixo.
5. **Aprovação 5**: Etapa B (RLS v2 com feature flag desligada). Risco zero até ativar.
6. **Aprovação 6**: Ativar feature flag RLS v2 + apontar webhook real. Risco controlado.

Cada etapa = 1 PR mental, com checagem em produção antes da próxima.

---

## O que fica EXPLICITAMENTE de fora desta fase

- ❌ IA respondendo automaticamente (campo `ai_active=false` por default em todas as instances)
- ❌ Automações / workflows
- ❌ Campanhas / disparos em massa
- ❌ Sincronização Feegow no chat
- ❌ Multi-tenant ativo (só preparação de coluna)
- ❌ Métricas avançadas (NPS, CSAT, dashboard)
- ❌ Importação massiva de pacientes
- ❌ Bot conversacional (só estrutura `bot_active` boolean, sem lógica)

---

## O que preciso de você antes de começar

1. ✅ Confirma este escopo?
2. ✅ Concorda com a ordem de aprovação em 6 passos?
3. ✅ Algo aqui que você quer adicionar/remover/postergar?

Quando responder, eu já preparo a **migração da Etapa A** com SQL completo + rollback pra você revisar linha por linha antes de rodar.