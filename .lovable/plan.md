
# Regras Antifraude, Ações Admin e Relatório Médico Interno IA

## O que já existe

A plataforma já possui toda a infraestrutura base:
- Tabelas: `medico_score_operacional`, `medico_score_compliance`, `medico_alertas_ia`, `medico_anomalias`, `medico_auditoria_ia`, `medico_logs_confianca`
- Edge function `ia-auditoria-medica` usando Gemini Flash com tool calling, gerando scores de 6 dimensões operacionais + 4 de compliance, alertas e anomalias
- Página admin `/app/admin/ia-medicos` com 4 tabs (Ranking, Alertas, Anomalias, Log Auditoria)
- Detecção automática de avaliações suspeitas (5 estrelas consecutivas em 7 dias)
- Penalidade Bayesiana no ranking para bursts de avaliação
- Penalidade de compliance no ranking vinculada ao nível de risco da IA

## O que será implementado

### 1. Migração de banco: Ações Admin + Regras antifraude

**Nova tabela `admin_acoes_medico`** - Log imutável de TODAS as ações admin sobre médicos:
- Tipos: `promover`, `reduzir_destaque`, `pausar_impulsionamento`, `bloquear_beneficios`, `sinalizar_acompanhamento`, `solicitar_correcao`, `registrar_observacao`, `congelar_ranking`, `liberar_selo`, `remover_selo`
- Campos: `medico_id`, `admin_id`, `tipo_acao`, `motivo`, `dados_antes`, `dados_depois`, `alerta_vinculado_id`, `anomalia_vinculada_id`
- Toda ação é imutável (INSERT-only, sem UPDATE/DELETE para auditabilidade)

**Nova tabela `medico_restricoes`** - Estado atual de restrições ativas por médico:
- Campos: `ranking_congelado`, `impulsionamento_pausado`, `beneficios_bloqueados`, `em_acompanhamento`, `selo_removido`, `motivo`, `aplicado_por`, `aplicado_em`, `expira_em`
- Usado pelos triggers de ranking para impedir movimentação quando congelado

**Atualização de `recalcular_ranking_medico`** - Respeitar restrições:
- Se `ranking_congelado = true`, manter posição anterior sem recalcular
- Se `impulsionamento_pausado = true`, campanhas ativas são pausadas automaticamente
- Premium NÃO pode apagar penalidades de compliance/anomalia (separação orgânico vs pago reforçada)

**Novas regras antifraude (triggers)**:
- Avaliações: detectar padrões de IP duplicado, mesma faixa horária, volume anômalo por paciente
- Campanhas: limitar gasto diário por CPC, detectar auto-clique (mesmo user_id em múltiplas campanhas)
- Ranking: Premium `fator_premium` NUNCA anula `penalidade_anomalia` ou `penalidade_compliance`

### 2. Service layer: ações admin (`src/lib/ia-auditoria.ts`)

Novos métodos:
- `executarAcaoAdmin(medicoId, tipoAcao, motivo, alertaId?, anomaliaId?)` - Registra a ação + aplica restrição
- `listarAcoesAdmin(medicoId?)` - Histórico de ações
- `listarRestricoesAtivas()` - Médicos com restrições ativas
- `removerRestricao(medicoId, tipo)` - Remove restrição com log
- `getHistoricoEvolucao(medicoId)` - Scores dos últimos 6 meses

### 3. Edge function: IA auditora expandida

Atualizar `ia-auditoria-medica` com indicadores adicionais no prompt:
- Pontualidade (atrasos recorrentes)
- Faltas/no-show DO MÉDICO (não do paciente)
- Reclamações de pacientes
- Retrabalho de documentos (receitas, atestados)
- Necessidade de intervenção da equipe
- Excesso de cancelamentos
- Baixa taxa de resposta
- Conflitos operacionais
- Reincidência de falhas
- Aderência às regras da plataforma

A IA passa a retornar adicionalmente:
- `pontos_positivos`: lista de aspectos positivos
- `pontos_criticos`: lista de problemas identificados
- `sugestao_acao`: `promover` / `manter` / `reduzir_destaque` / `acompanhar`
- `risco_reputacional`: score 0-100
- `evolucao_tendencia`: `melhorando` / `estavel` / `piorando`

### 4. Página admin refatorada: "Relatório Médico Interno IA"

A página existente (`AdminIAMedicos`) será expandida com 2 tabs adicionais e melhorias:

**Tab "Ranking Interno"** (existente, melhorado):
- Adicionar coluna de restrições ativas (congelado, pausado, etc.)
- Botões de ação rápida no expandido: Promover, Reduzir destaque, Congelar ranking, etc.
- Modal de confirmação com campo de motivo obrigatório
- Separação visual clara: Score Orgânico vs Impulsionamento Pago

**Nova tab "Ações Admin"**:
- Histórico cronológico de todas as ações (promover, bloquear, etc.)
- Quem fez, quando, motivo, alerta/anomalia vinculada
- Filtros por tipo de ação e médico
- Imutável - sem edição ou exclusão

**Nova tab "Restrições Ativas"**:
- Lista de médicos com restrições vigentes
- Tipo de restrição, motivo, quem aplicou, quando expira
- Botão para remover restrição (com log)

**Melhorias no expandido do médico**:
- Seção "Pontos Positivos" e "Pontos Críticos" vindos da IA
- Sugestão de ação da IA (promover/manter/reduzir)
- Risco reputacional separado do operacional
- Evolução mensal (tendência)
- Campo de observação interna livre (registrado em log)

### 5. Menu admin

Atualizar o nome no menu/breadcrumb para "Relatório Médico Interno IA".

---

## Detalhes Técnicos

### Migração SQL

```text
admin_acoes_medico
  id uuid PK
  medico_id uuid FK
  admin_id uuid FK auth.users
  tipo_acao text (enum check)
  motivo text NOT NULL
  dados_antes jsonb
  dados_depois jsonb
  alerta_vinculado_id uuid nullable FK
  anomalia_vinculada_id uuid nullable FK
  created_at timestamptz

medico_restricoes
  medico_id uuid PK
  ranking_congelado boolean default false
  impulsionamento_pausado boolean default false
  beneficios_bloqueados boolean default false
  em_acompanhamento boolean default false
  selo_removido boolean default false
  motivo text
  aplicado_por uuid
  aplicado_em timestamptz
  expira_em timestamptz nullable
  updated_at timestamptz
```

RLS: admin-only via `has_role(auth.uid(), 'admin')`.

### Separação orgânico vs pago (regra fundamental)

O ranking interno (orgânico) é calculado por métricas reais. O Premium APENAS:
- Adiciona selo visual
- Habilita campanhas CPC externas
- Libera relatórios avançados

O Premium NUNCA:
- Anula penalidades de anomalia
- Remove alertas da IA
- Altera score operacional ou compliance
- Mascara problemas no ranking interno
