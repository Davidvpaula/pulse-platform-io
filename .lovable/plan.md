## Problema

O trigger `fn_consulta_status_guard` no banco bloqueia `agendada → em_andamento`. As transições válidas são:

- `agendada → confirmada`
- `confirmada → em_andamento`
- `em_andamento → concluida`

Os 3 arquivos tentam pular direto para `em_andamento`, causando o erro.

---

## 1. Corrigir botão Iniciar (3 arquivos)

### `MedicoDashboard.tsx` (função `iniciarConsulta`, ~linha 226)
- Se `c.status === "em_andamento"`: apenas abrir sala, retornar
- Se `c.status === "agendada"`: update para `confirmada` primeiro, depois update para `em_andamento`
- Se `c.status === "confirmada"`: update direto para `em_andamento`
- Qualquer outro status: toast de erro, bloquear

### `MedicoAgenda.tsx` (função `iniciarConsulta`, ~linha 119)
- Mesma lógica: se agendada, confirmar primeiro; se confirmada, iniciar direto; se outro status, bloquear

### `MedicoConsultas.tsx` (função `iniciar`, ~linha 97)
- Mesma lógica: se agendada, confirmar primeiro; se confirmada, iniciar direto
- Já tem tratamento para `em_andamento` (só abre sala)

---

## 2. Reorganizar UX de MedicoConsultas

### Consultas agrupadas por status
Na listagem, agrupar visualmente as consultas do dia em seções:
- **Em andamento** (destaque, topo)
- **Aguardando / Confirmadas** (prontas para iniciar)
- **Concluídas** (colapsável ou ao final)

### Botões condicionais
- "Iniciar" / "Entrar na sala": só quando `agendada` ou `confirmada` e horário próximo (30min)
- "Finalizar": só quando `em_andamento`
- "Continuar": quando `em_andamento` e tem link de sala

### Header
- Adicionar badge "Fila de atendimento" no título para deixar claro o papel operacional

---

## 3. Link Agenda → Consultas

### `MedicoAgenda.tsx`
- Adicionar botão "Ver fila de atendimento" no header, linkando para `/app/medico/consultas`
- Manter Agenda focada em planejamento/calendário

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/medico/MedicoDashboard.tsx` | Fix iniciarConsulta com 2-step transition |
| `src/pages/app/medico/MedicoAgenda.tsx` | Fix iniciarConsulta + link para Consultas |
| `src/pages/app/medico/MedicoConsultas.tsx` | Fix iniciar + agrupamento por status + UX |
