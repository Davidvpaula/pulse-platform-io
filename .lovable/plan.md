## Problema

No `PlanoBuilder.tsx`, ao salvar um plano em `medicoMode`, a linha 324 faz:
```ts
payload.medico_id = uid; // uid = session.user.id (auth UUID)
```

Porém a política RLS exige que `planos.medico_id` corresponda a `medicos.id` (PK da tabela medicos), não ao `user_id` de auth. Resultado: "new row violates row-level security policy for table planos".

## Correção

Em `src/components/planos/PlanoBuilder.tsx`:

1. Adicionar um estado `medicoId` (PK da tabela medicos) que já é buscado em `loadMedicoAndSetBenefit` (variável `med.id`).
2. Na função `loadMedicoAndSetBenefit`, salvar `med.id` num estado.
3. Na lógica de save (linha 324), usar esse estado ao invés de `uid`:
   - `payload.medico_id = medicoId` (PK medicos)
   - `payload.created_by = uid` (auth uid — permanece correto)

Impacto: apenas 1 arquivo, ~5 linhas alteradas.
