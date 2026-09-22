# Auditoria — Médico

## Rotas e funções

Entrada: `/app/medico/dashboard`; 24 declarações de rota. [Inventário de cada rota, função e integração](INVENTARIO-MEDICO.md).

| Área | Funções encontradas |
|---|---|
| Onboarding | Aprovação, perfil/CRM, especialidades, sala, dados bancários, termos e treinamento |
| Atendimento | Agenda, horários, consultas, pacientes e perfil compartilhado |
| Clínico | Documentos, prescrições e controle de compartilhamento empresarial |
| Financeiro | Receitas, repasses e componentes de saque |
| Configuração | Perfil, sala e integração Google Calendar/callback |
| Crescimento | Serviços, planos, gamificação, premium, campanhas e ROI |
| B2B | Atuação corporativa e propostas |
| Comunicação | Notificações e comunicação interna; mensagens redirecionadas |

## Mecânica

As rotas operacionais usam [MedicoGuard](../../src/components/MedicoGuard.tsx) com [useMedicoAtual](../../src/lib/useMedicoAtual.ts). Pendente/em análise vai para aprovação; reprovado/suspenso/bloqueado é bloqueado; aprovado prossegue. A página de aguardar aprovação está fora desse guard, mas dentro do layout autenticado.

[MedicoDashboard](../../src/pages/app/medico/MedicoDashboard.tsx) combina estado do cadastro, consultas, termos, treinamento, ranking e saldo. Usa tanto `useCan`/abilities estático quanto permissões do banco. Sala fixa é o modo descrito no dashboard. Google Calendar é integrado por Edge Functions; documentos e prescrições passam por [clinico.ts](../../src/lib/clinico.ts).

## Achados

### MED-01 — Alta — Prescrição simulada grava na tabela clínica

**Confirmado.** [MedicoDocumentos](../../src/pages/app/medico/MedicoDocumentos.tsx) chama `emitirPrescricaoSimulada`. O helper insere medicamentos fixos e orientações de demonstração na tabela `prescricoes`; não está condicionado ao ambiente local. O preview local bloqueia a gravação, mas esse bloqueio não vale para uma sessão real normal.

Correção: retirar emissão demonstrativa da operação real, separar fixtures de teste e concluir o fluxo clínico de autoria/validação. Aceite: nenhuma ação clínica real emite conteúdo fixo de demonstração; erros não viram sucesso e a autoria é verificável.

### MED-02 — Alta — Compartilhamento aplica-se a todos os anexos da consulta

**Confirmado em `toggleVisibilidadeEmpresa`.** O update usa somente `.eq('consulta_id', consultaId)`. O indicador é verdadeiro se qualquer anexo estiver compartilhado; ao alternar, todos passam ao mesmo estado. Isso pode compartilhar arquivos que estavam privados, embora o médico esteja olhando um conjunto misto.

Correção: granularidade por documento, lista explícita do que será compartilhado e auditoria; validar autorização e visibilidade no backend. Aceite: alterar um anexo não muda os demais.

### MED-03 — Média — Tratamento de falha incompleto nos documentos

**Confirmado.** `carregar` e `handleEmitir` usam awaits sem `try/finally`. Rejeição de transporte pode manter loading/emissão ativa. O mapa de visibilidade só é substituído quando há anexos; deve ser limpo ao carregar conjunto vazio. Testar falha de rede e troca de conjunto de documentos.

### MED-04 — Média — Regras de acesso fragmentadas

**Confirmado no frontend; efeito a validar por jornada.** O dashboard mistura papel, matriz estática `useCan` e `financeiro.ver`, enquanto `/medico/financeiro` usa somente MedicoGuard. Ainda há comparação com `profileKey === 'secretaria'`, apesar da normalização para colaborador. Definir o contrato entre permissão administrativa, propriedade do médico e acesso à própria receita.

### MED-05 — Média — Callback sem limpeza dos redirecionamentos

**Confirmado em [MedicoGoogleCallback](../../src/pages/app/medico/MedicoGoogleCallback.tsx).** Os timers de navegação não são cancelados no cleanup. Sair antes do prazo pode causar redirecionamento posterior. Revisão adicional precisa conferir state/nonce e idempotência de troca de código na Edge Function; a ausência desses controles no componente não prova ausência no backend.

## Validação necessária

Testar estados cadastrais, isolamento entre dois médicos, acesso ao prontuário por vínculo, início/conclusão concorrente de consulta, documentos privados/compartilhados, expiração de integração e consistência receita/repasse. Sem chamada real a provedores nesta entrega.

Status: inventário e revisão estática documentados; fluxo clínico e financeiro ainda precisa de homologação isolada.
