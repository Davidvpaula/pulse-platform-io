
# Adicionar avaliações no perfil público do médico

## O que será feito

Na página pública do médico (`/medicos/:slug` - componente `MedicoDetalhe` em `PublicPages.tsx`), será adicionada uma seção **"Avaliações de pacientes"** exibindo as avaliações que o médico marcou como visíveis no site.

## Detalhes

### 1. Carregar avaliações visíveis (PublicPages.tsx - MedicoDetalhe)
- No `useEffect` existente, após carregar planos, buscar da tabela `avaliacoes_medicas` onde:
  - `medico_id = med.id`
  - `avaliacao_publica = true`
  - `exibir_no_perfil = true`
- Também buscar o nome do paciente (via `profiles.nome`) para exibição
- Ordenar por `created_at` desc, limitar a 10

### 2. Renderizar seção de avaliações
- Após a seção "Planos deste profissional" e antes do sidebar
- Card com titulo "Avaliações de pacientes" + badge com total
- Cada avaliação mostra: estrelas, comentário, nome do paciente (primeiro nome), data
- Nota média destacada no topo com estrelas preenchidas
- Se não houver avaliações visíveis, a seção não aparece

### Arquivos alterados
- `src/pages/public/PublicPages.tsx` (MedicoDetalhe) - adicionar fetch + renderização
