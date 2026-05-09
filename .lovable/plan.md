# Plano de Estabilização — Stripe + Google Meet + Auditoria Operacional

## 🔥 Hipótese principal (nova) — provável causa raiz

A tela "Finalize sua configuração (1 pendência) — Link da sala virtual configurado" indica que o **validador de prontidão do médico** continua tratando o perfil como "incompleto" mesmo quando:
- `tipo_sala = 'dinamico'`
- Google Calendar conectado (`medico_google_tokens` presente)
- `dranagilalasmar@gmail.com` autenticado

Provavelmente o validador exige `link_sala_padrao IS NOT NULL` independente de `tipo_sala`. Consequências em cascata:
1. Trigger / RPC pode estar bloqueando criação de slot/consulta online → status fica `aguardando_pagamento` mas algo no pós-pagamento falha silenciosamente.
2. `google-calendar-sync` pode estar entrando no ramo "fixo + sem link_padrao" → grava nada → `link_sala` permanece NULL.
3. UI do médico mostra pendência → impressão de que o sistema está incompleto.

**Antes de qualquer outra mudança da Fase 1, validar essa hipótese.** Se confirmada, virá um ajuste cirúrgico em duas camadas:
- Validador de prontidão (`completion`/`onboarding`): aceitar `(tipo_sala = 'dinamico' AND medico_google_tokens existe)` OU `(tipo_sala = 'fixo' AND link_sala_padrao NOT NULL)`.
- `google-calendar-sync`: o ramo `dinamico` já existe, mas confirmar que não cai no fallback `fixo` por nenhum motivo (default da coluna, valor antigo, etc.).

**Sem alterar schema nem RPC fora desse ajuste de validação.**

---

## Objetivo geral
Estabilizar o fluxo Paciente agenda → paga → consulta nasce → Google Meet criado automaticamente → paciente entra → médico inicia sem fricção.

## Diretrizes globais
- Ler integralmente os arquivos de cada fase antes de mexer.
- Não assumir comportamento, não criar mocks ocultos, não remover logs.
- Falha do Google nunca quebra pagamento/agendamento.
- `consultas.link_sala` é a fonte única de verdade da sala.
- Toda automação crítica precisa de fallback + log auditável.

## Fora de escopo (global)
- Não mexer em `google-create-meet`.
- Não alterar schema nem RPC `criar_consulta_pos_pagamento`.
- Não migrar Stripe para live.
- Não criar features paralelas nem reescrever arquitetura.

---

## FASE 1 — Stripe sandbox + validação de prontidão do médico (Meet dinâmico)

**Objetivos**
1. Confirmar a **hipótese principal** acima e corrigir o validador de prontidão para reconhecer `tipo_sala = 'dinamico'` + Google conectado.
2. Garantir que todo checkout passa pelo Stripe sandbox gerenciado e o webhook está saudável + logs estruturados.

**Leitura obrigatória**
- `supabase/functions/_shared/stripe.ts`
- `supabase/functions/criar-checkout-stripe/index.ts`
- `supabase/functions/criar-checkout-plano/index.ts`
- `supabase/functions/criar-checkout-premium/index.ts`
- `supabase/functions/payments-webhook/index.ts`
- `supabase/config.toml`
- `src/lib/stripe.ts`, `src/lib/pagamentos.ts`
- **Específico da hipótese:** componentes da tela "Finalize sua configuração" no dashboard do médico (`MedicoDashboard.tsx` + cards de pendência), `MedicoGuard.tsx`, qualquer hook/lib de "completude do médico", trigger do Postgres que bloqueia slot online sem `link_sala_padrao`.

**Investigação da hipótese (antes de mudar código)**
- SQL: `select id, nome, tipo_sala, link_sala_padrao from medicos where id = :nagila`.
- SQL: `select count(*) from medico_google_tokens where medico_id = :nagila`.
- Encontrar onde a tela calcula a pendência "Link da sala virtual" e confirmar a regra atual.
- Encontrar o trigger que bloqueia inserção de slot online; ver se aceita `tipo_sala = 'dinamico'`.

