
# Fase 3 — Criação MANUAL de agendamento Feegow

## BLOCO 1 — Endpoint Feegow descoberto

Endpoint oficial validado via documentação pública:

- **Método:** `POST`
- **URL:** `{base}/appoints/new-appoint`
- **Headers:** `x-access-token`, `Content-Type: application/json`
- **Campos obrigatórios:**
  - `local_id` (numeric) — unidade/local
  - `paciente_id` (numeric) — ID Feegow do paciente
  - `profissional_id` (numeric) — ID Feegow do profissional
  - `especialidade_id` (numeric) — ID Feegow da especialidade (campo `feegow_especialidade_id` em `medicos`)
  - `data` (string) — formato `dd-mm-YYYY`
  - `hora` (string) — formato `HH:MM:SS` 24h
  - `valor` (numeric) — centavos
  - `plano` (numeric) — `0` (particular)
- **Campos opcionais úteis:** `notas`, `celular`, `email`, `retorno`
- **Retorno:** contém o ID do agendamento criado

> `local_id` e `especialidade_id` serão obtidos dos dados já mapeados no médico. Se `local_id` não existir no mapeamento atual, usaremos `1` (padrão) ou o valor de `app_settings`.

---

## BLOCO 2 — Migration: campos Feegow na tabela `consultas`

Adicionar 4 colunas à tabela `consultas`, todas nullable e opcionais:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `feegow_agendamento_id` | `text` | ID externo retornado pela Feegow |
| `feegow_sync_status` | `text` | `pendente`, `enviado`, `erro` |
| `feegow_sync_at` | `timestamptz` | Data/hora da última tentativa |
| `feegow_sync_error` | `text` | Mensagem de erro, se houver |

Nenhuma constraint NOT NULL, nenhum default automático, nenhum trigger novo.

---

## BLOCO 3 — Edge function `feegow-criar-agendamento`

Fluxo completo:

1. Validar autenticação + `has_role(admin)`
2. Receber `consulta_id` no body
3. Buscar consulta local com joins (médico, paciente)
4. **Anti-duplicidade:** se `feegow_agendamento_id` já existir → erro 409
5. Validar `medico.feegow_professional_id` existe
6. Validar `medico.feegow_especialidade_id` existe
7. Validar `paciente.feegow_paciente_id` existe
8. Montar payload com dados da consulta (data, hora, valor, especialidade, profissional, paciente)
9. Chamar `POST /appoints/new-appoint` na Feegow com timeout 30s
10. Em caso de sucesso: atualizar `feegow_agendamento_id`, `feegow_sync_status = 'enviado'`, `feegow_sync_at`
11. Em caso de erro: atualizar `feegow_sync_status = 'erro'`, `feegow_sync_error`
12. Gravar log em `integracoes_logs` (origem `edge_function`, status `success`/`error`)
13. Retornar resultado completo ao admin

Segurança:
- Somente admin
- Sem retry automático
- Logs mascaram CPF/telefone
- Paciente/médico nunca veem IDs Feegow

---

## BLOCO 4 — UI Admin

Na página de detalhes da consulta (ou na lista de consultas admin), adicionar:

- **Botão "Enviar para Feegow"** — visível apenas para admin
- Modal de confirmação com resumo do payload antes de enviar
- Após envio, mostrar:
  - Status sync (enviado / erro / pendente)
  - ID Feegow retornado
  - Data da sincronização
  - Erro (se houver)
- Botão desabilitado se `feegow_agendamento_id` já existe (anti-duplicidade visual)
- Botão "Reenviar" disponível SOMENTE se status = `erro` (retry manual)

Local provável: componente novo `FeegowSyncConsulta.tsx` usado dentro da view admin de consultas.

---

## BLOCO 5 — Validação e testes

1. Chamar edge function com consulta sem `feegow_paciente_id` → esperar erro amigável
2. Chamar com consulta sem médico vinculado → erro amigável
3. Criação bem-sucedida → salvar ID externo, status `enviado`
4. Tentar duplicar → erro 409
5. Verificar logs em `integracoes_logs`
6. Build limpo

---

## BLOCO 6 — Relatório final

Ao concluir, entregarei:
- Endpoint usado e payload validado
- Campos obrigatórios confirmados
- Consulta criada com ID Feegow
- Logs persistidos
- Riscos restantes documentados
- Readiness para automação futura

---

## Detalhes técnicos

- Edge function segue o mesmo padrão de auth das existentes (`feegow-vincular-profissional`)
- `FEEGOW_TOKEN` e `FEEGOW_API_URL` já estão como secrets configurados
- `feegow_especialidade_id` vem da tabela `medicos` (já preenchido na vinculação)
- `local_id` será buscado de `app_settings` ou padrão `1`
- Timeout de 30s via `AbortController`
- Nenhum cron, webhook, ou automação criada
