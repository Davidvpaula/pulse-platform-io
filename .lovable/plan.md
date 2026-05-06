
# Diagnóstico Controlado — Feegow 422 na Criação de Paciente

## Contexto

A documentação oficial da Feegow (docs.feegow.com) lista o endpoint "Criar paciente" na seção Pacientes, mas o conteúdo dessa seção não é renderizado no HTML público (carregado dinamicamente). O endpoint `/patient/edit` usa os campos:

```json
{
  "paciente_id": 6655,
  "nome_completo": "JOSE RENATO BARONI",
  "cpf": "22222222222",
  "data_nascimento": "1994-01-30",
  "genero": "M",
  "celular": "21955554321",
  "tabela_id": "2",
  ...
}
```

O n8n node confirma que campos obrigatórios mínimos são: **nome** (required), **cpf** (required), **data_nascimento** (opcional, YYYY-MM-DD).

## O que será feito

Reescrever a edge function `feegow-enviar-paciente` **apenas no modo `teste_unitario`** para executar um diagnóstico exaustivo em 6 blocos:

### BLOCO 1 — Auditoria completa da resposta 422
- Enviar o payload atual para `/patient/store` e capturar:
  - Status HTTP, headers completos da resposta, body bruto (sem truncar), content-type
  - Payload exato enviado
- Repetir com `/patient/new-patient` (endpoint alternativo citado em versões antigas)

### BLOCO 2 — Descoberta de endpoints reais
- Testar GET e POST em variações:
  - `POST /patient/store`
  - `POST /patient/new-patient`
  - `POST /patient/create`
  - `POST /patient/insert`
- Para cada um: registrar status HTTP + body bruto + headers

### BLOCO 3 — Campos obrigatórios da instância
- Chamar `GET /patient/list-origins` para listar origens disponíveis
- Chamar `GET /financial/list-private-tables` (ou `/patient/list-private-tables`) para listar tabelas particulares
- Registrar se a instância exige `origem_id`, `tabela_id`, `sexo_id`, etc.

### BLOCO 4 — Payload progressivo
- Testar payloads incrementais (do mínimo ao completo):
  1. `{ "nome": "...", "cpf": "..." }` — mínimo absoluto
  2. Adicionar `data_nascimento`
  3. Adicionar `genero`
  4. Adicionar `celular`
  5. Adicionar `tabela_id`, `origem_id`
- Usar `nome_completo` vs `nome` como variação
- Testar `application/json` vs `application/x-www-form-urlencoded`
- Registrar cada resultado completo

### BLOCO 5 — Teste unitário final
- Quando um payload funcionar (HTTP 200/201):
  1. Capturar o `paciente_id` retornado
  2. Buscar por CPF via `GET /patient/list?cpf=...`
  3. Confirmar que o paciente existe
  4. Salvar `feegow_paciente_id` no banco local

### BLOCO 6 — Relatório final
- Retornar JSON completo com:
  - Endpoint correto confirmado
  - Payload mínimo que funcionou
  - Causa real do 422
  - Campos obrigatórios identificados
  - Resultado do teste unitário
  - Token mascarado

## O que NÃO será alterado
- Schema/migrations/RLS
- Outras edge functions
- Frontend/UI
- Nenhuma sincronização automática
- Modo padrão da edge function (só o modo `teste_unitario` será reescrito)

## Detalhes técnicos

Arquivo alterado: `supabase/functions/feegow-enviar-paciente/index.ts`

A lógica de diagnóstico substitui o bloco `if (mode === "teste_unitario")` atual. O modo padrão permanece inalterado. Cada bloco registra resultados em um array `passos[]` retornado no JSON final. Bodies de resposta NÃO serão truncados. Token será mascarado em todos os logs.
