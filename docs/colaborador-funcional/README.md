# Colaborador / Secretaria — etapa operacional local

Atualizado em 28/10/2026. Dashboard único, configurado pelas permissões concedidas pelo Admin. Esta etapa valida a central, operações de agenda e tarefas pessoais no Supabase local; não certifica todos os módulos para produção.

## Entregue

| Área e rota | Comportamento |
|---|---|
| /app/colaborador/dashboard | Totais reais do dia, fila paginada em 50 registros e pagamentos em aberto de todos os períodos. Cada área depende da permissão correspondente. |
| Central: confirmar/cancelar | RPC valida conta ativa, permissão da ação e transição de status. Cancelamento libera o horário vinculado; não representa reembolso. |
| /app/colaborador/agenda e /agendamentos | Criação manual atômica, validação de paciente/médico/horário e preço no servidor. Reserva concorrente não cria duas consultas. Troca de médico exige permissão, valida especialidade e transfere o horário. |
| /app/colaborador/tarefas | Tarefas pessoais persistentes, prioridade, prazo, filtro, paginação e avanço/reabertura. Sem pacientes ou atividades fictícias apresentados como reais. |
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

As migrações 20261027110000 até 20261027114000 estão versionadas. Não houve reset de banco, publicação remota ou integração externa.

## Validação executada

- 62 testes Vitest; TypeScript e build aprovados.
- 9 cenários integrados de banco/navegador em [testes-local.json](testes-local.json): permissões, total acima de 50, concorrência, troca de médico, confirmação, cancelamento, revogação com sessão aberta, suspensão, alias e tarefas persistentes/isoladas.
- Regressões de API do Admin, Médico e Paciente aprovadas; resultados nos respectivos diretórios de documentação.
- 2 testes do bundle de produção aprovados: seletor local e editor local não ficam expostos.
- [rotas-local.json](rotas-local.json) registra a navegação com as permissões da conta local. Uma rota que apresenta acesso restrito não equivale a uma função testada. Esse relatório não cobre todos os botões.
- Foram percorridas 15 rotas sem erros HTTP/JavaScript na execução isolada; 8 exibiram acesso restrito conforme as permissões da conta.
- Build ainda emite avisos de chunks grandes e imports estáticos/dinâmicos.

Comandos: npm run colaborador:test; npm run colaborador:routes; npm run typecheck; npm test; npm run build. Para os testes de produção neste computador, definir PLAYWRIGHT_CHANNEL=chrome.

Executar as suítes que usam as contas locais em sequência: testes do Admin alteram permissões e podem revogar sessões. Não executar navegação do colaborador ao mesmo tempo. O verificador de rotas falha se houver erros ou perda de sessão.

## Pendências e sequência

1. Concluir pacientes/detalhe: paginação de grandes volumes, contagens completas, erros de carga e rótulos que ainda dependem de estado Feegow. O cadastro existente e seus fluxos precisam de cobertura específica do colaborador.
2. Revisar supervisão, comunicação, financeiro delegado e gamificação por ação; revisar RPCs legadas SECURITY DEFINER, que não são protegidas apenas adicionando RLS às tabelas.
3. Agendamento manual usa a primeira especialidade ativa configurada do profissional; adicionar seleção explícita quando houver múltiplas. Troca com preço diferente e pagamento pago/processando é rejeitada; conciliação/reembolso ficam pendentes.
4. Avaliar trilha de auditoria e vínculo da conversa após troca de profissional; testar cenários de pagamento, conta removida e matrizes adicionais de permissão.
5. Concluir dashboard Empresa e regressão cruzada; depois preparar Supabase independente, configuração de produção, backups, monitoramento e servidor.

Novas tabelas precisam de políticas próprias. A restrição adicionada às tabelas existentes não se propaga automaticamente. Não conectar dados reais ou anunciar prontidão de produção antes dessas revisões.

## Acesso

Com Docker aberto, executar INICIAR-PLATAFORMA-LOCAL.cmd e manter o terminal ativo. Abrir ABRIR-COLABORADOR-LOCAL.html ou http://127.0.0.1:8082/auth e selecionar “Entrar como colaborador”. Permissões são ajustadas pelo Admin; ferramentas externas continuam desativadas.
