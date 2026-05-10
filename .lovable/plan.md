# Fase de Correção Priorizada

Execução em 6 etapas **isoladas e sequenciais**. Cada etapa termina com build limpo, rotas renderizando, RBAC intacto e findings documentados antes de avançar.

## Regras transversais (válidas em todas as etapas)

- Não criar arquitetura paralela, novos mocks, nem reintroduzir `hasCapability`.
- Não tocar em `src/integrations/supabase/{client,types}.ts` nem em `supabase/config.toml` (project-level).
- Toda mudança de schema vai por `supabase--migration`; toda mudança de dados por `supabase--insert`.
- Ao corrigir um RPC, também alinhar **todos** os call-sites no frontend (busca por `rg`).
- Validação final de cada etapa: `npm`/vitest passando + smoke nas rotas tocadas (browser tool) + ausência de erros novos no console.

---

## ETAPA 1 — Sweep Arquitetural Feegow

**Escopo:** remover Feegow como sistema operacional; manter apenas como provider clínico externo + deep-link.

1. **`/admin/fluxo`** (`FluxoOperacional.tsx`) — reescrever:
   - Remover `fluxoEmpresa` storyline com nodes `Database/Feegow sincronizado/Envio para Feegow`.
   - Substituir KPI "Pacientes em sincronização" por KPI operacional interno (ex.: "Pacientes novos hoje", "Agendamentos pendentes confirmação").
   - Novo storyline: `Cadastro → Agenda → Atendimento → Documentos → Financeiro → Comunicação` com **deep-link clínico opcional** ao final (usando `AbrirNaFeegowButton`).
2. **`/admin/pacientes`** — remover filtros `Sincronizado Feegow` / `Pendente Feegow` e qualquer badge operacional Feegow. Manter apenas status internos e, no detalhe, o botão deep-link.
3. **`/admin/feegow/schema`** (`FeegowSchema.tsx`) — adicionar `AdminLoading` / `AdminError` / `AdminEmpty` no carregamento dos endpoints, eliminando tela branca.
4. **Varredura `rg`** por strings: `"Feegow sincroniz"`, `"aguardando Feegow"`, `"pronto para Feegow"`, `"sync Feegow"` em `src/pages/app/admin/**` e `src/components/admin/**` — remover ocorrências operacionais remanescentes.

**Saída:** Feegow some do fluxo operacional; permanece só em deep-link e na tela de schema (informativa).

---

## ETAPA 2 — RPCs e Backend

**Escopo:** eliminar drift entre frontend, RPCs e schema. **Nenhuma mudança visual.**

1. **`auditoria_listar`** — consolidar em uma única assinatura: `(p_busca text, p_revisado bool, p_limit int, p_offset int)`. Migration drop dos overloads antigos; atualizar `AdminAuditoria.tsx`.
2. **Financeiro** — investigar e recriar (se ausente) `financeiro_central_dashboard`; corrigir joins em `pagamentos`, `cobrancas_links`, `fechamentos_mensais`. Adicionar fallback visual via `AdminError` quando RPC falhar.
3. **`admin_agendamentos_overview`** — corrigir assinatura conforme call-site real do frontend.
4. **`has_permission`** — auditar todos call-sites (`rg "has_permission|hasPermission"`) e padronizar aridade `(p_user uuid, p_permission text)`.
5. **`ia_medico_scores`** — migration criando tabela + RLS; agendar cron horário 08–20 BRT chamando `ia-auditoria-medica` (via `supabase--insert` para não vazar URL/anon key em migration); rodar primeira execução manual.
6. **Médicos** — remover referência a coluna `ativo` inexistente; usar `status` / `aprovacao_status` conforme schema oficial. Corrigir `select` em `/admin/medicos`.

**Saída:** zero 400/404 nas rotas Admin críticas; IA Auditora com primeira leitura real.

---

## ETAPA 3 — Modelagem e Legado Conceitual

