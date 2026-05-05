
# Análise Estratégica — Gamificação, Ranking Médico e Sistema Premium de Campanhas

---

## 1. Estado Atual da Plataforma (já implementado)

O ecossistema já possui uma base sólida de gamificação em 4 fases:

- **Avaliações** (`avaliacoes_medicas`): nota 1-5, comentário, pública/privada, exibir no perfil
- **Ranking** (`medico_ranking`): score composto (avaliação 35%, atendimentos 20%, conversão 15%, no_show 10%, recência 10%, premium 10%) — recalculado por trigger + cron 6h
- **Saldo de crescimento** (`medico_saldo_crescimento`): crédito/débito, 10 pontos por consulta concluída
- **Premium** (`medico_premium`): pago ou conquistado (50 atend, 4.0 nota, <10% no_show, 3 meses)
- **Impulsionamento CPC** (`impulsionamento_campanhas`, `_cliques`, `_conversoes`): campanhas internas com orçamento, CPC real, tracking de conversão
- **Config admin** (`ranking_config`): pesos, thresholds, CPC padrão — tudo configurável

---

## 2. Arquitetura de Dois Modos de Crescimento

### 2.1 Modo Free (Orgânico)

O médico cresce internamente através de um **Score Composto Multi-Dimensional** que separa 4 sub-scores independentes:

**Score Operacional (peso 30%)**
- Taxa de resposta a agendamentos (< 2h = 1.0, < 6h = 0.7, > 6h = 0.3)
- Pontualidade (início real vs horário agendado)
- Taxa de cancelamento iniciado pelo médico (inversa)
- Completude do perfil (foto, bio, especialidades, link_sala)
- Frequência de uso da plataforma (logins/semana, interações)

**Score Clínico (peso 30%)**
- Avaliação média dos pacientes (nota 1-5)
- Total de consultas concluídas (log normalizado para não penalizar novos)
- Taxa de retorno de pacientes (mesmo paciente volta em 6 meses)
- Taxa de no_show (inversa)
- Diversidade de horários disponibilizados

**Score Comercial (peso 20%)**
- Taxa de conversão (agendamentos / visualizações de perfil)
- Taxa de preenchimento de agenda (slots ocupados / slots disponíveis)
- Volume mensal de consultas (crescimento MoM)
- Ticket médio (valor médio por consulta)

**Score Reputacional (peso 20%)**
- Avaliações públicas positivas (>= 4 estrelas)
- Quantidade total de avaliações
- Tempo na plataforma (meses ativos)
- Selos e badges conquistados
- Resposta a avaliações negativas (moderação)

**Fórmula final:**
```text
ranking_score = (score_operacional * 0.30)
              + (score_clinico * 0.30)
              + (score_comercial * 0.20)
              + (score_reputacional * 0.20)
              * fator_premium (1.0 ou 1.2)
```

Todos os pesos são configuráveis pelo admin via `ranking_config`.

### 2.2 Modo Premium (Pago)

O Premium **não altera** o ranking orgânico diretamente. O `fator_premium` (1.2x) já existe e é o único bônus interno — configurável e auditável.

O Premium financia **crescimento externo**:
- Campanhas patrocinadas externas (Google Ads, Meta)
- Impulsionamento de perfil na busca pública do site
- Destaque visual (selo premium, borda diferenciada)
- Acesso a relatórios avançados de performance
- Recomendações de IA para otimização

**O que o Premium NÃO faz:**
- Não compra posição no ranking orgânico
- Não manipula avaliações
- Não esconde concorrentes
- Não altera score clínico ou operacional

---

## 3. Sistema de Gamificação Detalhado

### 3.1 Badges e Selos

| Badge | Critério | Renovação |
|-------|----------|-----------|
| Perfil Completo | 100% campos preenchidos | Permanente |
| Pontual | >90% consultas iniciadas no horário (30d) | Mensal |
| Top Avaliado | Top 10% em avaliação média (min 20) | Trimestral |
| Maratonista | 50+ consultas/mês por 3 meses | Trimestral |
| Fidelizador | >40% taxa retorno pacientes | Trimestral |
| Velocista | Tempo médio resposta < 1h (30d) | Mensal |
| Veterano | 12+ meses ativos na plataforma | Permanente |
| Premium Conquistado | Atingiu thresholds orgânicos | Enquanto mantiver |

