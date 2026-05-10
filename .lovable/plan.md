
# Próxima Fase Oficial — Financeiro Estrutural + Observabilidade + QA Permanente

Diagnóstico técnico já confirmado em exploração:
- `pagamentos`: tem FK só para `consultas`. Faltam para `pacientes`, `medicos`, `empresas`, `servicos_financeiros`.
- `cobrancas_links`: tem FK só para `pagamentos`. Faltam para `pacientes`, `consultas`, `servicos_financeiros`.
- `fechamentos_mensais`: zero FKs. Falta para `medicos`.
- O frontend pede embeds (`paciente:pacientes(...)`, `medico:medicos(...)`, `medicos(nome)`) — sem FK declarada o PostgREST devolve 400.

Por isso a fase começa por uma migração estrutural curta antes de tocar no frontend.

---

## FRENTE F1 — Financeiro estrutural (P0)

### F1.1 Inventário de órfãos + migração de FKs
**Etapa A — inventário (read-only):** rodar SELECTs que listam linhas onde `paciente_id`, `medico_id`, `empresa_id`, `servico_id`, `consulta_id` apontam para registros inexistentes em cada uma das três tabelas. Exportar relatório CSV para `/mnt/documents/financeiro_orfaos_<timestamp>.csv`. Nenhum dado é alterado nessa etapa.

**Etapa B — saneamento mínimo (via `supabase--insert`):** apenas se houver órfãos, `UPDATE ... SET coluna = NULL WHERE coluna NOT IN (SELECT id FROM tabela_alvo)`. Nunca `DELETE`. Documentar contagem antes/depois.

**Etapa C — migração (via `supabase--migration`):**

| Tabela | Coluna | Referência | ON DELETE |
|---|---|---|---|
| `pagamentos` | `paciente_id` | `pacientes(id)` | SET NULL |
| `pagamentos` | `medico_id` | `medicos(id)` | SET NULL |
| `pagamentos` | `empresa_id` | `empresas(id)` | SET NULL |
| `pagamentos` | `servico_id` | `servicos_financeiros(id)` | SET NULL |
| `cobrancas_links` | `paciente_id` | `pacientes(id)` | SET NULL |
| `cobrancas_links` | `consulta_id` | `consultas(id)` | SET NULL |
| `cobrancas_links` | `servico_id` | `servicos_financeiros(id)` | SET NULL |
| `fechamentos_mensais` | `medico_id` | `medicos(id)` | RESTRICT |

Padrão: `ADD CONSTRAINT ... NOT VALID` → `VALIDATE CONSTRAINT` em statement separado, evitando lock longo. Criar índice b-tree em cada coluna FK.

**Plano de rollback documentado** no comentário da migration: `ALTER TABLE ... DROP CONSTRAINT ...; DROP INDEX ...;` por coluna.

### F1.2 Frontend — embeds explícitos
Arquivos: `AdminFinanceiroCentral.tsx`, `SecretariaFinanceiro.tsx`, `ConsultaPagamentos.tsx`, `NovaCobrancaDialog.tsx`, `lib/pagamentos.ts`.

- Migrar para sintaxe `alias:tabela!fk_name(colunas)` (ex.: `paciente:pacientes!pagamentos_paciente_id_fkey(id, nome_completo)`).
- Padronizar aliases (`paciente`, `medico`, `empresa`, `servico`, `consulta`).
- Remover qualquer `.catch(() => [])` ou fallback que zere KPI. Toda falha → `<AdminError>` + log estruturado + retry.

### F1.3 Hardening — `<FinanceiroErrorBoundary>`
- Novo componente `src/components/financeiro/FinanceiroErrorBoundary.tsx`.
- Aplicar por aba (Pagamentos, Repasses, Reembolsos, Cobranças, Ledger).
- Header KPIs lê **somente** de `financeiro_central_dashboard` (RPC consolidada). Falha de aba não derruba header nem outras abas.

### F1.4 Ledger e consistência
- Sweep via `rg` por somatórios diretos de `valor_liquido_centavos`, `consultas - saques`, etc. Substituir por `fn_medico_saldo_real`.
- Telemetria: detectar divergência {ledger × snapshot × saldo calculado × repasse}. Adicionar card "Divergências detectadas" em `AdminLedgerObservabilidade` lendo de uma view nova `vw_financeiro_divergencias` (SELECT-only, sem materialização).

### Critérios F1
- 0 erro 400 em `/admin/financeiro`, `/secretaria/financeiro`, `/medico/financeiro`.
- Joins resolvidos; KPIs reais; saldo via ledger; falha isolada por aba; nenhum mascaramento.

---

## FRENTE F2 — Polimento cosmético

