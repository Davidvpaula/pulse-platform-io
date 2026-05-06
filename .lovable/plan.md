## Erro 1 — Relatório Financeiro

**Causa:** O frontend chama `relatorios_financeiro_snapshot(p_compare_mode, p_fim, p_inicio)` mas a função no banco aceita `(p_inicio, p_fim, p_medico)` — não tem `p_compare_mode`. Além disso, a função ainda referencia `cf.data_consulta` que foi renomeada para `n`.

**Correção (migração SQL):**
- Recriar `relatorios_financeiro_snapshot` adicionando o parâmetro `p_compare_mode` e substituindo `cf.data_consulta` por `cf.n` em todas as ocorrências.
- Manter `p_medico` como parâmetro opcional (já existe).

**OU** ajustar o frontend para não enviar `p_compare_mode` e usar os parâmetros que a função já aceita. Depende se a lógica de comparação é necessária.

Recomendo: **corrigir a função SQL** para aceitar `p_compare_mode` e trocar `data_consulta` → `n`.

---

## Erro 2 — Auditoria

**Causa:** Existem **duas funções** `auditoria_listar` com assinaturas quase idênticas (uma tem `p_revisado text`, a outra não; uma usa defaults `'todos'`, a outra `NULL`). O PostgREST não consegue escolher qual usar.

**Correção (migração SQL):**
- Dropar a versão que NÃO tem `p_revisado` (a mais limitada).
- Manter a versão completa com `p_revisado`.
- Ajustar defaults para compatibilidade com o frontend (que envia `'todos'` para filtros vazios).

---

## Resumo de alterações

| Item | Tipo | Arquivo |
|------|------|---------|
| Recriar `relatorios_financeiro_snapshot` | Migração SQL | Nova migração |
| Dropar `auditoria_listar` duplicada | Migração SQL | Mesma migração |
| Nenhuma alteração de frontend necessária | — | — |
