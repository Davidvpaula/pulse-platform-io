## Frente 1 — Fundação financeira / Ledger base

**Escopo único:** criar a camada paralela de ledger sem mexer em UX, RPCs atuais, Stripe, Feegow, dashboards ou comportamento visível. Tudo continua funcionando exatamente como hoje. O ledger nasce **observador**, não participante.

### Princípios desta frente
- Camada paralela e desligável.
- Append-only com hash chain.
- Idempotência forte por chave.
- Backfill com `drift = 0` ou aborta.
- Sem novas chamadas dentro de RPCs/edge functions existentes (isso é Frente 2).

---

### Passo 1 — Migração base (1 migration única)

**Tabelas novas (todas com RLS habilitada, leitura só para admin):**

- `financeiro_movimentos` — append-only.
  - `id uuid PK`, `ocorrido_em timestamptz`, `created_at timestamptz`
  - `conta text` check in (`'paciente'`,`'medico'`,`'plataforma'`,`'empresa'`,`'retencao'`)
  - `conta_ref_id uuid` (id do médico/paciente/empresa quando aplicável)
  - `direcao text` check in (`'credito'`,`'debito'`)
  - `valor_cents integer not null check (valor_cents > 0)`
  - `moeda text default 'BRL'`
  - `ref_type text` check in (`'pagamento'`,`'consulta'`,`'liberacao'`,`'saque'`,`'estorno'`,`'chargeback'`,`'ajuste_manual'`,`'taxa'`,`'backfill'`)
  - `ref_id uuid` (consulta_id, pagamento_id, saque_id, etc — sem FK rígida para sobreviver a deleções históricas)
  - `idempotency_key text not null` + `unique(idempotency_key)`
  - `origem text` (`webhook_stripe` / `rpc_saque` / `job_liberacao` / `backfill` / `ajuste_admin` / `trigger_snapshot`)
  - `actor_user_id uuid`, `metadata jsonb default '{}'::jsonb`
  - `hash_anterior text`, `hash_atual text not null`
  - **Triggers:** bloqueia UPDATE e DELETE; calcula `hash_atual = sha256(hash_anterior || row_canonical_json)` por médico (chain por `conta_ref_id` quando `conta='medico'`, chain global para os outros).
  - **Índices:** `(conta, conta_ref_id, ocorrido_em)`, `(ref_type, ref_id)`, `(idempotency_key)`.

- `financeiro_idempotency` — `id`, `scope text`, `key text`, `result jsonb`, `result_hash text`, `created_at`. `unique(scope, key)`. Bloqueia UPDATE/DELETE.

- `financeiro_outbox` — `id`, `evento text`, `payload jsonb`, `status text` (`pendente`/`processando`/`ok`/`erro`), `tentativas int default 0`, `proxima_tentativa_em`, `last_error text`, `created_at`, `processed_at`. **Sem produtor nesta frente** — só a tabela existe; processador fica para Frente 3.

- `financeiro_alertas` — `id`, `tipo text` (`drift_saldo`/`movimento_orfao`/`hash_quebrado`/`backfill_inconsistente`), `severidade text`, `payload jsonb`, `medico_id uuid null`, `resolvido_em`, `resolvido_por`, `created_at`. **Sem produtor automático** — só `fn_reconciliar_saldo_medico` escreve aqui.

**RLS:** todas as 4 tabelas — admin lê tudo; nenhum INSERT/UPDATE/DELETE direto via cliente (só via funções `SECURITY DEFINER`). Médico só lê movimentos da própria `conta_ref_id` (preparação para Frente 4 — não há UI ainda).

**Configuração:** inserir em `app_settings` a chave `financeiro.dias_liberacao_repasse` com valor padrão `14` (não usada nesta frente, fica preparada).

---

### Passo 2 — Funções SQL (todas SECURITY DEFINER, search_path travado)

- **`fn_registrar_movimento_idempotente(p_scope text, p_key text, p_payload jsonb)`** → `jsonb`.
  Lock por advisory lock derivado de `(scope,key)`. Se `(scope,key)` já existe em `financeiro_idempotency`, retorna `result` armazenado (idempotente). Senão: insere movimento + idempotency na mesma transação, calcula hash chain, devolve `{movimento_id, hash}`.

