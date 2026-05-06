
# Correção Crítica: `propostas_empresa_medico.medico_id`

## BLOCO 1 — Estado Atual Confirmado

| Item | Valor |
|------|-------|
| **FK atual** | `medico_id → profiles(id) ON DELETE CASCADE` |
| **RLS** | Já correta — usa `medicos.id` via `EXISTS(SELECT 1 FROM medicos m WHERE m.id = propostas_empresa_medico.medico_id AND m.user_id = auth.uid())` |
| **Registros** | **0 (tabela vazia)** — migração segura |
| **Conflito** | FK aponta para `profiles.id`, RLS compara com `medicos.id` — incompatível |

### Frontend — quem envia o quê hoje

| Arquivo | O que envia como `medico_id` | Correto? |
|---------|------------------------------|----------|
| `MedicoPropostas.tsx` (queries) | `medicoAtual.id` (medicos.id) | ✅ |
| `MedicoDashboard.tsx:143` | `session.user.id` (auth.uid) | ❌ |
| `EmpresaPropostas.tsx:124,162` | `m.user_id` (auth.uid) via select dropdown | ❌ |
| `EmpresaPropostas.tsx:94` | join `profiles!...fkey(nome)` | ❌ (FK vai mudar) |
| `AdminPropostasB2B.tsx:93` | join `profiles!...fkey(nome)` | ❌ (FK vai mudar) |
| `AdminRelatoriosB2B.tsx:113` | join `profiles!...fkey(nome)` | ❌ (FK vai mudar) |
| `MedicoCorporativo.tsx` | `med.id` (medicos.id) | ✅ |

### Bug colateral detectado (NÃO será corrigido nesta etapa)

- `MedicoPropostas.tsx` função `aceitar()`: insere em `planos` e `plano_medicos` com `medico_id: uid` (auth.uid) em vez de `medicos.id`. Isso é bug na tabela **planos**, não em propostas — será apenas reportado.

---

## BLOCO 2 — Migration Mínima

Uma única migration:

1. `DROP` FK antiga `propostas_empresa_medico_medico_id_fkey` (profiles)
2. `ADD` FK nova `propostas_empresa_medico_medico_id_fkey` (medicos) com `ON DELETE CASCADE`

Nenhuma outra alteração de schema/RLS/trigger.

---

## BLOCO 3 — Frontend Mínimo (5 arquivos)

| Arquivo | Alteração |
|---------|-----------|
| `EmpresaPropostas.tsx:99` | Adicionar `id` ao select de medicos |
| `EmpresaPropostas.tsx:124` | Trocar `id: m.user_id` → `id: m.id` |
| `EmpresaPropostas.tsx:94` | Trocar join `profiles!...fkey(nome)` → `medico:medicos!propostas_empresa_medico_medico_id_fkey(nome)` |
| `AdminPropostasB2B.tsx:93` | Mesma troca de join |
| `AdminRelatoriosB2B.tsx:113` | Mesma troca de join |
| `MedicoDashboard.tsx:143` | Trocar `session.user.id` → `medico.id` (já disponível no escopo) |

Nenhum outro arquivo será alterado.

---

## BLOCO 4-6 — Validação

Após implementação: build limpo, verificação de TypeScript, e relatório final com todos os itens solicitados.
