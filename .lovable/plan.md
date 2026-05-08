## Estabilização Funcional do Inbox WhatsApp

Tudo abaixo é **frontend-only**. Sem mexer em RLS, sem refatorar webhook, sem ativar IA, sem alterar schema. Reusa as 6 RPCs já validadas + tabelas criadas na Etapa A.

## Princípio de desacoplamento (já gravado)

- `phone_number_id`, `numero`, `business_account_id` lidos sempre de `whatsapp_instances`
- Token sempre via `META_WHATSAPP_TOKEN` (env)
- Trocar sandbox → produção = atualizar 1 linha + 3 secrets, **zero código**

## O que muda no `Inbox.tsx`

Substituir UPDATEs diretos por chamadas às RPCs novas:

| Ação atual (UPDATE direto) | Vira (RPC) | Ganho |
|---|---|---|
| `assumir()` faz `update conversations set assigned_to, status` | `supabase.rpc('assumir_conversa', { p_conversation_id })` | Lock atômico, audit log automático, bloqueia conflito |
| `fechar()` continua igual | mantém (não há RPC ainda — fora do escopo desta etapa) | — |
| Sem botão "Liberar" | Novo botão → `liberar_conversa` | Libera lock |
| Sem botão "Transferir" | Novo botão + dialog → `transferir_conversa` | Audit + status pendente |
| Vínculo paciente inexistente | Dialog "Vincular paciente" → `vincular_paciente_conversa` | Cria sem prontuário |
| Sem confirmação LGPD | Botão "Confirmar vínculo" → `confirmar_vinculo_paciente` | Libera prontuário |
| Sem paciente ativo | Selector → `definir_paciente_ativo_conversa` | Mãe atendendo 3 filhos |

## Componentes novos (pequenos, isolados)

```text
src/components/comunicacao/
  ├── LockBadge.tsx              ← mostra "🔒 atendendo: João" em tempo real
  ├── Janela24hMeta.tsx          ← contador regressivo + cor (verde/amarelo/vermelho)
  ├── VincularPacienteDialog.tsx ← busca por nome/CPF/telefone, lista resultados
  ├── PacientesVinculadosPanel.tsx ← lista vínculos da conversa, badge confirmado/pendente, botão "Definir ativo"
  ├── TransferirConversaDialog.tsx ← seleciona usuário OU setor + motivo
  └── AuditLogDrawer.tsx         ← painel lateral com timeline do conversation_audit_log
```

## Layout final do painel direito (substitui o atual)

```text
┌─────────────────────────────────┐
│ 📞 Contato (já existe)         │
├─────────────────────────────────┤
│ ⏱ Janela Meta 24h              │ ← novo
│ ━━━━━━━━━━━░░░ 18h restantes   │
├─────────────────────────────────┤
│ 🔒 Lock                         │ ← novo
│ Atendendo: João (há 2 min)     │
│ [Liberar] [Transferir]          │
├─────────────────────────────────┤
│ 👥 Pacientes vinculados         │ ← novo
│ • Maria Silva ✓ confirmado     │
│   ⭐ Em foco                    │
│ • João Silva ⚠ pendente         │
│   [Confirmar] [Definir ativo]  │
│ [+ Vincular paciente]           │
├─────────────────────────────────┤
│ 📅 Consulta vinculada (já existe) │
│ 🩺 Médico (já existe)           │
│ 🔍 Origem (já existe)           │
├─────────────────────────────────┤
│ [Ver audit log] (já existe)    │
└─────────────────────────────────┘
```

## Header da conversa (botões essenciais)

```text
[Maria Silva]  📱 5511...  | [Bot] [IA] [Assumir/Liberar] [Transferir] [Finalizar]
```

- Quando `locked_by === user.id` → mostra "Liberar" (vermelho leve)
- Quando `locked_by !== null && !== user.id` → mostra "🔒 João está atendendo" + botão "Forçar liberar" só p/ admin
- Quando `locked_by === null` → mostra "Assumir"

## Janela 24h Meta — UX

- **>12h:** badge verde, "✓ Janela aberta — 18h restantes"
- **<12h:** badge amarela, ⏱ contador
- **<2h:** badge vermelha, "⚠ Janela expira em breve"
- **expirada:** input de mensagem livre **bloqueado**, mostra "Janela 24h expirada — envie um template" + dropdown de templates aprovados (já existe `message_templates`). Botão "Enviar livre mesmo assim" só p/ admin.

Lê de `conversation_meta_window` (popula via trigger). Sem janela = trata como expirada (zero risco).

## LGPD — gating de prontuário

Hoje o painel mostra `consulta_id`/`medico_id` da conversa direto. Adiciono guard:

```ts
const podeVerProntuario = pacientesVinculados.some(p => p.confirmado_em !== null);
if (!podeVerProntuario) {
  // esconde: histórico clínico, link "ver prontuário", consulta vinculada com detalhes médicos
  // mostra: aviso amarelo "Confirme o vínculo do paciente para liberar prontuário"
}
```

