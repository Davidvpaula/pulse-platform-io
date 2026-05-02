
# CHECKUP COMPLETO: Seguranca & Acessos

---

## A) O que esta funcionando (REAL)

| Componente | Status | Detalhes |
|---|---|---|
| **Rotas** | OK | 6 rotas registradas: `permissoes`, `permissoes/log`, `sessoes`, `seguranca`, `impersonar`, `treinamentos` |
| **Guards de rota** | OK | Todas protegidas por `<G perm="colaboradores.alterar_permissoes">` |
| **Menu lateral** | OK | Grupo "Seguranca & Acessos" com 5 itens no `profiles.ts`, protegido por `requiresCapability` |
| **Breadcrumbs** | OK | Mapeados corretamente em `AppBreadcrumb.tsx` para todas as sub-rotas |
| **Permissoes (Colaboradores)** | OK | Lista colaboradores reais do banco, filtros por funcao/status, drawer de permissoes individual |
| **Permissoes (Funcao/Perfil)** | OK | `MatrizPermissoes` carrega `permissions_catalog` + `function_permissions`/`permissoes_perfil`, toggle funciona |
| **Log de permissoes** | OK | Paginacao, filtros por escopo/acao/periodo, exportacao CSV, detalhe JSON com diff antes/depois |
| **Sessoes ativas** | OK | Lista `user_sessions` reais com busca, mostra/esconde revogadas, botao revogar |
| **Impersonar** | OK | RPC `impersonation_iniciar` com validacoes (admin-only, nao pode admin alvo, motivo min 8 chars), log completo, banner de sessao ativa, expiracao 60min |
| **Seguranca (Politica de senha)** | OK | Tabela `password_policy` populada (id=1), CRUD real, HIBP toggle, complexidade |
| **Login attempts** | OK | Tabela `login_attempts` populada (13 registros), listagem real |
| **RLS** | OK | Todas as 7 tabelas com RLS habilitado. Policies admin-only para escrita, leitura restrita |
| **RPCs** | OK | 5 RPCs `SECURITY DEFINER`: `session_revoke`, `permissoes_dashboard`, `impersonation_iniciar/finalizar/listar_alvos` |
| **KPIs do dashboard** | OK | RPC `permissoes_dashboard` retorna contadores reais de colaboradores, permissoes, alteracoes 24h |

---

## B) O que esta quebrado / Bugs

| # | Bug | Severidade | Detalhes |
|---|---|---|---|
| B1 | **`session_revoke` RLS bypass** | Media | A RPC e `SECURITY DEFINER` e ja valida admin internamente, entao funciona. Porem a policy de UPDATE na tabela `user_sessions` so permite `user_id = auth.uid()`, ou seja um update direto (sem RPC) por admin falharia. Nao e critico pois o admin usa a RPC, mas e inconsistente. |
| B2 | **`ip_address` sempre NULL** | Baixa | Nos `login_attempts`, o campo `ip_address` e sempre NULL. O frontend nao consegue capturar IP real (precisa de edge function ou header do servidor). Dado visivel mas sem utilidade pratica. |
| B3 | **Nenhum registro em `permission_audit_logs`** | Media | A tabela tem 0 registros. O tab "Historico" na pagina Permissoes e a pagina "Log de permissoes" estao vazios. Possivel que o trigger/insert de auditoria nao esteja sendo executado ao alterar permissoes na `MatrizPermissoes`. |

---

## C) O que esta duplicado ou mal estruturado

| # | Item | Detalhes |
|---|---|---|
| C1 | **Naming inconsistente** | A rota `/admin/seguranca` e chamada "Alertas de seguranca" no menu/breadcrumbs, mas o componente `AdminSeguranca` e na verdade "Politica de Senhas + Tentativas de Login". Nao ha alertas de seguranca reais (ex: login suspeito, brute force detectado). |
| C2 | **Colaboradores carregados 2x** | `Permissoes.tsx` busca colaboradores da tabela. `AdminSessoes.tsx` busca colaboradores novamente para enriquecer sessoes com nomes. Poderia usar um hook compartilhado. Impacto baixo. |
| C3 | **Treinamentos na area errada** | A rota `/admin/treinamentos` esta dentro do grupo "Seguranca & Acessos" no `App.tsx` (mesmo guard), mas conceitualmente nao e seguranca. Talvez intencional para manter a permissao `colaboradores.alterar_permissoes`. |

---

## D) O que esta mockado / simulado

