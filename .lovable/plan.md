
# Corrigir RLS da tabela `pagamentos` para fluxo unificado

## Problema
A política de INSERT na tabela `pagamentos` exige `is_paciente_da_consulta(consulta_id)`, mas no fluxo unificado o `consulta_id` é NULL (consulta só nasce pós-pagamento). O erro aparece tanto no PA quanto em Especialidades e Serviços.

## Solução (2 partes)

### 1. Migração SQL — Atualizar RLS de `pagamentos`

A tabela já tem colunas `paciente_id` e `medico_id` diretas. Atualizar as políticas do paciente para usar essas colunas como alternativa:

```sql
DROP POLICY "paciente cria pagamento próprio" ON pagamentos;
DROP POLICY "paciente vê seus pagamentos" ON pagamentos;
DROP POLICY "paciente atualiza pagamento próprio" ON pagamentos;

-- INSERT: aceita com consulta_id (legado) OU paciente_id direto (unificado)
CREATE POLICY "paciente cria pagamento proprio"
  ON pagamentos FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pendente' AND (
      (consulta_id IS NOT NULL AND is_paciente_da_consulta(consulta_id))
      OR
      (consulta_id IS NULL AND paciente_id = (SELECT id FROM pacientes WHERE user_id = auth.uid()))
    )
  );

-- SELECT e UPDATE com lógica equivalente
```

### 2. Frontend — Preencher `paciente_id` e `medico_id` no insert

No `src/lib/pagamentos.ts`, o mock provider precisa incluir `paciente_id` e `medico_id` como colunas diretas (não só na metadata) para que o RLS consiga validar:

```typescript
if (input.reserva?.paciente_id) insertObj.paciente_id = input.reserva.paciente_id;
if (input.reserva?.medico_id) insertObj.medico_id = input.reserva.medico_id;
```

### Arquivos afetados
| Arquivo | Mudança |
|---------|---------|
| Migração SQL | Atualizar 3 políticas do paciente em `pagamentos` |
| `src/lib/pagamentos.ts` | Adicionar `paciente_id` e `medico_id` no insertObj do mock provider |
