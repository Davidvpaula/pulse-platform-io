# Relatório Financeiro com Snapshots Imutáveis

Adicionar uma página dedicada de relatório financeiro do admin que utiliza os campos `*_snapshot` criados na Fase 2 (valores congelados quando pagamento vira "pago" e consulta vira "concluída"), com comparação contra período anterior ou ano anterior e exportação em CSV e PDF.

## Rota e navegação
- Nova rota: `/app/admin/relatorios/financeiro`, protegida por `RequireRoutePermission` com permissões `relatorios.ver` + `relatorios.ver_financeiro`
- Adicionar link "Financeiro detalhado" no topo da aba "Financeiro" do `AdminRelatorios` apontando para a nova rota (mantém o `FinanceiroTab` atual como visão rápida)

## Banco de dados
Criar RPC `relatorios_financeiro_snapshot(p_inicio date, p_fim date, p_compare_mode text)` — `SECURITY DEFINER`, apenas admin, retornando JSONB com:

- **kpis** (período atual): receita_bruta, taxa_gateway, taxa_imposto, receita_liquida, comissão_plataforma, repasse_médicos, reembolsos, pagamentos_pagos, consultas_concluídas, ticket_médio — todos calculados sobre `pagamentos.*_snapshot` (filtro `snapshot_at::date BETWEEN inicio AND fim`) e `consultas.*_snapshot`
- **kpis_anterior**: mesmos números para o período comparativo, calculado dentro da RPC conforme `p_compare_mode` ("periodo_anterior" ou "ano_anterior")
- **por_medico**: lista ordenada com nome, consultas, receita, comissão, repasse
- **por_especialidade**, **por_modalidade**, **por_metodo**, **por_canal**: breakdowns agregados
- **diario**: série diária para gráfico (receita bruta, líquida, contagem de consultas)

`REVOKE EXECUTE ... FROM PUBLIC, anon` + `GRANT TO authenticated`.

## Página `AdminRelatorioFinanceiro.tsx`
Estrutura:

```text
┌────────────────────────────────────────────────────────────┐
│ PageHeader: Relatório Financeiro                           │
│ [DateRange]  [Comparar com: ▾ período anterior | ano       │
│               anterior]   [↓ CSV]  [↓ PDF]                 │
├────────────────────────────────────────────────────────────┤
│ KPIs (6 cards)  receita bruta · líquida · comissão ·       │
│                  repasse · reembolsos · ticket médio       │
│   cada um com Δ% vs período comparativo                    │
├────────────────────────────────────────────────────────────┤
│ Gráfico diário (linha):  receita bruta vs líquida          │
├────────────────────────────────────────────────────────────┤
│ Tabs:  Por médico · Especialidade · Modalidade ·           │
│        Método · Canal                                      │
│   tabelas ordenáveis com totais                            │
├────────────────────────────────────────────────────────────┤
│ Aviso: "Dados baseados em snapshots imutáveis. Pagamentos  │
│ pendentes não aparecem aqui."                              │
└────────────────────────────────────────────────────────────┘
```

Comportamento:
- Dispara RPC ao trocar período ou modo de comparação
- Loading skeleton enquanto carrega
- KPIs mostram delta colorido (verde/vermelho) e tooltip com valor anterior
- Tabela "Por médico" tem busca local

## Exportação CSV
Reusa `downloadCSV` de `src/lib/relatorios/utils.ts`:
- Bloco 1: KPIs período atual + comparativo + variação
- Bloco 2: por médico, com totais
- Bloco 3: por especialidade
- Blocos 4–6: modalidade, método, canal
- Encoding UTF-8 com BOM (Excel BR-friendly), separador `;`

## Exportação PDF
Implementação 100% client-side com `jspdf` + `jspdf-autotable` (já viáveis no bundle, sem edge function nem Puppeteer):

- Capa com fundo escuro (slate-900), título "Relatório Financeiro", subtítulo "Lasmar Telemed", período e data de geração
- Seção "Indicadores": tabela com 4 colunas (Indicador, Atual, Comparativo, Variação)
- Seção "Por médico" (até 25 linhas no PDF; CSV traz tudo)
- Seções "Por especialidade", "Por modalidade", "Por método", "Por canal"
- Quebra de página automática entre seções quando passa de y > 700pt
- Rodapé com "Página X de Y · Lasmar Telemed" em todas as páginas
- Nome do arquivo: `relatorio-financeiro-YYYY-MM-DD-a-YYYY-MM-DD.pdf`

Função utilitária em `src/lib/relatorios/pdfFinanceiro.ts` exportando `gerarPdfFinanceiro(dados, opts)`.

## Permissões
A permissão `relatorios.ver_financeiro` já existe no catálogo. O componente `<RequireRoutePermission perm={["relatorios.ver","relatorios.ver_financeiro"]} all>` bloqueia acesso por URL e mostra a tela de "Acesso restrito" para quem não tiver as duas chaves.

## Observação técnica
A página depende dos snapshots populados após a Fase 2: pagamentos pagos antes da migration não terão `snapshot_at`, então o relatório só mostrará dados a partir do momento que os triggers entraram em vigor. Não vou retroagir snapshots históricos automaticamente (qualquer cálculo retroativo seria estimativa, quebrando a premissa de imutabilidade). Caso o admin queira incluir histórico, podemos adicionar um botão "Backfill snapshots" em uma fase futura, com confirmação explícita e auditoria.

## Arquivos
**Criar**
- `supabase/migrations/<timestamp>_relatorios_financeiro_snapshot.sql` — RPC
- `src/pages/app/admin/AdminRelatorioFinanceiro.tsx` — página
- `src/lib/relatorios/pdfFinanceiro.ts` — gerador PDF

**Editar**
- `src/App.tsx` — adicionar rota
- `src/components/relatorios/FinanceiroTab.tsx` — botão "Ver relatório completo →"
- `src/lib/profiles.ts` — opcional: adicionar item de menu

**Dependências**
- `bun add jspdf jspdf-autotable` (sem peer issues conhecidas)
