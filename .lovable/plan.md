## Preencher Hero com ícones decorativos

Adicionar ícones flutuantes espalhados pelo fundo azul do Hero para reduzir o vazio, e reposicionar o ícone atual do estetoscópio (que está sendo escondido pelo card "Pronto Atendimento" à direita).

### Mudanças em `src/pages/public/Home.tsx`

1. **Reposicionar o `Stethoscope`** atual:
   - Mover do canto direito (onde colide com o card) para o **topo central / acima do card**, em tamanho menor (ex.: `top-8 right-1/3`, `h-24 w-24`).

2. **Adicionar ~5-7 ícones decorativos** espalhados em posições absolutas, todos com `pointer-events-none`, opacidade baixa (`text-white/15` a `text-white/25`) e tamanhos variados:
   - `Heart` — canto superior esquerdo, médio
   - `Plus` (cruz médica) — meio esquerdo, pequeno
   - `Activity` (linha de ECG) — base esquerda, médio
   - `Pill` — entre o texto e o card, pequeno
   - `Shield` ou `ShieldCheck` — topo direito alto, pequeno
   - `Calendar` — base direita, pequeno
   - `Sparkles` — pontual, decorativo

3. **Esconder os ícones decorativos no mobile** (`hidden md:block`) para não poluir telas pequenas onde o texto já ocupa quase todo o espaço.

4. **Garantir z-index** correto: ícones decorativos com `-z-0`/`z-0`, conteúdo (texto e card) com `z-10`, para que nada seja coberto.

### Validação
- Abrir `/`, conferir Hero com fundo azul, ícones espalhados sutis (não competem com o texto), estetoscópio visível (não escondido), card "Pronto Atendimento" intacto sobre tudo.
