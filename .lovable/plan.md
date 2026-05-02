
## Situação atual

- O **menu lateral** já usa `NavLink` com `isActive` e já destaca o item ativo com `bg-primary text-primary-foreground`. O grupo "Gamificação" no Admin já expande automaticamente quando a rota ativa pertence a ele (`defaultOpen={open}`). Portanto, o **destaque de menu ativo já funciona**.
- O componente `Breadcrumb` (shadcn) existe em `src/components/ui/breadcrumb.tsx` mas **nenhuma página o utiliza ainda**.
- As 3 páginas de gamificação usam `PageHeader` sem breadcrumbs.

## O que será feito

### 1. Adicionar breadcrumbs nas páginas de gamificação

Adicionar um bloco de breadcrumbs acima do `PageHeader` em cada página:

- **AdminGamificacao** (`src/pages/app/admin/AdminGamificacao.tsx`)
  - `Admin > Gamificação > Configuração & Ranking`

- **AdminGamificacaoFinanceiro** (`src/pages/app/admin/AdminGamificacaoFinanceiro.tsx`)
  - `Admin > Gamificação > Financeiro`
  - Link "Configuração & Ranking" apontando para `/app/admin/gamificacao`

- **MedicoGamificacao** (`src/pages/app/medico/MedicoGamificacao.tsx`)
  - `Médico > Gamificação & Ranking`

Os breadcrumbs usarão os componentes `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` já existentes, com `Link` do react-router para navegação.

### 2. Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/app/admin/AdminGamificacao.tsx` | Adicionar breadcrumb acima do PageHeader |
| `src/pages/app/admin/AdminGamificacaoFinanceiro.tsx` | Adicionar breadcrumb acima do PageHeader |
| `src/pages/app/medico/MedicoGamificacao.tsx` | Adicionar breadcrumb acima do PageHeader |

Nenhuma migração de banco necessária. Nenhum componente novo — apenas uso dos existentes.
