## Objetivo

Substituir a tela atual de `/atendimento-imediato` por um **calendário compartilhado de fila única**, alimentado por dados mockados, onde:

- Os horários de **todos os médicos disponíveis** aparecem juntos numa só agenda (não há uma coluna por médico).
- Cada slot tem **capacidade** (quantos atendimentos paralelos cabem naquele horário, baseado em quantos médicos estão livres no instante).
- Há **status visual de agendamento** (livre, reservado por mim, reservado por outro, lotado, em atendimento).
- Quando o paciente clica num horário e ele está livre → **bloqueia** imediatamente para esse paciente (lock cliente, expira em 90 s).
- Se outro paciente clica no **mesmo horário já bloqueado** → o sistema **transfere automaticamente** para o **horário mais próximo livre**, mostra um aviso ("Esse horário foi pego — alocamos 14:30 para você") e marca esse novo slot como o selecionado dele.
- Atribuição do médico segue **regra de ranking**: prioridade por **tempo de casa** (mais antigo primeiro), com desempate por carga atual no dia. Tudo decidido na hora do clique, sem o paciente escolher.

## Onde fica

- Continua em `src/pages/public/AtendimentoImediato.tsx` (mesma rota pública `/atendimento-imediato`).
- Novo módulo de mock isolado: `src/lib/mocks/atendimentoImediatoMock.ts`.
- Novos componentes em `src/components/atendimento-imediato/`.

## Layout da nova tela

```text
┌────────────────────────────────────────────────────────────────┐
│ Atendimento imediato — calendário compartilhado                │
│ 4 médicos no plantão · 27 horários livres hoje                 │
│ [ ◀ Hoje ▶ ]  [ Todos | Online | Presencial ]                  │
│                                                                │
│   Manhã        Tarde         Noite                             │
│  ┌────────┐  ┌────────┐    ┌────────┐                          │
│  │ 08:00  │  │ 13:00  │    │ 19:00  │   livre  (3 vagas)       │
│  │ 08:30  │  │ 13:30  │    │ 19:30  │   ● você reservou        │
│  │ 09:00  │  │ 14:00  │    │ 20:00  │   ○ reservado por outro  │
│  │ 09:30  │  │ 14:30  │    │ 20:30  │   ✕ lotado               │
│  │ 10:00  │  │ 15:00  │    │ 21:00  │   ▷ em atendimento       │
│  └────────┘  └────────┘    └────────┘                          │
│                                                                │
│ ▾ Você reservou 14:30 com Dr(a). Ana Lima (atribuído por      │
│   tempo de casa)  — confirma em 1m23s    [ Confirmar ]        │
└────────────────────────────────────────────────────────────────┘
```

Detalhes:

- Cada célula do calendário mostra hora, badge de capacidade (`3/4` = 3 vagas restantes de 4), cor por estado.
- O calendário é uma grade única — nunca uma coluna por médico. Quem é o médico só é revelado **depois** da reserva, no rodapé sticky de confirmação.

## Mock de dados

Arquivo `src/lib/mocks/atendimentoImediatoMock.ts` exporta:

- `mockMedicos`: 4 médicos com `id`, `nome`, `especialidade`, `aprovado_em` (define tempo de casa), `consultas_no_dia` (carga inicial).
- `mockSlotsDoDia(date)`: gera slots de 30 min entre 08:00–21:00; para cada horário, sorteia quais médicos estão livres → daí vem `capacidade` (=quantidade de médicos livres) e a lista interna `medicosDisponiveis`.
- Estado em memória mantido em React (sem persistência além da sessão da aba): `Map<slotKey, { reservas: { pacienteId, medicoId, expiresAt }[] }>`.

Não tocaremos em `agenda_slots` real do banco. O componente trabalha só com este mock.

## Regra de ranking

Função pura `escolherMedico(slot, jaReservadosNoDia)`:

1. Filtra `medicosDisponiveis` do slot que **ainda têm vaga** no horário (não reservados nesse mesmo timestamp).
2. Ordena por:
   - `aprovado_em` mais antigo (maior tempo de casa) ↑
   - desempate: `consultas_no_dia` (incluindo reservas já feitas via mock) ↓ (menor carga vence)
   - desempate final: ordem alfabética.
