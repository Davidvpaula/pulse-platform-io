
# FASE 5 — Integração de Dependentes com Documentos, Prontuário e Feegow

## Diagnóstico atual

### Feegow
- `feegow-enviar-paciente` já aceita qualquer `paciente_id` e envia para a API Feegow
- `pacientes.feegow_paciente_id` já existe — suporta dependentes nativamente
- O edge function busca dados diretamente da tabela `pacientes` (CPF, nome, nascimento)
- **Funciona para dependentes sem alteração** desde que o admin envie o `paciente_id` do dependente

### Documentos (`documentos_paciente`)
- RLS: `user_id = auth.uid()` — dependentes (user_id = NULL) não teriam documentos visíveis
- Upload usa `auth.uid()` como pasta no storage: dependentes sem login não podem ter docs
- **Precisa de ajuste**: titular deve poder gerenciar docs do dependente

### Prontuários e Prescrições
- Função `is_paciente_da_consulta()` verifica: `c.paciente_id -> p.user_id = auth.uid()`
- Dependente agendado via `paciente_atendido_id` — a consulta tem `paciente_id` = titular
- **Já funciona**: titular vê prontuários porque é o `paciente_id` da consulta
- Porém: futuramente, se dependente ganhar login, precisará da função atualizada

### MedicoDocumentos
- `listDocumentosDoMedico` usa `listConsultasDoMedico` que já resolve o nome correto do dependente (FASE 4)
- `emitirPrescricaoSimulada` insere em `prescricoes` por `consulta_id` — sem referência a paciente
- **Já funciona**, mas a prescrição não registra o nome/CPF do paciente atendido

### PacienteDocumentos
- `listDocumentosDoPaciente` filtra `paciente_id = p.id` (titular apenas)
- `listAnexosConsultaDoPaciente` filtra `consultas.paciente_id = p.id` — perde consultas onde paciente é `paciente_atendido_id`
- **Precisa de ajuste**: incluir docs dos dependentes e anexos de consultas dos dependentes

## O que será feito

### 1. Migration — Atualizar `is_paciente_da_consulta` e RLS de documentos

**`is_paciente_da_consulta()`**: Atualizar para também aceitar titular que agendou para dependente:
```sql
SELECT EXISTS (
  SELECT 1 FROM consultas c
  JOIN pacientes p ON p.id = c.paciente_id
  WHERE c.id = _consulta_id
    AND (
      p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM pacientes dep
        WHERE dep.id = c.paciente_atendido_id
          AND dep.responsavel_id = p.id
          AND p.user_id = auth.uid()
      )
    )
)
```
Isto afeta automaticamente prontuários e prescrições (usam esta função).

**`documentos_paciente` RLS**: Atualizar SELECT/INSERT/UPDATE/DELETE para que titular acesse docs de seus dependentes:
```sql
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM pacientes dep
    JOIN pacientes tit ON tit.id = dep.responsavel_id
    WHERE dep.id = documentos_paciente.paciente_id
      AND tit.user_id = auth.uid()
  )
)
```

**Storage `paciente-docs`**: Atualizar policies para titular acessar pasta de dependentes. Dependentes usarão path: `dep-{paciente_id}/...` em vez de `{auth.uid()}/...`.

### 2. Frontend — Documentos do dependente

**`listDocumentosDoPaciente()`** em `clinico.ts`: Expandir para incluir docs de dependentes ativos:
```ts
const allIds = [paciente.id, ...dependenteIds];
.in("paciente_id", allIds)
```

**`listAnexosConsultaDoPaciente()`**: Expandir consulta para incluir `paciente_atendido_id`:
```ts
.or(`paciente_id.eq.${p.id},paciente_atendido_id.in.(${allIds.join(",")})`)
```

**`uploadDocumentoPaciente()`**: Adicionar parâmetro opcional `dependenteId`. Se preenchido, usar `dep-{dependenteId}` como path no storage e `paciente_id = dependenteId` na tabela.

**`PacienteDocumentos.tsx`**: Adicionar seletor "Visualizando docs de:" (Eu / Dependente X) para filtrar documentos por paciente. O upload também permitirá selecionar para quem é o documento.

### 3. Frontend — Prontuário e prescrições do dependente no médico

**`listDocumentosDoMedico()`**: Já funciona (usa `listConsultasDoMedico` que resolve nome correto). Sem alteração.

**`emitirPrescricaoSimulada()`**: Sem alteração necessária — prescrições são vinculadas a `consulta_id`. O nome do paciente correto já vem via a consulta.

**`MedicoDocumentos.tsx`**: Já mostra `paciente_nome` correto (atualizado FASE 4). Sem alteração.

### 4. Feegow — Dependentes

**`feegow-enviar-paciente`**: Já funciona para dependentes — busca paciente por `paciente_id` direto da tabela `pacientes`, que inclui dependentes com CPF, nome e nascimento preenchidos.

Única adição: no `feegow-criar-agendamento`, usar `paciente_atendido_id` da consulta (quando preenchido) para buscar o `feegow_paciente_id` correto do dependente em vez do titular.

### 5. LGPD — Expandir consentimentos

Adicionar novos `tipo_consentimento` na tabela `dependente_consentimentos`:
- `compartilhamento_documental`
- `telemedicina_menor`
- `gravacao_consulta`
- `acesso_prescricoes`
- `acesso_exames`

Migration simples: sem nova tabela, apenas expand do check constraint ou enum.

### 6. Área do paciente — Navegação entre dependentes

No `PacienteDocumentos.tsx`, adicionar abas ou dropdown de seleção:
- "Meus documentos"
- "Documentos de [Nome Dependente]"

Cada seção mostra: exames, laudos, receitas, prescrições e anexos de consulta filtrados por aquele paciente.

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | `is_paciente_da_consulta`, RLS documentos, storage policies, consentimentos |
| `src/lib/clinico.ts` | `listDocumentosDoPaciente`, `listAnexosConsultaDoPaciente`, `uploadDocumentoPaciente` |
| `src/pages/app/paciente/PacienteDocumentos.tsx` | Seletor de dependente, filtro por paciente |
| `supabase/functions/feegow-criar-agendamento/index.ts` | Usar `paciente_atendido_id` para Feegow |

## O que NÃO muda

- `MedicoDocumentos.tsx` — já funciona
- `emitirPrescricaoSimulada` — já vinculado por consulta
- `feegow-enviar-paciente` — já suporta qualquer paciente_id
- Checkout, financeiro, agendamento — FASE 4 resolveu
- Prontuários RLS — atualizados via `is_paciente_da_consulta`

## Riscos

- Storage path migration: docs antigos usam `{auth.uid()}/...`. Docs de dependentes usarão `dep-{paciente_id}/...`. Sem conflito, mas a policy precisa cobrir ambos patterns.
- Se o dependente ganhar login futuro, precisará de migration para transferir `user_id` e ajustar storage paths.
- `documentos_paciente.user_id` é NOT NULL hoje — docs de dependentes precisarão usar o `user_id` do titular como uploader.

## Ordem de execução

1. Migration SQL (RLS + storage + consentimentos)
2. Feegow agendamento (edge function)
3. Frontend clinico.ts (queries)
4. Frontend PacienteDocumentos (UI)
5. Validação e testes
