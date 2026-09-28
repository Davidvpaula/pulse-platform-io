# Admin — retomada funcional local

Atualizado em 28/09/2026. Esta etapa retoma a construção após a [auditoria dos dashboards](../auditoria-dashboards/README.md). As alterações de banco foram aplicadas somente ao Supabase local, com dados fictícios. Não houve implantação no banco remoto.

## Acessar

- Admin com gravação real no banco local: <http://127.0.0.1:8082/auth>. Clique em **Entrar como administrador**.
- Convites capturados localmente: <http://127.0.0.1:54324>.
- Atalho: [ABRIR-ADMIN-LOCAL.html](../../ABRIR-ADMIN-LOCAL.html).
- Para reiniciar: abra o Docker Desktop e execute [INICIAR-ADMIN-LOCAL.cmd](../../INICIAR-ADMIN-LOCAL.cmd). Também pode usar `npm run admin:local` na pasta do projeto. Node >=22.12 e dependências instaladas são necessários.
- O preview antigo em 8080 continua sendo uma demonstração sem persistência; a validação funcional desta etapa usa 8082.

O inicializador sobe os serviços locais, aplica migrações pendentes com `--local`, prepara as contas fictícias e inicia frontend/Edge Functions. Não usa `db reset`, não apaga volumes e não sincroniza banco remoto. Logs ficam em `logs/`. Mantenha o terminal aberto enquanto usa os processos iniciados por ele.

As credenciais fictícias são geradas e armazenadas em arquivos ignorados pelo Git (`.admin-fixtures.local` e `.env.localbackend.local`). O cartão automático exige desenvolvimento e frontend/backend em loopback. Nunca use essas contas em um ambiente real. As funções internas de convite usam o Mailpit local; chamadas de integrações externas pelo cliente são bloqueadas neste modo. Isso não substitui isolamento de rede do servidor nem habilita Feegow, Meta ou pagamentos.

## Correções entregues

| Área | Alteração | Evidência |
|---|---|---|
| Banco e RLS | Restauradas permissões de execução de helpers usados nas políticas; verificação de identidade em helpers que recebem usuário | Leituras reais e varredura de rotas |
| Relatórios e agenda | Correção de agregação inválida, parâmetro de especialidade, autorização do relatório diário e relacionamentos ausentes | RPCs locais e telas sem erros HTTP |
| Planos | Consulta usa `nome_completo` do paciente | Rota local |
| Permissões | Respostas com `error` interrompem sucesso; template/cópia/limpeza em transação; template preserva bloqueios; cache ligado à identidade e atualizado periodicamente | Testes unitários e API com admin/colaborador |
| Suspensão | Colaborador não ativo não recebe permissões por grants ou perfil | Implementação SQL; precisa ampliar testes dos fluxos completos de suspensão |
| Inspeção | Tela explícita de cadastro/permissões do alvo; identidade do Admin preservada; log próprio validado pelo servidor; bloqueio de gravações pelo transporte do cliente | API e navegador, incluindo recarga da página |
| Dashboard | Exportação CSV e link de relatório habilitados; CSV trata aspas, quebras e fórmulas | Testes unitários e download no navegador |
| Financeiro | Erros de RPC deixam de ser anunciados como sucesso; lote informa falhas | Revisão e teste do helper; fluxos financeiros completos ainda pendentes |
| Paciente | Correção do parâmetro de autorização, remoção de coluna inexistente e checagem de falhas de persistência | Convite e cadastro fictício persistidos |
| Colaborador | Atribuição de role usa identidade autenticada do administrador; erros não são ignorados na atualização | Convite e cadastro fictício persistidos |
| Saúde | Diagnósticos usam consultas válidas; removida geração de alertas durante verificação de leitura | Rota local |

**Inspeção não é emulação do dashboard do alvo.** O recurso exibe um cadastro administrativo somente leitura. O token continua sendo do administrador; não há promessa de revogação das capacidades desse token fora do cliente. A RPC de inspeção restringe alvo, titular do log e duração no banco.

## Validação executada

- [57 rotas sem erros capturados de página/API](rotas-local.json), com sessão administrativa real e banco local. A varredura observa o carregamento por janela limitada; não cobre cada aba ou botão.
- [Operações de banco e convites](operacoes-local.json): FAQ, permissões, bloqueio de autoelevação, inspeção, validação de entrada e criação de paciente/colaborador. Os cadastros descartáveis são removidos ao terminar; os logs de auditoria podem permanecer.
- [Operações no navegador](navegador-local.json): exportar CSV, criar/editar/excluir FAQ e iniciar/recarregar/encerrar inspeção.
- `npm run typecheck` aprovado, **51 testes unitários aprovados** e build de produção concluído. O build mantém avisos de tamanho de chunks e imports mistos. Consulte [build.txt](build.txt).
- Dois testes de navegação no build de produção aprovados: acesso automático local e editor não são disponibilizados.
- Inicializador executado com a stack existente: migrações em dia, fixtures preservadas e serviços reutilizados.

Reexecutar operações: `npm run admin:test`. Reexecutar a varredura: `npm run admin:routes`. Os testes de navegador usam Chrome instalado e bloqueiam destinos externos.

## Pendências para concluir o Admin inteiro

Esta entrega não certifica todas as funções das 75 declarações de rota do inventário original. Permanecem:

1. Homologar cada ação com dados representativos: contratos, B2B, planos, serviços, agenda, cupons, cancelamentos, repasses e reembolsos. Carregamento sem erro não comprova gravações ou cálculos.
2. Resolver a divergência entre telas delegáveis e RPCs exclusivas de admin (ADM-03) e revisar a granularidade financeira com usuários delegados (ADM-05).
3. Ampliar cenários concorrentes, erros parciais de cadastros/convites e ordenação de conteúdo. Os convites Auth e as gravações seguintes ainda são operações separadas.
4. Validar os demais dashboards contra as alterações compartilhadas de permissões e sessão.
5. Rotas com parâmetros, integrações externas e funcionalidades dependentes de provedores não fazem parte da varredura de 57 telas. Feegow, Meta, webhooks e novos provedores continuam fora do escopo autorizado desta etapa.

As cinco migrações `20260928100000` a `20260928104000` estão versionadas para revisão e implantação futura. Os relacionamentos adicionados com `NOT VALID` não certificam registros históricos de um banco remoto. Nenhum dado remoto foi consultado para esta validação.
