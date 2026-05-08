## Objetivo

Quando o paciente clicar no "X" do banner "Como foi sua consulta com…", o pedido de avaliação some **definitivamente** para aquela consulta — não reaparece em recargas futuras.

## Mudanças

### 1. Banco de dados (migration)
Adicionar coluna em `consultas`:
- `avaliacao_dispensada_em timestamptz NULL` — registra quando o paciente recusou avaliar.

(Alternativa considerada: tabela separada. Descartada por ser 1:1 com a consulta e simplificar o filtro do RPC.)

### 2. RPC `consultas_pendentes_avaliacao`
Adicionar no `WHERE`:
```sql
AND c.avaliacao_dispensada_em IS NULL
```
Assim consultas dispensadas saem da lista para sempre.

### 3. Novo RPC `dispensar_avaliacao_consulta(p_consulta_id uuid)`
- `SECURITY DEFINER`, valida que `auth.uid()` é dono da consulta (via `pacientes.user_id`).
- Atualiza `avaliacao_dispensada_em = now()` se ainda for `NULL`.
- Retorna `boolean`.

### 4. Frontend — `src/lib/gamificacao.ts`
Adicionar helper:
```ts
export async function dispensarAvaliacaoConsulta(consultaId: string)
```
que invoca o RPC.

### 5. Frontend — `src/components/paciente/AvaliacaoPendenteBanner.tsx`
- No clique do botão `X`, chamar `dispensarAvaliacaoConsulta(p.consulta_id)` e só então remover do estado local.
- Manter o `dismissed` local apenas como fallback otimista até a chamada concluir.
- Em caso de erro, mostrar toast e reverter.

### 6. Avaliação posterior
Quando o paciente avaliar normalmente (cria registro em `avaliacoes_medicas`), nada muda — o RPC já filtra por `NOT EXISTS avaliacoes_medicas`. Não é preciso preencher `avaliacao_dispensada_em` nesse caso.

## Resultado
Clicar no X = decisão definitiva. Banner não acumula mais entre sessões.
