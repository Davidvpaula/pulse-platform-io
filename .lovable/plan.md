
## Diagnóstico do 403 Feegow

### Contexto
- A documentação Feegow confirma: header correto é `x-access-token`
- URL base confirmada: `https://api.feegow.com/v1/api`
- O endpoint `/specialties/list` é GET na documentação
- Possíveis causas: token inválido/expirado, aspas extras no token armazenado, método HTTP errado, ou permissão da licença

### Alteração

**Arquivo:** `supabase/functions/integracoes-test/index.ts`

Quando `body.mode === "diagnostico"`, a função executa 4 testes read-only em sequência e retorna um relatório consolidado:

| # | Header | Método HTTP | Endpoint |
|---|--------|-------------|----------|
| 1 | `x-access-token: TOKEN` | GET | `/specialties/list` |
| 2 | `x-access-token: TOKEN` | POST | `/specialties/list` |
| 3 | `Authorization: Bearer TOKEN` | GET | `/specialties/list` |
| 4 | `x-access-token: TOKEN` | GET | `/professional/list?ativo=1` |

O token é mascarado no relatório (primeiros 10 + últimos 4 chars). Nenhum dado é criado/enviado.

O retorno inclui: array de resultados com `{ teste, header_usado, metodo, endpoint, http_status, resposta_resumo }` + campo `recomendacao` automático baseado nos resultados.

### O que NÃO muda
- Nenhuma tabela, migration, RLS, UI ou outra edge function
- O fluxo padrão (sem `mode: "diagnostico"`) continua igual
