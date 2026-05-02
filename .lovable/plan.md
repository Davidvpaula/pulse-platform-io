
# Diagnóstico: Gestão de Pacientes/Usuários (Admin)

---

## A) O que já existe no código

### Páginas
| Arquivo | Linhas | Descrição | Dados |
|---------|--------|-----------|-------|
| `AdminUsuarios.tsx` | 614 | Listagem com busca (nome/CPF/email/telefone), filtros (status, vínculo, Feegow, pgto pendente), paginação, criação de paciente, suspender/bloquear/reativar com motivo e auditoria | **Dados reais** |
| `PacientePerfil.tsx` (shared) | 225 | Perfil do paciente com dados, últimas 20 consultas, ações rápidas (agendar, WhatsApp, financeiro) | **Dados reais, mas básico** |
| `SecretariaPacientes.tsx` | 259 | Listagem para secretaria | Dados reais |

### Rotas
- `/app/admin/usuarios` -> `AdminUsuarios` (com guard `pacientes.ver`)
- `/app/admin/pacientes/:id` -> `PacientePerfil` (com guard `pacientes.ver`)
- `/app/colaborador/pacientes` -> reutiliza `SecretariaPacientes` (com guard)
- `/app/colaborador/pacientes/:id` -> reutiliza `PacientePerfil` (com guard)
- `/app/secretaria/pacientes` e `/app/secretaria/pacientes/:id` -> sem guard (acesso direto)

### Menu Admin
Em `profiles.ts` -> Cadastros -> "Usuários" (aponta para `/app/admin/usuarios`). Empresas **NÃO está dentro de Cadastros** (está em grupo separado). Falta "Médicos" no mesmo sub-menu (já tem rota `/app/admin/medicos`).

## B) Quais RPCs/funções existem

| RPC | Descrição |
|-----|-----------|
| `alterar_status_conta_paciente` | Muda status (ativo/suspenso/bloqueado), exige motivo, verifica permissão (`pacientes.suspender/bloquear/reativar`), gera auditoria em `pacientes_auditoria` |
| Edge function `admin-criar-paciente` | Cria paciente + convite por email |

## C) Tabelas relevantes existentes

| Tabela | Estado |
|--------|--------|
| `pacientes` | Completa (41 colunas): dados pessoais, endereço, status_conta (enum: ativo/suspenso/bloqueado), Feegow, empresa, tags, observacoes_internas |
| `pacientes_auditoria` | Completa: paciente_id, actor_id, acao, status_anterior, status_novo, motivo, observacao, payload, created_at |
| `consultas` | Completa com todos os status |
| `pagamentos` | Completa (34 colunas): inclui valor_reembolsado_centavos |
| `reembolsos` | Existe: consulta_id, motivo, valor_centavos, status (enum), tipo (enum), actor_id, pagamento_id, analisado_por, decidido_em, snapshot_estornado |
| `financeiro_auditoria` | Existe |

## D) Permissões existentes (em AdminColaboradores)

Já definidas para atribuição a colaboradores:
- `pacientes.ver`, `pacientes.criar`, `pacientes.editar`
- `pacientes.suspender`, `pacientes.bloquear`, `pacientes.reativar`
- `pacientes.ver_documentos`, `pacientes.ver_financeiro`, `pacientes.agendar`

**Faltam:** `pacientes.reembolsar`, `pacientes.ver_agendamentos`, `pacientes.ver_comunicacao`, `pacientes.adicionar_observacao`

## E) O que está duplicado

- Nenhuma duplicação grave identificada. `PacientePerfil` é compartilhado entre admin/secretaria/colaborador.
- `AdminUsuarios` tem sua própria lógica de busca (não compartilha com SecretariaPacientes, mas são contextos diferentes -- ok).

## F) O que está mockado/simulado

- **Nada mockado** neste módulo. `AdminUsuarios` e `PacientePerfil` usam dados reais do banco.

## G) O que falta implementar

### Status do paciente
1. **Enum incompleto**: Faltam `banido` e `pendente` (hoje: ativo/suspenso/bloqueado). Precisa ALTER TYPE + ajustar RPC.
2. **Bloqueio temporário** (até data X): não existe campo `bloqueado_ate` na tabela.

### PacientePerfil (detalhe) -- precisa virar página completa com abas
Hoje é básico (dados + consultas). Faltam:
3. **Aba Financeiro**: pagamentos, pendentes, falhos, reembolsos, total gasto
4. **Aba Comunicação**: conversas WhatsApp vinculadas, mensagens
5. **Aba Planos**: planos ativos vinculados
6. **Aba Auditoria**: timeline de `pacientes_auditoria`
7. **Aba Observações internas**: campo existe em `pacientes.observacoes_internas` mas não há UI de edição nem histórico
8. **Aba Consultas**: expandir (hoje mostra 20 sem filtro/detalhes)
9. **Ações de reembolso**: botão para iniciar reembolso a partir de um pagamento
10. **KPIs no topo da listagem**: total pacientes, ativos, suspensos/bloqueados, com pgto pendente

### Permissões
11. Adicionar novas permissões ao catálogo de colaboradores
12. Aplicar guards nas abas do perfil

### Menu
13. Reorganizar menu: mover Empresas para dentro de Cadastros (ou ao menos "Cadastro" de empresa)

## H) Plano de ação em etapas curtas

### Etapa 1 -- Schema (migration)
- Adicionar `banido` e `pendente` ao enum `status_conta_paciente`
- Adicionar coluna `bloqueado_ate` (timestamptz, nullable) na tabela `pacientes`
- Ajustar RPC `alterar_status_conta_paciente` para suportar banir + pendente + bloqueio temporário
- Adicionar permissões faltantes em `AdminColaboradores`

### Etapa 2 -- KPIs + Melhorias na listagem
- Adicionar cards de KPI no topo (total, ativos, suspensos, bloqueados, pgto pendente)
- Adicionar status "banido"/"pendente" nos filtros
- Ações de banir no dropdown

### Etapa 3 -- PacientePerfil com abas
- Refatorar `PacientePerfil` para ter abas: Visão geral, Consultas, Financeiro, Comunicação, Planos, Auditoria, Observações
- Aba Visão geral: dados atuais + status + ações
- Aba Consultas: expandida com filtros e ações (reenviar link, cancelar, reagendar)
- Aba Financeiro: pagamentos + reembolsos + total gasto
- Guards por permissão em cada aba

### Etapa 4 -- Comunicação + Observações + Auditoria
- Aba Comunicação: conversas vinculadas ao paciente
- Aba Observações: edição + histórico (com auditoria)
- Aba Auditoria: timeline de `pacientes_auditoria`
- Aba Planos: planos vinculados

### Etapa 5 -- Menu + Permissões finais
- Reorganizar menu Cadastros
- Revisar guards em todas as rotas e botões

---

**Deseja que eu comece pela Etapa 1?** Ou prefere ajustar algo no plano antes?
