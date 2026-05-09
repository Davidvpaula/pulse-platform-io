## Frente D — Alertas Operacionais + IA Auditora Operacional

Filosofia: **80% regras determinísticas, 20% IA assistiva**. Observador puro, sem ação automática, sem impacto financeiro, sem ranking público.

---

### Estado atual mapeado

- ✅ `observabilidade_eventos` (event bus) já recebendo eventos NOC (`modulo='operacao'`)
- ✅ `fn_metricas_operacionais_dia`, views `vw_noc_*`, `fn_noc_snapshot` (Frente A)
- ✅ `medico_score_operacional` recalculado em batch (Frente B)
- ✅ Dashboard `/app/admin/noc` com abas Agora/Hoje/Atenção (Frente C)
- ⚠️ `medico_alertas_ia` existe mas é **antifraude/compliance por médico** — escopo diferente; não reaproveitar para alertas operacionais
- ⚠️ Edge `ia-auditoria-medica` existe, é antifraude — criar `noc-ia-auditora` separada para operação

---

### Parte A — Alertas determinísticos (sem IA)

**Tabela nova `operacao_alertas`** (única estrutura nova — confirmação do usuário):
- `id`, `tipo` (text), `severidade` (`info|aviso|critico`), `titulo`, `descricao`, `payload jsonb`
- `alerta_key text` (chave canônica para dedup, ex.: `paciente_aguardando:<consulta_id>`)
- `consulta_id`, `medico_id`, `paciente_id` nullable (para join no UI)
- `status` (`aberto|reconhecido|resolvido|expirado`), `responsavel_id`, `resolvido_em`, `resolucao_nota`
- `cooldown_ate timestamptz` (não reabre o mesmo `alerta_key` antes disso)
- `created_at`, `updated_at`
- Índice único parcial em `(alerta_key)` WHERE `status='aberto'` → garante idempotência
- RLS: SELECT/UPDATE para `admin`/`supervisor`; INSERT só via SECURITY DEFINER

**Função `fn_emitir_alerta_operacional(p_tipo, p_severidade, p_key, p_cooldown_min, p_titulo, p_descricao, p_payload, p_consulta_id, p_medico_id, p_paciente_id)`**
- Se já existe alerta `aberto` com mesmo `alerta_key` → retorna NULL (silencioso)
- Se existe alerta resolvido recente com `cooldown_ate > now()` → retorna NULL
- Senão INSERT novo alerta com `cooldown_ate = now() + p_cooldown_min`
- `EXCEPTION WHEN OTHERS THEN NULL` (não bloqueia chamador)

**Função `fn_alertas_operacionais_scan()`** — varredura batch (5 min via cron):
1. **Paciente aguardando >20min**: `consultas` com status `confirmada`, `data_hora_inicio < now() - 20min`, sem `em_andamento` no log → severidade `aviso`, cooldown 30min
2. **Médico atrasado >15min**: igual ao acima mas filtro 15min → severidade `aviso`, cooldown 30min
3. **Consulta iniciada com atraso >15min**: `em_andamento` cujo log mostra início_real - data_hora_inicio >15min → severidade `info`, cooldown 60min
4. **Excesso de no-show (24h)**: médico com >3 `no_show` em 24h → severidade `critico`, cooldown 6h
5. **Excesso de cancelamento tardio (24h)**: >3 cancelada_tarde por médico → `aviso`, cooldown 6h
- Cada regra envolvida em BEGIN/EXCEPTION individual (uma falha não derruba as outras)
- Loga total emitido em `observabilidade_eventos` (`operacao.alertas_scan`)

**Cron**: `noc_alertas_scan` a cada 5 minutos.

> Não incluído nesta frente (depende de presença/agenda cruzada — backlog): "médico offline em horário ativo", "conversa abandonada", "fila acima do limite".

---

### Parte B — IA Auditora Operacional (leve, batch horário)

**Tabela nova `noc_resumos_ia`**:
- `id`, `janela_inicio`, `janela_fim`
- `resumo text`, `gargalos jsonb` (máx 3), `sugestoes jsonb` (máx 3), `risco_geral` (`baixo|medio|alto`)
- `modelo`, `tokens_entrada int`, `tokens_saida int`
- `created_at`
- RLS: SELECT admin/supervisor; INSERT só via service_role

**Edge function `noc-ia-auditora`** (autenticada admin OU invocada pelo cron):
- Coleta input compacto:
  - métricas do dia (`fn_metricas_operacionais_dia`)
  - top 5 médicos com mais atraso/no-show das últimas 24h
  - contagem de `operacao_alertas` por tipo/severidade (24h)
  - eventos recentes de `observabilidade_eventos` (modulo=operacao, últimos 60min, top 20)
- Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) via `Output.object` schema:
  ```ts
  { resumo: string, gargalos: {titulo, descricao}[], sugestoes: {titulo, descricao}[], risco_geral: "baixo"|"medio"|"alto" }
  ```
- System prompt curto: "auditor operacional observador, NUNCA recomende ações automáticas, NUNCA cite valores financeiros, foque em padrões"
- Limites enforced no edge: máx 3 gargalos, 3 sugestões, ~2k tokens entrada
- Cooldown: se já existe resumo nas últimas 50min → retorna o último (não chama LLM)
- INSERT em `noc_resumos_ia`, log em `observabilidade_eventos`

**Cron**: `noc_ia_auditora_horaria` no minuto 5 de cada hora, **08-20 BRT** (11-23 UTC) — fora desse intervalo não roda (controle de custo).

---

### Parte C — Integração no `/app/admin/noc`

Adicionar 2 abas ao dashboard existente:

**Aba "Alertas"**
- Lista de `operacao_alertas` com filtros (severidade, status)
- Badge contador nos `aberto` no rótulo da aba
- Ações por linha: **Reconhecer**, **Resolver** (com nota opcional)
- Realtime via `postgres_changes` na tabela
- Link para consulta/médico quando aplicável

**Aba "Resumo IA"**
- Card com último resumo (resumo, risco_geral colorido, lista gargalos, lista sugestões)
- Histórico colapsável (últimas 24h)
- Botão **"Gerar agora"** (chama edge function manualmente — respeita cooldown 50min)
- Disclaimer: "Gerado por IA observadora — não toma ações automáticas"

Tudo read-only para o restante do sistema. Nenhum impacto em UX paciente/médico/financeiro.

---

### Decisões a confirmar antes de executar

1. **Janela de scan determinístico**: a cada 5 minutos via `pg_cron`?
2. **IA horária restrita a 08-20 BRT** (controle de custo) ou 24/7?
3. **`operacao_alertas` separada de `medico_alertas_ia`** (recomendado — escopos distintos)?
4. **Modelo IA**: `google/gemini-3-flash-preview` (default Lovable AI, sem secret extra)?

### Ordem de execução (incremental como frentes anteriores)

1. Migration: tabela `operacao_alertas` + RLS + `fn_emitir_alerta_operacional` + `fn_alertas_operacionais_scan` + cron 5min
2. Migration: tabela `noc_resumos_ia` + RLS
3. Edge function `noc-ia-auditora` + cron horário
4. UI: 2 abas novas no `/app/admin/noc`
5. Validação: verificar emissão real de alertas + 1 execução IA + dedup funcionando

Cada passo testável e reversível independentemente.