### 3.2 Níveis de Progressão

```text
Nível 1: Iniciante     (0-99 pontos)
Nível 2: Ativo         (100-299)
Nível 3: Engajado      (300-599)
Nível 4: Destaque      (600-999)
Nível 5: Referência    (1000-1499)
Nível 6: Elite         (1500+)
```

Pontos acumulados = soma de todos os créditos no `medico_saldo_crescimento`. Nunca se perde nível — apenas se ganha.

### 3.3 Streaks e Metas

- **Streak semanal**: dias consecutivos com pelo menos 1 consulta concluída
- **Meta mensal**: admin define meta (ex: 30 consultas), médico que atinge ganha bonus de pontos
- **Streak de resposta**: dias consecutivos respondendo agendamentos em < 2h

### 3.4 Loops de Recompensa

```text
Consulta concluída → +10 pontos → progresso no nível
                   → avaliação do paciente → +score reputacional
                   → streak mantido → bonus multiplicador
                   → meta mensal atingida → badge + pontos extras
                   → acúmulo de pontos → créditos para campanhas internas
```

### 3.5 Proteção Ética

- Avaliações não podem ser solicitadas repetidamente (1 por consulta)
- Badges são calculados por triggers server-side, não manipuláveis
- Score operacional usa dados reais (timestamps de consulta, não self-report)
- Ranking não exibe posição numérica para pacientes (apenas "Top 10%", "Destaque")
- Comentários de avaliação passam por moderação antes de exibição pública

---

## 4. Proteção contra Manipulação e Justiça

### 4.1 Novos vs Antigos

- **Log normalizado** para atendimentos: `log(1 + total_atendimentos)` impede que volume bruto domine
- **Janela temporal**: métricas operacionais usam últimos 90 dias, não acumulado total
- **Boost de novato**: médicos com < 30 dias recebem fator neutro (0.5) em vez de 0 em recência
- **Score separado por dimensão**: novo médico pode ter score clínico alto mesmo com score comercial baixo

### 4.2 Anti-fraude

- Rate limiting em avaliações (1 por paciente por consulta)
- Detecção de padrões suspeitos (muitas 5 estrelas do mesmo IP/device)
- Auditoria completa: toda mudança de score logada em `ranking_audit_log`
- Admin pode congelar ranking de médico sob investigação
- Créditos promocionais têm validade (90 dias) para evitar acúmulo artificial

---

## 5. Fluxo Premium Completo

### 5.1 Jornada do Médico

```text
Dashboard Médico
  └─ Banner "Impulsione seu perfil" (se não Premium)
      └─ /app/medico/premium
          ├─ Explicação dos benefícios
          ├─ Comparativo Free vs Premium
          ├─ Simulador de alcance (baseado em dados reais da especialidade)
          ├─ Planos disponíveis (Básico / Profissional / Enterprise)
          └─ Checkout (Stripe Embedded)
              └─ Retorno
                  └─ /app/medico/campanhas (Dashboard de campanhas)
                      ├─ Criar campanha
                      ├─ Campanhas ativas / pausadas / encerradas
                      ├─ Métricas (cliques, impressões, conversões, CPC, ROI)
                      ├─ Relatório de performance
                      └─ Recomendações IA
```

### 5.2 Rotas

| Rota | Descrição |
|------|-----------|
| `/app/medico/premium` | Página de vendas + checkout Premium |
| `/app/medico/campanhas` | Dashboard de campanhas do médico |
| `/app/medico/campanhas/:id` | Detalhe de campanha específica |
| `/app/medico/relatorios` | Relatórios de performance + IA |
| `/app/admin/gamificacao/premium` | Admin: gestão de assinaturas Premium |
| `/app/admin/gamificacao/campanhas` | Admin: visão geral de todas as campanhas |

