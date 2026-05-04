
# Problema: Slots da agenda nao aparecem no site publico

Dois problemas encontrados:

## 1. Slots Particulares -- RLS bloqueia usuarios nao logados

A policy RLS da tabela `agenda_slots` para SELECT so permite `authenticated`:

```
"Slots disponiveis publicos a autenticados" -- roles: {authenticated}
```

O componente `MedicoSlotsPanel` (usado na pagina "Agendar consulta") faz query direta na tabela `agenda_slots`. Visitantes nao logados (como mostrado no screenshot com "Entrar" no menu) nao veem nenhum slot.

**Solucao**: Alterar a policy RLS para incluir o role `anon`, permitindo que visitantes nao logados vejam slots disponiveis:

```sql
DROP POLICY "Slots disponíveis públicos a autenticados" ON agenda_slots;
CREATE POLICY "Slots disponíveis visíveis publicamente"
  ON agenda_slots FOR SELECT
  TO authenticated, anon
  USING (status = 'disponivel');
```

## 2. Servicos da Plataforma -- funcao SQL filtra apenas o dia atual

A funcao `fn_servico_slots_disponiveis` recebe `_data` (uma data) e filtra `s.inicio::date = _data`. O front-end passa `new Date().toISOString().slice(0, 10)` (hoje). Se os slots foram criados para dias futuros (ex: 8 de maio), nao aparecem.

**Solucao**: Modificar a funcao para mostrar slots de hoje em diante (ou os proximos N dias), em vez de filtrar por um unico dia. Tambem adicionar um seletor de data no front-end (`ServicoDetalhe.tsx`), similar ao que o `MedicoSlotsPanel` ja faz com paginacao por dia.

### Alteracoes:

**Migration SQL:**
- Atualizar RLS policy para incluir `anon`
- Recriar `fn_servico_slots_disponiveis` para aceitar intervalo de datas (ou remover filtro de dia unico, retornando proximos 7-14 dias)

**Front-end (`ServicoDetalhe.tsx`):**
- Remover filtro de dia unico na chamada RPC, ou passar intervalo
- Adicionar navegacao por dia (similar ao calendario do `MedicoSlotsPanel`) para que o paciente possa ver slots futuros
- Agrupar slots por data e exibir com paginacao

**Front-end (`MedicoSlotsPanel.tsx`):**
- Nenhuma alteracao necessaria (ja funciona com slots futuros), so depende da RLS corrigida

## Resumo das mudancas

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | RLS: adicionar `anon` ao SELECT; recriar `fn_servico_slots_disponiveis` sem filtro de dia unico |
| `src/pages/public/ServicoDetalhe.tsx` | Passar intervalo de datas na RPC; adicionar navegacao por dia/semana |

Nenhuma alteracao em `MedicoSlotsPanel.tsx` -- so a RLS resolve.
