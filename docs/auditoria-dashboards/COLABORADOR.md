# Auditoria — Secretaria / Colaborador

## Modelo funcional

Este é **um único dashboard configurado pelo administrador**, não um conjunto fixo de privilégios de secretaria. A entrada canônica é `/app/colaborador/dashboard`. Os papéis legados `secretaria` e `supervisor` são normalizados para `colaborador` em [auth.tsx](../../src/lib/auth.tsx). O supervisor usa a mesma estrutura e recebe capacidades adicionais, como fila da equipe. As páginas ainda guardam nomes `Secretaria*`; isso é organização técnica legada, não separação de produto.

Há 18 declarações canônicas do colaborador, 15 aliases de secretaria e um curinga de supervisor. [Inventário completo de rotas e funções](INVENTARIO-COLABORADOR.md).

## Funções encontradas

| Área | Funções / mecanismos |
|---|---|
| Central operacional | Consultas do dia, fila por urgência, pagamentos pendentes, indicadores e atalhos |
| Pacientes | Lista e perfil compartilhado; cadastro, histórico e ferramentas dos componentes vinculados |
| Agenda | Agenda geral, agendamentos e ações operacionais |
| Financeiro | Painel financeiro, cupons e log de uso |
| Equipe | Tarefas, comunicação interna, supervisão e produtividade |
| Relatórios | Indicadores operacionais |
| Integrações | Pendências Feegow |
| Capacidades administrativas delegáveis | Auditoria e gamificação, quando a permissão correspondente estiver liberada |
| Perfil | Dados do colaborador |

Os detalhes de handlers, fontes de dados e integrações de cada página estão no inventário. Comunicação externa, templates e métricas estão também no [relatório compartilhado](COMUNICACAO.md).

## Mecânica de permissões

O [catálogo do menu](../../src/lib/menu/menuCatalog.ts) declara chaves por item. O layout consulta [usePermissionsBatch](../../src/lib/permissions/usePermissionsBatch.ts); as rotas usam [RequireRoutePermission](../../src/components/permissions/RequireRoutePermission.tsx), que consulta outro hook, [usePermission](../../src/lib/permissions/usePermission.ts). Menu oculto não é controle de segurança do servidor.

Na última definição de `has_permission` localizada em [migração de permissões](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql), o administrador passa diretamente; fora disso, um revoke individual prevalece sobre grant individual, função interna e padrão do papel. A função interna exige colaborador ativo. A configuração usa `permissoes_colaborador`, `function_permissions`, `permissoes_perfil` e `permissions_catalog`.

O administrador dispõe de `permissoes_efetivas`, concessão/revogação, restauração do padrão, templates e cópia de overrides no [drawer de permissões](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx). As RPCs de alteração consultadas exigem admin no servidor. Uma chave que libera a página de configuração a um não admin não garante que ele possa gravar.

## Achados

### COL-01 — Alta — Suspensão não bloqueia todas as fontes de permissão

**Confirmado na definição SQL consultada; impacto efetivo a validar.** `status_conta = 'ativo'` só participa do ramo de função interna. Um grant individual ou padrão de role ainda pode fazer `has_permission` retornar verdadeiro para um colaborador suspenso. Não há guard de status do colaborador envolvendo todo `/app/colaborador`.

Correção: aplicar regra global de status antes das concessões, definir exceções explícitas e conferir as políticas que ainda usam apenas roles. Aceite: colaborador suspenso com grant individual e padrão de role não lê nem altera recursos operacionais, inclusive via RPC direta.

### COL-02 — Alta — Revogação não atualiza de forma confiável as telas abertas

**Confirmado no código.** Os dois hooks de permissão têm mapas de cache independentes. `usePermission` declara compartilhamento no comentário, mas não usa o cache de `usePermissionsBatch` nem assina Realtime. Seu efeito depende somente da lista de chaves. O Realtime do batch limpa um Map, sem notificar os hooks montados para recarregar. TTL só é observado numa próxima consulta, não dispara atualização.

Correção: usar uma fonte reativa única, invalidar estado e consulta em mudanças de identidade/permissão, tratar timeout/rejeição. Aceite: conceder e revogar em outra sessão atualiza menu, página e botões sem recarregar; servidor nega imediatamente a ação revogada.

### COL-03 — Alta — Dashboard inicial não respeita capacidades por bloco

**Confirmado no frontend; exposição de registros depende da RLS.** [SecretariaDashboard](../../src/pages/app/secretaria/SecretariaDashboard.tsx) consulta fila/valores e mostra atalhos financeiros, pacientes e agenda sem as respectivas verificações. Só o bloco de supervisor consulta `supervisor.fila_geral`. Dashboard, tarefas, comunicação interna e perfil não têm guard de papel/permissão no roteador além da sessão geral.

Correção: definir capacidades básicas e condicionar consultas, blocos e ações às permissões. Verificar acesso direto por paciente/empresa, não apenas navegação pelo menu.

### COL-04 — Média — Alias de paciente perde o identificador

**Confirmado em [App.tsx](../../src/App.tsx).** `/app/secretaria/pacientes/:id` redireciona para a string literal `/app/colaborador/pacientes/:id`. `Navigate` não substitui esse parâmetro. Correção: construir o destino com `useParams`. Aceite: uma URL legada com UUID mantém o mesmo UUID no destino.

### COL-05 — Média — Menu e rota de operação usam permissões diferentes

**Confirmado.** O item Operação exige `comunicacao.metricas.operacionais`, mas `/app/admin/comunicacao/operacao` exige `admin.dashboard`. O colaborador pode receber um item visível e encontrar acesso restrito. Alinhar as chaves e o controle do backend.

### COL-06 — Média — Ações da fila são demonstrativas

**Incompleto.** Confirmar, remarcar e cancelar na central operacional só chamam toast, inclusive “Consulta confirmada (em breve: ação real)”. Não há persistência nesses handlers. Implementar os fluxos com permissão por ação e retorno real, ou identificar os controles como indisponíveis.

### COL-07 — Média — Contagens limitadas e fila sem atualização temporal

**Confirmado.** A consulta do dashboard usa `limit(50)` e calcula totais e valores sobre esse subconjunto. A urgência é calculada no carregamento e no memo dependente de consultas, sem relógio de atualização. Mais de 50 consultas subestima indicadores; uma tela aberta pode manter prioridades antigas. Separar agregados do paginador e atualizar o relógio.

## Critérios para o dashboard modelável

- Admin define função interna e overrides individuais, com prévia fiel do menu e registro do motivo.
- Leitura, criação, edição, cancelamento, exportação e acesso a documentos são capacidades distintas, aplicadas em UI e backend.
- Nenhum bloco consulta dados proibidos apenas porque ficará oculto depois.
- Templates respeitam a regra explicitada de preservar/redefinir overrides; concessões em lote devem ser atômicas.
- Cobrir colaborador sem permissões, secretaria, financeiro, suporte, supervisor, revogação em sessão aberta e conta suspensa.

Status: inventário e auditoria estática realizados; falhas acima ainda não corrigidas nesta entrega.