3. Retorna o primeiro.

Se a lista ficou vazia → o slot está lotado e a função devolve `null` (gatilha o fallback de "horário mais próximo").

## Lógica de clique e transferência

Ao clicar num slot:

1. Resolve `medico = escolherMedico(slot, estado)`.
2. Se houver médico → cria reserva com TTL de **90 s**, registra `{ slotKey, medicoId, pacienteId=meuTabId, expiresAt }`. Atualiza estado, mostra rodapé sticky com nome do médico + botão Confirmar.
3. Se **não houver médico** (slot lotado) → procura o **slot mais próximo no tempo** que ainda tenha vaga (menor `Math.abs(slot.inicio - alvoOriginal)`), chama `escolherMedico` nele e:
   - cria a reserva no novo slot,
   - dispara `toast` informativo: *"O horário 14:00 acabou de ser reservado por outro paciente. Movemos você para 14:30 com Dr(a). Ana Lima."*
   - destaca o novo slot no calendário (anel pulsante por 3 s).
4. Se o paciente já tinha uma reserva ativa, ela é **liberada** antes de criar a nova.

Identidade do "paciente": gerada na primeira visita, salva em `sessionStorage` (`ai_mock_paciente_id`). Permite simular o cenário de dois usuários abrindo a página em abas/janelas anônimas diferentes.

## Estados visuais do slot

| Estado | Quando | Cor |
|---|---|---|
| `livre` | há vaga e nenhuma reserva minha | superfície + borda primary suave |
| `reservado_por_mim` | reserva ativa minha nesse slot | accent + anel primary |
| `reservado_por_outro` | há reservas de outros mas ainda sobra vaga | muted com ponto secundário |
| `lotado` | reservas+ocupações = capacidade | borda destrutiva, opacidade 60% |
| `em_atendimento` (mock) | timestamp <= agora < timestamp+duração | badge "Em atendimento" |
| `passado` | timestamp < agora | desabilitado, opacidade 40% |

Conta-regressiva visível no rodapé enquanto a reserva minha está ativa.

## Loop de tick

Um `setInterval(1000)` no componente:

- Expira reservas com `expiresAt <= now` (libera a vaga, toast leve "Reserva expirou").
- Recalcula contagem de "livre/lotado" por slot.
- Atualiza o relógio do rodapé.

## Componentes

- `src/components/atendimento-imediato/CalendarioFila.tsx` — grade de slots agrupada por turno (manhã/tarde/noite), recebe `slots`, `estado`, `onPick`.
- `src/components/atendimento-imediato/SlotCelula.tsx` — célula individual com estado visual e badge de capacidade.
- `src/components/atendimento-imediato/RodapeReserva.tsx` — barra sticky inferior com médico atribuído, contagem regressiva, botão **Confirmar** (vai para `/app/paciente/agendar/confirmar/MOCK-...?servico=...` — mesmo fluxo atual) e **Cancelar reserva**.
- `src/lib/mocks/atendimentoImediatoMock.ts` — geração de mock + função `escolherMedico` + helper `slotMaisProximoComVaga`.

## Edições

- `src/pages/public/AtendimentoImediato.tsx` — reescrita para usar o mock e o calendário compartilhado. Mantém o título/subtítulo e o `PageShell`, mas remove a lista por médico (que ia contra o requisito da fila única).
- Botão antigo "Iniciar atendimento" some — agora a ação é **clicar num horário**.

## Garantias

- **Sem mudanças no banco**: tudo é mock cliente. Nenhuma migration. Os slots reais (`agenda_slots`), `medico_servicos` e `fn_ranking_medico_servico` continuam intactos para uso futuro.
- **Acessibilidade**: cada célula é `<button>` com `aria-label` descritivo ("14:30, 2 vagas, livre").
- **Responsivo**: grade vira 2 colunas no mobile, 3 no desktop.
- **Replay multiusuário simples**: abrir a página em duas abas anônimas com `?paciente=A` e `?paciente=B` força IDs distintos para demonstrar o conflito + transferência.

## Fora de escopo

- Persistência real (banco/realtime). É demo determinística com mock.
- Pagamento. Só leva o paciente para a tela atual de confirmação.
- Edição de capacidade pelo Admin.
