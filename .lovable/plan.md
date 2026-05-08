
# Importação de documentos Feegow → Página do paciente

## Problema atual

1. A edge function `feegow-importar-documentos` existe mas **nunca é chamada** — nenhum botão, cron ou trigger a invoca.
2. Está em "modo teste unitário" com limite de 3 documentos.
3. Quando o Feegow retorna múltiplos pacientes com o mesmo CPF, pega cegamente o primeiro — pode não ser o correto.
4. Os endpoints de prescrição (`/patient/prescriptions`) podem retornar dados em formato diferente do esperado.

## Plano

### 1. Corrigir edge function `feegow-importar-documentos`

- **Remover limite de 3 docs** — importar todos.
- **Reconciliação por CPF inteligente**: quando a Feegow retorna múltiplos pacientes para o mesmo CPF, comparar nome do paciente local com os nomes retornados e escolher o mais próximo (fuzzy match simples). Se `feegow_paciente_id` já estiver salvo, usar direto.
- **Incluir endpoint de prescrições** com parsing adequado (nome do medicamento, posologia).
- **Permitir chamada pelo próprio paciente** (não só admin/secretária) — o paciente pode sincronizar seus próprios documentos da Feegow.

### 2. Botão "Sincronizar Feegow" na página de documentos do paciente

- Na página `/app/paciente/documentos`, adicionar um botão discreto "Importar da Feegow" que chama a edge function passando o `paciente_id` do paciente logado.
- Mostrar loading, resultado (quantos importados) e recarregar lista.
- O botão só aparece se o paciente tem CPF cadastrado.

### 3. Botão no Admin (paciente individual)

- Na tela de detalhes do paciente no admin (ou na aba de integração Feegow), adicionar botão "Importar documentos Feegow" para forçar a sincronização de um paciente específico.

### 4. Log de integração

- Já existe a lógica de `passos` no relatório — adicionar insert em `integracoes_logs` ao final da importação para rastreabilidade.

---

### Detalhes técnicos

**Edge function** — ajustes:
- Aceitar role `paciente` quando `paciente.user_id === auth.uid()` (importar apenas seus próprios docs)
- Remover cap de 3, manter paginação segura (max 50 por chamada)
- Quando múltiplos pacientes retornados por CPF: preferir o que já tem `feegow_paciente_id` salvo, senão comparar `nome_completo` 
- Parsear prescrições: campo `content` ou `descricao` da Feegow

**Frontend** — `PacienteDocumentos.tsx`:
- Botão "Importar da Feegow" no header (ao lado de "Anexar documento")
- State de loading + toast com resultado

**Tabelas** — nenhuma migração necessária, `documentos_paciente` já suporta os campos.
