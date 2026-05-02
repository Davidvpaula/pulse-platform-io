
# Fase 1 — Avaliações + Ranking + Dashboards Separados

## Resumo
Criar o sistema de avaliação de pacientes, ranking dinâmico de médicos, e duas páginas dedicadas (médico e admin) completamente separadas do financeiro e outros módulos.

---

## 1. Banco de dados (migração)

**3 novas tabelas + funções + triggers:**

- `ranking_config` — configuração admin (pesos da fórmula, mín. avaliações para exibir, dias de recência). RLS: apenas admin.
- `avaliacoes_medicas` — paciente_id, medico_id, consulta_id (unique), nota 1-5, comentário, flags público/exibir_no_perfil. RLS: paciente insere/lê próprias, médico lê as dele e atualiza `exibir_no_perfil`, admin lê tudo, anon lê públicas.
- `medico_ranking` — tabela materializada com avaliacao_media, total_atendimentos, taxa_conversao, taxa_no_show, fator_recencia, ranking_score, posicao. RLS: médico lê próprio, admin tudo, público leitura.

**Triggers:**
- `trg_validar_avaliacao` — BEFORE INSERT: verifica consulta concluída, paciente correto, médico correto
- `trg_after_avaliacao_recalc` — AFTER INSERT: recalcula ranking do médico

**Funções:**
- `recalcular_ranking_medico(uuid)` — calcula score usando fórmula oficial
- `recalcular_ranking_todos()` — loop em médicos aprovados + atualiza posições

**Permissões:** `gamificacao.ver` e `gamificacao.configurar` no catálogo.

## 2. Service layer

**Novo arquivo `src/lib/gamificacao.ts`:**
- `enviarAvaliacao()`, `consultaJaAvaliada()`, `listarAvaliacoesMedico()`, `toggleExibirNoPerfil()`
- `getRankingMedico()`, `listarRankingTop()`
- `getRankingConfig()`, `salvarRankingConfig()`, `recalcularRankingTodos()`

## 3. Componente de avaliação

**Novo `src/components/paciente/AvaliarMedicoDialog.tsx`:**
- Dialog com estrelas clicáveis (1-5), campo de comentário, checkbox "tornar público"
- Validação: só aparece para consultas concluídas sem avaliação existente
- Feedback visual após envio

## 4. Integração no PacienteAgendamentos

- Botão "Avaliar" ao lado de cada consulta concluída (verifica se já avaliou)
- Abre o `AvaliarMedicoDialog`

## 5. Dashboard Médico — `/app/medico/gamificacao`

**Nova página `src/pages/app/medico/MedicoGamificacao.tsx`:**
- **Performance**: nota média, total avaliações, atendimentos, posição no ranking, taxa de conversão, taxa de no-show, fator de recência
- **Avaliações**: lista de comentários recebidos com toggle para exibir/ocultar no perfil público
- Página separada, não mistura com financeiro

## 6. Dashboard Admin — `/app/admin/gamificacao`

**Nova página `src/pages/app/admin/AdminGamificacao.tsx`:**
- **Pesos do ranking**: formulário com sliders para os 6 pesos (validação soma = 1.0)
- **Configuração**: mín. avaliações para exibir, dias recência ativo/penalidade
- **Top médicos**: tabela com ranking, score, avaliações, atendimentos
- **Botão recalcular**: recalcula ranking de todos os médicos
- Página separada, protegida por `gamificacao.configurar`

## 7. Rotas e menus

- `App.tsx`: adicionar rotas `/app/medico/gamificacao` e `/app/admin/gamificacao`
- `menuCatalog.ts`: adicionar item "Gamificação" no menu do colaborador (admin)
- Imports e guards adequados (`MedicoGuard`, `RequireRoutePermission`)

## Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/...gamificacao_fase1.sql` | Criar |
| `src/lib/gamificacao.ts` | Criar |
| `src/components/paciente/AvaliarMedicoDialog.tsx` | Criar |
| `src/pages/app/medico/MedicoGamificacao.tsx` | Criar |
| `src/pages/app/admin/AdminGamificacao.tsx` | Criar |
| `src/pages/app/paciente/PacienteAgendamentos.tsx` | Modificar (botão avaliar) |
| `src/App.tsx` | Modificar (2 rotas) |
| `src/lib/menu/menuCatalog.ts` | Modificar (menu item) |

## O que NÃO será alterado
- Financeiro existente (saques, repasse, snapshots)
- Planos e assinaturas
- Nenhuma lógica de consulta existente
