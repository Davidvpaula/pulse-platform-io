## Mudar fundo dos cards "Atendimento Humanizado" e "Em qualquer lugar"

Trocar o azul escuro por um visual claro/branco com borda sutil, mantendo a foto lateral.

### Alterações em `src/pages/public/Home.tsx`

1. **Seção que envolve os cards (linha 167)**
   - De: `bg-[hsl(200_80%_18%)] text-white`
   - Para: `bg-background` (fundo neutro da página, sem faixa escura)

2. **Card individual (linha 298, componente do card)**
   - De: `bg-[hsl(200_60%_22%)]` com texto branco
   - Para: `bg-card border border-border` com `text-foreground`
   - Ícone: badge passa de translúcido escuro para `bg-primary/10 text-primary`
   - Título: `text-foreground`
   - Descrição: `text-muted-foreground`
   - Adicionar `shadow-sm hover:shadow-md transition-shadow` para dar leveza

### Resultado visual
Cards brancos com borda sutil, ícone destacado em primary, foto lateral preservada — alinhado ao restante da home clara.
