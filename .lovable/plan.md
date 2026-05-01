
# Perfil Médico Completo + Sistema de Saques

## Resumo

Criar estrutura completa de perfil profissional do médico com dados pessoais, endereço, dados bancários, sistema de solicitação de saque, e gestão de saques pelo admin. Tudo com RLS, auditoria e permissões.

---

## 1. Migração de banco de dados

### Novas tabelas

**`medico_enderecos`** — endereço residencial e comercial do médico
- `id`, `medico_id` (FK medicos), `tipo` (residencial/comercial), CEP, rua, numero, complemento, bairro, cidade, estado, `created_at`, `updated_at`

**`medico_dados_bancarios`** — dados bancários protegidos
- `id`, `medico_id`, `tipo_pessoa` (PF/PJ), `titular_nome`, `titular_documento` (CPF/CNPJ), `banco`, `agencia`, `conta`, `tipo_conta` (corrente/poupanca), `pix_tipo` (cpf/cnpj/email/telefone/aleatoria), `pix_chave`, `ativo` (boolean), `created_at`, `updated_at`

**`saques_medicos`** — solicitações de saque
- `id`, `medico_id`, `valor_centavos`, `status` (enum: solicitado/em_analise/aprovado/pago/recusado/cancelado), `metodo` (pix/ted), `dados_bancarios_id` (FK), `periodo_inicio`, `periodo_fim`, `solicitado_em`, `aprovado_em`, `pago_em`, `recusado_em`, `motivo_recusa`, `observacao`, `created_by`

**`saque_medico_itens`** — vínculo saque ↔ consultas_financeiro (impede saque duplicado)
- `id`, `saque_id` (FK), `consulta_financeiro_id` (FK, UNIQUE), `valor_medico_centavos`

**`medico_nfes`** — notas fiscais do médico
- `id`, `medico_id`, `saque_id` (FK nullable), `arquivo_url`, `numero_nota`, `valor_centavos`, `data_emissao`, `status` (pendente/validada/recusada), `observacao`, `created_at`

### Configurações via app_settings

Inserir chaves padrão:
- `financeiro.saque.frequencia` → `"quinzenal"`
- `financeiro.saque.dias_fechamento` → `[1, 15]`
- `financeiro.saque.prazo_liberacao_dias` → `7`
- `financeiro.saque.valor_minimo_centavos` → `5000`
- `financeiro.saque.exigir_nfe` → `false`
- `financeiro.saque.permitir_parcial` → `true`

### Novos campos na tabela `medicos` (já existentes: cpf, data_nascimento)

Nenhuma alteração necessária — CPF e data_nascimento já existem.

### RLS

- `medico_dados_bancarios`: médico vê/edita os próprios; admin vê todos (via `has_role`)
- `saques_medicos`: médico vê os próprios; admin vê todos
- `saque_medico_itens`: médico vê os próprios (via join saque); admin vê todos
- `medico_nfes`: médico vê/insere os próprios; admin vê todos
- `medico_enderecos`: médico vê/edita os próprios; admin vê todos

### Storage bucket

- Criar bucket `medico-nfes` (privado) com RLS para médico e admin

### Permissões (inserir no permissions_catalog)

Novas chaves:
- `financeiro.saques.ver`, `financeiro.saques.aprovar`, `financeiro.saques.marcar_pago`, `financeiro.saques.recusar`, `financeiro.saques.configurar`
- `financeiro.ver_dados_bancarios_medico`, `financeiro.nfe.ver`

### Trigger de auditoria

- Trigger em `medico_dados_bancarios` → insere em `financeiro_auditoria` ao alterar
- Trigger em `saques_medicos` → insere em `financeiro_auditoria` nas mudanças de status

---

## 2. Perfil do Médico — Reorganização da tela

**Arquivo:** `src/pages/app/medico/MedicoPerfil.tsx`

Reorganizar em 2 blocos com Tabs:

**Aba "Perfil Público"** (manter o que já existe):
- Nome, foto, bio, especialidade, CRM, prévia do site, link sala online

**Aba "Dados Pessoais"**:
- Nome completo, CPF (mascarado), data de nascimento, telefone, e-mail, CRM, UF CRM, especialidade, RQE
- Seção endereço residencial (consulta `medico_enderecos`)
- Checkbox "Endereço comercial diferente" → campos de endereço comercial

**Aba "Dados Bancários"**:
- Componente `MedicoDadosBancarios.tsx`
- Tipo recebedor, titular, documento (mascarado na exibição), banco, agência, conta, tipo conta, pix
- Aviso informativo, confirmação ao alterar, auditoria automática

---

## 3. Financeiro do Médico — Seção de Saque

**Arquivo:** `src/pages/app/medico/MedicoFinanceiro.tsx`

Adicionar nova seção após os KPIs existentes:

- Card "Saldo disponível para saque" com:
  - A receber (liberado)
  - Aguardando liberação
  - Saques solicitados (pendentes)
  - Último saque
  - Próxima data de liberação (calculada a partir de app_settings)

- Botão "Solicitar saque" → abre modal:
  - Valor disponível, campo valor, método (Pix/TED), dados bancários, upload NFe opcional, observação
  - Ao confirmar: cria `saques_medicos` + `saque_medico_itens` vinculando consultas liberadas

- Tabela "Histórico de saques" com status e detalhes

**Componentes novos:**
- `src/components/medico/SolicitarSaqueDialog.tsx`
- `src/components/medico/SaqueHistorico.tsx`

---

## 4. Admin — Saques Médicos

**Nova rota:** `/app/admin/financeiro/saques-medicos`
**Arquivo:** `src/pages/app/admin/AdminSaquesMedicos.tsx`

- Cards: total solicitado, aprovado, pago no mês, pendentes, bloqueados por NFe
- Tabela com filtros: médico, valor, método, dados bancários (resumidos), NFe, status, ações
- Ações: aprovar, recusar (com motivo), marcar pago, solicitar correção, baixar NFe, ver dados bancários
- Drawer de detalhes: médico, CPF/CNPJ, banco, valor, período, consultas incluídas, NFe, auditoria

**Configuração de saques** (sub-aba ou seção dentro da mesma página):
- Frequência, dias de fechamento, prazo segurança, valor mínimo, exigir NFe, permitir parcial

---

## 5. Navegação e rotas

- Adicionar rota `/app/admin/financeiro/saques-medicos` no App.tsx com permissão `financeiro.saques.ver`
- Adicionar item no menu Admin > Financeiro: "Saques médicos"
- Adicionar tabs "Dados Pessoais" e "Dados Bancários" ao perfil do médico

---

## 6. Lógica de liberação de saldo

Função helper (`src/lib/saques.ts`):
- Consulta `consultas_financeiro` com status "liberado" e data_consulta + prazo_seguranca < agora
- Exclui itens já vinculados em `saque_medico_itens`
- Retorna saldo disponível e lista de IDs elegíveis
- Calcula próxima data de liberação baseada na configuração

---

## Detalhes Tecicos

- Total de 5 novas tabelas + 1 bucket de storage
- ~8 arquivos novos/modificados no frontend
- Todas as tabelas com RLS restritiva (médico próprio + admin)
- Auditoria via triggers no banco + logs na `financeiro_auditoria`
- Dados bancários mascarados no frontend (ex: `***456-7`)
- Snapshot financeiro existente (`consultas_financeiro`) permanece inalterado
