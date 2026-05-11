## Reverter header para o modelo sólido fixo

### O que muda (apenas `src/layouts/PublicLayout.tsx`)

**Header**
- Remover cápsula flutuante (`sticky top-4`, `rounded-full`/`rounded-3xl`, `max-w-7xl mx-auto`, `border`, `shadow`, `backdrop-blur`, padding lateral `px-4 md:px-8`)
- Aplicar header clássico SaaS:
  - `sticky top-0 z-50`
  - `w-full bg-background` (fundo sólido branco no tema claro)
  - `border-b border-border` (borda inferior sutil)
  - Conteúdo interno dentro de `container` com `h-16 flex items-center justify-between`

**Menu mobile**
- Drawer volta ao formato tradicional: painel `absolute top-full left-0 right-0`, fundo sólido `bg-background`, `border-b border-border`, sem cantos arredondados externos

**Main**
- Remover `pt-6` extra (header não flutua mais, fica colado no topo)

### O que é mantido (sem tocar)

- Os 8 itens do menu: Atendimento imediato, Especialidades, Serviços, Médicos, Planos, Empresas, Para médicos, FAQ
- Botões "Cadastre-se" (primary pill) e "Login" (ghost)
- Logo e seu posicionamento
- Footer inteiro
- Rotas, links e qualquer lógica

### Arquivos afetados
- `src/layouts/PublicLayout.tsx` (somente)
