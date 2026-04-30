## Objetivo

Dar ao admin um **painel dedicado para os parâmetros do Atendimento Imediato** (preço, duração, repasse) e fazer com que esses valores **alimentem em tempo real** o calendário compartilhado da página `/atendimento-imediato`. Hoje o calendário roda 100% mock, ignorando o serviço configurado em `app_settings.atendimento_imediato.servico_id`.

## Estado atual

- O serviço de Atendimento Imediato já existe como uma linha em `servicos_financeiros` (tipo `pronto_atendimento`), referenciada em `app_settings.atendimento_imediato.servico_id`.
- A edição é feita via `AdminServicos.tsx` (sheet genérico de qualquer serviço) — funciona, mas é "escondida" e mistura com plano/pacote.
- O calendário público (`AtendimentoImediato.tsx` + `mockSlotsDoDia`) usa duração fixa de 30 min e nem lê o preço/comissão.

## O que será feito

### 1) Página admin dedicada — `AdminAtendimentoImediato`

Nova rota: `/app/admin/atendimento-imediato` (entrada também a partir de `AdminConfiguracoes` e `AdminServicos`, no card emerald que já existe).

Layout em 3 cartões + uma seção de validação:

**Cartão 1 — Serviço vinculado**
- Mostra qual serviço está selecionado em `app_settings.atendimento_imediato.servico_id`.
- Select para trocar (mesmo critério já usado em `AdminServicos`: tipo `pronto_atendimento`, ativo, ≥1 médico aderido).
- Botão "Criar novo serviço de Pronto Atendimento" (abre o sheet de criação já existente, pré-preenchido com `tipo='pronto_atendimento'`).

**Cartão 2 — Parâmetros operacionais**
- Campo "Preço único (R$)" → `valor_paciente_centavos`.
- Campo "Duração por slot (min, múltiplo de 5)" → `duracao_min`.
- Botão "Salvar" → `update servicos_financeiros set ... where id = paServicoId`.
- Bloqueado se nenhum serviço estiver vinculado.

**Cartão 3 — Repasse Médico × Plataforma**
- Reusa `RepasseSplitInput` (já existente).
- Modelo `percentual` (campo `comissao_pct`) ou `valor_fixo` (campo `valor_fixo_centavos`).
- Mostra o split previsto (médico recebe X / plataforma fica com Y) usando o preço atual.
- Botão "Salvar repasse".

**Seção 4 — Validação no calendário**
- Pequeno painel que lista os primeiros slots gerados *já com os parâmetros novos*: hora início → fim (calculado com `duracao_min` salvo), preço, repasse esperado.
- Link "Abrir calendário público →" para conferir.

Toda alteração emite toast e dispara reload local + um `BroadcastChannel("atendimento_imediato_config_v1")` para que abas abertas do calendário recarreguem.

### 2) Conectar o calendário compartilhado ao serviço real

Editar `src/lib/mocks/atendimentoImediatoMock.ts` para aceitar um parâmetro de duração:

```ts
export function mockSlotsDoDia(date: Date, duracaoMin: number = MOCK_DURACAO_MIN): MockSlot[]
```

Editar `src/pages/public/AtendimentoImediato.tsx`:
- Novo hook local `useAtendimentoImediatoConfig()` que carrega:
  - `servico_id` de `app_settings`
  - linha correspondente em `servicos_financeiros` (preço, duração, modelo, pct/valor_fixo)
- Usa essa duração na chamada de `mockSlotsDoDia(hoje, cfg.duracao_min)`.
- Mostra no header da página o **preço único** e a **duração** vindos do banco (não mais hardcoded).
- No `RodapeReserva`, exibir o valor a pagar (preço configurado).
- Inscreve no `BroadcastChannel("atendimento_imediato_config_v1")` para refazer o fetch quando admin salvar.

### 3) Helpers em `src/lib/clinico.ts`

Adicionar pequenos helpers (sem migration):

```ts
export async function getServicoAtendimentoImediato(): Promise<{
  servico_id: string | null;
  preco_centavos: number;
  duracao_min: number;
  modelo: "percentual" | "valor_fixo";
  comissao_pct: number | null;
  valor_fixo_centavos: number | null;
} | null>;

export async function updateServicoAtendimentoImediato(patch: Partial<...>): Promise<{ ok: boolean; error?: string }>;
```

### 4) Atalhos de navegação

- Em `AdminConfiguracoes.tsx`: adicionar um card na mesma linha do "Repasse financeiro" linkando para a nova página.
- Em `AdminServicos.tsx`: o card emerald ganha um botão "Abrir painel completo →" levando para a nova rota (mantém o select rápido onde está).

## Arquivos

**Criar**
- `src/pages/app/admin/AdminAtendimentoImediato.tsx`

**Editar**
- `src/App.tsx` (registrar rota)
- `src/lib/clinico.ts` (helpers)
- `src/lib/mocks/atendimentoImediatoMock.ts` (aceitar duração custom)
- `src/pages/public/AtendimentoImediato.tsx` (consumir config real + BroadcastChannel)
- `src/pages/app/admin/AdminConfiguracoes.tsx` (atalho)
- `src/pages/app/admin/AdminServicos.tsx` (botão para painel dedicado)

## Garantias

- **Sem migrations** — tudo já existe (`servicos_financeiros`, `app_settings`, RLS, trigger de imutabilidade financeira).
- **Sem mexer no enum de status** nem em RLS.
- **Imutabilidade preservada**: alterações no preço/repasse só afetam slots/consultas *novas*; consultas já criadas mantêm snapshot em `consultas_financeiro` (regra global do projeto).
- **Reflexo automático**: o calendário lê do banco a cada montagem + escuta o BroadcastChannel para recarregar imediatamente quando admin salva em outra aba.
- **Compatibilidade**: `mockSlotsDoDia(date)` continua funcionando sem o segundo parâmetro (default = 30).
