## Objetivo

Consolidar oficialmente a decisão arquitetural Feegow como **regra permanente** do projeto, elevando-a de "memória de feature" para **constraint vinculante** que vale para qualquer mudança futura.

## O que vai mudar

### 1. Promover regra ao Core do projeto
A linha já existente no `mem://index.md` Core será reescrita de forma mais imperativa, deixando claro que é decisão **permanente e bloqueante**:

> **Arquitetura clínica (DEFINITIVA): sistema interno = SoR operacional; Feegow = SoR clínico externo. PROIBIDO: sync bidirecional, financeiro/agenda/mensagens/filas/SLA na Feegow, espelhamento operacional, dupla fonte da verdade, iframe, dependência operacional. Feegow só serve para prontuário, documentos, histórico, receitas/exames/atestados e deep-link clínico.**

### 2. Criar memória do tipo `constraint` (nunca re-propor)
Novo arquivo `mem://constraints/feegow-arquitetura-definitiva.md` com:

- **Status:** decisão permanente, aprovada, não-negociável.
- **Lista exaustiva de proibições** (a lista que você mandou, palavra por palavra).
- **Lista do que a Feegow PODE fazer** (provider clínico, prontuário, documentos, deep-link, interoperabilidade).
- **Lista do que o sistema interno é dono** (operação, Inbox, WhatsApp, IA, agenda, financeiro, pagamentos, repasses, marketplace, automações, multiatendimento, observabilidade, auditoria, UX).
- **Why:** evitar acoplamento, dívida técnica, race conditions, perda de autonomia, dupla fonte da verdade.
- **How to apply:** qualquer feature/PR que viole estas regras deve ser **rejeitado automaticamente** sem nova discussão.

### 3. Atualizar memória existente
- `mem://features/arquitetura-clinical-provider` ganha um banner no topo: "STATUS: DEFINITIVO — ver constraint `feegow-arquitetura-definitiva`".
- `mem://features/feegow-agendamento-manual` (já marcada como SUPERADA) ganha referência cruzada à constraint.
- `mem://preferences/integracoes-externas` ganha nota: "Feegow → escopo congelado pela constraint definitiva. Ativação futura = só deep-link + documentos read-only."

### 4. Atualizar índice
`mem://index.md` ganha entrada de destaque na seção Memories:
> - [Constraint: arquitetura Feegow definitiva](mem://constraints/feegow-arquitetura-definitiva) — **REGRA PERMANENTE.** Proibições e escopo congelado.

## O que NÃO está no escopo

- Nenhuma alteração em código, edge functions, banco de dados, RLS ou UI.
- Nenhuma exclusão das edge functions já marcadas como deprecated (decidiremos isso em outra revisão).
- Apenas memória/documentação imutável.

## Resultado esperado

A partir desta consolidação, qualquer pedido futuro que mencione "sincronizar agenda com Feegow", "puxar financeiro da Feegow", "embutir Feegow num iframe", "usar Feegow como fonte de pacientes", etc. será automaticamente recusado pelo agente com referência direta a esta constraint, sem precisar redebater a decisão.
