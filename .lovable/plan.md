## Objetivo

Estabilizar telemedicina priorizando **link fixo por médico**. Google Calendar passa a ser apenas complemento (lembrete na agenda do médico). Consulta online nunca nasce sem `link_sala`.

## Diagnóstico atual

- Trigger `consulta_preencher_link_sala` JÁ existe e copia `medicos.link_sala_padrao` → `consultas.link_sala` em todo INSERT online sem link. Cobre 100% dos fluxos de criação (RPC paciente, webhook Stripe, admin, colaborador, troca de médico, RPC `criar_consulta_pos_pagamento`, `confirmar_agendamento_v2`, etc.) — não precisa tocar em fluxo nenhum.
- O problema atual: a única médica aprovada (Nágila) está com `tipo_sala='dinamico'` e `link_sala_padrao` vazio. Por isso as consultas nascem sem link e dependem do Google Meet dinâmico (que falha silenciosamente).
- Trigger `agenda_slot_exige_link_sala` hoje aceita `tipo_sala='dinamico'` sem link. Precisa endurecer para exigir link fixo sempre.

## Plano (cirúrgico, sem mexer em UI do paciente)

### 1. Migration — congelar modo "fixo" como padrão operacional

- Forçar todos os médicos aprovados sem `link_sala_padrao` a configurarem antes de oferecer slot online.
- Atualizar `agenda_slot_exige_link_sala`: SEMPRE exigir `link_sala_padrao` para slot online, independente de `tipo_sala`. Modo dinâmico fica como código morto (preservado, mas não selecionável na prática).
- Atualizar o default de `medicos.tipo_sala` para `'fixo'`.
- Reset: para a Nágila (e qualquer médico em `dinamico` sem link), voltar `tipo_sala='fixo'` para a UI exibir o campo de link fixo obrigatório.
- Trigger `consulta_preencher_link_sala` permanece como está (já cobre todos os fluxos via INSERT em `consultas`).

### 2. Google Calendar vira complemento

- `syncConsultaToGoogle` continua sendo chamado fire-and-forget após pagamento (já está).
- Edge function `google-calendar-sync`: ajustar para que, se o médico tiver `link_sala` (fixo), o evento Google Calendar seja criado apenas como lembrete usando o link fixo do médico no campo `location` / descrição. NÃO gerar Meet dinâmico, NÃO sobrescrever `consultas.link_sala`.
- Falha do Google = log silencioso, consulta segue normal (já é o comportamento, só reforçar).

### 3. Lembrete de troca de link a cada 30 dias (no dashboard do médico)

- Adicionar coluna `medicos.link_sala_padrao_atualizado_em` (timestamp).
- Trigger `BEFORE UPDATE` em `medicos`: quando `link_sala_padrao` mudar, gravar `now()`.
- Backfill com `now()` para médicos atuais que já têm link.
- Card no `MedicoDashboard` (componente novo `LembreteTrocarLinkSala`):
  - Se `link_sala_padrao` está vazio → CTA vermelho "Configurar link da sua sala" → leva para perfil.
  - Se `link_sala_padrao_atualizado_em` > 30 dias → card amarelo "Recomendamos trocar seu link de sala (X dias sem alteração)" com botão "Atualizar agora" e "Lembrar depois" (dismiss local de 7 dias via localStorage).
  - Caso contrário, não exibe nada.

### 4. UI do médico — perfil

- Na tela de perfil do médico, deixar bem claro que o link é fixo e que pode ser trocado quando quiser. Mostrar "última atualização há X dias". Não bloquear, só sinalizar.

### 5. Validação

- Migration roda → Nágila volta para `tipo_sala='fixo'`.
- Pedir ao usuário (ou já preencher via SQL de teste) um `link_sala_padrao` fixo para Nágila.
- Teste mecânico: paciente agenda slot online → paga (mock) → query `consultas.link_sala` deve nascer = `link_sala_padrao` da médica, **sem depender** do Google.
- Confirmar via query: novas consultas têm `link_sala` ≠ NULL e ≠ link `meet.google.com` dinâmico.

## Fora de escopo

- Não remover código de Meet dinâmico (fica como opção futura).
- Não mexer em UI do paciente.
- Não mexer em schema além do necessário (1 coluna nova + 1 trigger de timestamp + ajuste em trigger existente).
