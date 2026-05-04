
## Diagnóstico completo

Analisei toda a cadeia: rotas, views, RPCs, dashboards admin/medico, e a lógica de slots.

### Problemas encontrados

**1. ServicoDetalhe não mostra médicos (todas os serviços, não só PA)**
O `fn_ranking_medico_servico` retorna `{ error, data: null }` para usuários anon, mas o código usa `try/catch` que nunca captura esse erro (o SDK do Supabase não lança exceções). Resultado: `ids = []` sempre para visitantes não logados.

**2. Serviço PA aparece na listagem /servicos e leva à página errada**
O serviço "Atendimento Imediato Clínico" tem `tipo = 'consulta'` e o filtro na listagem é `.neq('tipo', 'pronto_atendimento')`, então ele aparece normalmente. Ao clicar, vai para `/servicos/atendimento-imediato` (ServicoDetalhe genérico com listagem de médicos), mas deveria ir para `/atendimento-imediato` (calendário compartilhado).

**3. Todos os serviços da plataforma deveriam ter calendário compartilhado**
O usuário pediu que serviços da plataforma tenham o mesmo padrão do PA: calendário compartilhado onde o paciente escolhe horário e o sistema escolhe o médico. A página ServicoDetalhe atual mostra uma lista de médicos individuais, o que é o padrão para consultas particulares, não para serviços da plataforma.

## Plano de correção

### 1. Corrigir fallback do ranking em ServicoDetalhe (bug geral)

Em `src/pages/public/ServicoDetalhe.tsx`, trocar o `try/catch` por checagem de `error`:

```
const { data: rk, error: rkErr } = await supabase.rpc(...)
if (!rkErr && rk) {
  ids = rk.map(...)
} else {
  // fallback: busca direto em medico_servicos
}
```

### 2. Redirect PA para a página dedicada

No `ServicoDetalhe`, após carregar o serviço, verificar se o `id` do serviço carregado coincide com o `atendimento_imediato.servico_id` do `app_settings`. Se sim, redirecionar para `/atendimento-imediato`.

Isso garante que qualquer link para `/servicos/atendimento-imediato` leve automaticamente ao calendário compartilhado.

### 3. Transformar ServicoDetalhe em calendário compartilhado para TODOS os serviços da plataforma

Refatorar a página `ServicoDetalhe` para usar o mesmo padrão de calendário do PA:
- Criar uma RPC genérica `fn_servico_slots_disponiveis(servico_id, data)` que retorna slots disponíveis para qualquer serviço, agrupados por horário com contagem de vagas (similar ao `fn_pa_slots_disponiveis` mas parametrizado)
- Reutilizar os componentes `CalendarioFila`, `SlotCelula` e `RodapeReserva` do atendimento imediato
- Mostrar: valor, duração, calendário de horários por turno (Manhã/Tarde/Noite)
- Ao selecionar horário: sistema aloca o melhor médico disponível pelo ranking
- Criar RPCs `fn_servico_reservar_slot` e `fn_servico_confirmar_reserva` (baseadas nas do PA)

### 4. Na listagem /servicos, separar visualmente o PA

Na página `Servicos.tsx`, o serviço de PA continua na listagem mas com destaque visual (badge "Atendimento Imediato") e link direto para `/atendimento-imediato`.

## Migration necessária

- `fn_servico_slots_disponiveis(servico_id uuid, data date)` — retorna slots do serviço com vagas
- `fn_servico_reservar_slot(slot_inicio timestamptz, servico_id uuid)` — reserva slot no serviço
- `fn_servico_confirmar_reserva(slot_id uuid)` — confirma reserva

## Arquivos impactados

- `src/pages/public/ServicoDetalhe.tsx` — reescrever com calendário compartilhado
- `src/pages/public/Servicos.tsx` — link PA para rota correta
- Migration com 3 novas RPCs

## Sem impacto em
- Dashboard médico ou admin (não muda nada na geração de horários)
- Financeiro, gamificação, ranking (as funções de ranking são usadas internamente pelas RPCs)
- Atendimento Imediato dedicado (continua funcionando independente)
