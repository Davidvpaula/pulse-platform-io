## Objetivo

Adicionar uma tela de **simulação somente-leitura** no painel financeiro do Admin que mostra, lado a lado, como o repasse seria calculado para uma lista de consultas particulares (`servico_id IS NULL`):

- **Coluna "Atual" (snapshot já gravado)** — exibe os valores que estão imutáveis na consulta (`valor_snapshot_centavos`, `comissao_snapshot_centavos`, `comissao_percentual_snapshot`). É o que o médico realmente vai receber.
- **Coluna "Se fosse hoje" (recalculado)** — aplica a prioridade vigente (exceção do médico ativa > regra global) sobre o mesmo `valor_snapshot_centavos`, **sem gravar nada**.
- **Coluna "Diferença"** — destaca onde a regra atual divergiria do snapshot, e em quanto.

Isso responde à pergunta "se eu mudar o repasse global / criar uma exceção para o Dr. X, o que muda para consultas já agendadas vs. para as próximas?" — sem risco de alterar nenhuma consulta existente.

## Onde fica

- Nova rota: `/app/admin/financeiro/previa-repasse`
- Card de acesso a partir de `AdminFinanceiroConfig.tsx` (botão "Abrir prévia de impacto").
- Item correspondente no menu lateral do Admin (mesma seção do "Configuração de repasse").

## Layout da tela

```text
┌─ Prévia de impacto do repasse (somente leitura) ──────────────┐
│ Filtros: [Período ▾]  [Status ▾]  [Médico ▾]  [Buscar]        │
│                                                                │
│ Simulação:                                                     │
│   ( ) Usar regras vigentes                                     │
│   (•) Simular novo repasse global: [ 56 % médico ]             │
│   [ ] Simular exceção para [Médico ▾] = [ 60 % médico ]        │
│                                                                │
│ Resumo:  N consultas | Σ snapshot médico R$ X | Σ simulado R$ Y│
│          Diferença total: +R$ Z                                │
│                                                                │
│ Tabela:                                                        │
│  Data | Médico | Status | Valor | % atual | R$ médico atual    │
│       | % simulado | R$ médico simulado | Δ | Origem da regra  │
└────────────────────────────────────────────────────────────────┘
```

Duas abas no topo:

- **"Já agendadas"** — `consultas` particulares com `inicio >= hoje` (ou conforme filtro), status em `agendada / aguardando_pagamento / confirmada`. Mostra que o snapshot **não muda** mesmo simulando.
- **"Novas (próximos slots)"** — slots particulares ainda livres dos médicos selecionados, simulando que valor o médico receberia se a consulta fosse criada agora com as regras simuladas.

## Lógica (sem mutações)

1. Carregar consultas particulares (`servico_id IS NULL`) com `medico_id`, `inicio`, `status`, `valor_snapshot_centavos`, `comissao_snapshot_centavos`, `comissao_percentual_snapshot` + nome do médico.
2. Para cada consulta, resolver a "regra vigente" no cliente:
   - Se houver `medico_comissao_override` ativo com `servico_id IS NULL` para o `medico_id` → **exceção do médico**.
   - Senão → **regra global** (`getRepasseGlobal`).
3. Aplicar a regra simulada (escolhida no formulário) sobre `valor_snapshot_centavos` para obter o "R$ médico simulado".
4. Mostrar comparação. Nenhuma chamada de `update/insert/delete` em consultas, app_settings ou overrides.

Para a aba **"Novas"**, usa-se `slots` futuros particulares + `medico_servicos`/preço-base do médico (já existente) como `valor_base_centavos` simulado.

## Componentes/arquivos novos

- `src/pages/app/admin/AdminPreviaRepasse.tsx` — tela principal com abas, filtros, resumo e tabela.
- `src/components/financeiro/PreviaRepasseTabela.tsx` — tabela comparativa (atual vs. simulado vs. diferença).
- `src/components/financeiro/PreviaRepasseSimuladorForm.tsx` — formulário de simulação (reaproveita `RepasseSplitInput`).
- `src/lib/financeiroPrevia.ts` — funções puras de leitura + cálculo de simulação:
  - `listConsultasParticularesParaPrevia(filtros)`
  - `listSlotsParticularesFuturosParaPrevia(filtros)`
  - `simularRepasse({ valorCentavos, regraSimulada, regrasVigentesPorMedico })` — retorna `{ pctMedico, valorMedicoCentavos, origemRegra }`.

## Edições

- `src/pages/app/admin/AdminFinanceiroConfig.tsx` — botão "Abrir prévia de impacto" linkando para a nova rota.
- `src/App.tsx` (ou onde estão as rotas do Admin) — registrar a rota `/app/admin/financeiro/previa-repasse` protegida pelo mesmo guard de `AdminFinanceiroConfig`.
- Menu lateral do Admin — adicionar item "Prévia de repasse".

## Garantias

- **Read-only por construção:** `financeiroPrevia.ts` só faz `select`. Nenhuma mutação.
- **Snapshot respeitado:** a coluna "Atual" mostra exatamente os campos `*_snapshot_*` da consulta — deixa claro ao Admin que consultas já agendadas não serão recalculadas mesmo se o repasse global mudar.
- **Exportação CSV** opcional do comparativo, para o Admin levar para análise.

## Fora de escopo

- Não cria, altera ou apaga consultas, overrides ou `app_settings`.
- Não dispara notificações para médicos.
- Não toca em consultas com `servico_id` (serviços da plataforma) — fica como melhoria futura.