| Item | Arquivo | Ação |
|---|---|---|
| String "integração Feegow" | `AdminUsuarios.tsx` (subtítulo) | Substituir por "Cadastro, vínculo e ações administrativas". |
| Footer "Snapshot atualizado em —" | `AdminNOC.tsx` | Reaproveitar `lastUpdated` do header; remover placeholder. |
| Sessões com Usuário/IP "—" | `AdminSessoes.tsx` | Badges contextuais: "Sessão sem perfil" / "Sessão legada" / "IP não capturado". |
| Endpoints Feegow 422 | `FeegowSchema.tsx` | Mapear 422 → label "Permissão pendente na instância (configuração externa)" + cor neutra. |
| Padronização Admin | sweep com `rg "Loader2|animate-spin"` em `src/pages/app/admin` | Garantir uso de `AdminLoading/AdminError/AdminEmpty`. |

---

## FRENTE F3 — Observabilidade & Auditoria avançada

### F3.1 NOC — novos painéis
- "Tempo médio de resposta" via `function_edge_logs.execution_time_ms` (24h).
- "Consultas em andamento" — `consultas WHERE status='em_andamento'`.
- "Filas operacionais" — `whatsapp_outbound_queue` pendente + `notificacoes` não lidas.
- "Falhas integração" — `whatsapp_outbound_logs status='failed'` + `feegow_call_logs status='error'` (24h).
- "Alertas financeiros" — `operacao_alertas WHERE categoria='financeiro'`.
- "Eventos críticos" — severidade alta/crítica últimas 2h.

### F3.2 Auditoria
- Filtro "Tipo de ator" (admin/médico/colaborador/sistema).
- Filtro "Categoria financeira" (saque/repasse/reembolso/pagamento).
- Exportar PDF do filtro corrente (`react-pdf`).
- Agrupamento por `correlation_id`.

### F3.3 IA Auditora — expansão de score
Adicionar dimensões: `retrabalho`, `atrasos`, `reclamações` (NPS<6 ou avaliação ≤2), `inconsistência financeira` (output do detector F3.4).

### F3.4 Detector financeiro IA
Edge function nova `noc-financeiro-detector` (cron horário 08-20 BRT) detectando:
- divergência snapshot × ledger × saldo
- repasse inconsistente
- saldo inválido (negativo sem operação que justifique)
- cobrança órfã (sem `paciente_id` válido)
- fechamento sem médico
Resultados gravados em `operacao_alertas` (categoria=`financeiro`, origem=`ia`).

---

## FRENTE F4 — QA permanente

### F4.1 Playwright E2E
- Setup `@playwright/test` + script `bunx playwright test`.
- Specs: `admin.spec.ts`, `medico.spec.ts`, `paciente.spec.ts`.
- Cada spec: login → 5 rotas críticas → asserts (`h1` presente, sem texto "Page not found", sem responses 400/404 em endpoints listados).

### F4.2 Smoke RPC — `scripts/smoke-rpc.ts`
Executa via supabase-js: `financeiro_central_dashboard`, `fn_noc_snapshot`, `auditoria_listar`, `has_permission`, `has_permissions_batch`, `fn_medico_saldo_real`, `session_heartbeat`. Exit code != 0 em qualquer falha.

### F4.3 Detector de drift — `scripts/check-routes.ts`
Cruza `App.tsx` × `menuCatalog.ts` × `permissions_catalog`. Reporta: rota sem menu, menu sem rota, rota sem guard, permission key ausente. P0 falha CI; P1/P2 warning.

### F4.4 Healthcheck financeiro automático
`scripts/healthcheck-financeiro.ts` (chamável manual + cron diário): valida saldo ledger × snapshots, pagamentos órfãos, cobranças órfãs, fechamento sem médico, divergência de repasse. Saída em JSON + grava resumo em `operacao_alertas`.

---

## Ordem de execução & gates

```text
F1.1 Etapa A (inventário)  → user revisa CSV de órfãos
       ↓
F1.1 Etapa B (saneamento)  → via supabase--insert
       ↓
F1.1 Etapa C (migração)    → via supabase--migration  ← user aprova
       ↓
F1.2 / F1.3 / F1.4 (frontend + hardening + ledger)
       ↓ GATE: build verde + 0 erro 400 financeiro + smoke RPC OK
F2 (polimento cosmético)
       ↓ GATE
F3 (NOC → Auditoria → IA → detector financeiro)
       ↓ GATE
F4 (Playwright + Smoke + Drift + Healthcheck)
```

**Gates obrigatórios entre frentes:** build verde, console limpo, smoke RPC OK, RBAC intacto, sem regressão visual, findings documentados.

---

## Regras transversais (mantidas)

- Sem `hasCapability`, sem mocks novos, sem mascaramento de erro, sem KPI artificial.
- Não tocar `client.ts`, `types.ts`, `config.toml` core, webhooks Stripe, arquitetura auth.
- Schema → `supabase--migration`. Dados → `supabase--insert`. RPC corrigida → atualizar todos os call-sites.
- Feegow permanece read-only/deep-link clínico.

---

## Resultado final esperado

Plataforma financeiramente íntegra, arquiteturalmente consistente, auditável, observável, antifraude preparada, com QA automatizado e pronta para escala operacional real.