**Ações Stripe**
1. Validar secrets: `STRIPE_SANDBOX_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `LOVABLE_API_KEY`.
2. Confirmar `verify_jwt = false` para `payments-webhook` e `?env=sandbox`.
3. Confirmar uso uniforme de `createStripeClient(env)`.
4. Adicionar logs estruturados no webhook (`event.type`, `pagamento_id`, `consulta_id`, retornos).

**Ações validação prontidão (se hipótese confirmada)**
- Ajustar o cálculo da pendência: pendência só persiste se (`tipo_sala = 'fixo'` E `link_sala_padrao IS NULL`) OU (`tipo_sala = 'dinamico'` E sem token Google).
- Se houver trigger DB equivalente, criar migração mínima para o mesmo critério.

**Testes mecânicos**
- Tela do médico para de exibir "1 pendência" para a Dra. Nágila.
- Checkout sandbox `4242 4242 4242 4242` → webhook recebe → consulta criada → `confirmada`.
- Nenhuma chamada direta a `api.stripe.com`.

---

## FASE 2 — Google Meet automático (sem clique do médico)

**Objetivo:** consulta online nasce com evento Google Calendar + Meet + `link_sala` preenchido logo após o pagamento.

**Leitura obrigatória**
- `supabase/functions/google-calendar-sync/index.ts`
- `supabase/functions/payments-webhook/index.ts`
- `supabase/functions/google-oauth/index.ts`
- `src/pages/app/medico/MedicoGoogleCallback.tsx`
- `src/pages/app/medico/MedicoConsultas.tsx`

**Diagnóstico**
`payments-webhook` chama `supabase.functions.invoke()` que não envia o bearer service-role esperado pelo `google-calendar-sync`. Sync falha silencioso; Meet só nasce no fallback do médico.

**Ações**
1. Trocar `supabase.functions.invoke()` por `fetch()` explícito para `${SUPABASE_URL}/functions/v1/google-calendar-sync` com `Authorization: Bearer <SERVICE_ROLE>` e `apikey: <SERVICE_ROLE>`. Logar status + body.
2. Adicionar logs em `google-calendar-sync`: `isInternal`, `medico_id`, `tipo_sala`, presença de token, status HTTP Google, `meetLink` extraído.
3. Validar via SQL `tipo_sala`, `link_sala_padrao`, refresh token Google do médico de teste.
4. Garantir `conferenceData.createRequest` + `?conferenceDataVersion=1` + escrita em `consultas.link_sala`.

**Resultado esperado:** após pagamento, `link_sala` preenchido em <5s, paciente vê "Entrar", médico clica "Iniciar" e Meet abre direto.

---

## FASE 3 — Auditoria de rotas

**Objetivo:** zero rota quebrada, menu órfão ou guard inconsistente.

**Leitura obrigatória:** `App.tsx`, `ProtectedRoute.tsx`, `MedicoGuard.tsx`, `PacienteGuard.tsx`, `EmpresaGuard.tsx`, `RequireRoutePermission.tsx`, `menuCatalog.ts`, `scripts/validate-routes.mjs`.

**Ações:** rodar `node scripts/validate-routes.mjs --strict`, `vitest run routes-validation`, cruzar menu × rota × guard × render, conferir redirect `secretaria → colaborador`.

**Teste mecânico:** tabela `rota | perfil | guard | renderiza | menu` sem células vermelhas.

---

## FASE 4 — Auditoria de botões críticos

**Leitura:** `AgendamentoConfirmar.tsx`, `MedicoConsultas.tsx`, `FinalizarAtendimentoDialog.tsx`, dialogs de secretaria.

**Botões**
- **Paciente:** Pagar, Entrar na consulta, Remarcar, Cancelar, Pagamentos.
- **Médico:** Iniciar, Continuar, Finalizar, WhatsApp, Histórico, Abrir externo.
- **Colaborador:** Novo agendamento, Trocar médico, Aplicar cupom.

**Para cada:** renderiza? estado correto? clique chama função certa? toast correto? pós-estado correto?

---

## FASE 5 — Estabilização e regressão

1. **Testes Deno** em `google-calendar-sync`: chamada interna service-role, médico sem token, médico `dinamico`, médico `fixo`.
2. **Vitest** em `MedicoConsultas`: botão iniciar com link / sem link / fallback. Adicionar teste do validador de prontidão (regra `dinamico` + Google).
3. **Deploy** de `payments-webhook` e `google-calendar-sync`.
4. **Smoke test E2E manual:** paciente novo → agenda → paga → recebe link → médico inicia → finaliza → financeiro atualizado.

---

## Critério final de pronto
- Tela do médico **sem** pendência falsa de "Link da sala virtual" para médicos com Google conectado em modo dinâmico.
- `consultas.link_sala` preenchido em <5s após pagamento, sem clique do médico.
- Zero erro nos logs de `payments-webhook` e `google-calendar-sync`.
- Todos testes verdes; rotas e botões 100% auditados.
- Google Meet abrindo instantaneamente no botão Iniciar.
