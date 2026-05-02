
# Detalhes do Contrato B2B

Nova página `/app/admin/contrato-b2b/:id` acessível a partir da Gestão B2B, exibindo informações completas de um contrato específico.

---

## O que será construído

### 1. Página `AdminContratoDetalhes.tsx`

**Cabeçalho**: Nome da empresa, status do contrato (badge colorido), botão voltar.

**Seção "Dados do Contrato"**:
- Modelo financeiro, valor mensal/por consulta/por colaborador
- Datas de início, fim e renovação
- Limite de consultas/mês, plano vinculado
- Observações

**Seção "Regras de Uso do Plano"**:
- Limite de consultas por mês vs. uso atual (barra de progresso)
- Quantidade de funcionários vinculados
- Modelo financeiro explicado em texto legível
- Se existe plano vinculado, exibir nome e detalhes

**Seção "Alertas"**:
- Contrato vencendo em menos de 30 dias (alerta amarelo)
- Contrato vencido (alerta vermelho)
- Uso acima do limite de consultas (alerta vermelho)
- Contrato suspenso/encerrado (alerta cinza)

**Seção "Histórico de Alterações"**:
- Consulta `empresas_auditoria` filtrando pelo `empresa_id` do contrato
- Timeline com: data, ação, campo alterado, valor anterior -> valor novo, motivo, observação
- Ordenado do mais recente ao mais antigo

### 2. Rota e Navegação

- Rota em `App.tsx`: `/app/admin/contrato-b2b/:id` com permissão `empresas.ver`
- Breadcrumb: Admin > Empresas > Gestão B2B > Detalhes do Contrato
- Link "Ver detalhes" na tabela de contratos do `AdminGestaoB2B.tsx` apontando para a nova página

### 3. Dados utilizados (sem migrações)

- `empresas_contratos` (join com `empresas` e `planos`)
- `empresas_auditoria` (histórico)
- `empresas_funcionarios` (contagem de funcionários ativos)

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/app/admin/AdminContratoDetalhes.tsx` |
| Editar | `src/App.tsx` (rota) |
| Editar | `src/components/AppBreadcrumb.tsx` (breadcrumb) |
| Editar | `src/pages/app/admin/AdminGestaoB2B.tsx` (link para detalhes) |
