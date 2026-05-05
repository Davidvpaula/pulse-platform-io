
# Reformulação do Atendimento Imediato (PA)

## Diagnóstico

Dois problemas raiz foram identificados:

1. **RLS bloqueia slot reservado**: A tabela `agenda_slots` tem uma política pública de leitura que permite apenas `status = 'disponivel'`. Quando o PA reserva o slot (via `fn_pa_reservar_slot`, status muda para `reservado`), o paciente não consegue mais ler esse slot. Resultado: `carregarSlotInfo()` retorna `null` → "Horário indisponível".

2. **Dupla reserva conflitante**: O PA pré-reserva o slot com 90 segundos de TTL via `fn_pa_reservar_slot`, depois redireciona para a rota unificada onde `reservarSlotUnificado` tenta reservar novamente com 15 minutos. Essa dupla reserva é desnecessária e causa conflito.

Os Serviços da Plataforma (Pediátrico Online, Check-up, etc.) funcionam porque **não pré-reservam** — o slot está `disponivel` quando o paciente chega no formulário, e a reserva só acontece no submit.

## Solução: Alinhar PA ao padrão dos Serviços

### 1. Migração — RLS para paciente ver slot reservado por ele

Adicionar política na `agenda_slots` para que o paciente consiga ler slots reservados para ele:

```sql
CREATE POLICY "Paciente ve slot reservado por ele"
  ON public.agenda_slots FOR SELECT
  TO authenticated
  USING (
    status = 'reservado'
    AND reservado_por = (SELECT id FROM pacientes WHERE user_id = auth.uid() LIMIT 1)
  );
```

Isso garante que mesmo se um slot for reservado, o dono da reserva pode visualizá-lo.

### 2. Refatorar `AtendimentoImediato.tsx` — Remover pré-reserva

Simplificar o fluxo PA para funcionar igual aos Serviços:

- **Remover** a chamada a `fn_pa_reservar_slot` no clique do slot
- **Remover** o rodapé de reserva com countdown de 90 segundos
- Ao clicar em um slot, navegar **diretamente** para `/app/agendamento/confirmar/:slotId?tipo=pa&ref={servico_id}`
- O slot continua `disponivel` até o paciente submeter o formulário (onde `reservarSlotUnificado` faz a reserva de 15 minutos)

O componente ficará muito mais simples — sem estado de reserva, sem timer, sem `RodapeReserva`.

### 3. Atualizar `carregarSlotInfo()` — Fallback para `servicos_financeiros`

No branch `tipo === "pa"`, usar `servicos_financeiros` diretamente em vez da view `servicos_publicos` (que já é um wrapper simples). Isso garante que a nova política de leitura pública que adicionamos funcione.

### 4. Atualizar `reservarSlotUnificado` (RPC) — Lógica de ranking para PA

Adicionar ao RPC `reservar_slot_unificado` a lógica de seleção por ranking quando `tipo = 'pa'`:
- Se o slot solicitado está disponível, usá-lo
- Se não, buscar o mais próximo no mesmo dia (mesma lógica que `fn_pa_reservar_slot` tinha)

Isso move a inteligência de alocação do PA para dentro do fluxo unificado.

### Resumo dos arquivos

| Arquivo | Mudança |
|---------|---------|
| Migração SQL | RLS para paciente ler slot reservado por ele |
| `src/pages/public/AtendimentoImediato.tsx` | Remover pré-reserva e countdown; clicar no slot navega direto para confirmar |
| `src/pages/app/agendamento/AgendamentoConfirmar.tsx` | Usar `servicos_financeiros` em vez de `servicos_publicos` para tipo `pa` e `servico` |
| Migração SQL (RPC) | Opcional: adicionar fallback de ranking no `reservar_slot_unificado` para tipo PA |
| `src/components/atendimento-imediato/RodapeReserva.tsx` | Pode ser removido ou mantido (não será mais importado) |

### O que NÃO muda

- Fluxo dos Serviços e Especialidades — já funciona corretamente
- Checkout e pagamento — intactos
- `criar_consulta_pos_pagamento` — intacto
- Edge functions Stripe — intactas
