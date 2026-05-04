
# Plano de Execucao — Todas as Etapas do Checkup

Baseado no diagnostico aprovado, executarei as 4 etapas em sequencia.

---

## Etapa 1 — Migration: RLS + RPCs (Bug critico + Seguranca)

Uma unica migration SQL que faz:

1. **RLS `agenda_slots`**: Drop policy `"Slots disponíveis públicos a autenticados"` (authenticated only) e criar `"Slots disponíveis visíveis publicamente"` com `TO authenticated, anon` e `USING (status = 'disponivel')`. Isso corrige a invisibilidade de slots particulares para visitantes nao-logados no perfil do medico.

2. **RPC `fn_servico_reservar_slot`**: Recriar com 2 parametros (`_slot_inicio`, `_servico_id`) em vez de 3. O `_paciente_id` sera derivado internamente via `auth.uid()` + lookup em `pacientes`. Adiciona guard `auth.uid() IS NOT NULL`. Isso corrige o mismatch de parametros com o frontend e impede impersonacao.

3. **RPC `fn_servico_confirmar_reserva`**: Idem — recriar com 2 parametros (`_slot_id`, `_servico_id`). Adiciona verificacao de que o slot foi reservado pelo mesmo paciente. Revoga `EXECUTE` de `anon` em ambas as RPCs.

---

## Etapa 2 — Limpeza de codigo

1. **`src/lib/format.ts`**: Adicionar funcao `dataLabel(iso: string): string` centralizada (Hoje/Amanha/data formatada).

2. **`src/components/public/MedicoSlotsPanel.tsx`**: Remover `formatHora` e `dataLabel` locais, importar `fmtHora` e `dataLabel` de `@/lib/format`.

3. **`src/pages/public/ServicoDetalhe.tsx`**: Remover `dataLabel` local, importar de `@/lib/format`.

---

## Etapa 3 — (incluida na Etapa 1)

A seguranca das RPCs ja esta coberta na migration da Etapa 1.

---

## Etapa 4 — Melhorias UX

1. **`MedicoHorarios.tsx`**: Na info-bar de duracao, quando `tipoSlot === "servico"`, mostrar a duracao do(s) servico(s) selecionado(s) em vez da duracao da especialidade.

2. **`PacienteAgendamentos.tsx`**: Melhorar o empty state de "futuras" com card mais destacado e CTA maior.

---

## Arquivos modificados

| Arquivo | Tipo |
|---------|------|
| Migration SQL (novo) | DB schema |
| `src/lib/format.ts` | Adicionar `dataLabel` |
| `src/components/public/MedicoSlotsPanel.tsx` | Remover helpers locais, usar centralizados |
| `src/pages/public/ServicoDetalhe.tsx` | Remover `dataLabel` local, importar |
| `src/pages/app/medico/MedicoHorarios.tsx` | Fix info-bar duracao |
| `src/pages/app/paciente/PacienteAgendamentos.tsx` | Melhorar empty state |
