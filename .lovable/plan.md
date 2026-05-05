
## Problema identificado

O Atendimento Imediato tem **dois bugs**:

1. **Rota inexistente**: Após confirmar, navega para `/app/paciente/consultas` — essa rota não existe (a correta é `/app/paciente/agendamentos`). Resultado: tela "Rota não encontrada" (imagem 2).

2. **Fluxo fora do padrão unificado**: O PA usa RPCs legadas (`fn_pa_reservar_slot` + `fn_pa_confirmar_reserva`) que criam consulta com status `aguardando_pagamento` diretamente no banco — sem passar pelo checkout/pagamento. Isso viola a regra "consulta só nasce pós-pagamento" e deixa consultas em limbo (imagem 3).

Os outros serviços (Pediátrico Online, Check-up) funcionam porque já usam a rota unificada `/app/agendamento/confirmar/:slotId`.

---

## Plano de correção

### 1. Alterar o botão "Confirmar" do PA

Em vez de chamar `fn_pa_confirmar_reserva` (que cria consulta direto), o botão "Confirmar" deve redirecionar para a rota unificada:

```
/app/agendamento/confirmar/{slot_id}?tipo=pa&ref={servico_id}
```

Isso garante que o paciente passe pelo formulário de dados, reserva via `reservar_slot_unificado`, checkout e pagamento — igual aos outros serviços.

### 2. Manter a reserva inicial (`fn_pa_reservar_slot`)

A RPC `fn_pa_reservar_slot` continua útil: ela faz a alocação inteligente por ranking (escolhe o médico, redistribui se lotado). Porém, ao confirmar, o fluxo segue pela rota unificada que chama `reservar_slot_unificado` — que vai re-reservar o slot já reservado pelo PA.

Para evitar conflito, ajustaremos `reservar_slot_unificado` para aceitar slots com status `reservado` quando o `reservado_por` é o próprio paciente (hoje só aceita `disponivel`).

### 3. Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/public/AtendimentoImediato.tsx` | `confirmar()` navega para rota unificada em vez de chamar RPC legada |
| Migration SQL | Ajustar `reservar_slot_unificado` para aceitar re-reserva do próprio paciente |

### 4. Detalhes técnicos

**AtendimentoImediato.tsx** — função `confirmar()`:
- Remover chamada a `fn_pa_confirmar_reserva`
- Navegar para `/app/agendamento/confirmar/${reserva.slot_id}?tipo=pa&ref=${cfg.servico_id}`
- Manter `fn_pa_reservar_slot` (etapa 1 do PA: reserva rápida com ranking)

**Migration** — `reservar_slot_unificado`:
- Adicionar condição: se slot está `reservado` E `reservado_por` = paciente atual, permitir re-reserva (estender expiração)
- Caso contrário, manter comportamento atual (rejeitar se não `disponivel`)
