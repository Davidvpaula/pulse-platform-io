## Implementação dos "Serviços da Plataforma"

Estou em modo plano (somente leitura) — preciso da sua aprovação para executar. Tudo abaixo será feito sem novas perguntas após o "Approve".

---

### Etapa 1 — Migração SQL (1 arquivo)

**Estende `servicos_financeiros`**: `duracao_min`, `valor_paciente_centavos`, `prioridade`, `especialidade_id`, `slug` (único), `requer_aprovacao_medico`, `descricao_publica`, `icone`. Vitrine pública: SELECT liberado para anon quando `ativo=true`.

**Estende `agenda_slots`**: coluna `servico_id` (NULL = particular).

**Estende `medico_servicos`**: enum `medico_servico_status` (`ativo|pendente|recusado|desativado`).

**Estende `medicos`**: `prioridade_atendimento int default 100`.

**Estende `consultas`**: `avaliacao_paciente_nota` (1–5), `avaliacao_paciente_em`, `avaliacao_paciente_comentario`.

**`app_settings`**: insere chave `ranking.pesos = {disponibilidade:0.40, avaliacao:0.25, espera:0.25, prioridade:0.10}`.

**Funções/triggers**:
- `fn_resolver_comissao(medico, servico, valor)` → ordem override_servico → override_global_medico → servico → global
- `fn_agenda_slot_servico_check` (BEFORE INSERT/UPDATE em `agenda_slots`): exige adesão ativa, força duração do serviço, bloqueia mudar de serviço para particular se já há consulta vinculada
- `fn_consulta_snapshot_financeiro` (AFTER INSERT em `consultas`): grava snapshot completo em `consultas_financeiro` + `valor_snapshot_centavos`/`comissao_snapshot_centavos`/`snapshot_at` na consulta
- `fn_consultas_financeiro_imutavel` (BEFORE UPDATE): bloqueia alteração de qualquer campo monetário, só permite mudar `status`
- `fn_ranking_medico_servico(servico, modalidade, limit)` → score = pesos × (disp + aval + espera + prio), exclui médicos suspensos/inativos

---

### Etapa 2 — Telas internas

**`/app/admin/servicos`** (rota nova, perm `financeiro.servicos_gerenciar`):
- Tabela: Nome · Tipo · Duração · Valor paciente · Repasse · Prioridade · Especialidade · #Médicos · Switch Ativo
- Filtros: tipo, ativo, especialidade. Busca por nome.
- Drawer "Novo/Editar serviço" com todos os campos + preview "Médico recebe R$ X · Plataforma R$ Y" em tempo real
- Aba secundária "Médicos vinculados" no drawer (lista + override individual)
- Validações: slug único, valor_fixo ≤ valor_paciente, duração 5–480 múltiplo de 5

**`/app/medico/servicos`** (rota nova):
- Cards por serviço ativo
- Cada card mostra: nome, tipo, duração, valor paciente, **"Você recebe R$ X"** (chama `fn_resolver_comissao`)
- Toggle "Atendo este serviço" (cria/desativa `medico_servicos`)
- Se `requer_aprovacao_medico`, toggle vira "Solicitar adesão" → status pendente
- Botão "Solicitar override de comissão" abre modal com motivo (não auto-aplica — vai para fila admin)
- Banner topo: "Você atende N de M serviços"

**Atualização da UI de criação de slot** (médico/secretaria):
- Radio "Particular | Serviço da plataforma"
- Se serviço: dropdown só com os aderidos; campo duração some (informativo)

---

### Etapa 3 — Site público

**Home** — bloco hero "⚡ Atendimento imediato" abaixo do herói principal:
- Componente `<ProntoAtendimentoCard />` consulta `fn_ranking_medico_servico` para serviço tipo `pronto_atendimento` (pega o de menor prioridade) e mostra melhor médico disponível agora + valor + tempo de espera
- Se nenhum disponível: "Próximo horário: HH:MM"
- CTA "Iniciar agora" → fluxo de agendamento direto

**`/servicos`** (rota pública nova):
- Grid de cards de serviços ativos ordenados por `prioridade`
- Filtro por tipo
- Cada card: nome, ícone, duração, valor, "X médicos disponíveis hoje"

**`/servicos/[slug]`** (rota pública nova):
- Header com nome/descrição/valor
- Lista ranqueada de médicos (via `fn_ranking_medico_servico`) com slot mais próximo
- Botão "Agendar com [Médico]" para cada item

**Menu público**: adicionar item "Serviços" entre "Especialidades" e "Para empresas".

---

### Resumo das decisões já confirmadas
- Pesos ranking: 0.40 / 0.25 / 0.25 / 0.10 ✅
- Adesão **manual** pelo médico ✅
- Override sempre **percentual** ✅
- Execução **sequencial sem pausa** Etapa 1 → 2 → 3 ✅

**Aprovar para iniciar.**