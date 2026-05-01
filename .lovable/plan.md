## Diagnóstico

Nada foi apagado. As páginas, rotas e componentes estão **todos presentes** no código:

| Item que "sumiu" | Página existente | Rota |
|---|---|---|
| Financeiro (visão geral / análise / relatórios) | `AdminFinanceiroCentral.tsx` | `/app/admin/financeiro` |
| Edição de precificação / taxa da plataforma / comissões | `AdminFinanceiroConfig.tsx` | `/app/admin/financeiro/repasse` |
| Prévia de repasse | `AdminPreviaRepasse.tsx` | `/app/admin/financeiro/previa-repasse` |
| Relatório financeiro (download CSV, etc.) | `AdminRelatorioFinanceiro.tsx` | `/app/admin/relatorios/financeiro` |
| Permissões (adicionar/remover) | `Permissoes.tsx` | `/app/admin/permissoes` |
| Log de permissões | `PermissoesLog.tsx` | `/app/admin/permissoes/log` |
| Auditoria interna | `AdminAuditoria.tsx` | `/app/admin/auditoria` |
| Relatório de auditoria | `AdminRelatorioAuditoria.tsx` | `/app/admin/relatorios/auditoria` |
| Serviços, Atendimento imediato, Cupons, Planos, Sessões, Segurança, Impersonar | todos existem | todas registradas em `App.tsx` |

### Causa raiz

O **menu lateral** (`src/layouts/AppLayout.tsx`) filtra itens usando o sistema mock antigo `hasCapability` que vive em `localStorage` (`src/lib/auth.tsx` + `src/lib/abilities.ts`). Esse sistema tem uma lista fechada `Capability` que **não inclui** as permissões reais do banco usadas no menu Admin:

- `financeiro.ver`, `financeiro.editar_comissao`, `financeiro.servicos_gerenciar`
- `colaboradores.alterar_permissoes`
- `relatorios.ver`, `auditoria.ver`

Como `defaultCapabilities.admin` não lista essas chaves, o filtro do menu retorna `false` e **esconde** Financeiro, Serviços, Atendimento imediato, Cupons, Planos, Segurança & Acessos (Permissões), Relatórios e Auditoria — exatamente o que você notou.

As **rotas em si funcionam** (o guard `RequireRoutePermission` consulta o banco e dá bypass para admin). Ou seja: se você digitar `/app/admin/financeiro` na URL, a página abre normalmente. O problema é só de exibição no menu.

## Plano de correção (1 etapa, ~10 min)

### 1. Unificar o filtro do menu com a fonte real de permissão

Em `src/layouts/AppLayout.tsx`, no filtro de itens do menu, fazer **bypass para admin** (idêntico ao que `RequireRoutePermission` já faz):

```text
- consulta `useSession().roles` (já disponível via hook existente)
- se roles inclui "admin" → mostra todos os itens (ignora capability)
- senão → mantém filtro atual com hasCapability
```

Isso resolve 100% do problema sem migração e sem mexer em rotas.

### 2. Reconciliar as capabilities mock (limpeza, opcional mas recomendado)

Em `src/lib/abilities.ts`:

- Estender o tipo `Capability` adicionando: `financeiro.ver`, `financeiro.editar_comissao`, `financeiro.servicos_gerenciar`, `colaboradores.alterar_permissoes`, `relatorios.ver`, `auditoria.ver`, `analises.ver`, `analises.financeiro`, `pacientes.ver`, `medicos.ver`, `medicos.aprovar`, `colaboradores.ver`, `empresas.ver`.
- Incluir todas elas em `defaultCapabilities.admin`.

Assim o sistema mock fica coerente com o real e a alternância de perfil em modo demo (dev) também passa a mostrar tudo.

### 3. Verificação manual

Após o fix, conferir no menu Admin a presença dos blocos:

```text
Visão geral · Fluxo operacional · Cadastros ▾
Agendamentos
Financeiro ▾  ← Visão geral / Repasse e comissões / Prévia de repasse
Serviços · Atendimento imediato · Cupons · Planos
Comunicação ▾ · Integrações ▾
Segurança & Acessos ▾  ← Permissões / Log de permissões / Sessões / Alertas / Impersonar
Análises ▾ · Relatórios ▾  ← Visão geral / Financeiro / Auditoria
Auditoria
Treinamento · Configurações
```

### Onde encontrar cada coisa que você sentiu falta

- **Análise financeira + relatórios + nº médicos atendidos**: `Financeiro → Visão geral` (`AdminFinanceiroCentral`) e `Relatórios → Financeiro` (com export CSV).
- **Edição de precificação / taxa da plataforma / comissões**: `Financeiro → Repasse e comissões` (`AdminFinanceiroConfig`). A edição de preços de serviços fica em `Serviços` (`AdminServicos`).
- **Permissões (adicionar/remover)**: `Segurança & Acessos → Permissões` (`/app/admin/permissoes`).
- **Auditoria interna**: item de menu `Auditoria` no nível raiz e também `Relatórios → Auditoria`.

## Arquivos que serão alterados

- `src/layouts/AppLayout.tsx` — bypass admin no filtro do menu.
- `src/lib/abilities.ts` — completar `Capability` e `defaultCapabilities.admin`.

Nenhuma migração de banco. Nenhum risco para dados.