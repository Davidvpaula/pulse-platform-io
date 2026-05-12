## Mudança puramente UX/UI — sem tocar em rotas, permissões ou código de negócio

### 1. Remover do menu lateral (admin) — `src/lib/profiles.ts`
Remover apenas estas 3 linhas do array de menu do perfil admin:
- Linha 217: `Termos & Condições`
- Linha 253: `Treinamento`
- Linha 254: `FAQ do Site`

As rotas (`/app/admin/termos-condicoes`, `/app/admin/treinamentos`, `/app/admin/faq`), os componentes, guards e permissões continuam exatamente como estão.

### 2. Adicionar 3 botões/atalhos em `src/pages/app/admin/AdminConfiguracoes.tsx`
Logo abaixo do `<PageHeader>` (onde hoje está o comentário "Atalhos removidos visualmente"), incluir uma nova grade de 3 cards clicáveis (`<Link to=...>`) seguindo o mesmo padrão visual já usado anteriormente na página (card-elevated, ícone à esquerda, título + descrição curta, seta à direita ao hover):

| Card | Ícone | Rota |
|---|---|---|
| Termos & Condições | `FileText` | `/app/admin/termos-condicoes` |
| Treinamento | `BookOpen` | `/app/admin/treinamentos` |
| FAQ do Site | `HelpCircle` | `/app/admin/faq` |

Layout responsivo: `grid gap-3 md:grid-cols-3`. Visual coerente com os Sections existentes (Pagamentos / Especialidades).

### Resultado
- Menu lateral fica mais enxuto (3 itens a menos).
- Configurações vira o hub natural desses 3 acessos administrativos secundários.
- Zero mudança em rotas, permissões, lógica ou backend.