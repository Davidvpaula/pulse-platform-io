
# Fase 2 — Agenda Feegow Somente Leitura

## Objetivo
Consultar a agenda/disponibilidade de profissionais Feegow vinculados e exibir no Admin para conferência. **Zero escrita na Feegow.**

---

## BLOCO 1 — Descobrir endpoints reais de agenda

A edge function `feegow-agenda-readonly` testará múltiplos endpoints da API Feegow em modo diagnóstico:

| # | Endpoint | Método | Parâmetros |
|---|----------|--------|------------|
| 1 | `/appoints/list` | GET | `profissional_id`, `data_inicio`, `data_fim` |
| 2 | `/appoints/list` | POST | body com `profissional_id`, `data_inicio`, `data_fim` |
| 3 | `/appoints/schedule` | GET | `profissional_id`, `data` |
| 4 | `/professional/schedule` | GET | `profissional_id`, `data_inicio`, `data_fim` |
| 5 | `/schedule/list` | GET | `profissional_id`, `data` |
| 6 | `/appoints/available-slots` | GET | `profissional_id`, `data` |

O modo `diagnostico` testa todos e retorna status/resposta de cada um. O modo `agenda` usa o endpoint que funcionar.

Todos os resultados (URL, método, status HTTP, resposta resumida, se retornou agenda real) são registrados em `integracoes_logs`.

---

## BLOCO 2 — Edge function `feegow-agenda-readonly`

Nova edge function: `supabase/functions/feegow-agenda-readonly/index.ts`

**Entrada (POST):**
```json
{
  "medico_id": "uuid",
  "data_inicio": "2026-05-07",
  "data_fim": "2026-05-14",
  "mode": "agenda" | "diagnostico"
}
```

**Validações:**
- Autenticação obrigatória (Bearer token)
- Apenas admin (has_role)
- medico_id deve existir na tabela `medicos`
- Médico deve ter `feegow_professional_id` preenchido
- Rejeita se sem vínculo

**Comportamento:**
- Modo `diagnostico`: testa todos os endpoints, retorna relatório completo
- Modo `agenda`: consulta o endpoint funcional, retorna eventos/horários
- Registra log em `integracoes_logs` (ação: `consultar_agenda_feegow`)
- Não altera nenhum dado além do log

---

## BLOCO 3 — UI Admin

Na página `FeegowProfissionais.tsx`, para médicos vinculados:

- Novo botão **"Ver agenda Feegow"** (ícone calendário)
- Abre Dialog com:
  - Seletor de período (data início/fim, padrão: próximos 7 dias)
  - Botão "Consultar"
  - Tabela/lista de eventos retornados (data, hora, status, paciente se disponível)
  - Empty state: "Nenhum evento encontrado no período"
  - Erro: mensagem clara + detalhes técnicos colapsáveis
  - Banner fixo: "Somente leitura — não altera agenda na Feegow"
- Botão **"Diagnóstico de endpoints"** para admins testarem quais endpoints funcionam

---

## BLOCO 4 — Segurança

- Nenhuma operação de escrita na Feegow
- Apenas parâmetros de consulta enviados (profissional_id, datas)
- Acesso restrito a admin
- IDs Feegow não expostos a paciente/médico
- Sem cron, webhook ou automação

---

## BLOCO 5 — Validação

Após implementação, testar via `curl_edge_functions`:
1. Médico sem vínculo → erro amigável
2. Médico com vínculo → consulta agenda (modo diagnóstico primeiro)
3. Sem dados → empty state
4. Erro Feegow → log + mensagem clara
5. Build TypeScript limpo

---

## BLOCO 6 — Relatório final

Após testes, entregar relatório com:
- Endpoints testados e resultados
- Endpoint funcional identificado
- Parâmetros corretos
- Exemplo de retorno
- Logs criados
- Riscos restantes
- Readiness para futura criação manual de agendamento

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/feegow-agenda-readonly/index.ts` | Criar |
| `src/pages/app/admin/FeegowProfissionais.tsx` | Adicionar botão + dialog agenda |

Nenhuma migration necessária (logs já existem em `integracoes_logs`).
