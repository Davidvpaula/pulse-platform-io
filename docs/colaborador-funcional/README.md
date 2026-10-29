# Colaborador / Secretaria — etapa operacional local

Atualizado em 29/10/2026. Dashboard único, configurado pelas permissões concedidas pelo Admin. Esta etapa valida a central, operações de agenda, pacientes e tarefas pessoais no Supabase local; não certifica todos os módulos para produção.

## Entregue

| Área e rota | Comportamento |
|---|---|
| /app/colaborador/dashboard | Totais reais do dia, fila paginada em 50 registros e pagamentos em aberto de todos os períodos. Cada área depende da permissão correspondente. |
| Central: confirmar/cancelar | RPC valida conta ativa, permissão da ação e transição de status. Cancelamento libera o horário vinculado; não representa reembolso. |
| /app/colaborador/agenda e /agendamentos | Criação manual atômica, validação de paciente/médico/horário e preço no servidor. Reserva concorrente não cria duas consultas. Troca de médico exige permissão, valida especialidade e transfere o horário. |
| /app/colaborador/tarefas | Tarefas pessoais persistentes, prioridade, prazo, filtro, paginação e avanço/reabertura. Sem pacientes ou atividades fictícias apresentados como reais. |
| /app/colaborador/pacientes | Busca por nome, CPF ou ID exato e paginação no servidor, 50 por página, sem corte nos primeiros 500. Filtro pelo status real da conta. Contagem de consultas como paciente atendido e indicação de pagamento em aberto exigem permissões próprias. Erro de carga tem opção de tentar novamente. |
| /app/colaborador/pacientes/:id | Consultas, financeiro/planos, comunicação e auditoria carregam apenas com a permissão correspondente. Observações exigem pacientes.editar e são salvas junto da auditoria em transação. Falhas de leitura têm opção de tentar novamente; troca de paciente limpa os dados anteriores. |
| /app/secretaria/pacientes/:id | Redirecionamento preserva o identificador e a busca da URL. |
| Login local | Cartão de colaborador autentica uma conta fictícia real no banco local. Ausente no build de produção. |
| Layout móvel compartilhado | Menu começa fechado no celular e fecha ao navegar ou reduzir a janela, evitando sobrepor botões. |

## Permissões e proteção

- agenda.ver_todas controla a agenda; pacientes.ver controla a identidade na central; financeiro.ver controla os totais financeiros.
- agenda.confirmar foi adicionada ao catálogo sem concessão automática. O Admin concede as capacidades necessárias.
- agenda.criar e pacientes.ver são exigidas para criar agendamento; agenda.trocar_medico para trocar o profissional; agenda.cancelar para cancelar.
- Conta suspensa ou removida é bloqueada pelo guard. A sessão aberta revalida o cadastro a cada 15 segundos. As RPCs desta etapa verificam o acesso em cada chamada.
- Políticas restritivas de banco impedem que permissões legadas por papel ignorem a suspensão nas tabelas públicas com RLS existentes na migração. Identidade básica permanece disponível para apresentar o bloqueio.
- Tarefas exigem proprietário e colaborador ativo. Não há atribuição a terceiros nesta etapa, nem acesso automático do Admin às tarefas pessoais de outra conta.
- O setup local preserva o status de colaboradores já cadastrados.

As migrações 20261027110000 até 20261027114000, 20261028110000, 20261028120000 e 20261028121000 estão versionadas. Não houve reset de banco, publicação remota ou integração externa.

## Validação executada

- 62 testes Vitest; TypeScript e build aprovados.
- Cenários integrados de banco/navegador em [testes-local.json](testes-local.json): permissões, total acima de 50, concorrência, troca de médico, confirmação, cancelamento, revogação com sessão aberta, suspensão, alias e tarefas persistentes/isoladas. A continuação acrescenta listagem de 53 pacientes, paginação, filtros de conta, busca por ID, ocultação de agregados sem permissão e recuperação de falha de carga.
- Regressões de API do Admin, Médico e Paciente aprovadas; resultados nos respectivos diretórios de documentação.
- 2 testes do bundle de produção aprovados: seletor local e editor local não ficam expostos.
- [rotas-local.json](rotas-local.json) registra a navegação com as permissões da conta local. Uma rota que apresenta acesso restrito não equivale a uma função testada. Esse relatório não cobre todos os botões.
- Foram percorridas 15 rotas sem erros HTTP/JavaScript na execução isolada; 8 exibiram acesso restrito conforme as permissões da conta.
- Build ainda emite avisos de chunks grandes e imports estáticos/dinâmicos.

Comandos: npm run colaborador:test; npm run colaborador:routes; npm run typecheck; npm test; npm run build. Para os testes de produção neste computador, definir PLAYWRIGHT_CHANNEL=chrome.

Executar as suítes que usam as contas locais em sequência: testes do Admin alteram permissões e podem revogar sessões. Não executar navegação do colaborador ao mesmo tempo. O verificador de rotas falha se houver erros ou perda de sessão.

## Pendências e sequência

