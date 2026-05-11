## Objetivo

Unificar as páginas `/especialidades` e `/medicos` numa única experiência pública chamada **"Encontre seu médico"**, mantendo a barra de busca/filtros que já existe em Médicos (a que você gostou) e adicionando as especialidades como **chips de filtro rápido** no topo — assim o usuário descobre as áreas e já vê os profissionais sem trocar de página.

## Nova página: `/medicos` (rota única)

Layout, de cima para baixo:

1. **Cabeçalho** — título "Nossos médicos" e subtítulo "Todos com CRM ativo e perfil verificado".
2. **Barra de busca + filtros** — exatamente a atual de Médicos:
   - campo "Buscar por nome, especialidade ou CRM…"
   - select "Todas especialidades"
   - select de ordenação ("Mais relevantes / Mais avaliados / Nome A-Z").
3. **Faixa de especialidades (chips)** — logo abaixo da busca, scroll horizontal em mobile:
   - chip "Todas" + um chip por especialidade com ícone, nome e contagem (`Cardiologia · 4`).
   - clicar no chip aplica o filtro de especialidade (mesmo estado do select).
   - especialidades sem médicos aparecem em cinza com selo "Em breve" e abrem o diálogo `EmBreveDialog` ao clicar (preserva o comportamento atual).
4. **Resultados** — grid de cards de médicos idêntico ao atual, com contador "X médicos encontrados".

## Rotas

- `/medicos` → nova página unificada (componente renomeado / refatorado a partir do `Medicos` atual).
- `/especialidades` → redireciona com `<Navigate to="/medicos" replace />` para não quebrar links antigos.
- Suporte a `?esp=<id>` na URL para que cliques antigos em especialidades (vindos da Home, footer, planos) já caiam com o filtro aplicado.

## Navegação

- Menu superior (`PublicLayout`): remover o item "Especialidades", manter "Médicos" (ou renomear para "Encontre seu médico" — confirmo na implementação se você quiser o rename).
- Footer: remover o link "Especialidades", manter "Médicos".

## Arquivos a alterar

- `src/pages/public/PublicPages.tsx` — remover `Especialidades`, expandir `Medicos` com a faixa de chips, leitura do query param `?esp=`.
- `src/App.tsx` — trocar a rota `/especialidades` por um redirect para `/medicos`.
- `src/layouts/PublicLayout.tsx` — remover entradas duplicadas no header e no footer.

Sem mudanças de backend, schema ou lógica de negócio — é só reorganização de UI pública.
