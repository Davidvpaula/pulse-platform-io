
## Problema

O erro **"FOR UPDATE cannot be applied to the nullable side of an outer join"** ocorre em ambas as funções `fn_pa_reservar_slot` e `fn_servico_reservar_slot`. 

A causa: as queries fazem `LEFT JOIN public.medico_ranking mr ...` e depois usam `FOR UPDATE SKIP LOCKED`. O PostgreSQL proíbe `FOR UPDATE` em tabelas do lado "nullable" de um outer join. Como `medico_ranking` é LEFT JOIN (nullable side), o banco rejeita a query inteira.

Por isso o agendamento nunca chega ao formulário -- o RPC retorna erro antes de reservar qualquer slot.

---

## Sobre "pacientes" (sua dúvida)

A tabela `pacientes` guarda o perfil de paciente vinculado ao `auth.uid()`. Se um usuário se cadastra mas nunca completa o perfil de paciente (ou se o registro não foi criado automaticamente), a função retorna "Perfil de paciente não encontrado". Isso é uma segunda barreira, mas no seu caso o erro que aparece é o do `FOR UPDATE`, que acontece antes dessa verificação chegar a importar.

---

## Plano de correção

### 1. Migration SQL -- corrigir ambas as funções

Trocar `FOR UPDATE SKIP LOCKED` por `FOR UPDATE OF s SKIP LOCKED` em todas as 4 queries (2 em cada função). Isso diz ao PostgreSQL para travar apenas a tabela `agenda_slots` (alias `s`), ignorando o LEFT JOIN com `medico_ranking`.

Funções afetadas:
- `fn_pa_reservar_slot` (2 queries com FOR UPDATE)
- `fn_servico_reservar_slot` (2 queries com FOR UPDATE)

Nenhuma outra mudança na lógica -- apenas adicionar `OF s` ao lock.

### 2. Nenhuma mudança no frontend

O frontend já está tratando erros corretamente. Uma vez que o RPC funcione, o fluxo normal prossegue: reserva o slot e redireciona para confirmação/formulário.

---

## Detalhes técnicos

Mudança em cada query:
```sql
-- Antes:
FOR UPDATE SKIP LOCKED;

-- Depois:
FOR UPDATE OF s SKIP LOCKED;
```

Isso é a correção padrão do PostgreSQL para locking seletivo em queries com outer joins.
