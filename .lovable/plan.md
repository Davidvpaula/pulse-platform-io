
## Objetivo

Melhorar o dialog "Finalizar atendimento" do médico para que Prescrição e Atestado sejam **upload de PDF via drag & drop**, salvando diretamente na tabela `documentos_paciente` + bucket `paciente-docs`. Prontuário continua com campos de texto.

## O que muda

### 1. Migração — novos tipos no enum `documento_paciente_tipo`

Adicionar dois valores ao enum existente:
- `prescricao`
- `atestado`

Também adicionar coluna opcional `consulta_id` em `documentos_paciente` para vincular o documento à consulta e coluna `uploaded_by` (uuid) para rastrear quem fez o upload (médico).

### 2. Componente `DropzonePdf` (novo)

Componente reutilizável em `src/components/shared/DropzonePdf.tsx`:
- Área de arrastar e soltar com visual de drop zone
- Aceita apenas `application/pdf`
- Limite de 10 MB
- Mostra nome do arquivo selecionado com opção de remover
- Props: `onFileSelected(file | null)`, `label`, `disabled`

### 3. Atualizar `FinalizarAtendimentoDialog`

- **Prontuário** — sem mudanças (campos de texto mantidos)
- **Prescrição** — remover formulário de medicamentos. Substituir por `DropzonePdf` com label "Arraste o PDF da prescrição"
- **Atestado** — nova seção (igual à prescrição) com `DropzonePdf` e label "Arraste o PDF do atestado"
- **Pagamento** — sem mudanças

Na função `finalizar()`:
1. Para cada PDF selecionado (prescrição e/ou atestado), fazer upload ao bucket `paciente-docs` no path `{paciente_id}/{consulta_id}/{tipo}_{timestamp}.pdf`
2. Inserir registro em `documentos_paciente` com tipo `prescricao` ou `atestado`, vinculando `consulta_id` e `uploaded_by`
3. Fluxo existente de prontuário e pagamento permanece inalterado

### 4. RLS

Política para médico inserir em `documentos_paciente`: médico autenticado pode inserir documentos para pacientes das suas consultas. A tabela já tem RLS — adicionar política de INSERT para médicos.

## Detalhes técnicos

- Bucket `paciente-docs` já existe (private)
- Enum `documento_paciente_tipo` já tem: exame, laudo, receita, identidade, plano, vacina, outro
- Adicionamos `prescricao` e `atestado` ao enum
- Storage policy: médico pode fazer upload em `paciente-docs/{paciente_id}/*`
- Nenhuma dependência da Feegow — tudo local
