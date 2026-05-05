
## Problema

A página **Admin > Planos de Médicos** retorna 0 resultados porque a query PostgREST falha com erro 400:

```
Could not find a relationship between 'planos' and 'medicos' in the schema cache
```

A query usa `medicos!planos_medico_id_fkey(nome, especialidade)`, mas essa FK não existe no banco.

## Causa raiz

- `planos.medico_id` armazena `auth.users.id`
- `medicos.user_id` armazena o mesmo valor
- `medicos.user_id` já possui UNIQUE index (`medicos_user_id_key`)
- Porém **nenhuma FK** liga `planos.medico_id` a `medicos.user_id`

## Solução

### Migration: criar a FK

```sql
ALTER TABLE public.planos
  ADD CONSTRAINT planos_medico_id_fkey
  FOREIGN KEY (medico_id) REFERENCES public.medicos(user_id)
  ON DELETE SET NULL;
```

Isso é tudo. Nenhuma alteração de código necessária -- a query existente no `AdminPlanosMedicos.tsx` já usa exatamente `medicos!planos_medico_id_fkey`, que passará a funcionar assim que a FK existir.

### Verificações

- `medicos.user_id` já tem UNIQUE index (confirmado: `medicos_user_id_key`)
- Os 2 planos existentes (`medico_id = 59282375-...`) batem com `medicos.user_id` do mesmo valor
- Nenhum arquivo de código será alterado
- O schema cache do PostgREST é atualizado automaticamente após a migration
