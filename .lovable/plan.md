
## Diagnóstico

A boa notícia: **toda a engrenagem financeira que você descreveu já está implementada no banco**. O que falta é apenas a UI no Admin para gerenciar.

### O que já existe (não vamos refazer)

- **Configuração global**: `app_settings.key = 'financeiro.comissao_padrao_pct'` (default 44%) → representa o % da plataforma. Repasse médico = 100 - este valor.
- **Exceções por médico**: tabela `medico_comissao_override` (com `medico_id`, `servico_id` opcional, `comissao_pct`).
- **Função de resolução** `fn_resolver_comissao` com a prioridade exata que você pediu:
  1. Override médico+serviço (mais específico)
  2. Override médico (sem serviço) → **regra das particulares**
  3. Configuração do serviço (quando `servico_id` preenchido)
  4. Global (`financeiro.comissao_padrao_pct`)
- **Snapshot imutável**: trigger `fn_consulta_snapshot_financeiro` grava `valor_snapshot_centavos` e `comissao_snapshot_centavos` na criação da consulta. Trigger de UPDATE bloqueia alteração posterior.
- **Separação particular vs plataforma**: feita por `agenda_slots.servico_id IS NULL` (particular) ou `NOT NULL` (serviço).

A regra "Se servico_id IS NULL → global ou exceção / Se NOT NULL → regra do serviço" **já está ativa** em produção.

### O que falta (e é só isso)

UI no Admin para o usuário não-técnico configurar esses valores sem mexer no banco.

---

## Plano de implementação

### 1. Página `/app/admin/financeiro-config` (nova)

Nova rota dedicada acessada a partir do menu Admin → Financeiro (e também via card em `AdminConfiguracoes`).

**Card 1 — "Repasse global · Consultas particulares"**
- Input: `% repasse médico` (ex: 56)
- Campo derivado read-only: `% plataforma` = 100 − repasse médico
- Botão Salvar → grava em `app_settings` na chave `financeiro.comissao_padrao_pct` (armazenando o % da plataforma, mantendo compatibilidade com `fn_resolver_comissao`)
- Texto explicativo: "Aplica-se a todas as consultas de especialidade (sem serviço da plataforma vinculado), exceto médicos com exceção configurada."

**Card 2 — "Exceções de repasse por médico"**
- Tabela: Médico · CRM · % repasse médico · % plataforma · Ações (editar / remover)
- Botão "+ Nova exceção" → modal com:
  - Combobox de busca de médico (ativos)
  - Input `% repasse médico`
  - Checkbox "aplicar somente a um serviço específico" (default desligado = exceção global do médico, que é o caso particular)
- CRUD direto em `medico_comissao_override` (com `servico_id = NULL` por padrão)
- RLS já existente cobre acesso (admin / `financeiro.editar_comissao`)

**Card 3 — "Como funciona" (informativo)**
Resume a hierarquia de prioridade para evitar dúvida do operador.

### 2. Integração no menu

- Adicionar link no `AdminConfiguracoes.tsx` (card "Financeiro · Repasse")
- Adicionar item no menu lateral do admin (seção Financeiro)

### 3. Validações / UX

- % entre 0 e 100, máximo 2 casas decimais
- Confirmação ao salvar global (afeta novas consultas)
- Aviso visível: "Não afeta consultas já criadas (snapshot imutável)"
- Toast de sucesso/erro
- Auditoria: gravar em `audit_log` toda alteração (já temos infra)

### 4. Não mexer

- Trigger `fn_consulta_snapshot_financeiro` — funcionando
- `fn_resolver_comissao` — funcionando
- Cards do dashboard médico (particular vs plataforma) — funcionando
- Serviços da plataforma (`servicos_financeiros.comissao_pct`) — fluxo separado, intocado

---

## Detalhes técnicos

- **Convenção do valor armazenado**: `financeiro.comissao_padrao_pct` historicamente guarda **% da plataforma** (atual 44 → médico recebe 56%). Vou manter essa convenção no banco e converter na UI (mostrar/editar como "% repasse médico" para alinhar com a linguagem do produto).
- **Sem migration de schema**: tudo já existe. Só `UPDATE app_settings` e `INSERT/UPDATE/DELETE medico_comissao_override` via cliente, com RLS atuais.
- **Hooks**: criar `useFinanceiroConfig()` para ler/gravar global e `useComissaoOverrides()` para CRUD de exceções.
- **Arquivos novos**:
  - `src/pages/app/admin/AdminFinanceiroConfig.tsx`
  - `src/components/admin/financeiro/RepasseGlobalCard.tsx`
  - `src/components/admin/financeiro/ExcecoesRepasseCard.tsx`
  - `src/lib/financeiroConfig.ts`
- **Arquivos editados**:
  - `src/App.tsx` (rota)
  - `src/pages/app/admin/AdminConfiguracoes.tsx` (card de atalho)
  - sidebar/layout admin (item de menu)

---

## Resultado esperado

- Admin entra em uma única tela e define em segundos o repasse global das particulares.
- Cria exceções pontuais para médicos premium / juniores sem precisar de dev.
- Snapshot imutável continua garantindo histórico financeiro intacto.
- Nada do fluxo de serviços da plataforma é tocado.

Aprova para eu implementar?
