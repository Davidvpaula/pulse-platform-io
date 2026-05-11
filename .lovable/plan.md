## Objetivo

Transformar o card estático "Pronto Atendimento" do hero em um **carrossel interno** que cicla entre 3 serviços já existentes (Atendimento Imediato → Saúde Mental → Pediátrica), mantendo **exatamente** as mesmas dimensões e estética premium do card atual. Setas e dots ficam **dentro do próprio card**.

A seção autônoma "Nossos serviços" (criada antes, abaixo da Hero) é **removida** porque agora vive embutida no hero.

## O que muda visualmente

```text
┌───────────────────────────────┐
│       imagem do serviço       │  ← mesma área 4:3 do card atual
│                               │
│  ‹                         ›  │  ← setas internas (sobre a imagem, base)
└───────────────────────────────┘
│ [badge tipo]                  │
│ Nome do serviço               │
│ Subtítulo / descrição curta   │
│ A partir de R$ XX  [CTA]      │
│        • • •                  │  ← dots internos, no rodapé do card
└───────────────────────────────┘
```

- Mesma largura/altura do card atual (`max-w-md`, imagem `aspect-[4/3]`, padding `p-5`).
- Setas circulares brancas sobre a imagem, cantos esquerdo/direito (overlay leve).
- Dots discretos no rodapé do card, abaixo do CTA.
- Transição suave (fade + slide via Embla padrão).
- **Sem autoplay** (mantém regra premium institucional já acordada).
- Swipe/drag funcionam normalmente.

## Conteúdo dos slides

Ordem fixa, na sequência pedida:

1. **Atendimento Imediato Clínico** (slug `atendimento-imediato`) — CTA "Agende agora" → `/atendimento-imediato`. Badge "Disponível agora" (verde, igual hoje).
2. **Saúde Mental · Acolhimento** (slug `saude-mental-acolhimento`) — CTA "Ver detalhes" → `/servicos/saude-mental-acolhimento`. Badge neutro do tipo do serviço.
3. **Consulta Pediátrica Online** (slug `pediatria-online`) — CTA "Ver detalhes" → `/servicos/pediatria-online`. Badge neutro do tipo.

Slides usam dados reais do `servicos_publicos` (nome, subtítulo, valor, duração, imagem). Se um serviço não tiver imagem, cai no fallback de gradiente + ícone (já existente). Para o slide do Atendimento Imediato, mantemos a imagem padrão atual (`@/assets/home/pronto-atendimento.jpg`) como fallback se o admin ainda não publicou imagem própria, para não regredir visualmente.

## Implementação técnica

### Arquivos

- **Criar** `src/components/public/HeroServicoCarousel.tsx`
  - Recebe a lista de slugs alvo: `["atendimento-imediato", "saude-mental-acolhimento", "pediatria-online"]`.
  - Usa `useServicosPublicos()` (hook existente, sem alteração) e filtra/ordena por slug nessa ordem.
  - Renderiza um único card no formato visual idêntico ao bloco atual `lines 105–145` de `Home.tsx`.
  - Embla Carousel com `loop: true`, sem autoplay, dragFree=false, align=start.
  - Setas (`CarouselPrevious`/`CarouselNext`) posicionadas absolute sobre a base da imagem (cantos), estilo branco translúcido, hover sólido.
  - Dots internos no rodapé do conteúdo, abaixo do bloco preço/CTA.
  - Fallback: enquanto carrega → skeleton com mesmas dimensões; sem dados → mostra slide estático "Pronto Atendimento" (estado degradado seguro, igual hoje).
  - Para slide PA, exige badge "Disponível agora" + CTA "Agende agora" → `/atendimento-imediato`. Demais slides: badge neutro do `tipo` (ex.: "Consulta") + CTA "Ver detalhes" → `/servicos/{slug}`.

- **Editar** `src/pages/public/Home.tsx`
  - Substituir o bloco do card estático (linhas ~104–146) por `<HeroServicoCarousel />`.
  - **Remover** o `<ServicosCarousel />` solto (linha ~210) e seu import (linha ~27).

- **Manter sem mudanças**: `useServicosPublicos.ts`, `ServicosCarousel.tsx` (fica disponível caso queira reutilizar em outra página), demais seções da Home, rotas, banco, RLS, admin.

### Regras de UX

- **Tamanho do card**: idêntico (`w-full max-w-md`, imagem `aspect-[4/3]`, conteúdo `p-5`).
- **Altura constante**: bloco de conteúdo usa `min-h` calculado para evitar pulo entre slides com textos de tamanhos diferentes.
- **Texto longo**: `line-clamp-2` no nome, `line-clamp-2` no subtítulo.
- **Setas**: visíveis apenas ≥ md; mobile usa só swipe + dots.
- **Dots ativos**: mesma régua já usada no `ServicosCarousel` (barra alongada azul para o ativo).
- **Acessibilidade**: `aria-label` por seta e dot, foco visível, ordem de tab natural.

### Sem mudanças em

- Banco de dados / migrações.
- Hook `useServicosPublicos`.
- Páginas `Servicos.tsx` e `ServicoDetalhe.tsx`.
- Admin (`AdminServicos.tsx`).
- Rotas, auth, permissões, financeiro.

## Riscos e mitigação

- Diferença de altura entre slides → `min-h` no bloco de conteúdo + `line-clamp`.
- Slug renomeado no admin → fallback procura por `slug` nos 3 alvos; se faltar, o slide é omitido sem quebrar.
- Imagem ausente em slides 2/3 → fallback gradiente+ícone já implementado.
- Loop com 3 slides + Embla → setting `loop: true` testado; dots refletem snap atual.

## Resultado

Hero mantém a mesma silhueta visual e peso institucional, mas agora comunica três pilares de serviço de forma elegante, com navegação interna discreta. A página ganha foco, sem a seção extra de carrossel logo abaixo.