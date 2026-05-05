
## Problema

O botão "Iniciar" na página `/app/medico/consultas` tem duas condições extras que a página `/app/medico/agenda` não tem:

1. **Requer `c.link_sala`** — se por algum motivo a sala não estiver preenchida, o botão não aparece
2. **Requer estar a menos de 30 minutos do horário** — se a consulta é mais adiante, o botão some

Na Agenda, o botão aparece sempre que o status é `agendada` ou `confirmada`, sem essas restrições.

## Correção

**Arquivo:** `src/pages/app/medico/MedicoConsultas.tsx`

1. **Remover a restrição de 30 minutos** do `podeIniciar` (linha 155-157) — a Fila de Atendimento é a página operacional, o médico deve poder iniciar a qualquer momento.

2. **Remover a exigência de `c.link_sala`** do botão Iniciar (linha 230) — o botão deve aparecer independentemente de ter link de sala. Se tiver sala, abre após iniciar; se não tiver, só muda o status.

Resultado: o botão Iniciar vai se comportar igual ao da Agenda.