1. **Dependentes** em `/admin/pacientes`: badge "Dependente", agrupamento visual sob o responsável, regra de unicidade (CPF/telefone) com indicador de duplicado.
2. **Atendimento Imediato**: unificar para `tipo=pronto_atendimento` em todos os pontos (porta pública, painel, métricas). Migration de backfill se houver registros com `tipo=consulta` na fila PA.
3. **Colaboradores**: remover filtro "Secretaria" e qualquer chip remanescente do perfil legado.

**Saída:** modelo conceitual coerente com as memories de unificação e PA.

---

## ETAPA 4 — UX Operacional e Observabilidade

1. **`/admin/sessoes`** — estender RPC para retornar `email`, `ip`, `user_agent`; mascarar IP parcialmente (`200.x.x.45`) por padrão LGPD.
2. **`/admin/noc`** — popular `lastUpdated` no `onSuccess` da query principal; exibir timestamp relativo + absoluto.
3. **Estados degradados** — aplicar `AdminLoading`/`AdminError`/`AdminEmpty` consistentemente em: dashboards financeiros, integrações, auditoria, IA Auditora, NOC, observabilidade.

**Saída:** zero tela branca / loader infinito nas rotas Admin testadas.

---

## ETAPA 5 — Padronização, Rotas e Cosmético

1. **Comunicação**: escolher canônica `/comunicacao/*` (já é o prefixo real). Remover/redirecionar variantes `/admin/comunicacao/*` em sidebar e links internos.
2. **IA Avatar**: padronizar slug `/comunicacao/ia-avatar` (ou `/ia`, decidir 1) em menu, rota e label.
3. **Redirects**: adicionar `/admin/permissoes-log` → `/admin/permissoes/log` em `App.tsx`.
4. **Permissions catalog**: migration adicionando `comunicacao.metricas.operacionais`.
5. **Sandbox**: garantir banner SANDBOX visível enquanto `wa-providers` retornar `mock_sent`.

**Saída:** zero warnings de `validateMenuKeys`, rotas previsíveis.

---

## ETAPA 6 — Validação Final Pós-Correção

Re-executar **teste mecânico** nos 3 perfis (Admin, Médico, Paciente) cobrindo:

- Rotas protegidas + RBAC granular (`has_permission`).
- Financeiro (KPIs reais, sem mascaramento).
- Integrações (deep-link Feegow, WhatsApp sandbox, Stripe sandbox).
- IA Auditora (scores populados).
- Observabilidade (stream + alertas).
- Sidebar ≡ `App.tsx` ≡ `menuCatalog`.

Critérios de aceite finais:

- 0 RPC 400/404 crítico
- 0 tela branca / loader infinito
- 0 referência operacional Feegow fora de deep-link
- 0 warning `validateMenuKeys`
- Build verde, vitest verde, console limpo

---

## Detalhes técnicos (referência rápida)

**Arquivos-âncora por etapa:**

```text
E1: src/pages/app/admin/FluxoOperacional.tsx
    src/pages/app/admin/AdminPacientes.tsx
    src/pages/app/admin/FeegowSchema.tsx
E2: supabase/migrations (auditoria_listar, ia_medico_scores)
    src/pages/app/admin/AdminAuditoria.tsx
    src/lib/admin/queries.ts
    src/lib/permissions/usePermission.ts
E3: src/pages/app/admin/AdminPacientes.tsx
    src/pages/public/AtendimentoImediato.tsx
    src/pages/app/admin/AdminColaboradores.tsx
E4: src/pages/app/admin/AdminSessoes.tsx
    src/pages/app/admin/AdminNoc.tsx
    src/components/admin/AdminStates.tsx (já existe — apenas aplicar)
E5: src/App.tsx
    src/lib/menu/menuCatalog.ts
    migration permissions_catalog
```

**Ordem de migrations (E2 + E3 + E5):**
1. `auditoria_listar` consolidação
2. `ia_medico_scores` criação + RLS
3. `permissions_catalog` insert da chave faltante
4. (E3) backfill `pronto_atendimento` se necessário

**Cron IA Auditora** vai por `supabase--insert` (contém URL + anon key — não pode entrar em migration versionada).

**Sem mudanças** em: `client.ts`, `types.ts`, `config.toml` (exceto se houver função nova com config específica), arquitetura de auth, Stripe webhook.