Dados não-clínicos (nome, telefone, status conversa, mensagens da própria conversa) continuam visíveis — eles já são da conversa, não do prontuário.

## Realtime — manter o que já tem

A subscription atual em `*` em `conversations` já cobre mudanças de `locked_by`, `paciente_ativo_id` etc (são UPDATEs). Adiciono:
- Sub em `conversation_pacientes` (INSERT/UPDATE) → atualiza painel de vínculos
- Sub em `conversation_meta_window` (UPDATE) → atualiza contador (alternativa: timer local de 1min é suficiente)

## Métricas (cards no topo do Inbox, opcional nesta etapa)

| Card | Query |
|---|---|
| Conversas hoje | `count(*) where created_at > today` |
| Em atendimento | `count(*) where status='em_atendimento'` |
| Aguardando resposta | `count(*) where status='aberta'` |
| Mensagens 24h | `count(messages) where created_at > now-24h` |

Posso adicionar agora (cards leves) ou deixar p/ próxima etapa. Pergunto antes de implementar.

## IA / automações — mantêm freeze

- Botão "IA" do header continua existindo, mas chamada só altera `conversations.ai_active`. Edge `ai-respond` continua **sem ler `whatsapp_instances.ai_active`** (default false) → nada dispara.
- Templates / `message_templates` CRUD continua funcionando (admin).

## Paciente teste — fluxo end-to-end na sandbox

1. Crio dialog "🧪 Simular mensagem inbound" (só visível p/ admin) que faz `INSERT messages (sender_type=paciente, body)` numa conversa selecionada — substitui webhook real durante o freeze.
2. Match por telefone: ao abrir conversa sem paciente vinculado, painel direito mostra "💡 Sugestão: encontrei `Maria Silva` (mesmo telefone) — [Vincular]". Query: `select pacientes where telefone = conv.contact_phone limit 5`.
3. Colaborador clica → `vincular_paciente_conversa`
4. Painel mostra vínculo "⚠ pendente confirmação" → colaborador clica "Confirmar"
5. Prontuário libera, paciente fica como ativo automaticamente (1º vínculo confirmado vira ativo)

## Edge functions — mexer só no mínimo

| Function | Mudança | Por quê |
|---|---|---|
| `whatsapp-enviar` | **Adicionar guard de janela 24h**: ler `conversation_meta_window`, se expirou exigir `template_id`. Sem template = retorna 422. | Bloqueio servidor-side, não confia no FE |
| `whatsapp-webhook` | **Não mexer agora** (continua dry-run, não apontado na Meta) | Etapa C separada |

**Apenas `whatsapp-enviar` recebe um patch mínimo (1 SELECT + 1 if).** Sem refator, sem alterar contrato.

## Permissões usadas (todas já existem)

- `comunicacao.responder` — assumir, transferir, vincular, responder
- `comunicacao.transferir` — botão transferir
- `comunicacao.finalizar` / `comunicacao.inbox.encerrar` — fechar
- `comunicacao.inbox.assumir` — botão assumir
- Admin (`has_role`) — forçar liberar, enviar livre fora janela, simular inbound

## Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Inbox v1 quebrar | Mantenho funções antigas (`assumir`, `fechar`, `toggleBot`) e só substituo o **corpo** da `assumir` por RPC. Assinatura igual. |
| Realtime spam | Já hoje qualquer UPDATE em conversations dispara `loadConvs()`. As novas RPCs fazem 1 UPDATE só. Sem loop. |
| Médico ver dados sem confirmação | Guard `podeVerProntuario` é client-side; servidor já protege via RLS atual de `pacientes`. Frontend é defesa-em-profundidade. |
| Janela 24h calculada errada | Lê do banco (trigger autoritativo). FE só renderiza. |
| Templates faltando p/ janela expirada | Mostra mensagem clara "Cadastre templates em /admin/comunicacao/templates" |

## Ordem de aprovação (eu paro entre cada uma)

1. **Header + RPCs no header** (assumir/liberar/transferir + LockBadge). Risco: baixo.
2. **Painel direito** com `Janela24hMeta` + `PacientesVinculadosPanel` + `VincularPacienteDialog`. Risco: baixo.
3. **LGPD gate** (esconde prontuário sem `confirmado_em`). Risco: baixo.
4. **`AuditLogDrawer`** (timeline). Risco: zero.
5. **`Simular inbound` admin-only** (substitui webhook na sandbox). Risco: zero (admin only).
6. **Patch em `whatsapp-enviar`** (guard 24h). Risco: baixo (deploy edge function).
7. **Cards de métricas** (opcional). Risco: zero.

## O que NÃO faço

- ❌ Apontar webhook real na Meta
- ❌ Ativar IA / automações
- ❌ Conectar número oficial
- ❌ Alterar RLS
- ❌ Refatorar webhook ou ai-respond
- ❌ Mexer em Feegow

Aprova? Se sim, começo pela **etapa 1 (header + RPCs)** e paro pra você validar no preview antes de seguir.