
# Planos Customizados — Plano de Execução

## Viabilidade

**Sim, é 100% viável.** A base atual já possui:
- `planos` com `medico_id` (nullable) — suporta planos do médico
- `plano_beneficios` com `especialidade_id`, `medico_id`, `servico_id` (todos nullable) — já tem os FKs
- `assinaturas` e `assinatura_uso` — ciclo de vida de assinatura já funcional
- `especialidades`, `servicos_financeiros`, `medico_servicos` — fontes de dados para seleção dinâmica
- Enum `beneficio_tipo` já inclui: especialidade, medico, servico, categoria, desconto_geral

O que **falta** é UI de seleção dinâmica nos benefícios, o módulo do médico, taxação, plano do paciente, e separação financeira nos dashboards.

---

## Etapa 1 — Correção dos Benefícios (item 1)

**Problema:** O `PlanoBuilder` tem os campos `tipo` (especialidade/medico/servico) mas o formulário não exibe seletor dinâmico — só um campo texto "Nome".

**Solução:**
- No `PlanoBuilder.tsx`, ao selecionar tipo "Médico": exibir autocomplete buscando perfis com `tipo_perfil = 'medico'`
- Tipo "Especialidade": autocomplete da tabela `especialidades`
- Tipo "Serviço": autocomplete de `servicos_financeiros`
- Salvar o respectivo ID (`medico_id`, `especialidade_id`, `servico_id`) no benefício
- O campo "Nome" vira read-only, preenchido automaticamente pela seleção

**Impacto:** Nenhuma alteração de banco necessária (colunas já existem).

---

## Etapa 2 — Plano Criado pelo Médico (item 2)

**Banco:**
- Adicionar coluna `nivel` (enum: `admin`, `medico`, `paciente_custom`) na tabela `planos` — default `admin`
- Adicionar coluna `regra_acesso` (enum: `direto`, `pos_consulta`) — default `direto`
- Adicionar coluna `termos_aceitos` (boolean) no `planos`
- Adicionar `termos_plano_medico` em `app_settings` (texto editável pelo Admin)
- RLS: médico só pode criar/editar planos onde `medico_id = auth.uid()` e `nivel = 'medico'`

**Frontend:**
- Nova página: `/app/medico/planos` — lista planos do médico logado
- Reutilizar `PlanoBuilder` com modo restrito (sem campos de custo operacional, imposto, etc.)
- Tela de Termos antes de salvar
- Plano publicado aparece no perfil público do médico
- Nova página Admin: `/app/admin/planos-medicos` — lista todos os planos de médicos (read-only + aprovação)

---

## Etapa 3 — Taxação Admin sobre Plano do Médico (item 3)

**Banco:**
- Nova tabela `plano_taxa_plataforma` com: `id`, `tipo` (percentual/fixo), `valor_pct`, `valor_fixo_centavos`, `vigencia_inicio`, `created_by`, `created_at`
- Nova tabela `assinatura_snapshot` com: `id`, `assinatura_id`, `plano_snapshot` (JSONB), `beneficios_snapshot` (JSONB), `valor_bruto_centavos`, `taxa_plataforma_centavos`, `valor_liquido_medico_centavos`, `desconto_aplicado_pct`, `origem` (enum: admin/medico/paciente_custom), `created_at`
- Trigger: ao criar assinatura de plano com `nivel = 'medico'`, gerar snapshot automaticamente com cálculo da taxa

**Frontend:**
- Admin > Financeiro > Planos personalizados: configurar % ou valor fixo
- Dashboard médico: card "Receita de planos" (valor líquido)
- Dashboard admin: card "Lucro plataforma — planos médicos"

---

## Etapa 4 — Plano Personalizado pelo Paciente (item 4)

**Banco:**
- Nova tabela `plano_medicos` (N:N): `id`, `plano_id`, `medico_id`, `aceite_medico` (boolean), `aceite_em` (timestamp)
- Nova tabela `desconto_progressivo_regras`: `id`, `qtd_medicos_min`, `desconto_pct`, `ativo`, `created_by`, `created_at`
- Ao criar plano com `nivel = 'paciente_custom'`, `created_by = paciente`, inserir linhas em `plano_medicos` para cada médico escolhido
- Assinatura só ativa após todos os médicos aceitarem (`aceite_medico = true`)

**Frontend:**
- Fluxo no app do paciente: `/app/paciente/montar-plano`
  - Step 1: escolher médicos (com busca)
  - Step 2: ver desconto progressivo calculado em tempo real
  - Step 3: revisar valor final e confirmar
- Admin > Planos > Regras de desconto: CRUD da tabela `desconto_progressivo_regras`
- Admin > Planos > Planos pacientes: lista de planos custom com status de aceite

---

## Etapa 5 — Separação Financeira (itens 5 e 6)

**Banco:**
- Adicionar coluna `origem_receita` (enum: `consulta`, `servico_plataforma`, `plano_admin`, `plano_medico`, `plano_paciente_custom`) na tabela `assinaturas`
- Trigger que preenche automaticamente com base no `nivel` do plano vinculado

**Frontend — Dashboard Admin:**
- Admin > Planos: 3 abas (Plataforma / Médicos / Pacientes custom)
- Admin > Financeiro: cards separados por origem (consultas, serviços, plano admin, plano médico, plano paciente)
- Filtro por `origem_receita` em todos os relatórios

**Frontend — Dashboard Médico:**
- Separar receita de consultas vs receita de planos próprios

---

## Etapa 6 — Regras Críticas (item 7)

- Versionamento de plano: ao editar plano com assinantes ativos, criar nova versão (novo registro) e manter o antigo vinculado às assinaturas existentes
- Snapshot imutável: `assinatura_snapshot` nunca é editado após criação
- RLS rigoroso em todas as novas tabelas
- Auditoria: triggers em `planos_auditoria` já existem, estender para novas tabelas

---

## Ordem de Execução

1. **Etapa 1** — Seleção dinâmica nos benefícios (só frontend, risco zero)
2. **Etapa 2** — Plano do médico (migração + frontend)
3. **Etapa 3** — Taxação (migração + frontend)
4. **Etapa 4** — Plano do paciente (migração + frontend)
5. **Etapa 5** — Separação financeira nos dashboards
6. **Etapa 6** — Versionamento e regras de segurança

Cada etapa é independente e não quebra o sistema existente. Posso executar uma por vez para validação.

---

## Detalhes Técnicos

**Novas tabelas:** `plano_taxa_plataforma`, `assinatura_snapshot`, `plano_medicos`, `desconto_progressivo_regras`

**Colunas adicionadas em tabelas existentes:**
- `planos`: `nivel`, `regra_acesso`, `termos_aceitos`
- `assinaturas`: `origem_receita`

**Novos enums:** `plano_nivel`, `plano_regra_acesso`, `origem_receita_assinatura`

**Novas rotas:**
- `/app/medico/planos`
- `/app/paciente/montar-plano`
- `/app/admin/planos-medicos`

**Arquivos principais afetados:**
- `src/components/planos/PlanoBuilder.tsx` (seleção dinâmica)
- `src/pages/app/admin/AdminPlanos.tsx` (abas por nível)
- Novos componentes para cada módulo

**Nenhuma tabela existente é removida ou reestruturada.** Apenas adições.