- **`fn_medico_saldo_real(p_medico_id uuid)`** → `table(disponivel_cents, pendente_cents, retido_cents, sacado_cents, total_movimentos, ultimo_movimento_em)`.
  Soma direta sobre `financeiro_movimentos` filtrando por `conta='medico' and conta_ref_id=p_medico_id`. **Esta é a verdade.**

- **`fn_reconciliar_saldo_medico(p_medico_id uuid)`** → `jsonb`.
  Compara `mv_medico_saldo` × `fn_medico_saldo_real`. Se diverge: insere `financeiro_alertas` (`tipo='drift_saldo'`), refresca a linha do médico na MV, retorna `{ok:false, diff}`. Se igual: retorna `{ok:true}`. Também valida hash chain dos últimos N movimentos do médico — se quebrada, cria alerta `hash_quebrado`.

- **`fn_validar_hash_chain(p_medico_id uuid, p_limit int default 100)`** → `boolean`. Helper interno.

- **(opcional, helper)** `fn_financeiro_movimento_resumo(p_medico_id uuid, p_desde timestamptz)` para uso futuro nos testes.

**Não criar nesta frente:** funções de captura (saque, liberação D+X, pagamento). Isso é Frente 2/3.

---

### Passo 3 — `mv_medico_saldo`

View materializada com colunas: `medico_id`, `disponivel_cents`, `pendente_cents`, `retido_cents`, `sacado_cents`, `total_movimentos`, `atualizado_em`.

`UNIQUE INDEX` em `medico_id` (necessário para `REFRESH CONCURRENTLY`).

**Refresh nesta frente:** apenas manual via `fn_reconciliar_saldo_medico`. Sem trigger automática ainda (evita acoplar com Frente 2).

---

### Passo 4 — Backfill seguro (script idempotente)

Função: **`fn_backfill_financeiro(p_dry_run boolean default true, p_medico_id uuid default null)`** → `jsonb` com `{movimentos_gerados, medicos_processados, drift_detectado, abortado}`.

**Política:**
1. Roda em **transação única**. Qualquer drift > 0 → `RAISE EXCEPTION` → rollback total.
2. Idempotente: usa idempotency_keys determinísticos (ex: `backfill:consulta:<id>:credito_pendente`, `backfill:saque:<id>:retencao`, `backfill:saque:<id>:debito`). Reexecutar não duplica.
3. **Ordem das fontes:**
   a. Para cada `consultas_financeiro` com pagamento confirmado → 1 movimento `pendente_credito` para o médico (`ref_type='consulta'`, `ocorrido_em=consulta.snapshot_at`).
   b. Para cada `consultas` com `status='concluida'` há mais de `dias_liberacao_repasse` → movimento `liberacao` (debita pendente, credita disponível) com `ocorrido_em = concluida_em + interval`.
   c. Para cada `saques_medicos` com status pendente/aprovado → movimento `retencao` na solicitação.
   d. Para cada `saques_medicos` pago → movimento `debito_disponivel` na data de pagamento.
   e. Para reembolsos/estornos existentes em `pagamentos` → movimentos `estorno`.
4. Após inserir, para cada médico tocado: chama `fn_medico_saldo_real`, compara com a expectativa derivada de `consultas_financeiro - saques_pagos - retencoes_pendentes + ajustes_existentes`. **Se divergir 1 centavo → aborta tudo.**
5. `dry_run=true` (default) faz tudo dentro de SAVEPOINT e dá rollback no final, gerando relatório completo sem persistir. Dono do projeto roda em `dry_run` primeiro, valida o relatório, depois roda com `false`.

**Tabela auxiliar `financeiro_backfill_log`** — `id`, `executado_em`, `executado_por`, `dry_run`, `relatorio jsonb`, `ok boolean`, `erro text`. Audita cada execução do backfill.

---

### Passo 5 — Testes de consistência (Deno + pgTAP-like via SQL)

Suite executada via `supabase--test_edge_functions` em uma edge function `_internal-financeiro-tests` (não exposta, sem rota pública, deletada após validação ou marcada interna).

