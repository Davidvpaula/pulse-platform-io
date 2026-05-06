
# Correção Controlada — Telas Admin Feegow com Dados Reais

## Diagnóstico (BLOCO 1)

**Já existe no banco (REAL):**
- `integracoes_config` — Feegow está lá (id: `5f4836b4...`, status: `nao_configurado`, modo_simulado: `true`)
- `integracoes_status_mapping` — 8 mapeamentos reais Feegow já inseridos (agendada→Marcado não confirmado, etc.)
- `integracoes_logs` — tabela existe, mas vazia (nenhum log persistido)
- `integracoes_pendencias` — tabela existe, vazia
- `pacientes.feegow_paciente_id` — 2 pacientes com `feegow_paciente_id=7` e `feegow_status=liberado`
- Edge functions reais: `integracoes-test`, `feegow-enviar-paciente`, `feegow-importar-documentos`

**100% Mock (a corrigir):**
- `FeegowIntegracao.tsx` — usa `feegowConnection`, `integrationLogsMock`, `pendenciasFeegow()` de `src/lib/feegow.ts`
- `FeegowMapeamento.tsx` — usa `statusMap` estático do lib/feegow.ts em vez da tabela `integracoes_status_mapping`
- `FeegowSchema.tsx` — usa `feegowSchema` estático (esquema conceitual, não endpoints reais)
- `PendenciasIntegracao.tsx` — usa `pendenciasFeegow()` que retorna `[]` e `integrationLogsMock`

**Não alterar:** `src/lib/feegow.ts` (manter como referência, mas páginas não importam mais dele)

---

## Plano de Implementação

### 1. Reescrever `FeegowIntegracao.tsx` (BLOCOS 2, 3, 7)

Substituir dados mock por dados reais:

- **Status da conexão**: Ler da tabela `integracoes_config` (WHERE tipo='feegow') — status, modo_simulado, ambiente, ultimo_teste_at, ultimo_teste_ok, ultimo_erro
- **Logs reais**: Ler de `integracoes_logs` (WHERE integracao='feegow'). Se vazio, mostrar empty state "Nenhum log persistido ainda."
- **Pendências reais**: Contar de `integracoes_pendencias` (WHERE integracao='feegow')
- **Botão "Testar conexão"**: Chamar edge function `integracoes-test` com `mode: "diagnostico"` e mostrar resultado real (especialidades, profissionais, HTTP status). Persistir resultado em `integracoes_config` (ultimo_teste_at, ultimo_teste_ok) via edge function ou RPC
- **Botões seguros**: Listar especialidades, listar profissionais, buscar paciente por CPF (chamam edge functions read-only). Resultados exibidos em modal/drawer
- **Remover botões perigosos**: "Sincronizar pacientes", "Sincronizar agendamentos" ficam desabilitados com tooltip "Não ativado — aguardando aprovação"
- **Não mostrar token completo** — exibir apenas "Configurado como FEEGOW_API_TOKEN" ou "Não configurado"

### 2. Reescrever `FeegowMapeamento.tsx` (BLOCO 4)

- Ler de `integracoes_status_mapping WHERE sistema_origem='feegow'` (8 registros reais já existem)
- Mostrar adicionalmente mapeamentos validados de entidades:
  - `feegow_paciente_id → pacientes` (validado, 2 registros)
  - `CPF como chave de reconciliação` (validado)
  - `documentos/exames → documentos_paciente` (validado, 1 importação)
  - `profissionais → medicos` (pendente)
  - `especialidades → especialidades` (pendente)
- Manter read-only, sem edição

### 3. Reescrever `FeegowSchema.tsx` (BLOCO 5)

Em vez do schema conceitual de tabelas, mostrar **endpoints reais da API Feegow** com status:

| Endpoint | Método | Status |
|---|---|---|
| /specialties/list | GET | Funcionando |
| /professional/list | GET | Funcionando |
| /patient/list | GET | Funcionando |
| /patient/create | POST | Funcionando |
| /patient/exam-requests | GET | Funcionando |
| /laudos/list | GET | 422 — permissão pendente |
| /patient/prescriptions | GET | 422 — permissão pendente |
| Atestados, prontuário, anexos | — | Não testado |

Dados estáticos (hardcoded) baseados nos testes já realizados. Botão "Re-testar endpoints" pode chamar edge function no futuro.

### 4. Reescrever `PendenciasIntegracao.tsx` (BLOCO 6)

- Ler de `integracoes_pendencias` (real, atualmente vazio)
- Mostrar lista estática de pendências conhecidas:
  - Permissões Feegow para laudos/prescrições/atestados
  - Coluna `origem` em `documentos_paciente`
  - Mapeamento médicos Feegow ↔ médicos Lasmar
  - Auditoria de importação
  - Teste de envio de consulta/agendamento
- Logs recentes de `integracoes_logs`
- Empty states reais quando não houver dados

### 5. Edge function: persistir resultado do teste (BLOCO 2)

Atualizar `integracoes-test` para, após testar Feegow, gravar na tabela `integracoes_config`:
- `ultimo_teste_at = now()`
- `ultimo_teste_ok = true/false`
- `ultimo_erro = mensagem (se falhou)`
- Inserir log em `integracoes_logs`

Usa `SUPABASE_SERVICE_ROLE_KEY` (já disponível nas edge functions).

---

## Arquivos alterados

1. `src/pages/app/admin/FeegowIntegracao.tsx` — reescrita completa
2. `src/pages/app/admin/FeegowMapeamento.tsx` — reescrita (dados do banco + entidades validadas)
3. `src/pages/app/admin/FeegowSchema.tsx` — reescrita (endpoints reais)
4. `src/pages/app/shared/PendenciasIntegracao.tsx` — reescrita (dados reais + pendências conhecidas)
5. `supabase/functions/integracoes-test/index.ts` — adicionar persistência do resultado no banco

## NÃO será alterado

- `src/lib/feegow.ts` — mantido como referência (será limpo em etapa futura)
- Schema/migrations — nenhuma alteração
- RLS — nenhuma alteração
- Outras edge functions
- Frontend fora das 4 páginas listadas
- Nenhuma automação ativada
- Nenhuma sincronização em massa
