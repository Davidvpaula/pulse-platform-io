
## Problem

When generating platform service slots, ALL are marked as "conflito" because the conflict check looks at every existing slot for the doctor, regardless of `servico_id`. This means:
- Particular slots block service slot creation at the same times
- When selecting multiple services, the first service's newly created slots block the second/third service

## Fix

**File: `src/lib/clinico.ts` — `criarSlotsEmLote` function (line ~776)**

Add a `servico_id` filter to the conflict query:
- If `servicoId` is provided: only check conflicts against slots with the **same** `servico_id`
- If `servicoId` is null (particular): only check conflicts against slots where `servico_id IS NULL`

This allows a doctor to have overlapping time slots for different services and for particular appointments, since the shared calendar model assigns doctors dynamically at booking time.

### Before
```ts
const { data: existentes } = await supabase
  .from("agenda_slots")
  .select("inicio, fim")
  .eq("medico_id", medicoId)
  .lt("inicio", maxFim)
  .gt("fim", minIni);
```

### After
```ts
let q = supabase
  .from("agenda_slots")
  .select("inicio, fim")
  .eq("medico_id", medicoId)
  .lt("inicio", maxFim)
  .gt("fim", minIni);

if (input.servicoId) {
  q = q.eq("servico_id", input.servicoId);
} else {
  q = q.is("servico_id", null);
}

const { data: existentes } = await q;
```

No migration needed. Single file change.
