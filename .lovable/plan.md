## Objetivo

Na página `/agendar`, ao clicar em **"Ver horários"** no card do médico, o painel atualmente abre como um **Sheet lateral** à direita (quebrado visualmente). Vamos substituir por uma **expansão inline dentro do próprio card**, com animação suave e visual elegante.

## Mudanças

### 1. `src/pages/public/PublicPages.tsx` (seção `AgendarPage`)

- Trocar o estado `sheetMedico` por `expandedMedicoId: string | null` (apenas um aberto por vez — clicar em outro fecha o anterior).
- Remover o bloco `<Sheet>` (linhas ~825-840) inteiramente.
- No botão "Ver horários":
  - Vira um toggle (texto muda para "Ocultar horários" quando aberto).
  - Ícone com rotação suave (chevron).
- Logo abaixo do botão, dentro do mesmo card, renderizar condicionalmente uma área expansível contendo `<MedicoSlotsPanel />`.
- Animação: usar `framer-motion` (`AnimatePresence` + `motion.div` com `height: auto`) para abrir/fechar com easing suave.

### 2. Refinamento visual do conteúdo expandido

- Borda superior sutil separando o card do painel expandido.
- Padding generoso (`p-6`), fundo levemente diferenciado (`bg-muted/30`).
- Layout interno do `MedicoSlotsPanel` mantém os 3 blocos (calendário, horários, detalhes) mas em grid responsivo:
  - Desktop (≥md): 3 colunas lado a lado.
  - Mobile: empilhado.
- Card do médico ganha `ring-2 ring-primary/20` quando expandido (estado ativo visível).

### 3. Comportamento

- Scroll suave até o card expandido após abrir (`scrollIntoView({ behavior: "smooth", block: "nearest" })`).
- Trocar de médico fecha o anterior automaticamente.
- Botão "Selecionar horário" dentro do painel continua navegando para `/app/agendamento/confirmar/:slotId` (lógica já existente em `MedicoSlotsPanel`, não mexer).

### 4. Detalhes técnicos

- `MedicoSlotsPanel` não precisa de alterações funcionais — só passa a viver inline.
- Confirmar que o componente respeita largura do container pai (sem larguras fixas que estouravam dentro do Sheet).
- Manter tokens semânticos do design system (sem cores hardcoded).
- Sem mudanças de backend, sem mudanças nas RPCs, sem mudanças em rotas.

## Fora de escopo

- Não mexer no fluxo de agendamento em si.
- Não mexer no `MedicoSlotsPanel` além de eventuais ajustes de largura/grid responsivo.
- Não mexer em outras páginas que usem o painel (ex.: ServicoHero) — só `/agendar`.
