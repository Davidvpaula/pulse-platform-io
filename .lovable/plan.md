## Trocar fundo do Hero por azul gradiente + ícone

Remover a foto do casal idoso (`hero-couple.png`) do Hero da Home e substituir por um fundo de cor azul mesclado (azul-claro → azul-escuro), com o ícone/logo redondo decorativo aparecendo no canto direito (como antes).

### Mudanças em `src/pages/public/Home.tsx`

1. **Remover** o `<img src={heroCouple} … />` e o gradiente preto sobreposto (linhas 36–45).
2. **Substituir** `bg-[#f5efe4]` da `<section>` por um gradiente azul usando tokens do design system:
   - `bg-gradient-to-br from-primary via-primary to-[hsl(215_60%_18%)]` (azul → azul escuro), ou usar `--gradient-primary` já definido em `index.css` se existir.
3. **Manter** todo o conteúdo (H1, subtítulo, botões, card flutuante "Pronto Atendimento") intacto, com texto branco.
4. **Adicionar** um ícone/logo decorativo redondo flutuante no lado direito (atrás do card), reproduzindo o "logotipo desenhado" anterior — círculo `bg-primary-soft/20` com o ícone `Stethoscope` ou `Heart` em branco/soft, posicionado absoluto no topo direito.
5. **Remover** o import `heroCouple` que ficará órfão.

### Limpeza opcional
- Manter o arquivo `src/assets/home/hero-couple.png` (não deletar — pode ser reutilizado).

### Validação
- Abrir `/` e conferir Hero com fundo azul mesclado, sem foto do casal, ícone redondo no canto direito, botões e card "Pronto Atendimento" preservados.
