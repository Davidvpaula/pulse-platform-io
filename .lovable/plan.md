## Mudanças em `src/pages/public/PublicPages.tsx` (página `/medicos`)

1. **Remover a faixa de chips de especialidades** (todo o bloco `{especialidades.length > 0 && (...)}` logo abaixo da barra de busca).
2. **Renomear o filtro de especialidade** no `Select`:
   - `SelectValue placeholder="Especialidade"` → `placeholder="Especialidades"`
   - Item `"Todas especialidades"` → `"Especialidades"` (volta ao estado neutro do filtro).

Sem outras alterações. O `EmBreveDialog` deixa de ser acionado pela página (era usado só pelos chips), então fica como código morto — removo o estado `emBreveNome` e a importação do `EmBreveDialog` desta página para manter limpo.