Cenários cobertos:
1. **Idempotência básica** — chamar `fn_registrar_movimento_idempotente` duas vezes com mesma key → 1 movimento, mesmo `result`.
2. **Webhook duplicado simulado** — duas chamadas concorrentes com mesma key → 1 movimento (advisory lock).
3. **Append-only** — `UPDATE financeiro_movimentos … ` deve falhar; `DELETE` deve falhar.
4. **Hash chain íntegra** — inserir 50 movimentos, validar `fn_validar_hash_chain` retorna true; alterar manualmente um hash via SQL bruto (em ambiente de teste isolado) → função detecta quebra.
5. **Reconciliação** — médico com movimentos conhecidos: `fn_medico_saldo_real` bate com `mv_medico_saldo` após refresh; injetar drift artificial → reconciliação cria alerta e corrige.
6. **Race de saque (preparação)** — duas chamadas concorrentes a `fn_registrar_movimento_idempotente` com mesma key de saque → só uma vence, outra vê `result` cacheado.
7. **Estorno** — pagamento + estorno geram dois movimentos distintos com sinais opostos; saldo final = 0.
8. **Backfill idempotente** — rodar duas vezes → segunda execução não cria nenhum movimento novo, drift = 0.

Falha em qualquer teste **interrompe a frente**.

---

### Passo 6 — Relatório final (executado e entregue ao usuário)

Markdown com:
- Total de movimentos backfilled, por `ref_type`.
- Total de médicos processados.
- Drift por médico (esperado: zero em todos).
- Resultado de cada um dos 8 testes.
- Hash do último movimento global (snapshot inicial do ledger).
- Confirmação de que **nenhuma RPC atual foi modificada** (lista de arquivos tocados).
- Próximo passo recomendado: aprovar Frente 2 (plug nos pontos de captura) quando o usuário decidir.

---

### Garantias de compatibilidade e rollback

**O que NÃO é tocado nesta frente:**
- `consultas_financeiro`, `pagamentos`, `saques_medicos`, `medico_comissao_override`, `plano_taxa_plataforma`, `cobrancas_links`, `empresas_faturas`, `financeiro_auditoria` — intactas.
- Edge functions: `payments-webhook`, `criar-checkout-stripe`, `criar-checkout-premium`, `nfe-emitir` — intactas.
- RPCs: `criar_consulta_pos_pagamento`, `creditar_saldo_consulta`, `financeiro_pagamento_confirmar/cancelar`, `relatorios_financeiro`, `audit_saques_medicos` — intactas.
- UI: `AdminFinanceiroCentral`, `AdminPreviaRepasse`, `AdminSaquesMedicos`, `AdminRelatorioFinanceiro`, `MedicoFinanceiro`, `SecretariaFinanceiro` — intactas.
- Feegow, IA Auditora, Stripe produção, PIX, split — não tocados.

**Rollback:**
1. As 4 tabelas novas + MV + funções + backfill_log podem ser dropadas em uma migration única — nada externo depende delas.
2. Como nenhum código de produção chama o ledger nesta frente, drop é seguro a qualquer momento.
3. O backfill_log preserva o histórico do que foi tentado mesmo após drop, se exportado antes.

---

### Memória a atualizar (no fim da frente)

Adicionar `mem://features/financeiro-ledger-base.md` (`type: feature`) descrevendo as 4 tabelas, as funções canônicas e a regra "todo movimento via `fn_registrar_movimento_idempotente`". Adicionar linha no Core: "Financeiro = snapshot imutável + ledger append-only paralelo. Saldo real via `fn_medico_saldo_real`, nunca somar tabelas legadas direto."

---

### O que vem depois (NÃO nesta frente, só registrado)

- **Frente 2:** plugar webhooks/RPCs existentes em `fn_registrar_movimento_idempotente` sem mudar comportamento aparente.
- **Frente 3:** liberação D+X automática + cron de reconciliação + processador de outbox.
- **Frente 4:** UI Admin/Médico/Empresa.
- **Frente 5:** antifraude determinístico + integração com IA Auditora.
