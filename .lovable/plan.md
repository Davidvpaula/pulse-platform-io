
# Plano: Proposta Empresa → Médico (Negociação B2B Guiada)

## Resumo

Novo fluxo de negociação estruturada: Empresa cria proposta para médico(s), Admin revisa/ajusta taxa, médico aceita/recusa. Proposta aceita vira plano ativo automaticamente. Tudo auditado e com termos obrigatórios.

---

## 1. Migração de Banco de Dados

### Tabela `propostas_empresa_medico`

```sql
CREATE TYPE proposta_empresa_status AS ENUM (
  'criada', 'em_analise', 'aprovada_admin', 'enviada_medico',
  'aceita', 'recusada', 'convertida', 'cancelada'
);

CREATE TYPE proposta_tipo_contrato AS ENUM (
  'mensal', 'pacote', 'recorrente'
);

CREATE TABLE propostas_empresa_medico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  medico_id UUID NOT NULL REFERENCES profiles(id),
  especialidade_id UUID REFERENCES especialidades(id),
  status proposta_empresa_status NOT NULL DEFAULT 'criada',
  tipo_contrato proposta_tipo_contrato NOT NULL DEFAULT 'mensal',
  valor_mensal_centavos INTEGER NOT NULL,
  qtd_atendimentos INTEGER,  -- opcional
  mensagem_empresa TEXT,
  mensagem_medico TEXT,       -- resposta opcional do médico
  -- Admin fields
  taxa_plataforma_pct NUMERIC(5,2),  -- preenchido pelo admin
  valor_ajustado_centavos INTEGER,   -- se admin ajustar
  observacao_admin TEXT,
  admin_id UUID REFERENCES profiles(id),
  aprovado_em TIMESTAMPTZ,
  -- Médico fields
  respondido_em TIMESTAMPTZ,
  -- Conversão
  plano_gerado_id UUID REFERENCES planos(id),
  -- Termos
  termo_empresa_aceito BOOLEAN NOT NULL DEFAULT false,
  termo_empresa_versao INTEGER,
  termo_medico_aceito BOOLEAN NOT NULL DEFAULT false,
  termo_medico_versao INTEGER,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- RLS: empresa vê suas propostas, médico vê propostas enviadas a ele (status >= 'enviada_medico'), admin vê todas.

### Novos enum values em `termo_tipo`

Adicionar `proposta_empresa` e `proposta_medico` ao enum `termo_tipo` para os novos termos obrigatórios.

### Auditoria

Usar a tabela `planos_auditoria` existente para registrar eventos do ciclo de vida (criação, aprovação admin, aceite/recusa médico, conversão).

---

## 2. Páginas e Componentes

### 2.1 Empresa: "Propostas Comerciais" (NOVA)

**Rota**: `/app/empresa/propostas`
**Arquivo**: `src/pages/app/empresa/EmpresaPropostas.tsx`

- Lista de propostas criadas pela empresa com status visual (timeline)
- Botão "Nova Proposta" abre formulário:
  - Selecionar médico(s) (busca por nome)
  - Especialidade (select das existentes)
  - Tipo de contrato (mensal/pacote/recorrente)
  - Valor mensal proposto (input centavos)
  - Quantidade de atendimentos (opcional)
  - Mensagem personalizada
  - Checkbox: aceite do termo de empresa (busca termo tipo `proposta_empresa`)
- Cards com status: Criada → Em análise → Aprovada → Enviada → Aceita/Recusada

### 2.2 Admin: "Propostas Empresa → Médico" (NOVA)

**Rota**: `/app/admin/propostas-b2b`
**Arquivo**: `src/pages/app/admin/AdminPropostasB2B.tsx`

- Lista todas as propostas com filtros (status, empresa, médico)
- Ao clicar: modal de revisão com:
  - Dados da proposta
  - Campo para ajustar taxa da plataforma (%) — pré-preenchido com `getRepasseGlobal()` de `financeiroConfig.ts`
  - Campo para ajustar valor final (opcional)
  - Observação interna
  - Botões: Aprovar / Rejeitar
- Aprovar muda status para `aprovada_admin` e depois `enviada_medico`

### 2.3 Médico: "Propostas Comerciais" (NOVA)

**Rota**: `/app/medico/propostas`
**Arquivo**: `src/pages/app/medico/MedicoPropostas.tsx`

- Lista propostas recebidas (status >= `enviada_medico`)
- Card por proposta mostrando:
  - Empresa, especialidade, tipo de contrato
  - Valor bruto
  - Taxa da plataforma (%) — transparente
  - Valor líquido (calculado: valor * (1 - taxa/100))
  - Mensagem da empresa
- Aceitar exige checkbox de termo (`proposta_medico`)
- Campo opcional de mensagem de resposta
- Botões: Aceitar / Recusar

### 2.4 Conversão automática em plano

Quando médico aceita:
- Criar registro na tabela `planos` com:
  - `nivel = 'admin'`, `publico = 'empresa'`, `categoria = 'empresarial'`
  - `empresa_id`, `medico_id`, `especialidade_id` da proposta
  - `valor_mensal_centavos` do valor acordado
  - `modelo_cobranca` mapeado do `tipo_contrato`
  - `status = 'ativo'`, `aprovado_admin = true`
- Criar `plano_medicos` vinculando médico ao plano com `aceite_medico = true`
- Criar snapshot financeiro via lógica existente de `financeiroConfig`
- Atualizar proposta: `status = 'convertida'`, `plano_gerado_id = id do plano`
- Registrar em `planos_auditoria`

---

## 3. Navegação

- **Empresa sidebar**: adicionar item "Propostas" após "Financeiro" em `src/lib/profiles.ts`
- **Médico sidebar**: adicionar item "Propostas" após "Corporativo" em `src/lib/profiles.ts`
- **Admin sidebar**: adicionar "Propostas B2B" no grupo de empresas em `src/lib/profiles.ts`
- **Rotas**: 3 novas rotas em `src/App.tsx`
- **Breadcrumbs**: 3 novas entradas em `src/components/AppBreadcrumb.tsx`

---

## 4. Termos e Condições

Expandir o sistema existente (`termos_condicoes`):
- Adicionar 2 novos valores ao enum `termo_tipo`: `proposta_empresa` e `proposta_medico`
- Admin pode criar/editar estes termos na página AdminTermos existente
- Aceite registrado na proposta com versão do termo

---

## 5. Integração Financeira

- Reutilizar `getRepasseGlobal()` de `src/lib/financeiroConfig.ts` como taxa default
- Admin pode personalizar taxa por proposta
- Snapshot financeiro segue padrão existente (imutável na criação do plano)
- Separação clara: receita plataforma vs repasse médico

---

## 6. Auditoria

Registrar em `planos_auditoria` com ações específicas:
- `proposta_criada`, `proposta_aprovada_admin`, `proposta_rejeitada_admin`
- `proposta_aceita_medico`, `proposta_recusada_medico`, `proposta_convertida`

Payload JSONB com dados completos da proposta em cada evento.

---

## 7. Impactos em Módulos Existentes

| Módulo | Impacto |
|--------|---------|
| Planos (`planos`) | Novos registros criados automaticamente — sem mudança estrutural |
| Financeiro | Reutiliza `financeiroConfig.ts` — sem duplicação |
| Comissões | Taxa definida por proposta, compatível com `medico_comissao_override` |
| Termos | 2 novos tipos no enum — Admin gerencia pela tela existente |
| Auditoria | Usa `planos_auditoria` existente — sem nova tabela |

---

## Arquivos a criar/modificar

**Criar:**
- `src/pages/app/empresa/EmpresaPropostas.tsx`
- `src/pages/app/admin/AdminPropostasB2B.tsx`
- `src/pages/app/medico/MedicoPropostas.tsx`

**Modificar:**
- `src/App.tsx` — 3 rotas
- `src/lib/profiles.ts` — 3 itens de menu
- `src/components/AppBreadcrumb.tsx` — 3 breadcrumbs
- Migração SQL — tabela + enum values + RLS
