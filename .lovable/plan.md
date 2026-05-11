## Mudanças em `src/layouts/AppLayout.tsx`

Reorganizar a estrutura para que o **header fique fixo no topo cobrindo toda a largura** (incluindo a área do sidebar) e o sidebar comece **abaixo do header**, empurrando o conteúdo principal junto.

### Estrutura nova

```text
┌──────────────────────── HEADER FIXO (full width, sticky) ────────────────────────┐
├──────────┬───────────────────────────────────────────────────────────────────────┤
│ SIDEBAR  │                              MAIN                                     │
│ (abaixo  │                                                                       │
│  header) │                                                                       │
└──────────┴───────────────────────────────────────────────────────────────────────┘
```

### Passos

1. **Mover o `<header>`** para fora do container interno e colocá-lo como primeiro filho do layout, ocupando 100% da largura. Manter `sticky top-0 z-40`.
2. **Remover o `<Logo>` duplicado dentro do `SidebarBody`** (linhas 294-296) — o header já mostra a logo. O sidebar passa a começar direto pelo card de contexto (Admin / Médico / etc.).
3. **Sidebar começa abaixo do header**: o wrapper `flex flex-1` fica embaixo do header; o `<aside>` desktop perde o "flow-stripe" topo-zero e mantém apenas o conteúdo do menu (sem cabeçalho próprio).
4. **Botão de recolher/expandir**: ajustar `top-20` → algo como `top-[4.5rem]` para continuar alinhado logo abaixo do header (fica igual visualmente, mas garantido).
5. **Sidebar mobile (drawer)**: também passa a começar abaixo do header (`top-16` em vez de `top-0`), preservando o comportamento sem backdrop bloqueante.
6. **ImpersonationBanner**: continua acima do header (já é o primeiro elemento do layout).

Sem mudanças em rotas, permissões ou conteúdo do menu — é só restruturação visual do shell.
