
## Diagnóstico

Foram identificadas **2 causas-raiz** para os erros:

### Erro 1: "PA não configurado" (Atendimento Imediato)

A RPC `fn_pa_reservar_slot` busca a configuração com:
```sql
SELECT (value->>'servico_id')::uuid FROM app_settings WHERE key = 'atendimento_imediato'
```

Mas a configuração real no banco usa:
- **Chave:** `atendimento_imediato.servico_id`  
- **Valor:** UUID direto (`a3fa895b-...`), não um JSON com campo `servico_id`

Todas as outras funções (`fn_pa_slots_disponiveis`, frontend, admin) usam a chave correta. Apenas `fn_pa_reservar_slot` está errada.

### Erro 2: "Erro ao reservar" (Serviço da Plataforma)

A RPC `fn_servico_reservar_slot` funciona corretamente em termos de lógica, mas:
- Se o usuário logado **não tem perfil de paciente**, retorna "Perfil de paciente não encontrado" que é engolido pelo frontend genérico "Erro ao reservar"
- O frontend não exibe a mensagem de erro específica da RPC corretamente em todos os cenários

---

## Plano de ação

### Etapa 1: Migration - Corrigir `fn_pa_reservar_slot`

Atualizar a RPC para usar a chave correta:

```sql
-- DE (errado):
SELECT (value->>'servico_id')::uuid FROM app_settings WHERE key = 'atendimento_imediato';

-- PARA (correto, igual fn_pa_slots_disponiveis):
SELECT (value #>> '{}')::uuid FROM app_settings WHERE key = 'atendimento_imediato.servico_id';
```

Também adicionar:
- Filtro `s.servico_id = _pa_servico_id` nos SELECTs (consistência com `fn_pa_slots_disponiveis`)
- Validação de perfil paciente + `reservado_por`
- Mensagens de erro específicas

### Etapa 2: Melhorar tratamento de erro no frontend

Nos dois componentes (`AtendimentoImediato.tsx` e `ServicoDetalhe.tsx`), melhorar o toast de erro para exibir a mensagem real da RPC ao invés de mensagem genérica. Atualmente o código já faz `(data as any)?.erro || "Erro ao reservar..."` mas quando a RPC retorna um `error` de rede (não um `data.erro`), a mensagem se perde.

### Arquivos alterados

| Arquivo | Tipo | O que muda |
|---------|------|------------|
| Migration SQL | DB | Corrige `fn_pa_reservar_slot` |
| `src/pages/public/AtendimentoImediato.tsx` | Frontend | Melhor exibicao de erro |
| `src/pages/public/ServicoDetalhe.tsx` | Frontend | Melhor exibicao de erro |

### Impacto em outros módulos
Nenhum. As RPCs e componentes alterados são auto-contidos.
