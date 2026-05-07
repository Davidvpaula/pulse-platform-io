
# Bug: Vinculação Feegow associa profissional errado

## Causa raiz

A edge function `feegow-vincular-profissional` busca o profissional com:
```
GET /professional/list?profissional_id={id}
```

Porém a API Feegow retorna `content` como **array com TODOS os profissionais** (ignora o filtro ou o parâmetro não funciona como esperado). O código faz:
```js
const prof = Array.isArray(fData.content) ? fData.content[0] : null;
```

Isso **sempre pega o primeiro da lista** (Ana Claudia, profissional_id=17), independente de qual ID foi solicitado.

Os logs confirmam: em todas as vinculações recentes, o `metadata` retornado é sempre Ana Claudia (profissional_id=17), mesmo quando `entidade_id_externo` era diferente.

## Correção

Na edge function `feegow-vincular-profissional`, em vez de pegar `content[0]`, **buscar dentro do array/objeto o profissional cujo `profissional_id` corresponde ao ID solicitado**:

```js
// Se content é array, buscar pelo ID correto
// Se content é objeto (dicionário por ID), buscar pela chave
const prof = Array.isArray(fData.content)
  ? fData.content.find(p => p.profissional_id === feegow_profissional_id)
  : fData.content?.[String(feegow_profissional_id)] ?? null;
```

Depois de corrigir, re-vincular Nagila ao profissional correto.

## Impacto
- Corrige vinculação de todos os médicos (não apenas Nagila)
- A Nagila precisará ser desvinculada e revinculada após o fix
