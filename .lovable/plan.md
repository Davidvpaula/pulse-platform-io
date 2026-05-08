# Validação E2E do Inbox no preview — 12 passos

Validação assistida via browser automation. Vou executar os passos abaixo na rota `/app/comunicacao/inbox`, usando a conversa `[SMOKE-TEST] inbox-rpc` (id `57b6229f-…`) e o paciente de teste já criado no smoke test (`8a9541c4-…`). Como exige interações que **gravam dados** (vincular, confirmar, definir ativo), preciso sair do plan mode para executar.

## Pré-requisitos

- Você precisa estar logado no preview como **admin** (a sessão atual mostra `/app/admin/dashboard` — provavelmente já está)
- Conversa de teste já existe (smoke test não foi limpo)

## Roteiro de validação

| # | Ação | O que confere |
|---|------|---------------|
| 1 | Navegar para `/app/comunicacao/inbox` | Lista carrega, conversa `[SMOKE-TEST] inbox-rpc` aparece |
| 2 | Selecionar a conversa de teste | Painel central abre com mensagem inbound; painel direito renderiza |
| 3 | Inspecionar bloco **Janela Meta 24h** | Badge de cor (verde/amarela/vermelha) com tempo restante |
| 4 | Inspecionar **Pacientes vinculados** | Mostra `[SMOKE-TEST] Paciente Teste` confirmado + ⭐ ativo (vem do smoke test) |
| 5 | Confirmar **LGPD gate liberado** | Bloco "Consulta Vinculada" / "Médico Vinculado" visíveis (já tem vínculo confirmado) |
| 6 | Clicar **Liberar** (header) | Lock removido, badge "Humano" some, status volta |
| 7 | Clicar **Assumir** | Lock retorna com seu nome, status `em_atendimento` |
| 8 | Abrir dialog **Vincular paciente** | Sugestão por telefone aparece; busca funciona |
| 9 | Vincular um segundo paciente (qualquer real) como teste | Aparece como ⚠ pendente |
| 10 | Conferir **LGPD gate** ainda liberado (já há 1 confirmado) | Bloco clínico continua visível |
| 11 | Clicar **Ver audit log** | Sheet lateral abre com timeline (assumir, liberar, vincular_paciente, etc.) |
| 12 | Verificar realtime | Abrir 2ª aba na mesma conversa, assumir em uma — outra atualiza sem refresh |

## Passos que **não** vou executar (destrutivos / fora do escopo)

- ❌ Excluir vínculos
- ❌ Trocar paciente ativo do smoke test (mantém estado para inspeção futura)
- ❌ Finalizar conversa
- ❌ Alterar webhook/IA/RLS
- ❌ Vincular pacientes reais permanentemente — se eu vincular no passo 9, removo logicamente ao final via `removido_em`

## Saída esperada

Relatório com:
- ✅/❌ por passo
- Screenshots dos momentos-chave (painel direito, audit drawer, gate LGPD)
- Lista de bugs encontrados (se houver)
- Confirmação de que nenhum arquivo foi alterado

## Caso encontre bug

Paro, reporto, e só edito código com sua aprovação.

Aprova para sair do plan mode e executar a validação?
