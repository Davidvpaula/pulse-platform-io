## Objetivo

Criar a tela `/app/admin/relatorios/auditoria` como visão analítica do `audit_log` (via view unificada `audit_eventos_unificado`), no mesmo padrão do relatório financeiro recém-criado. Foco em **consulta/relatório**, sem fluxo de revisão (que já existe em `/app/admin/auditoria`).

Filtros pedidos: **entidade**, **usuário (ator)**, **data**, **severidade**. Aproveitar RPC `auditoria_listar` e `auditoria_dashboard` que já existem e já validam permissão `auditoria.ver`.

## Escopo

### 1. Nova página `src/pages/app/admin/AdminRelatorioAuditoria.tsx`

Layout em três blocos:

**a) Barra de filtros (sticky no topo)**
- Período (date range com presets 7d / 30d / 90d / customizado) — reutiliza `FiltrosGlobaisBar` ou recria leve
- Severidade (multi: baixo / médio / alto / crítico)
- Módulo / Entidade tipo (select: consultas, colaboradores, planos, comunicação, financeiro, permissões — derivado dos valores existentes na view)
- Entidade ID (input UUID opcional, com placeholder)
- Usuário (ator) — combobox com busca por nome (carrega top atores via `auditoria_dashboard.top_atores` + permite digitar UUID)
- Ação (input texto livre, busca parcial)
- Origem (manual / sistema)
- Botão "Aplicar" e "Limpar"

**b) KPIs e gráficos** (via `auditoria_dashboard`)
- Cards: Total no período, Hoje, Críticos, Altos, Não revisados sensíveis, Financeiro, Permissões, Integração, Bloqueios
- Gráfico de linha "Eventos por dia" (Recharts, `por_dia`)
- Gráfico de barras "Top 10 atores" (`top_atores`)
- Donut "Por módulo" (`por_modulo`)

**c) Tabela de eventos** (via `auditoria_listar`)
- Colunas: Data/hora, Severidade (badge colorida), Módulo, Ação, Ator, Entidade (tipo + id curto), Campo, Valor anterior → novo, Origem
- Paginação server-side (50 por página) usando `total_count` que a RPC já retorna
- Click na linha abre `Sheet` lateral com payload completo (JSON formatado), motivo, observação, contexto de revisão se houver — somente leitura
- Ordenação por data desc

### 2. Exportação

- **CSV**: gera no cliente a partir do resultado atual filtrado (todos os eventos do filtro, não só a página — fazer fetch sem paginação até limite de 5000 com aviso)
- **PDF**: novo helper `src/lib/relatorios/pdfAuditoria.ts` (mesmo padrão de `pdfFinanceiro.ts`, usando `jspdf` + `jspdf-autotable`):
  - Capa com filtros aplicados, período e total de eventos
  - Resumo de KPIs
  - Tabela de eventos (truncada se > 1000, com nota)
  - Rodapé com hash/timestamp da geração para rastreabilidade

### 3. Roteamento e navegação

- `src/App.tsx`: registrar rota `admin/relatorios/auditoria` protegida por `RequireRoutePermission perm="auditoria.ver"` (mesma permissão usada na tela existente)
- `src/pages/app/admin/AdminRelatorios.tsx`: substituir o placeholder da aba "auditoria" por um card com link "Abrir relatório completo de auditoria →" apontando para a nova rota (mantém consistência com aba financeiro)

### 4. Diferenciação vs `/app/admin/auditoria` existente

| Aspecto | `/admin/auditoria` (operacional) | `/admin/relatorios/auditoria` (analítico) |
|---|---|---|
| Foco | Revisar e marcar eventos | Consultar, analisar, exportar |
| Ações | Botão "Marcar revisado", notas | Somente leitura |
| Visual | Tabela densa | KPIs + gráficos + tabela |
| Export | CSV simples | CSV + PDF rico |

## Detalhes técnicos

- Não há mudança de schema nem nova RPC: tudo vai pelas funções existentes `auditoria_listar` e `auditoria_dashboard`, que já têm `SECURITY DEFINER` validando `has_permission(auth.uid(), 'auditoria.ver')`.
- `audit_log` cru tem 0 linhas hoje; a view `audit_eventos_unificado` agrega outras fontes (consultas, colaboradores, planos, comunicação) — a tela já vai funcionar com os dados reais existentes.
- Tipagem dos eventos: copiar o type `Evento` de `AdminAuditoria.tsx` para um novo `src/lib/relatorios/typesAuditoria.ts` para reuso entre página e exportador PDF.
- PDF renderiza em background via `jspdf` (já instalado na fase do relatório financeiro), portanto sem nova dependência.
- Mantém i18n em pt-BR e segue tokens de cor do design system (badges de severidade: verde/amarelo/laranja/vermelho via `bg-*` semânticos do tailwind config).

## Arquivos

**Novos**
- `src/pages/app/admin/AdminRelatorioAuditoria.tsx`
- `src/lib/relatorios/pdfAuditoria.ts`
- `src/lib/relatorios/typesAuditoria.ts`

**Editados**
- `src/App.tsx` (nova rota)
- `src/pages/app/admin/AdminRelatorios.tsx` (link na aba auditoria)

## Fora de escopo

- Nenhuma migration SQL
- Não mexer em `/app/admin/auditoria` existente
- Não criar fluxo de revisão/marcação nesta tela (é só leitura/relatório)
- Sem realtime (relatório é snapshot do filtro aplicado)