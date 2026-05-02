
# Página Faturamento B2B Detalhado

## O que será criado

Uma nova página `/app/admin/faturamento-b2b` com:

### KPIs no topo
- Total no período (valor + qtd faturas)
- Em aberto (valor + qtd)
- Atrasadas (valor + qtd)
- Pagas (valor + qtd)

### Filtros
- Busca por nome da empresa ou competência
- Filtro por status (todos, em_aberto, paga, atrasada, cancelada)
- Filtro por ano
- Filtro por empresa (dropdown dinâmico)

### Tabela de faturas
Colunas: Empresa, Competência, Valor, Funcionários, Consultas, Vencimento, Pago em, Status (badge colorido com ícone), Ações.

### Modal de detalhes
Ao clicar "ver" em uma fatura: exibe dados completos (empresa, valor, vencimento, funcionários, consultas, observações, detalhamento JSON, botão de download placeholder).

### Exportação CSV
Botão no header que exporta todas as faturas filtradas em CSV com separador `;`.

## Alterações técnicas

| Arquivo | Ação |
|---------|------|
| `src/pages/app/admin/AdminFaturamentoB2B.tsx` | **Criar** — página completa com query à tabela `empresas_faturas` (join `empresas.razao_social`) |
| `src/App.tsx` | Adicionar rota `admin/faturamento-b2b` com permissão `empresas.ver` e import lazy |
| `src/lib/profiles.ts` | Adicionar item no sidebar Admin (seção Cadastros/B2B) |
| `src/components/AppBreadcrumb.tsx` | Adicionar breadcrumb para a nova rota |

Nenhuma migração de banco necessária — usa tabela `empresas_faturas` existente com colunas: `empresa_id`, `competencia_mes`, `competencia_ano`, `vencimento`, `valor_total_centavos`, `qtd_funcionarios`, `qtd_consultas`, `status` (enum: em_aberto, paga, atrasada, cancelada), `pago_em`, `observacoes`, `detalhamento`.