| # | Item | Status | Detalhes |
|---|---|---|---|
| D1 | **HIBP (Have I Been Pwned)** | SIMULADO | O toggle existe e salva no banco, mas nao ha edge function que verifique a API HIBP no momento do cadastro/troca de senha. E apenas uma flag armazenada. |
| D2 | **Expiracao de senha** | SIMULADO | O campo `expiration_days` e salvo mas nao ha logica que force troca de senha apos X dias. Precisaria de um middleware/hook no login. |
| D3 | **Complexidade de senha** | SIMULADO | O toggle `require_complexity` e salvo mas a validacao real de maiuscula+numero+simbolo nao esta implementada no fluxo de cadastro/troca. |
| D4 | **Bloqueio por 5 tentativas** | SIMULADO | O texto diz "5 tentativas falhas em 15 min bloqueiam", mas nao ha trigger/RPC que bloqueie. A tabela `login_attempts` registra, mas nenhuma logica impede login apos N falhas. |
| D5 | **Alertas de seguranca** | NAO EXISTE | O menu diz "Alertas de seguranca" mas a pagina exibida e politica de senhas. Nao existe sistema de alertas (login de novo dispositivo, brute force, geolocalizacao anomala). |

---

## E) O que falta implementar

| # | Item | Prioridade | Detalhes |
|---|---|---|---|
| E1 | **Auditoria de permissoes real** | Alta | O `MatrizPermissoes` altera permissoes mas nao insere em `permission_audit_logs`. Precisa adicionar INSERT na funcao `toggle()`. |
| E2 | **Validacao real de senha** | Media | Implementar edge function ou hook que consulte `password_policy` e valide complexidade/HIBP no signup e password reset. |
| E3 | **Rate limiting de login** | Media | Implementar logica de bloqueio apos N tentativas falhas usando `login_attempts`. |
| E4 | **Alertas de seguranca reais** | Media | Criar tabela `security_alerts` + logica para detectar logins suspeitos, novos dispositivos, brute force. |
| E5 | **Captura de IP real** | Baixa | Mover registro de `login_attempts` para edge function que tenha acesso aos headers HTTP. |
| E6 | **Expirar sessoes por inatividade** | Baixa | Adicionar job/trigger que revogue sessoes com `last_seen_at` antigo. |

---

## F) Melhorias de UX/UI

| # | Melhoria | Detalhes |
|---|---|---|
| F1 | Renomear "Alertas de seguranca" para "Politica de senhas" no menu/breadcrumbs, ou criar pagina real de alertas. |
| F2 | Na pagina `AdminSeguranca`, adicionar indicadores visuais de que HIBP/complexidade/expiracao sao "configuracoes futuras" enquanto nao ha enforcement real. |
| F3 | No `AdminSessoes`, adicionar botao "Revogar todas" para emergencias. |
| F4 | No `Permissoes`, o KPI "Alteracoes 24h" esta sempre 0 (bug E1). Quando corrigido, ficara util. |
| F5 | Na listagem de `login_attempts`, adicionar filtro por data e por resultado (sucesso/falha). |

---

## G) Riscos tecnicos ou de seguranca

| # | Risco | Severidade | Detalhes |
|---|---|---|---|
| G1 | **Sem enforcement de politica de senha** | Media | Admin configura regras, mas nada as aplica. Usuario pode ter senha "123456". |
| G2 | **Sem rate limiting** | Media | Nao ha bloqueio por brute force. Tentativas ilimitadas. |
| G3 | **Impersonacao salva em sessionStorage** | Baixa | Se o admin abrir DevTools, pode manipular o estado de impersonacao. Mitigado pelo fato de RLS continuar sendo admin (nao ha escalacao de privilegio real). |
| G4 | **`login_attempts` sem INSERT policy** | Info | Nao ha INSERT policy para `login_attempts`. Se o registro e feito via trigger em `auth` (SECURITY DEFINER), esta OK. Caso contrario, o registro pode falhar silenciosamente. |

---

## H) Plano de acao em etapas (priorizado)

### Etapa 1 — Correcoes criticas (Auditoria + Naming)
- Adicionar INSERT em `permission_audit_logs` no `MatrizPermissoes` e `ColaboradorPermissoesDrawer` ao alterar permissoes
- Renomear "Alertas de seguranca" para "Politica de senhas" no menu (`profiles.ts`) e breadcrumbs

### Etapa 2 — Enforcement basico de senha
- Criar edge function `validate-password` que consulta `password_policy` e valida complexidade
- Integrar no fluxo de signup e troca de senha no frontend

### Etapa 3 — Rate limiting
- Criar RPC `check_login_blocked(email)` que conta falhas nos ultimos 15min
- Integrar no fluxo de login para bloquear apos 5 falhas

### Etapa 4 — Alertas de seguranca reais
- Criar tabela `security_alerts` (tipo, user_id, ip, detalhes, lida, created_at)
- Criar pagina real de alertas com deteccao de novo dispositivo e brute force
- Mover a rota `/admin/seguranca` para politica de senhas e criar nova rota para alertas

### Etapa 5 — Melhorias de UX
- Adicionar "Revogar todas" no AdminSessoes
- Filtros de data na listagem de login_attempts
- Badges indicando funcionalidades simuladas vs ativas

---

**Diga "etapa 1" para comecar pelas correcoes criticas, ou indique outra etapa.**