### 5.3 Planos Premium

| Plano | Valor | Benefícios |
|-------|-------|------------|
| Básico | R$ 149/mês | Selo premium, 1 campanha CPC interna, relatórios básicos |
| Profissional | R$ 349/mês | Tudo do Básico + 3 campanhas, relatório IA, destaque busca |
| Enterprise | R$ 699/mês | Tudo do Prof. + campanhas ilimitadas, Google Ads integrado, consultor IA |

---

## 6. Sistema de Pagamento Premium

### 6.1 Fluxo financeiro

- **Assinatura recorrente** via Stripe (mensal)
- **Upgrade**: pro-rata automático (Stripe calcula diferença)
- **Downgrade**: mantém plano atual até fim do ciclo, depois muda
- **Cancelamento**: acesso até fim do ciclo pago; campanhas ativas pausam automaticamente
- **Inadimplência**: 3 tentativas Stripe; após falha final, pausa campanhas e remove selo
- **Pausa de campanha**: médico pode pausar/retomar campanhas sem cancelar assinatura
- **Renovação automática**: padrão; médico pode desativar (acesso até fim do ciclo)
- **Créditos promocionais**: pontos orgânicos podem ser convertidos em crédito para CPC interno (taxa configurável, ex: 100 pontos = R$ 5 em CPC)

### 6.2 Tabelas envolvidas

- `medico_premium` (já existe) — status da assinatura
- `premium_assinaturas` (nova) — histórico completo, stripe_subscription_id, plano, valor, ciclo
- `premium_creditos` (nova) — conversão de pontos orgânicos em créditos CPC
- `impulsionamento_campanhas` (já existe) — campanhas CPC

---

## 7. IA de Recomendação Estratégica

Edge function `recomendacao-medico` que analisa dados reais e gera insights:

**Inputs**: dados de `medico_ranking`, `consultas`, `impulsionamento_*`, `medico_saldo_crescimento`

**Outputs (exemplos)**:
- "Sua taxa de conversão caiu 15% este mês. Considere adicionar mais horários nas terças."
- "Especialidade X tem alta demanda na sua região. Uma campanha de R$ 100 pode gerar ~20 novos agendamentos."
- "Seu perfil está perdendo relevância — 0 consultas nos últimos 14 dias."
- "Horários das 18h-20h convertem 3x mais que manhã na sua especialidade."
- "Seu score operacional está em 72%. Melhorar tempo de resposta pode subir para 85%."

**Modelo**: Gemini 2.5 Flash via Lovable AI Gateway (sem API key externa)

---

## 8. Arquitetura Técnica

### 8.1 Novas Tabelas

| Tabela | Propósito |
|--------|-----------|
| `medico_score_detalhado` | 4 sub-scores + score final, atualizado por trigger |
| `medico_badges` | Badges conquistados por médico (badge_key, conquistado_em, expira_em) |
| `medico_streaks` | Streaks ativos (tipo, dias_consecutivos, melhor_streak) |
| `medico_metas` | Metas definidas pelo admin (tipo, threshold, periodo) |
| `medico_metas_progresso` | Progresso do médico em cada meta |
| `premium_assinaturas` | Histórico de assinaturas Premium (plano, valor, stripe_id) |
| `premium_creditos` | Conversão pontos → créditos CPC |
| `ranking_audit_log` | Log de todas as mudanças de score/posição |
| `recomendacoes_ia` | Cache de recomendações geradas pela IA |
| `campanha_metricas_diarias` | Agregação diária de métricas por campanha |

### 8.2 Edge Functions

| Function | Propósito |
|----------|-----------|
| `recalcular-ranking` | Já existe — expandir para 4 sub-scores |
| `recomendacao-medico` | IA de recomendação estratégica |
| `premium-webhook` | Webhook Stripe para assinaturas Premium |
| `badge-check` | Verificação periódica de badges (cron) |

### 8.3 Segurança e LGPD

