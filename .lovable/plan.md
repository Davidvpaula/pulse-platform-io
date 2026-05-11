## Objetivo

Substituir o botão hambúrguer do header por uma **aba de "Recolher" fixa na borda direita da sidebar** (igual ao exemplo Wix). A sidebar fica sempre visível por padrão e essa aba alterna entre recolhido / expandido.

---

## Mudanças em `src/layouts/AppLayout.tsx`

### Header
- **Remover** o botão `<Menu>` (hambúrguer) do header.
- Manter o `<Link to="/"><Logo /></Link>` como primeiro item do header.
- Manter o badge de fluxo, sino e avatar como estão.

### Sidebar (desktop, `lg+`)
- Continuar persistente; estado `sidebarOpen` com persistência em `localStorage` (já implementado).
- Quando recolhida: `w-0` invisível (igual hoje).
- **Adicionar aba flutuante de toggle** colada ao canto direito da `<aside>`:
  - Posição: `absolute top-4 -right-3` em relação à `<aside>` (a aside ganha `relative`).
  - Aparência: botão circular pequeno (`h-7 w-7`), `bg-card border border-border shadow-sm`, hover destaca borda primária.
  - Ícone: `ChevronLeft` quando aberto (recolher), `ChevronRight` quando fechado (expandir).
  - Tooltip nativo: `title="Recolher menu"` / `title="Expandir menu"`.
  - Quando a sidebar está recolhida (`w-0`), a aba precisa ficar visível em uma faixa fina à esquerda do conteúdo. Solução: renderizar a aba **fora** da `<aside>`, num container `fixed left-0 top-20 z-40` quando recolhida; e dentro da `<aside>` quando aberta. Mantém a aba sempre clicável.
- Animação de largura permanece (`transition-[width]`).

### Mobile (`<lg`)
- Como o header já não tem hambúrguer, em mobile precisamos de outra forma de abrir.
- Solução simples: a aba flutuante de toggle (mesma usada no desktop) também aparece em mobile, posicionada `fixed left-0 top-20`. Ao clicar, abre o overlay drawer que já existe.
- Backdrop e fechamento ao clicar fora continuam iguais.

### Remoções
- `import { Menu }` deixa de ser usado — remover.
- Adicionar `import { ChevronLeft, ChevronRight }`.

---

## Diagrama

```text
Aberto (default):
┌──────────────┬─────────────────────────────────────┐
│   Sidebar  ◀│  conteúdo                           │
│   w-64      │                                      │
└──────────────┴─────────────────────────────────────┘

Recolhido:
│▶│  conteúdo full width                              │
└──┴────────────────────────────────────────────────┘
(aba ▶ flutuante na lateral esquerda do viewport)
```

---

## Fora de escopo

- Variante "mini" com ícones (continua some/aparece total).
- Mudanças em `PublicLayout`.
- Atalho de teclado (`[`/`]`).
