
# Plano: Gestão de Pacientes (top-level) + Reembolso avulso + Checkup de rotas

## Diagnóstico atual

**Menu Admin** -- "Pacientes" está dentro de "Cadastros" como "Usuários/Pacientes". Conforme a imagem de referência, deveria ser um item top-level separado.

**Reembolso** -- A tabela `reembolsos` existe (colunas: id, consulta_id, pagamento_id, valor_centavos, status enum [solicitado, em_analise, aprovado, recusado, concluido], tipo [total, parcial], motivo, etc.). RPCs `financeiro_reembolso_aprovar` e `financeiro_reembolso_recusar` existem. Porém:
- Nao existe UI para **solicitar/criar** um reembolso avulso (admin/secretaria)
- O `PacientePerfil.tsx` mostra reembolsos em lista read-only mas sem botao de acao

**Auditoria de banimento** -- A RPC `alterar_status_conta_paciente` ja registra em `pacientes_auditoria`. Falta UI no `PacientePerfil` para ver timeline de mudancas de status (incluindo banimento) e falta o campo `bloqueado_ate` na aba de acoes.

**Rotas** -- `admin/pacientes/:id` existe e aponta para `PacientePerfil`. Rota da lista e `admin/usuarios`. Precisa harmonizar nomenclatura.

---

## Etapa 1 -- Reorganizar menu Admin

Alterar `src/lib/profiles.ts`:
- Remover "Usuarios/Pacientes" de dentro de "Cadastros"
- Criar item top-level "Pacientes" com submenu:
  - "Gestao de pacientes" -> `/app/admin/pacientes` (lista)
  - "Perfil do paciente" nao precisa de menu (acesso via lista)
- Manter "Cadastros" apenas com: Medicos, Colaboradores
- Ajustar "Empresas" ja existente como top-level (ja esta)
- Adicionar rota `/app/admin/pacientes` no `App.tsx` (redirect ou alias para AdminUsuarios)
- Atualizar breadcrumbs em `AppBreadcrumb.tsx`

## Etapa 2 -- Completar UI de reembolso avulso

Criar botao "Solicitar reembolso" no `PacientePerfil.tsx` (aba Financeiro), visivel com `RequirePermission perm="pacientes.reembolsar"`:
- Dialog com: selecao de consulta/pagamento, tipo (total/parcial), valor, motivo
- Insert na tabela `reembolsos` com status `solicitado`
- Tambem adicionar botao na `AdminFinanceiroCentral.tsx` para criar reembolso avulso

**Como funciona o reembolso de consulta avulsa:**
1. Admin/Secretaria abre o perfil do paciente -> aba Financeiro
2. Clica "Solicitar reembolso" -> seleciona o pagamento da consulta
3. Escolhe tipo (total/parcial), valor e motivo
4. O reembolso entra como `solicitado` na fila
5. Admin aprova via `AdminFinanceiroCentral` (RPCs ja existem)
6. Integracao com Stripe para estorno real sera feita na etapa de integracao final

## Etapa 3 -- Auditoria de banimento e acoes de status

No `PacientePerfil.tsx`:
- Adicionar botoes de acao de status (Suspender/Bloquear/Banir/Reativar) na aba principal, com dialog de motivo + campo `bloqueado_ate` para bloqueio temporario
- Usar RPC `alterar_status_conta_paciente` ja existente
- Garantir que a aba "Auditoria" mostra timeline completa incluindo acoes de banimento com badges coloridos

## Etapa 4 -- Checkup completo de rotas cruzadas

Verificar e corrigir:
- Links de `AdminUsuarios` -> `PacientePerfil` (ajustar para `/app/admin/pacientes/:id`)
- Links de `SecretariaPacientes` -> `PacientePerfil` (ja funciona)
- Links de `PacientePerfil` -> Financeiro (pagamentos, consultas)
- Links de `AdminFinanceiroCentral` -> paciente (click no nome abre perfil)
- Links de `AdminAgendamentos` -> paciente e medico
- Garantir navegacao bidirecional: Paciente <-> Financeiro <-> Agendamento <-> Medico
- Atualizar `scripts/validate-routes.mjs` se necessario

---

## Detalhes tecnicos

**Migrations**: Nenhuma necessaria -- tabela `reembolsos`, RPC de status e colunas `bloqueado_ate` ja existem.

**Permissoes**: `pacientes.reembolsar`, `pacientes.banir`, `pacientes.suspender` ja cadastradas em `AdminColaboradores.tsx`.

**Arquivos modificados**:
- `src/lib/profiles.ts` (menu)
- `src/App.tsx` (rotas)
- `src/components/AppBreadcrumb.tsx` (breadcrumbs)
- `src/pages/app/shared/PacientePerfil.tsx` (reembolso dialog + acoes de status)
- `src/pages/app/admin/AdminUsuarios.tsx` (links atualizados)
- `src/pages/app/admin/AdminFinanceiroCentral.tsx` (link para perfil paciente)
