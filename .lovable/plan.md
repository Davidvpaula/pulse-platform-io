## Objetivo

Remover o botão **Pagamentos** (e o painel expansível associado) de cada card na lista `PacienteAgendamentos`. Informações de pagamento já estão acessíveis em **Financeiro do paciente**, então mantê-las no card duplica espaço e polui as ações.

## Mudanças

Arquivo: `src/pages/app/paciente/PacienteAgendamentos.tsx`

- Remover botão `Pagamentos` (linhas ~322–328) e o bloco expansível `{expandedPag === c.id && <ConsultaPagamentos … />}` (linhas ~330–333).
- Remover o estado `expandedPag` / `setExpandedPag` (linha 59) — fica órfão.
- Remover imports não usados após a limpeza:
  - `ConsultaPagamentos` (linha 30)
  - `ChevronDown` e `Receipt` do `lucide-react` se não forem mais referenciados.
- Conferir TS para garantir que nenhum outro local usa `expandedPag`.

## Resultado

Card final do paciente: `[Status] [Entrar] [WhatsApp] [Remarcar] [Cancelar]` — sem o item Pagamentos. Quem precisar do detalhe vai em **Financeiro**.

## Fora de escopo

- Página `PacienteFinanceiro` (já mostra pagamentos).
- Card do médico/colaborador (mantém Pagamentos onde existir).