- RLS em todas as tabelas (médico vê apenas seus dados)
- Admin vê tudo via `has_role`
- Dados de ranking anonimizados para pacientes (sem posição numérica)
- Logs de auditoria imutáveis (INSERT only, sem UPDATE/DELETE)
- Consentimento explícito para exibição pública de avaliações
- Direito ao esquecimento: função que anonimiza dados do médico

---

## 9. Plano de Implantação Cirúrgico

### Etapa 1 — Base estrutural (Score Multi-Dimensional)
- Criar `medico_score_detalhado` com 4 sub-scores
- Migrar fórmula de `recalcular_ranking_todos` para calcular sub-scores
- Expandir `ranking_config` com pesos dos sub-scores
- Atualizar UI admin e médico para exibir radar chart dos scores

### Etapa 2 — Badges e Progressão
- Criar `medico_badges`, `medico_streaks`, `medico_metas`
- Edge function `badge-check` com cron diário
- UI médico: painel de badges, streaks, nível atual
- UI admin: configuração de badges e metas

### Etapa 3 — Score Operacional Real
- Capturar timestamp real de início de consulta (pontualidade)
- Calcular taxa de resposta a agendamentos
- Métricas de completude de perfil
- Frequência de uso (login tracking)

### Etapa 4 — Créditos Promocionais
- Criar `premium_creditos`
- Lógica de conversão pontos → créditos CPC (configurável)
- Validade de créditos (90 dias)
- UI médico: converter pontos, ver saldo de créditos

### Etapa 5 — Modo Premium (Assinatura)
- Criar `premium_assinaturas`
- Produtos/Preços Stripe (3 planos)
- Página `/app/medico/premium` com checkout embedded
- Webhook de assinatura (ativar/desativar premium)
- Lógica de upgrade/downgrade/cancelamento

### Etapa 6 — Dashboard de Campanhas
- Expandir `/app/medico/campanhas` com métricas avançadas
- `campanha_metricas_diarias` para agregação
- Gráficos de ROI, conversão, CPC ao longo do tempo
- Simulador de alcance baseado em dados reais

### Etapa 7 — Relatórios Inteligentes
- Dashboard de performance do médico com comparativos
- Exportação de relatórios (PDF)
- Métricas por período, especialidade, horário

### Etapa 8 — IA de Recomendação
- Edge function `recomendacao-medico` via Gemini Flash
- Cache em `recomendacoes_ia` (renovação semanal)
- Widget no dashboard médico com insights acionáveis
- Notificações proativas (perda de tráfego, oportunidades)

### Etapa 9 — Google Ads Integrado (futuro)
- Estrutura de tabelas para integração com Google Ads API
- Edge function de sincronização de campanhas
- Mapeamento de conversões externas → internas
- (Ativação real depende de credenciais — adiar conforme regra de integrações)

### Etapa 10 — Auditoria e Anti-fraude
- `ranking_audit_log` para todas as mudanças
- Detecção de padrões suspeitos em avaliações
- Painel admin de investigação
- Congelamento de ranking sob suspeita
- Relatório de compliance LGPD

---

## 10. Riscos e Pontos Críticos

| Risco | Mitigação |
|-------|-----------|
| Médico novo nunca consegue subir | Log normalizado + boost de novato + janela temporal |
| Compra de avaliações falsas | 1 avaliação por consulta real + detecção de padrão |
| Premium = pay-to-win percebido | Separação clara orgânico/pago, fator premium transparente e limitado (1.2x) |
| Conflito ético CFM | Ranking não público com posição numérica, badges operacionais (não clínicos), sem comparação direta entre médicos para pacientes |
| Sobrecarga de recálculo | Cron 6h + trigger por evento, não real-time |
| LGPD | Consentimento, anonimização, audit trail, direito ao esquecimento |

---

Este plano mantém a base sólida já implementada (Fases 1-4) e a expande de forma incremental, sem quebrar nada existente. Cada etapa é independente e pode ser implementada isoladamente. Deseja começar por alguma etapa específica?
