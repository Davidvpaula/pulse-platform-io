# Plano: Correção de funções RPC duplicadas no agendamento

## Status: APROVADO — Aguardando execução da migration

## Problema
Existem funções RPC duplicadas no banco que causam erro "Could not choose the best candidate function":

- `fn_pa_reservar_slot(_slot_inicio timestamptz)` ← CORRETA
- `fn_pa_reservar_slot(_slot_inicio timestamptz, _paciente_id uuid)` ← DUPLICATA (remover)
- `fn_servico_reservar_slot(_servico_id uuid, _slot_inicio timestamptz)` ← CORRETA  
- `fn_servico_reservar_slot(_slot_inicio timestamptz, _servico_id uuid)` ← DUPLICATA (remover)

## Migration necessária

```sql
-- 1) Drop old fn_pa_reservar_slot with extra _paciente_id param
DROP FUNCTION IF EXISTS public.fn_pa_reservar_slot(_slot_inicio timestamp with time zone, _paciente_id uuid);

-- 2) Drop old fn_servico_reservar_slot with inverted param order
DROP FUNCTION IF EXISTS public.fn_servico_reservar_slot(_slot_inicio timestamp with time zone, _servico_id uuid);

-- 3) Recreate fn_pa_reservar_slot (canonical, single param, OF s)
-- [body identical to current correct version]

-- 4) Recreate fn_servico_reservar_slot (canonical, _servico_id first, OF s)  
-- [body identical to current correct version]
```

## Frontend
Nenhuma mudança necessária — as chamadas RPC já usam parâmetros nomeados corretos.
