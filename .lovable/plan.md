
# Etapa 1 — Criar RPCs faltantes para Central de Integrações

## Problema
A página `AdminIntegracoes.tsx` chama duas funções RPC que não existem no banco:
1. **`integracoes_dashboard`** (linha 97) — retorna KPIs zerados
2. **`event_reprocessar`** (linha 129) — impede reprocessar eventos com erro

## Solução

Uma única migration SQL criando as duas funções:

### 1. `integracoes_dashboard()`
Retorna JSON com 5 contadores usados nos KPIs:
- `conectadas` — integrações com status `conectado`
- `simuladas` — integrações com `modo_simulado = true`
- `erros` — integrações com status `erro`
- `eventos_pendentes` — eventos na `event_queue` com status `pending` ou `processing`
- `pendencias_criticas` — pendências abertas com prioridade `critica`

Função `SECURITY DEFINER` (somente admin acessa a página via guard existente).

### 2. `event_reprocessar(p_event_id uuid)`
Reseta um evento `failed` ou `cancelled`:
- Define `status = 'pending'`, `attempts = 0`, `error_message = NULL`, `scheduled_for = now()`
- Retorna `void`
- Valida que o evento existe e está em status reprocessável
- `SECURITY DEFINER` com `search_path = public`

### Impacto
- Zero alterações em código frontend (já consome essas RPCs)
- Zero impacto em outros módulos
- Nenhuma tabela nova, nenhuma coluna nova
