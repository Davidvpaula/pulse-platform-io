## Objetivo

Remover a seção "Registro do prontuário" (Queixa, Hipótese, Conduta, CID-10) do dialog `FinalizarAtendimentoDialog`.

## Confirmação de rotas de upload

As rotas de upload de PDF (Prescrição e Atestado) estão corretas:
- Bucket `paciente-docs` existe (privado)
- Storage policy `medico envia docs para paciente-docs` permite INSERT pelo médico
- Tabela `documentos_paciente` tem policy `Médico insere docs paciente da consulta` para INSERT
- Path: `{paciente_user_id}/{consulta_id}/{tipo}_{timestamp}.pdf`
- Tudo funcional, sem alteração necessária

## Alterações

### 1. `src/components/medico/FinalizarAtendimentoDialog.tsx`

- Remover estados: `criarProntuario`, `queixa`, `conduta`, `hipotese`, `cidStr`
- Remover toda a seção visual "Registro do prontuário" (section com switch + textareas + input CID)
- Remover bloco de upsert em `prontuarios` dentro da função `finalizar()`
- Manter tudo o mais (Prescrição, Atestado, Pagamento) intacto
