## Corrigir `nome_completo` -> `nome` na tabela medicos

A tabela `medicos` usa o campo `nome`, mas 4 arquivos referenciam `nome_completo` (inexistente), causando falha silenciosa em todas as buscas de médico.

### Arquivos e correções

**1. `src/lib/financeiroConfig.ts`** (5 pontos)
- Query de overrides: `nome_completo` -> `nome` no select e no map
- Query de auditoria: `nome_completo` -> `nome` no select e no forEach
- `searchMedicosAtivos`: `nome_completo` -> `nome` no select, order, ilike e map

**2. `src/lib/financeiroPrevia.ts`** (4 pontos)
- Duas queries de prévia: `nome_completo` -> `nome` no select join e no map

**3. `src/pages/app/comunicacao/Inbox.tsx`** (2 pontos)
- Query de nome do médico: `nome_completo` -> `nome` no select e no acesso ao dado

**4. `src/pages/app/empresa/EmpresaDocumentos.tsx`** (2 pontos)
- Query de documentos: `nome_completo` -> `nome` no select join e no map

### Resultado
Busca de médicos funcionará em: modal de exceção de repasse, modal de reembolso, prévia de repasse, auditoria financeira, inbox e documentos empresa.
