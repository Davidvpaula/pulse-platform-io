# Etapa 2 — Núcleo Operacional Visual do Inbox

Frontend-only. Reusa as 6 RPCs validadas + tabelas da Etapa A (`conversation_pacientes`, `conversation_meta_window`, `conversation_audit_log`). Sem mexer em RLS, webhook, IA, automações ou arquitetura.

## Componentes novos

```text
src/components/comunicacao/
  ├── Janela24hMeta.tsx           ← contador 24h Meta + cor verde/amarelo/vermelho
  ├── PacientesVinculadosPanel.tsx ← lista vínculos, badges LGPD, ativo, ações
  ├── VincularPacienteDialog.tsx  ← busca paciente por nome/CPF/telefone
  ├── AuditLogDrawer.tsx          ← timeline conversation_audit_log
  └── LGPDGate.tsx                ← wrapper que esconde dados clínicos sem confirmado_em
```

## Janela24hMeta

- Lê `conversation_meta_window` (window_expires, last_inbound)
- Estados visuais:
  - `>12h restantes` → badge verde "✓ Janela aberta — Xh restantes"
  - `2–12h` → badge amarela com contador
  - `<2h` → badge vermelha "⚠ Expira em Xmin"
  - `expirada` ou sem registro → badge cinza "Janela 24h expirada — exige template"
- Timer local de 60s atualiza visual; subscription realtime em `conversation_meta_window` (UPDATE) refresca origem
- Sem alterar input de envio nesta etapa (o bloqueio servidor-side fica para Etapa 6 do plano original)

## PacientesVinculadosPanel

Lista `conversation_pacientes` da conversa ativa, join com `pacientes(nome_completo, telefone)`:

```text
👥 Pacientes vinculados
• Maria Silva     ✓ confirmado   ⭐ Ativo
• João Silva      ⚠ pendente     [Confirmar]  [Definir ativo]
• Ana Silva       ✓ confirmado   [Definir ativo]
[+ Vincular paciente]
```

- Badge "⚠ pendente" quando `confirmado_em IS NULL`
- Badge "⭐ Ativo" quando `id === conversation.paciente_ativo_id`
- Botões chamam: `confirmar_vinculo_paciente`, `definir_paciente_ativo_conversa`
- Realtime: subscription em `conversation_pacientes` filtrada por `conversation_id`

## VincularPacienteDialog

- Input de busca → `pacientes` (ilike nome OR cpf OR telefone, limit 10)
- Sugestão automática se `pacientes.telefone == conversation.contact_phone` aparece no topo marcada como "💡 Sugestão por telefone"
- Botão "Vincular" → `vincular_paciente_conversa` (vínculo nasce com `confirmado_em = NULL`)

## AuditLogDrawer

- Sheet lateral acionado por botão "Ver audit log" (já existe placeholder no painel)
- Lista `conversation_audit_log` filtrada por `conversation_id` ordem desc
- Timeline com ícone por `acao`: assumir, liberar, transferir, vincular_paciente, confirmar_vinculo, trocar_paciente_ativo
- Mostra `actor_id` (resolvido para nome via `profiles`) + `created_at` relativo + `payload` em detalhe colapsável

## LGPD gate (no painel direito)

Lógica:
```ts
const podeVerProntuario = pacientesVinculados.some(p => p.confirmado_em !== null);
```

- `false` → esconde blocos "Consulta Vinculada", "Médico Vinculado", "Acesso temporário médico" e "Janela de Acesso médica"; mostra aviso amarelo: "⚠ Confirme o vínculo do paciente para liberar dados clínicos."
- `true` → comportamento atual mantido
- Não afeta dados não-clínicos (nome contato, telefone, status conversa, mensagens da própria conversa)

## Reorganização do painel direito (não é refactor — é adição/reordenação de blocos existentes)

Ordem nova, de cima pra baixo:

```text
┌─────────────────────────────────┐
│ 📞 Contato (mantido)           │
│   + badge status conversa      │ ← novo (aberta/em_atendimento/fechada)
│   + badges canal (Bot/IA/Humano)│ ← novo, lê bot_active / ai_active / locked_by
├─────────────────────────────────┤
│ ⏱ Janela24hMeta                 │ ← NOVO componente
├─────────────────────────────────┤
│ 🔒 Lock + Responsável + Setor  │ ← já tem no header; replica resumo aqui
├─────────────────────────────────┤
│ 👥 PacientesVinculadosPanel     │ ← NOVO
├─────────────────────────────────┤
│ ⚠ LGPDGate (se sem confirmação)│ ← NOVO aviso
├─────────────────────────────────┤
│ 📅 Consulta vinculada          │ ← gated por LGPD
│ 🩺 Médico vinculado            │ ← gated por LGPD
│ 🔍 Origem                      │ ← mantido
│ 🏷 Tags                         │ ← mantido
├─────────────────────────────────┤
│ Ações rápidas (mantido)         │
│ [Ver audit log] → AuditLogDrawer│ ← novo handler
└─────────────────────────────────┘
```

## Realtime — adições

No `useEffect` de subscriptions já existente, adicionar dois canais filtrados por `active.id`:

- `conversation_pacientes` (INSERT/UPDATE/DELETE) → recarrega lista de vínculos
- `conversation_meta_window` (UPDATE) → atualiza Janela24hMeta
- `conversation_audit_log` (INSERT) → atualiza badge de "novo evento" no botão do drawer

Subscription existente em `conversations` continua cobrindo lock e paciente_ativo (são UPDATEs).

## O que NÃO muda nesta etapa

- Header (já implementado na Etapa 1)
- Lista de conversas à esquerda
- Área de mensagens central
- `whatsapp-enviar` (patch fica para etapa posterior)
- Webhook, RLS, IA, automações, Feegow, número oficial, schema

## Detalhes técnicos

- Tipos novos vivem em `src/components/comunicacao/types.ts` (criar se necessário) ou inline nos componentes
- Queries usam `supabase.from(...)` com tipagem do `Database` gerado
- RPCs já tipadas em `types.ts` (Etapa A)
- Estados locais por componente; sem context novo, sem store global
- Tradução de `actor_id → nome` via cache local Map<uuid,string> populado on-demand de `profiles`
- Tokens semânticos do design system (sem cor hardcoded): badges usam `variant` existente + classes `text-success` / `text-warning` / `text-destructive` já presentes em `index.css`

## Riscos

| Risco | Mitigação |
|---|---|
| Painel direito ficar denso em telas pequenas | Componentes colapsáveis (Accordion shadcn) onde fizer sentido |
| Realtime spam | 3 subscriptions filtradas por `conversation_id`, debounce de 300ms no refetch |
| LGPD gate esconder dado de admin que precisa ver | Guard só roda se há ao menos 1 vínculo; sem vínculos, mostra aviso "vincule um paciente" e mantém ações administrativas |
| Audit log lento (muitas linhas) | Limit 50 inicial + "carregar mais" |

## Ordem de implementação (paro entre cada uma se preferir)

1. `Janela24hMeta` + integração no painel
2. `PacientesVinculadosPanel` + `VincularPacienteDialog` + integração
3. `LGPDGate` + reordenação dos blocos clínicos
4. `AuditLogDrawer` + botão
5. Badges status/canal no topo + subscriptions realtime extras

Posso aplicar tudo de uma vez (mesma feature, mesmo arquivo Inbox.tsx tocado uma vez só) ou em sub-etapas. Recomendo **tudo de uma vez** já que é frontend isolado e o teste manual cobre o conjunto. Aprova?
