
# ETAPA 1 — Auditoria Real do Dashboard Admin

## Diagnóstico atual (dados reais coletados)

### 1. RPCs chamadas pelo Admin

| Status | Qtd | RPCs |
|--------|-----|------|
| **Existem no banco** | 14 | `admin_agendamentos_overview`, `admin_consulta_cancelar`, `admin_consulta_forcar_confirmacao`, `admin_consulta_marcar_realizada`, `admin_consulta_reenviar_link`, `forcar_status_consulta`, `security_generate_alerts`, `auditoria_listar`, `financeiro_pagamento_cancelar`, `financeiro_pagamento_confirmar`, `integracoes_dashboard`, `relatorios_financeiro`, `relatorios_financeiro_snapshot`, `alterar_status_conta_paciente` |
| **NÃO existem** | 26 | `admin_visao_geral`, `admin_empresas_overview`, `analytics_overview`, `analytics_trafego`, `analytics_conversao`, `analytics_financeiro`, `analytics_tempo_real`, `auditoria_dashboard`, `colaborador_alterar_status`, `colaborador_atualizar`, `colaborador_remover_permissao`, `colaborador_set_permissao`, `empresa_toggle_modulo`, `empresa_visao_geral`, `financeiro_central_dashboard`, `financeiro_reembolso_aprovar`, `financeiro_reembolso_recusar`, `financeiro_repasse_bloquear`, `financeiro_repasse_marcar_pago`, `impersonation_listar_alvos`, `event_reprocessar`, `plano_saude_financeira`, `relatorios_clinica`, `relatorios_executivo`, `session_revoke`, `permissoes_dashboard` |

### 2. Infraestrutura RBAC

As 3 funções críticas (`has_permission`, `has_permissions_batch`, `has_role`) **NÃO existem** no banco. Toda a UI de permissões (menus dinâmicos, `RequireRoutePermission`, `usePermissionsBatch`) faz chamadas que falham silenciosamente — o admin só "passa" porque o código JS faz bypass local.

### 3. Guards faltantes

4 rotas admin **não têm** `RequireRoutePermission`:
- `admin/dashboard`
- `admin/perfil`
- `admin/comunicacao-interna`
- `admin/faq`

### 4. Padrões problemáticos

- **0 páginas** usam React Query — todas usam `useEffect` + `useState` manual (sem cache, retry, stale, dedup).
- **30+ usos de `as any`** — indicando tipos desconhecidos ou RPCs não no schema.
- **0 mock/localStorage** no Admin (bom sinal).

---

## Plano de execução (5 blocos)

### Bloco A — Criar as 26 RPCs faltantes no banco

Criar via migrations SQL, divididas em sub-grupos:

1. **RBAC (3)**: `has_permission`, `has_permissions_batch`, `has_role`
2. **Dashboard/Visão geral (2)**: `admin_visao_geral`, `admin_empresas_overview`
3. **Analytics (5)**: `analytics_overview`, `analytics_trafego`, `analytics_conversao`, `analytics_financeiro`, `analytics_tempo_real`
4. **Colaboradores (4)**: `colaborador_alterar_status`, `colaborador_atualizar`, `colaborador_remover_permissao`, `colaborador_set_permissao`
5. **Financeiro (6)**: `financeiro_central_dashboard`, `financeiro_reembolso_aprovar`, `financeiro_reembolso_recusar`, `financeiro_repasse_bloquear`, `financeiro_repasse_marcar_pago`, `plano_saude_financeira`
6. **Empresas (2)**: `empresa_toggle_modulo`, `empresa_visao_geral`
7. **Sessões/Impersonação (3)**: `session_revoke`, `impersonation_listar_alvos`, `permissoes_dashboard`
8. **Auditoria/Relatórios (3)**: `auditoria_dashboard`, `relatorios_clinica`, `relatorios_executivo`
9. **Integrações (1)**: `event_reprocessar`

Cada RPC terá `SECURITY DEFINER` + validação de admin via `has_role`.

### Bloco B — Corrigir guards e RBAC

- Adicionar `RequireRoutePermission` às 4 rotas desprotegidas.
- Remover os `as any` nas chamadas RPC (após criação das RPCs, os tipos serão gerados automaticamente).

### Bloco C — Eliminar dead code

- Remover referência a `criar_consulta_com_reserva` em `src/lib/clinico.ts`.
- Corrigir import `corsHeaders` no edge function `recalcular-ranking`.
- Limpar imports não utilizados.

### Bloco D — Padronizar data-fetching

- Onde fizer sentido (páginas principais como Dashboard, Agendamentos, Financeiro), migrar de `useEffect` manual para React Query (`useQuery`/`useMutation`) com:
  - `staleTime` adequado
  - `retry` configurado
  - loading/error states consistentes

### Bloco E — Relatório final

Gerar relatório PDF/Markdown com:
- Mapa completo RPC x Página
- Status de cada página (funcional / parcial / quebrada)
- Lista de correções aplicadas
- Cobertura de guards
- Recomendações para Etapa 2

---

## Detalhes técnicos

- As 26 RPCs serão criadas em **3-4 migrations** agrupadas por domínio para manter o histórico organizado.
- Cada RPC retorna JSON tipado. As que são de leitura usam `SECURITY DEFINER` + check `has_role(auth.uid(), 'admin')`. As de escrita validam permissões granulares quando aplicável.
- A migration do RBAC (has_permission/has_role/has_permissions_batch) é a **primeira** a ser executada, pois as demais dependem dela.
- O Bloco D (React Query) será feito incrementalmente, priorizando as 5 páginas mais usadas.

## Ordem de execução

1. Bloco A (RBAC) → aprovação → Bloco A (restante das RPCs)
2. Bloco B (guards)
3. Bloco C (dead code)
4. Bloco D (React Query — páginas principais)
5. Bloco E (relatório)

Estimativa: a etapa toda envolve ~4 migrations e edições em ~15 arquivos frontend.
