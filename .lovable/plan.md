
## Plano: 7 itens pendentes do sistema de saques médicos

### 1. Permissões nos Role Templates
Adicionar 7 novas permissões ao `roleTemplates.ts`:
- `financeiro.saques_ver` / `financeiro.saques_aprovar` / `financeiro.saques_recusar` / `financeiro.saques_marcar_pago`
- `financeiro.dados_bancarios_ver`
- `financeiro.saques_config`
- `financeiro.saques_solicitar_correcao`

Incluir nos templates "Financeiro" e "Gestor Operacional".

### 2. Guards de permissão no Admin
Envolver botões de ação em `AdminSaquesMedicos.tsx` com `<RequirePermission>`:
- Aprovar: `financeiro.saques_aprovar`
- Recusar: `financeiro.saques_recusar`
- Marcar pago: `financeiro.saques_marcar_pago`
- Ver dados bancários (sheet): `financeiro.dados_bancarios_ver`
- Configurar regras: `financeiro.saques_config`

### 3. Seção "Documentos Fiscais" standalone para médico
Criar `src/components/medico/MedicoDocumentosFiscais.tsx` — lista NFes do médico (independente de saque), com upload avulso. Adicionar como nova aba "Documentos Fiscais" em `MedicoPerfil.tsx`.

### 4. Auditoria de alterações de configuração
Na função `salvarConfig` de `AdminSaquesMedicos.tsx`, após gravar, inserir registro em `financeiro_auditoria` com `tipo = 'config_saque'` e os valores antes/depois.

### 5. Metadados periodo_inicio / periodo_fim
No `SolicitarSaqueDialog.tsx`, ao criar o saque, calcular `periodo_inicio` (menor `data_consulta` dos itens selecionados) e `periodo_fim` (maior `data_consulta`), e incluir no insert.

### 6. Fluxo "Solicitar correção" no Admin
Adicionar status `correcao_solicitada` ao enum via migration. No `AdminSaquesMedicos.tsx`, adicionar botão "Solicitar correção" (com motivo) para saques solicitados/em_analise. No `MedicoFinanceiro.tsx` / `SaqueHistorico.tsx`, exibir badge e motivo quando status = `correcao_solicitada`.

### 7. Ajuste RLS para dados pessoais do médico
Migration para adicionar policy permitindo UPDATE em `medico_dados_bancarios` quando o médico tem status `aprovado` (atualmente restrito a `pendente`/`reprovado`). Ajustar para `medico_enderecos` também.

---

### Detalhes técnicos

**Migration SQL** (1 migration):
- `ALTER TYPE saque_medico_status ADD VALUE 'correcao_solicitada'`
- DROP + CREATE das RLS policies de UPDATE em `medico_dados_bancarios` e `medico_enderecos` para incluir médicos aprovados

**Arquivos modificados:**
- `src/lib/permissions/roleTemplates.ts`
- `src/pages/app/admin/AdminSaquesMedicos.tsx`
- `src/components/medico/SolicitarSaqueDialog.tsx`
- `src/components/medico/SaqueHistorico.tsx`
- `src/pages/app/medico/MedicoPerfil.tsx`

**Arquivo criado:**
- `src/components/medico/MedicoDocumentosFiscais.tsx`
