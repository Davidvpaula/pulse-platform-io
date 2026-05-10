# Estabilidade da suíte E2E (Onda A)

Este documento é **operacional**: como observar, interpretar e reagir a falhas
sem cair nas armadilhas clássicas (mascarar flake como bug, expandir suíte
prematuramente, aumentar timeouts globalmente).

## Princípio

A Onda A está em **período de observação**. Objetivo: medir se a suíte
atual é confiável o bastante para suportar uma Onda B no futuro.
Durante esse período, **não** adicionamos testes novos. Só corrigimos
estabilidade.

## Como interpretar uma falha do CI

1. Abrir a run no GitHub Actions → job `Playwright E2E (Onda A)`.
2. Baixar o artefato `playwright-report` (fica 7 dias).
3. Localmente: `bunx playwright show-report playwright-report/`.
4. Para cada falha, classificar:
   - **Regressão real**: o produto mudou e o teste pegou. Corrigir produto
     ou ajustar o teste se a mudança foi intencional.
   - **Flake**: passou no retry, ou falha intermitente sem mudança correlata
     de produto. Ver seção "Critério de flaky" abaixo.
   - **Instabilidade do preview**: 502, 504, timeout de navegação, cold
     start > 30s. Ver "Sinais do preview".

## Critério de "flaky"

Um teste é considerado **flaky** quando:

- Falhou ≥ **2 vezes em 10 runs consecutivas em `main`**, e
- Não houve mudança de produto correlata (mesma versão de `main` passou e
  falhou alternadamente), e
- O retry interno (`retries: 1`) salvou o run em parte das ocorrências.

Sinal único de falha não basta para chamar de flake. Sinal único é
**investigação**, não diagnóstico.

## Quarentena

Quando um teste é confirmado como flaky e a causa-raiz exige tempo:

1. Trocar `test(...)` por `test.fixme(...)` com comentário obrigatório:
   ```ts
   // QUARENTENA 2026-05-12 — flake intermitente em /app/admin/noc, ver issue #123
   test.fixme("NOC renderiza conteúdo operacional", async ({ page }) => { ... });
   ```
2. Abrir issue rastreando o caso (link no comentário).
3. **Nunca** usar `test.skip()` silencioso ou comentar o teste — perde o
   sinal de quarentena no relatório.
4. Revisitar a quarentena em ≤ 14 dias.

## Sinais de instabilidade do preview Lovable

| Sintoma | Causa provável | Ação |
|---|---|---|
| `net::ERR_CONNECTION_REFUSED` | Preview offline / republicando | Re-rodar 1x. Se persistir, abrir ticket. |
| Navigation timeout > 30s | Cold start | Aceitável uma vez por dia. Recorrente → ticket. |
| 502/504 em `/auth` | Edge function de auth com problema | Verificar logs. Não tocar nos testes. |
| Login falha mas `localStorage` tem token antigo | StorageState velho em cache | Esperado: a tolerância de 6h em `auth.setup.ts` cobre isso. |

## O que NÃO fazer durante observação

- ❌ Adicionar testes novos para "ajudar a estabilidade".
- ❌ Aumentar `timeout` global ou `retries` global.
- ❌ Mudar produto só para acomodar um teste frágil.
- ❌ Trocar assert real por assert "mais leve" só pra passar.
- ❌ Desligar o job E2E do CI.
- ❌ Iniciar Onda B antes de ter dados de estabilidade.

## O que pode ser feito durante observação

- ✅ Tornar seletor mais resiliente (ex.: `role="link"` em vez de classe).
- ✅ Trocar `waitForTimeout` por wait condicional.
- ✅ Adicionar retry específico em um único teste se houver justificativa
  documentada (e issue aberta).
- ✅ Quarentenar com `test.fixme()` + issue.
- ✅ Melhorar mensagens de erro dos helpers (não os asserts).

## Métricas a observar (3-5 dias mínimo)

Coletar manualmente nas primeiras runs do CI:

| Métrica | Alvo | Como medir |
|---|---|---|
| Tempo total da suíte | < 4 min | Duração do job `e2e` no Actions |
| Tempo do `setup` (4 logins) | < 30 s | Output do step "Run Playwright tests" |
| Taxa de falha por spec | < 5% | Contar falhas em 10 runs / spec |
| Falhas que passaram no retry | < 10% | Buscar `flaky` no output do reporter |
| Cold-start do preview | ≤ 1x/dia | Observar primeiro request da run |

Se qualquer alvo for estourado consistentemente, **registrar aqui** com data
e proposta de ajuste antes de mexer em código.

## Quando promover para Onda B

A Onda A está pronta para virar Onda B quando:

- ≥ 10 runs consecutivas em `main` 100% verdes (sem usar retry).
- Tempo médio total estável (< 4 min, variação < 30 s entre runs).
- Zero testes em quarentena.
- Nenhum incidente de "preview offline" derrubando o CI por > 1 dia útil.

Antes disso, **não abrir Onda B**. Suíte instável é pior que suíte pequena.