1. Pacientes/detalhe: autorização, erros, notas auditadas, transições de status, registro interno de reembolso, paginação de todas as abas e totais históricos foram implementados. Revisar cadastro e fluxo completo de análise/execução de reembolso. Os atalhos abrem agenda/comunicação; não prometem pré-selecionar paciente ou enviar mensagem externa. Validar desempenho da busca e agregações em volumes de produção.
2. Revisar supervisão, comunicação, financeiro delegado e gamificação por ação; revisar RPCs legadas SECURITY DEFINER, que não são protegidas apenas adicionando RLS às tabelas.
3. Agendamento manual usa a primeira especialidade ativa configurada do profissional; adicionar seleção explícita quando houver múltiplas. Troca com preço diferente e pagamento pago/processando é rejeitada; conciliação/reembolso ficam pendentes.
4. Avaliar trilha de auditoria e vínculo da conversa após troca de profissional; testar cenários de pagamento, conta removida e matrizes adicionais de permissão.
5. Concluir dashboard Empresa e regressão cruzada; depois preparar Supabase independente, configuração de produção, backups, monitoramento e servidor.

Novas tabelas precisam de políticas próprias. A restrição adicionada às tabelas existentes não se propaga automaticamente. Não conectar dados reais ou anunciar prontidão de produção antes dessas revisões.

### Continuação: detalhe do paciente

Financeiro e planos usam financeiro.ver; consultas usam agenda.ver_todas (médicos continuam sujeitos às políticas de suas consultas); comunicação usa comunicacao.ver_inbox; auditoria usa auditoria.ver. URL com aba proibida abre a visão geral. Políticas restritivas adicionais protegem a leitura de reembolsos, assinaturas e auditoria para colaboradores. Conversas continuam sujeitas às políticas existentes de distribuição/acesso; revisar integralmente no módulo de comunicação.

paciente_salvar_observacoes exige conta operacional ativa, pacientes.ver e pacientes.editar, limita o texto a 10 mil caracteres, trava o paciente e grava nota/auditoria na mesma transação. A tela não anuncia sucesso se a gravação falhar. Essa garantia é da RPC; revisar caminhos legados de escrita direta antes da produção.

paciente_reembolsos_recentes permanece no banco para compatibilidade. A tela passou a usar paciente_historico_pagina para todas as áreas. Nenhuma dessas operações de leitura executa solicitações, aprovações ou repasses financeiros.

### Continuação: histórico paginado — 29/10/2026

A migração 20261029110000 adiciona paciente_historico_pagina como SECURITY INVOKER, preservando RLS e exigindo a permissão de cada área. Consultas, pagamentos, reembolsos, assinaturas, conversas e auditoria têm páginas de 50 registros, contagem completa e ordenação com ID como desempate. O médico acessa apenas o histórico permitido pelas políticas de vínculo; não recebe acesso financeiro por ser médico.

Os totais são calculados no banco sobre todos os registros visíveis, independentemente da página. Total pago (bruto) soma pagamentos com status pago, reembolsado ou reembolsado_parcial; Reembolsado soma valor_reembolsado_centavos dos pagamentos, não pedidos apenas aprovados. Consultas contam titular ou paciente atendido. Os pagamentos seguem o vínculo paciente_id existente; reconciliação de registros legados sem esse vínculo continua necessária.

Trocar de página preserva a aba e o texto em edição nas observações; trocar de paciente reinicia a navegação. Para solicitar reembolso de um pagamento antigo, navegar até a página que contém o pagamento. O seletor de solicitação usa os pagamentos elegíveis da página atual.

Testes cobrem 105 pagamentos distribuídos em três páginas, totais estáveis e reembolso parcial registrado, consultas sem repetição entre páginas, encerramento da paginação no navegador e isolamento do histórico entre médicos. Requisições separadas não fornecem um snapshot único entre páginas se houver gravações concorrentes; escala e desempenho devem ser avaliados antes de produção.

### Continuação: status e solicitações financeiras

Migrações 20261028130000 e 20261028131000:

- Status exige pacientes.ver, conta operacional ativa e a capacidade específica: pacientes.suspender, pacientes.bloquear, pacientes.banir ou pacientes.reativar. As duas últimas foram incluídas no catálogo sem concessão automática. Uma assinatura antiga redundante da função foi removida, preservando a RPC com parâmetros opcionais.
- Motivo obrigatório, rejeição de prazo passado, trava do paciente e auditoria na mesma transação. Conta banida deve ser reativada antes de outra transição. Colaborador com pacientes.editar não pode contornar o fluxo usando UPDATE direto.
- O prazo do bloqueio é registrado; esta etapa não implementa reativação automática por agendamento.
- Solicitação de reembolso exige pacientes.ver, financeiro.ver e pacientes.reembolsar. O pagamento precisa estar pago, vinculado a consulta e ao titular informado. Pagamentos sem consulta não são elegíveis nesta etapa.
- O servidor calcula o saldo considerando valores já reembolsados/aprovados/concluídos. Apenas uma solicitação pendente por pagamento; chamadas concorrentes são serializadas. Gravação direta por colaboradores foi retirada.
- A operação registra somente a solicitação e a auditoria. Não aprova, não transfere dinheiro e não envia notificações externas. O fluxo completo de aprovação, conciliação e execução permanece pendente.
- Testes locais cobrem capacidades distintas, bloqueio pelo navegador, prazo passado, titular incorreto, valor acima do saldo, concorrência e tentativa de escrita direta. Dados financeiros usados são fictícios.

## Acesso

Com Docker aberto, executar INICIAR-PLATAFORMA-LOCAL.cmd e manter o terminal ativo. Abrir ABRIR-COLABORADOR-LOCAL.html ou http://127.0.0.1:8082/auth e selecionar “Entrar como colaborador”. Permissões são ajustadas pelo Admin; ferramentas externas continuam desativadas.
