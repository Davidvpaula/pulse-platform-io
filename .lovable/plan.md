## Objetivo
Limpar visualmente a página `/app/admin/configuracoes` removendo os dois cards de atalho que duplicam acessos já presentes no menu lateral.

## Mudança única
**Arquivo:** `src/pages/app/admin/AdminConfiguracoes.tsx`

Remover apenas a renderização (JSX) destes dois blocos:
1. Card **"Repasse financeiro · Médicos"** (`<Link to="/app/admin/financeiro/repasse">…`)
2. Card **"Atendimento imediato"** (`<Link to="/app/admin/atendimento-imediato">…`)

## O que NÃO será mexido
- Rotas (`/app/admin/financeiro/repasse` e `/app/admin/atendimento-imediato` continuam funcionando normalmente)
- Permissões (`usePermission`, capability `financeiro.editar_comissao`)
- Menu lateral, guards, lógica de configurações
- Seções de **Pagamentos** e **Especialidades** da própria página

## Resultado
A página passa a mostrar apenas: cabeçalho → Pagamentos → Especialidades. Os atalhos continuam acessíveis pelos seus locais habituais no menu.
