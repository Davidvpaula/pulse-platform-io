## Objetivo

Substituir o header atual do **PublicLayout** pelo design do Figma: navbar flutuante em formato de cápsula branca, com nova estrutura de links e botão CTA azul.

Escopo restrito ao site público (`PublicLayout.tsx`). Nada no AppLayout interno, nada de backend, rotas ou lógica.

---

## Mudanças visuais

**Container flutuante**
- Header com `position: sticky top-4`, margens laterais (`mx-4 md:mx-8`), `max-w-7xl mx-auto`.
- Cápsula: fundo `bg-background/95` + `backdrop-blur-md`, `rounded-full`, `shadow-lg` suave, borda sutil.
- Padding interno generoso (`px-6 py-3`), altura ~64px.

**Conteúdo (3 zonas)**
- **Esquerda**: Logo Lasmar TeleMed (componente `<Logo />` já existente).
- **Centro**: links de navegação com peso medium, item ativo em `font-bold text-foreground`, demais em `text-foreground/70 hover:text-foreground`.
- **Direita**: botão **"Cadastre-se"** (pill, `bg-primary` azul celeste, `rounded-full`) + link **"Login"** ghost.

**Mobile**
- Mantém cápsula, mas só logo + botão hamburger.
- Drawer desce abaixo da cápsula com os mesmos links + CTAs.

---

## Nova estrutura de links

Substitui os 8 links atuais pelos 5 do Figma:

| Label Figma        | Rota destino                |
|--------------------|-----------------------------|
| Início             | `/`                         |
| Pronto Atendimento | `/atendimento-imediato`     |
| Agendar Consulta   | `/agendar`                  |
| Sobre Nós          | `/sobre` *(ver nota abaixo)* |
| Ajuda              | `/faq`                      |

CTAs à direita:
- **Cadastre-se** → `/auth?mode=signup` (ou `/auth`)
- **Login** → `/auth`

> Observação: a rota `/sobre` ainda não existe no projeto. Posso (a) apontar temporariamente para `/` ou `/faq`, ou (b) criar uma página placeholder `/sobre`. **Sugiro (a) apontar para `/` por enquanto** e deixar `/sobre` como TODO para a próxima onda de páginas institucionais. Confirme se prefere outro caminho.

> Os links removidos do header (Especialidades, Serviços, Médicos, Planos, Empresas, Para médicos, FAQ) **continuam existindo no footer**, então nada de navegação se perde.

---

## Tokens de design (do Figma)

Já cobertos pela Onda 1 do rebrand:
- Azul Celeste `#21a3d6` → `--primary`
- Creme `#fdfbf6` → `--background`
- Cinza 85% `#262626` → `--foreground`

Nenhum token novo necessário. Todas as cores via classes semânticas (`bg-primary`, `text-foreground`, etc.).

---

## Arquivo único alterado

- `src/layouts/PublicLayout.tsx` — apenas o `<header>` (e o array `links`). Footer e demais áreas intocados.

---

## Detalhes técnicos

- A cápsula flutua sobre o conteúdo: removo a borda inferior do header e adiciono `pt-4` no início do `<main>` para compensar.
- Item ativo detectado via `NavLink` (`isActive`), com pill sutil `bg-primary/10 text-primary` ao invés de só negrito (mais legível em cápsula clara).
- Z-index do header sobe para `z-50` para garantir flutuação sobre seções com gradiente.
- Mobile drawer continua dentro da mesma cápsula, expandindo verticalmente com `rounded-3xl` em vez de `rounded-full` quando aberto.

---

## Fora de escopo (não tocar)

- AppLayout interno, sidebar, qualquer rota `/app/*`.
- Footer público.
- Hero, Home, demais seções da landing.
- Backend, permissões, lógica.
- Criação de página `/sobre` (vai virar TODO).
