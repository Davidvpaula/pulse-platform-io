## Objetivo

Três ajustes de polimento na camada pública de serviços:

1. **Atendimento Imediato** ganha o mesmo card visual (`ServicoHero`) usado pelos demais serviços.
2. **Páginas de serviço** (incluindo `/atendimento-imediato`) param de duplicar o título — o H1 sai do `PageShell` e fica apenas dentro do card.
3. A frase **"Calendário compartilhado — escolha o horário, o sistema escolhe o profissional."** desce para dentro do **rodapé do card**, como nota fina e elegante.

Limpeza visual de tabela (header redundante removido, espaços recompostos).

## O que muda visualmente

```text
ANTES  (Servico / Atendimento Imediato)
┌ LASMAR TELEMED
│ Consulta Pediátrica Online        ← H1 grande do PageShell
│ Calendário compartilhado — ...    ← subtitle do PageShell
│
│ ┌ CARD ─────────────────────┐
│ │ [img]   LASMAR TELEMED    │
│ │         Consulta Pediátrica  ← duplicado
│ │         ...
│ └───────────────────────────┘
│ 23 horários livres hoje
│ [aviso azul]
│ [calendário]

DEPOIS
┌ (sem cabeçalho do PageShell)
│
│ ┌ CARD ─────────────────────┐
│ │ [img]   LASMAR TELEMED · CONSULTA
│ │         Consulta Pediátrica Online
│ │         Acompanhe a saúde do seu filho sem sair de casa.
│ │         R$ 149,00 · 30 min   [Ver horários ↓]
│ │         ─────────────────────────
│ │         Calendário compartilhado — escolha o horário,
│ │         o sistema escolhe o profissional.
│ └───────────────────────────┘
│ 23 horários livres hoje
│ [aviso azul]
│ [calendário]
```

## Arquivos a alterar

### 1. `src/components/PageShell.tsx`
- Tornar `title` opcional. Quando `title` e `subtitle` estiverem ambos ausentes, **não renderizar** o bloco do cabeçalho (eyebrow + H1 + subtitle). O `<section>` e o `mt-12` do conteúdo são preservados, mas o padding é reduzido (`py-8 md:py-10`) quando não há header — mantém o espaçamento institucional sem buraco.

### 2. `src/components/public/ServicoHero.tsx`
- Nova prop opcional `footerNota?: string` (ou `nota?: ReactNode`).
- Quando presente, renderiza dentro do card, **abaixo do CTA**, separado por um `border-t border-border/60`, como linha discreta `text-xs text-muted-foreground` (icone `CalendarDays` opcional à esquerda).
- Sem mudança nos slots existentes (imagem, descrição, valor, CTA).

### 3. `src/pages/public/ServicoDetalhe.tsx`
- Remover `title` e `subtitle` do `PageShell` (passar somente `children`).
- Passar `footerNota="Calendário compartilhado — escolha o horário, o sistema escolhe o profissional."` para o `ServicoHero`.
- O parágrafo "**N** horários livres …" fica como está, logo abaixo do card.

### 4. `src/pages/public/AtendimentoImediato.tsx`
- Adicionar fetch único do row completo em `servicos_publicos` quando `cfg?.servico_id` resolve, para obter `nome`, `subtitulo`, `descricao_publica`, `imagem_url`, `icone`, `tipo` (mantém o `cfg` atual para `preco_centavos`/`duracao_min`, fallback se a row não existir).
- Substituir o bloco custom "header de status" (`card-elevated` com gradiente, badge "Pronto Atendimento", contagem de horários, valor/duração, legendas) por:
  - `<ServicoHero ...>` com prop `footerNota="Calendário compartilhado — escolha o horário, o sistema escolhe o médico."`
  - Logo abaixo do card, uma linha de status compacta:
    `<Activity verde> 23 horários livres hoje · [Livre] [Lotado]` (mesmo conteúdo que existia no header antigo, agora num strip leve, sem caixa pesada).
- Remover `title` e `subtitle` do `PageShell`.
- Estado de loading: enquanto a row de serviço não chega, mostrar `<ServicoHeroSkeleton />` no lugar do card.

### Sem mudanças em
- Banco de dados, RLS, RPCs, hooks, fluxo de reserva/checkout.
- Calendário (`CalendarioFila`), aviso azul e demais blocos abaixo do card.
- Outros consumidores de `PageShell` (continuam funcionando — `title` segue suportado).
- `HeroServicoCarousel` e Home.

## Limpeza visual aplicada

- Sai o H1 duplicado de cada página de serviço.
- Sai o eyebrow "LASMAR TELEMED" do `PageShell` quando há `ServicoHero` (o eyebrow já vive dentro do card).
- A frase do calendário passa a ser uma nota institucional dentro do card, em vez de subtítulo solto no topo.
- Em `/atendimento-imediato`, sai a caixa redundante de header de status e fica um strip horizontal único e leve (vagas + legenda).

## Riscos e mitigação

- `PageShell` usado em muitas páginas → mudança 100% retrocompatível (`title` apenas vira opcional).
- `servicos_publicos` pode não ter `imagem_url` para o serviço PA → fallback de gradiente + ícone (já existe no `ServicoHero`).
- Se `cfg.servico_id` for nulo (porta pública desativada), mantemos o aviso atual ("Porta pública desativada pelo admin") em vez do card.

## Resultado

Páginas de serviço ficam mais limpas, sem repetição de título, com hierarquia visual única (o card é o herói absoluto). Atendimento Imediato passa a se comunicar com a mesma linguagem dos demais serviços, mantendo seus elementos operacionais (vagas, legenda, calendário) no formato compacto.