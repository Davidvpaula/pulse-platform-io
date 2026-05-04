
## Problema encontrado

A página de Atendimento Imediato não mostra horários porque a função de banco `fn_pa_slots_disponiveis` tem **duas falhas**:

1. **Chave errada no app_settings** — A função busca `key = 'atendimento_imediato'` e tenta `value->>'servico_id'`, mas o app salva com `key = 'atendimento_imediato.servico_id'` e o value é diretamente o UUID (`a3fa895b-...`). Resultado: a CTE `pa_cfg` retorna vazio, e a função retorna zero linhas.

2. **Não filtra por servico_id no slot** — Mesmo se corrigisse a chave, a query junta `agenda_slots` apenas por `medico_id`, sem verificar `s.servico_id = pa_cfg.servico_id`. Isso mostraria slots de qualquer tipo (particular, outros serviços) em vez de apenas os do PA.

Os horários existem (17 slots disponíveis com `servico_id = a3fa895b-...` para hoje), a config existe (`atendimento_imediato.servico_id`), e o médico está vinculado ao serviço. O problema é só na função SQL.

## Plano de correção

### 1. Migration: recriar `fn_pa_slots_disponiveis`

Alterar a CTE `pa_cfg` para:
- Buscar `key = 'atendimento_imediato.servico_id'` (a chave real)
- Extrair o value como texto puro convertido para UUID: `(value #>> '{}')::uuid`

Adicionar filtro no JOIN principal:
- `JOIN pa_cfg ON s.servico_id = pa_cfg.servico_id` para garantir que só retorne slots criados especificamente para o serviço de PA.

### 2. Nenhuma alteração em código frontend

A página `AtendimentoImediato.tsx` e os componentes de calendário já estão corretos. O problema é exclusivamente no banco.

### Impacto
- Nenhum impacto em ranking, gamificação ou financeiro
- Nenhuma tabela nova ou coluna alterada
- Apenas a função SQL é recriada com a query corrigida
