## Problem

When navigating to `/app/agendamento/confirmar/:slotId?tipo=especialidade` without a `ref` parameter, the `carregarSlotInfo` function passes an empty string `""` to `.eq("especialidade_id", ref)`, which Postgres rejects as an invalid UUID.

This happens because `MedicoSlotsPanel` doesn't always have an `especialidadeId` — when the patient picks a slot without a specific specialty context, no `ref` is included in the URL.

## Fix

**File: `src/pages/app/agendamento/AgendamentoConfirmar.tsx`** (function `carregarSlotInfo`, lines 99-112)

When `tipo === "especialidade"` and `ref` is empty:
- Skip the `.eq("especialidade_id", ref)` query
- Instead, fetch the doctor's first active `medico_especialidades` record (same fallback already used in the `else` branch at lines 137-150)
- Use that to populate `referencia_nome`, `preco_centavos`, and `duracao_minutos`

This is a small change to the `if (tipo === "especialidade")` block — add an early check for empty `ref` and reuse the generic fallback logic.
