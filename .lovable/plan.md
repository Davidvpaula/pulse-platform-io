
# Revisão: Tópicos B2B solicitados vs. implementado

## Status por tópico

### 1) PLANOS EMPRESARIAIS — Parcialmente implementado
- **Feito:** Página `AdminPlanosEmpresariais` existe em `/admin/planos-empresariais`, com listagem de planos, filtros e integração com `PlanoBuilder`.
- **Falta:**
  - Campos específicos de "valor por vida", "tipo de cobrança (mensal, uso, híbrido)" e "regras de uso" não estão explícitos no schema (`planos_empresariais` não existe como tabela dedicada — usa a tabela `planos` genérica com filtro `categoria=empresarial`). Não há colunas como `valor_por_vida`, `tipo_cobranca`, `regras_uso` dedicadas.
  - O `PlanoBuilder` é reutilizado, mas não tem campos específicos para B2B (regras de uso, SLA, limite de especialidades).

### 2) VÍNCULO EMPRESA-MÉDICO — Parcialmente implementado
- **Feito:** `AdminGestaoB2B` mostra contratos e faturas por empresa. `MedicoCorporativo` lista consultas corporativas do médico (filtra por `empresa_id` preenchido).
- **Falta:**
  - Não há tela no Admin para vincular médicos a empresas (tabela de vínculo médico-empresa não existe).
  - Não há configuração de "preços diferenciados por empresa" no painel do médico.

### 3) PAINEL DO MÉDICO CORPORATIVO — Implementado
- **Feito:** `MedicoCorporativo` com abas de Consultas e Pacientes corporativos, filtro por empresa, identificação de origem (empresa vs particular) via presença de `empresa_id`.
- **Falta:** Nenhum gap crítico.

### 4) DOCUMENTOS COMPARTILHADOS — Parcialmente implementado
- **Feito:** Coluna `visibilidade_empresa` existe no schema (`documentos_paciente`). `EmpresaDocumentos` filtra apenas documentos com `visibilidade_empresa = true`.
- **Falta:**
  - **O médico não tem UI para marcar documentos como privado/compartilhável.** `MedicoDocumentos.tsx` não referencia `visibilidade_empresa` em nenhum lugar. O toggle/switch para o médico definir visibilidade não foi implementado.

### 5) UX/UI — SEPARAÇÃO B2C vs B2B — Parcialmente implementado
- **Feito:** Rotas separadas (`/empresa/*` vs `/paciente/*`), sidebar separado, páginas dedicadas.
- **Falta:**
  - Na visão do médico, `MedicoCorporativo` é uma página separada, mas dentro das consultas normais (`MedicoConsultas`) não há badge/tag visual indicando "corporativo" vs "particular".
  - Não há separação visual explícita no financeiro do médico entre receita B2B e B2C.

### 6) AUDITABILIDADE / NÃO DUPLICAR LÓGICA — OK
- **Feito:** `EmpresaTermos` reutiliza `registrarAceite` e `MeusAceites`. Planos empresariais reutilizam `PlanoBuilder`. Não há duplicação evidente.

---

## Resumo do que falta implementar

| # | Item | Esforço |
|---|------|---------|
| 1 | Toggle `visibilidade_empresa` na UI do médico (MedicoDocumentos) | Pequeno |
| 2 | Campos específicos B2B no PlanoBuilder (valor/vida, tipo cobrança, regras de uso) | Médio |
| 3 | Vínculo médico-empresa no Admin (tabela + UI) | Médio |
| 4 | Badge "Corporativo" nas consultas gerais do médico | Pequeno |
| 5 | Separação visual B2B/B2C no financeiro do médico | Pequeno |

Deseja que eu implemente todos esses itens pendentes?
