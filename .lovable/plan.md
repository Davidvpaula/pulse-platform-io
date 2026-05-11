## Objetivo

No layout interno (`/app/...`):

1. **Sidebar persistente** — sempre visível por padrão (em qualquer largura de tela), controlada por um único estado `open`.
2. **Botão para esconder/mostrar** — o ícone "hambúrguer" do header passa a alternar a sidebar em qualquer viewport (não só mobile).
3. **Logo no topo do header** — voltar com o logotipo à esquerda do header (como era antes), clicável → leva para a home pública (`/`).

---

## Mudanças em `src/layouts/AppLayout.tsx`

### Estado e comportamento

- Substituir `mobileOpen` por um único estado `sidebarOpen` (default `true`), persistido em `localStorage` (`app:sidebar-open`) para lembrar a preferência do usuário entre sessões.
- Remover a regra `hidden lg:flex` da `<aside>` persistente — passa a ser sempre renderizada.
- Quando `sidebarOpen === false`, a sidebar some (largura `0`) com `transition-all` suave; quando `true`, retorna a `w-64`. Sem overlay/backdrop em desktop — o conteúdo simplesmente reflui.
- Em mobile (`<lg`), aplicar comportamento overlay: posição fixed, backdrop escurecido, fechar ao clicar fora ou em um link (mantém a UX atual de drawer).
- O botão de hambúrguer no header passa a ser visível em todas as larguras (`lg:` removido) e simplesmente faz `setSidebarOpen(v => !v)`.

### Logo no header

- À direita do botão de hambúrguer, adicionar:
  ```tsx
  <Link to="/" aria-label="Ir para a home">
    <Logo size="sm" />
  </Link>
  ```
- Manter também o `<Logo />` que já existe no topo da própria sidebar (não muda).
- Mover o badge de fluxo (`flow.icon` + `flow.label`) para depois do logo, mantendo a hierarquia atual.

### Sem novas dependências

- Continua usando o componente custom já existente (não migrar para `shadcn/ui sidebar`).
- Animação via `transition-[width] duration-200 ease-out` já suportada pelo Tailwind.

---

## Diagrama (desktop)

```text
┌────────────────────────────────────────────────────┐
│ [☰] [Logo→/]  [Badge Fluxo]            🔔  Avatar │  header
├──────────────┬─────────────────────────────────────┤
│              │                                     │
│  Sidebar     │     conteúdo (Outlet)               │
│  persistente │                                     │
│  w-64        │                                     │
│              │                                     │
└──────────────┴─────────────────────────────────────┘

Quando o usuário clica no ☰:
┌────────────────────────────────────────────────────┐
│ [☰] [Logo→/]  [Badge Fluxo]            🔔  Avatar │
├────────────────────────────────────────────────────┤
│                                                    │
│      conteúdo (Outlet) — full width                │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Fora de escopo

- Variante "mini" com só ícones (a sidebar some por completo quando recolhida — mais simples e rápido).
- Reorganização do menu / menuCatalog.
- Mudanças em `PublicLayout.tsx` (já tem logo correto).
