
# FASE 4 — Checkout, Pagamento e Fluxo Médico para Dependentes

## Contexto atual (pós FASE 3)

- `consultas.paciente_atendido_id` existe (nullable FK)
- O seletor "Quem será atendido?" passa `paciente_atendido_id` via metadata do pagamento
- A RPC `criar_consulta_pos_pagamento` já salva `paciente_atendido_id` na consulta
- A RLS já permite titular ver consultas dos dependentes
- `listConsultasDoMedico` já resolve o nome do atendido
- **Porém**: checkout, histórico do paciente e recibos ainda não exibem a separação titular/atendido

## O que será feito

### 1. Checkout — Exibir "quem paga" vs "quem será atendido"

No `PacienteCheckout.tsx`, acima do resumo financeiro, adicionar bloco informativo:

```
Responsável financeiro: João Silva
Paciente atendido: Maria Silva (Filha)
```

- Ler `paciente_atendido_id` do metadata do pagamento
- Se null, mostrar apenas "Consulta para você"
- Se preenchido, buscar nome e parentesco do dependente na tabela `pacientes`

Nenhuma migration necessária — os dados já estão no metadata.

### 2. Histórico do paciente — Separar "minhas" vs "dos dependentes"

No `PacienteAgendamentos.tsx`, em cada card de consulta:

- Quando `paciente_atendido_id` existe e difere do titular, mostrar badge: **"Para: Maria Silva (Filha)"**
- Adicionar filtro opcional: "Todas", "Minhas consultas", "Dos dependentes"
- Permitir busca pelo nome do dependente

O `listConsultasDoPaciente` (clinico.ts) já retorna `paciente_atendido_nome` e `paciente_atendido_parentesco`.

### 3. Recibo PDF — Incluir paciente atendido

No `reciboPdf.ts`, adicionar campo opcional `pacienteAtendidoNome`.
Quando preenchido, o PDF mostra:

```
Responsável: João Silva
Paciente atendido: Maria Silva
```

Atualizar o `PacienteFinanceiro.tsx` para passar esse dado ao gerar PDF.

### 4. Consulta médica — Garantir nome correto

Já implementado na FASE 3: `listConsultasDoMedico` em `clinico.ts` resolve `paciente_atendido.nome_completo` quando preenchido. O `MedicoConsultas.tsx` usa `c.paciente_nome` que já reflete isso.

Adicional: no card de consulta do médico, quando há dependente, mostrar badge discreta "Resp.: João Silva" para contexto, sem alterar o destaque do nome do paciente atendido.

### 5. Financeiro do paciente — Consultas dos dependentes

O `usePacienteFinanceiro` (queries de pagamentos) já filtra por `paciente_id` do titular, que continua sendo o responsável financeiro. Funcionamento mantido.

Adicionar no detalhe de cada pagamento, quando a consulta tem `paciente_atendido_id`: "Paciente atendido: Maria Silva".

### 6. Compatibilidade e segurança

- Consultas antigas (`paciente_atendido_id = NULL`) continuam exibindo normalmente
- Pacientes sem dependentes não veem nenhuma mudança
- RLS já está correta desde FASE 3
- Nenhuma migration de schema necessária
- Snapshots financeiros e comissões não são afetados (vinculados ao pagamento/consulta, não ao paciente atendido)
- Relatórios admin usam joins por `consultas` → `pagamentos` e não são impactados

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/paciente/PacienteCheckout.tsx` | Bloco "Responsável / Paciente atendido" |
| `src/pages/app/paciente/PacienteAgendamentos.tsx` | Badge de dependente + filtro |
| `src/pages/app/paciente/PacienteFinanceiro.tsx` | Info do atendido no detalhe do pagamento |
| `src/lib/reciboPdf.ts` | Campo `pacienteAtendidoNome` no PDF |
| `src/pages/app/medico/MedicoConsultas.tsx` | Badge "Resp.: ..." quando há dependente |
| `src/lib/clinico.ts` | Tipo `ConsultaDetalhada` — adicionar campos opcionais |

## O que NÃO será feito

- Feegow, Memed, documentos, prontuários, receitas
- Mudanças em pagamento/Stripe/snapshots/comissões
- Upload documental, assinatura ICP
- Nenhuma migration SQL

## Riscos

- O `usePacienteFinanceiro` em `src/lib/paciente/queries.ts` faz `.select(... consultas!inner(...))` que não inclui `paciente_atendido_id` — precisa adicionar na query
- Recibos gerados antes desta fase não terão o campo `pacienteAtendidoNome` — fallback seguro com "—"
