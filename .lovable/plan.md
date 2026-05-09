## Objetivo

Resolver dois problemas de UX na visão de agendamentos do paciente:

1. **Botão "Aguarde" quebra a experiência** — quando o médico já tem link fixo de sala, o paciente deve ver **"Entrar"** clicável imediatamente, sem janela de antecedência de 15 min.
2. **Lista padrão polui com Concluídas/Canceladas** — a primeira tela só deve mostrar consultas que **ainda vão acontecer** (ativas/futuras). Concluídas e canceladas só aparecem se o usuário escolher no filtro.

---

## 1. Botão "Entrar" instantâneo (componente `EntrarTeleconsulta`)

Arquivo: `src/components/paciente/EntrarTeleconsulta.tsx`

Mudanças:
- **Remover a janela de antecedência** (`ANTECEDENCIA_MIN = 15`) e o estado "Aguarde" associado. Hoje o componente bloqueia entrada até 15 min antes do início; com link fixo isso é desnecessário (a sala existe sempre).
- Comportamento novo:
  - Status bloqueado (`cancelada`, `concluida`, `no_show`) → não renderiza nada (mantém).
  - Sem `link_sala` → mantém estado "Sala em prep." (médico ainda não configurou link fixo).
  - Com `link_sala` e dentro do status válido → renderiza **"Entrar" sempre clicável**, independente do horário.
- Manter `TOLERANCIA_POS_MIN = 30` apenas como limite máximo pós-fim (após 30 min do fim, esconder o botão para não confundir).
- Manter o `audit-log` `teleconsulta.paciente_entrou` no clique.

Resultado visual: o card de consulta futura passa a mostrar `[Entrar] [WhatsApp] [Remarcar] [Cancelar] [Pagamentos]` em vez de `[Aguarde]`.

---

## 2. Filtro padrão: apenas consultas ativas

Arquivo: `src/pages/app/paciente/PacienteAgendamentos.tsx`

Mudanças no filtro principal (`Filtro` type + `lista` useMemo + `<Select>`):

- **Renomear o filtro padrão** de `"futuras"` para `"ativas"` (rótulo: **"Próximas"**) com a regra:
  - `fim >= agora` **E** `status NÃO em ('cancelada','concluida','no_show')`.
  - É o filtro inicial (`useState<Filtro>("ativas")`).
- **Adicionar opção "Concluídas"** (`status === 'concluida'`).
- Manter **"Canceladas"** (`status === 'cancelada'`).
- Manter **"Passadas"** (todo histórico antes de agora, exceto canceladas) e **"Todas"** para quem quiser visão completa.
- Atualizar `EmptyState` para reconhecer o novo valor `"ativas"` e a mensagem ("Você não tem consultas próximas").
- Ordenação: ativas/futuras = ascendente; passadas/concluídas/canceladas = descendente (mais recente primeiro).

Ordem do dropdown sugerida:
```
Próximas    (default)
Concluídas
Canceladas
Passadas
Todas
```

---

## Fora de escopo

- Lógica do médico (`MedicoConsultas`) — janela de iniciar lá já é controlada por `agendada/confirmada` e não usa `EntrarTeleconsulta`.
- Mudanças em status de consultas, snapshot financeiro, webhooks ou Stripe.
- Backfill de dados antigos.
