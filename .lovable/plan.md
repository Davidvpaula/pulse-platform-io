## Colocar os 3 blocos lado a lado

O grid atual usa `md:grid-cols-2 lg:grid-cols-[0.95fr_1fr_0.85fr]`. Como o breakpoint `lg` é 1024px e a viewport está em 948px, o terceiro card (Detalhes da consulta) cai pra baixo.

### Alteração em `src/components/public/MedicoSlotsPanel.tsx` (linha 140)

Mudar:
```
grid gap-3 md:grid-cols-2 lg:grid-cols-[0.95fr_1fr_0.85fr]
```
Para:
```
grid gap-3 md:grid-cols-[0.95fr_1fr_0.9fr]
```

Assim, a partir de 768px (md), os 3 blocos (Calendário, Horários, Detalhes) ficam lado a lado em uma única linha. Em telas menores que md continuam empilhados.
