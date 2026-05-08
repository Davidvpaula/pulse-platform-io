## Causa do erro

Toast: `invalid input value for enum consulta_canal: "direto"`.

A função RPC do relatório financeiro (migration `20260506193607_…`) tem:

```sql
SELECT COALESCE(c.canal_origem, 'direto') as canal, ...
GROUP BY c.canal_origem
```

`canal_origem` é do tipo enum `consulta_canal`, cujos valores válidos são:
`app, empresa, manual_admin, manual_secretaria, retorno, api, pa_publico, servico_plataforma`.

`'direto'` não existe no enum, então o Postgres falha ao tentar resolver o `COALESCE` (ambos os ramos precisam ser do mesmo tipo). O relatório quebra inteiro.

## Correção

Migration nova que recria a função `relatorio_financeiro_consolidado` (ou o nome exato dessa RPC) trocando o trecho do `por_canal` para fazer cast para texto antes do `COALESCE`:

```sql
SELECT COALESCE(c.canal_origem::text, 'direto') as canal,
       COUNT(*) as consultas,
       SUM(cf.valor_bruto_centavos) as receita_centavos
FROM consultas_financeiro cf
LEFT JOIN consultas c ON c.id = cf.consulta_id
WHERE cf.status = 'valido'
  AND cf.data_consulta::date >= p_inicio
  AND cf.data_consulta::date <= p_fim
GROUP BY c.canal_origem
ORDER BY receita_centavos DESC
```

Mudança única: `c.canal_origem` → `c.canal_origem::text` no `COALESCE`. Resolve o erro sem mexer no enum nem em dados.

Nada muda no frontend.

## Validação
1. Acessar `/app/admin/relatorios/financeiro` com um período que tenha consultas — o relatório deve carregar sem o toast vermelho.
2. Verificar que o gráfico "Receita por canal" mostra as barras (incluindo possivelmente "direto" se houver consulta sem canal, embora hoje canal_origem seja NOT NULL DEFAULT 'app').
