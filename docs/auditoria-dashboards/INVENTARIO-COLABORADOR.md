# Inventário técnico — colaborador

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (34)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/secretaria/dashboard` | Redireciona para `/app/colaborador/dashboard` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:315](../../src/App.tsx#L315) |
| `/app/secretaria/pacientes/:id` | Redireciona para `/app/colaborador/pacientes/:id` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:316](../../src/App.tsx#L316) |
| `/app/secretaria/pacientes` | Redireciona para `/app/colaborador/pacientes` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:317](../../src/App.tsx#L317) |
| `/app/secretaria/agenda` | Redireciona para `/app/colaborador/agenda` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:318](../../src/App.tsx#L318) |
| `/app/secretaria/agendamentos` | Redireciona para `/app/colaborador/agendamentos` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:319](../../src/App.tsx#L319) |
| `/app/secretaria/cupons/log` | Redireciona para `/app/colaborador/cupons/log` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:320](../../src/App.tsx#L320) |
| `/app/secretaria/cupons` | Redireciona para `/app/colaborador/cupons` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:321](../../src/App.tsx#L321) |
| `/app/secretaria/comunicacao` | Redireciona para `/app/colaborador/dashboard` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:322](../../src/App.tsx#L322) |
| `/app/secretaria/financeiro` | Redireciona para `/app/colaborador/financeiro` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:323](../../src/App.tsx#L323) |
| `/app/secretaria/tarefas` | Redireciona para `/app/colaborador/tarefas` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:324](../../src/App.tsx#L324) |
| `/app/secretaria/equipe` | Redireciona para `/app/colaborador/equipe` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:325](../../src/App.tsx#L325) |
| `/app/secretaria/relatorios` | Redireciona para `/app/colaborador/relatorios` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:326](../../src/App.tsx#L326) |
| `/app/secretaria/comunicacao-interna` | Redireciona para `/app/colaborador/comunicacao-interna` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:327](../../src/App.tsx#L327) |
| `/app/secretaria/perfil` | Redireciona para `/app/colaborador/perfil` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:328](../../src/App.tsx#L328) |
| `/app/secretaria/pendencias-integracao` | Redireciona para `/app/colaborador/pendencias-integracao` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:329](../../src/App.tsx#L329) |
| `/app/supervisor/*` | Redireciona para `/app/colaborador/dashboard` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:332](../../src/App.tsx#L332) |
| `/app/colaborador/dashboard` | [src/pages/app/secretaria/SecretariaDashboard.tsx](../../src/pages/app/secretaria/SecretariaDashboard.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:335](../../src/App.tsx#L335) |
| `/app/colaborador/pacientes` | [src/pages/app/secretaria/SecretariaPacientes.tsx](../../src/pages/app/secretaria/SecretariaPacientes.tsx) | Permissão "pacientes.ver" (uma basta, se lista) | [src/App.tsx:336](../../src/App.tsx#L336) |
| `/app/colaborador/pacientes/:id` | [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) | Permissão "pacientes.ver" (uma basta, se lista) | [src/App.tsx:337](../../src/App.tsx#L337) |
| `/app/colaborador/agenda` | [src/pages/app/secretaria/SecretariaAgenda.tsx](../../src/pages/app/secretaria/SecretariaAgenda.tsx) | Permissão "agenda.ver_todas" (uma basta, se lista) | [src/App.tsx:338](../../src/App.tsx#L338) |
| `/app/colaborador/agendamentos` | [src/pages/app/secretaria/SecretariaAgendamentos.tsx](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx) | Permissão "agenda.ver_todas" (uma basta, se lista) | [src/App.tsx:339](../../src/App.tsx#L339) |
| `/app/colaborador/cupons` | [src/pages/app/secretaria/SecretariaCupons.tsx](../../src/pages/app/secretaria/SecretariaCupons.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:340](../../src/App.tsx#L340) |
| `/app/colaborador/cupons/log` | [src/pages/app/shared/CuponsUsoLog.tsx](../../src/pages/app/shared/CuponsUsoLog.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:341](../../src/App.tsx#L341) |
| `/app/colaborador/financeiro` | [src/pages/app/secretaria/SecretariaFinanceiro.tsx](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx) | Permissão "financeiro.ver" (uma basta, se lista) | [src/App.tsx:342](../../src/App.tsx#L342) |
| `/app/colaborador/tarefas` | [src/pages/app/shared/Tarefas.tsx](../../src/pages/app/shared/Tarefas.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:343](../../src/App.tsx#L343) |
| `/app/colaborador/equipe` | [src/pages/app/supervisor/SupervisorDashboard.tsx](../../src/pages/app/supervisor/SupervisorDashboard.tsx) | Permissão "supervisor.fila_geral" (uma basta, se lista) | [src/App.tsx:344](../../src/App.tsx#L344) |
| `/app/colaborador/relatorios` | [src/pages/app/secretaria/SecretariaRelatorios.tsx](../../src/pages/app/secretaria/SecretariaRelatorios.tsx) | Permissão "relatorios.ver_operacional" (uma basta, se lista) | [src/App.tsx:345](../../src/App.tsx#L345) |
| `/app/colaborador/produtividade` | Redireciona para `/app/colaborador/equipe` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:346](../../src/App.tsx#L346) |
| `/app/colaborador/comunicacao-interna` | [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:347](../../src/App.tsx#L347) |
| `/app/colaborador/perfil` | [src/pages/app/colaborador/ColaboradorPerfil.tsx](../../src/pages/app/colaborador/ColaboradorPerfil.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:348](../../src/App.tsx#L348) |
| `/app/colaborador/pendencias-integracao` | [src/pages/app/shared/PendenciasIntegracao.tsx](../../src/pages/app/shared/PendenciasIntegracao.tsx) | Permissão "supervisor.pendencias_feegow" (uma basta, se lista) | [src/App.tsx:349](../../src/App.tsx#L349) |
| `/app/colaborador/auditoria` | [src/pages/app/admin/AdminAuditoria.tsx](../../src/pages/app/admin/AdminAuditoria.tsx) | Permissão "auditoria.ver" (uma basta, se lista) | [src/App.tsx:350](../../src/App.tsx#L350) |
| `/app/colaborador/gamificacao` | [src/pages/app/admin/AdminGamificacao.tsx](../../src/pages/app/admin/AdminGamificacao.tsx) | Permissão "gamificacao.configurar" (uma basta, se lista) | [src/App.tsx:351](../../src/App.tsx#L351) |
| `/app/colaborador/gamificacao/financeiro` | [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx) | Permissão "gamificacao.configurar" (uma basta, se lista) | [src/App.tsx:352](../../src/App.tsx#L352) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### AdminAuditoria.tsx

Fonte: [src/pages/app/admin/AdminAuditoria.tsx](../../src/pages/app/admin/AdminAuditoria.tsx) (645 linhas). Rotas: `/app/colaborador/auditoria`.

Funções da interface, conforme títulos e descrições: Auditoria; Rastreamento e análise de ações sensíveis na plataforma..

Funções nomeadas: [src/pages/app/admin/AdminAuditoria.tsx:49](../../src/pages/app/admin/AdminAuditoria.tsx#L49) `periodoInicial`; [src/pages/app/admin/AdminAuditoria.tsx:57](../../src/pages/app/admin/AdminAuditoria.tsx#L57) `linkEntidade`; [src/pages/app/admin/AdminAuditoria.tsx:72](../../src/pages/app/admin/AdminAuditoria.tsx#L72) `AdminAuditoria`; [src/pages/app/admin/AdminAuditoria.tsx:98](../../src/pages/app/admin/AdminAuditoria.tsx#L98) `handleTab`; [src/pages/app/admin/AdminAuditoria.tsx:156](../../src/pages/app/admin/AdminAuditoria.tsx#L156) `aplicarFiltros`; [src/pages/app/admin/AdminAuditoria.tsx:157](../../src/pages/app/admin/AdminAuditoria.tsx#L157) `limparFiltros`; [src/pages/app/admin/AdminAuditoria.tsx:166](../../src/pages/app/admin/AdminAuditoria.tsx#L166) `aplicarPreset`; [src/pages/app/admin/AdminAuditoria.tsx:196](../../src/pages/app/admin/AdminAuditoria.tsx#L196) `exportarCSV`; [src/pages/app/admin/AdminAuditoria.tsx:219](../../src/pages/app/admin/AdminAuditoria.tsx#L219) `exportarPDF`; [src/pages/app/admin/AdminAuditoria.tsx:233](../../src/pages/app/admin/AdminAuditoria.tsx#L233) `marcarRevisado`; [src/pages/app/admin/AdminAuditoria.tsx:637](../../src/pages/app/admin/AdminAuditoria.tsx#L637) `Field`.

Dados e integrações diretas: `rpc(auditoria_dashboard)` [src/pages/app/admin/AdminAuditoria.tsx:107](../../src/pages/app/admin/AdminAuditoria.tsx#L107); `rpc(auditoria_listar)` [src/pages/app/admin/AdminAuditoria.tsx:123](../../src/pages/app/admin/AdminAuditoria.tsx#L123); `rpc(auditoria_listar)` [src/pages/app/admin/AdminAuditoria.tsx:176](../../src/pages/app/admin/AdminAuditoria.tsx#L176); `from(audit_revisoes)` [src/pages/app/admin/AdminAuditoria.tsx:239](../../src/pages/app/admin/AdminAuditoria.tsx#L239); `from((dinâmico))` [src/pages/app/admin/AdminAuditoria.tsx:389](../../src/pages/app/admin/AdminAuditoria.tsx#L389); `from((dinâmico))` [src/pages/app/admin/AdminAuditoria.tsx:433](../../src/pages/app/admin/AdminAuditoria.tsx#L433); `from((dinâmico))` [src/pages/app/admin/AdminAuditoria.tsx:478](../../src/pages/app/admin/AdminAuditoria.tsx#L478).

Operações diretas detectadas: insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/typesAuditoria.ts](../../src/lib/relatorios/typesAuditoria.ts); [src/components/relatorios/KpiCard.tsx](../../src/components/relatorios/KpiCard.tsx); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/relatorios/pdfAuditoria.ts](../../src/lib/relatorios/pdfAuditoria.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminAuditoria.tsx:79](../../src/pages/app/admin/AdminAuditoria.tsx#L79): modulo: "todos", risco: "todos", origem: "todas",
- [src/pages/app/admin/AdminAuditoria.tsx:81](../../src/pages/app/admin/AdminAuditoria.tsx#L81): actorTipo: "todos", categoriaFinanceira: "", correlationId: "",
- [src/pages/app/admin/AdminAuditoria.tsx:126](../../src/pages/app/admin/AdminAuditoria.tsx#L126): p_modulo: aplicado.modulo === "todos" ? "todos" : aplicado.modulo,
- [src/pages/app/admin/AdminAuditoria.tsx:127](../../src/pages/app/admin/AdminAuditoria.tsx#L127): p_risco: aplicado.risco === "todos" ? "todos" : aplicado.risco,
- [src/pages/app/admin/AdminAuditoria.tsx:128](../../src/pages/app/admin/AdminAuditoria.tsx#L128): p_origem: aplicado.origem === "todas" ? "todos" : aplicado.origem,
- [src/pages/app/admin/AdminAuditoria.tsx:135](../../src/pages/app/admin/AdminAuditoria.tsx#L135): p_actor_tipo: aplicado.actorTipo \|\| "todos",
- [src/pages/app/admin/AdminAuditoria.tsx:160](../../src/pages/app/admin/AdminAuditoria.tsx#L160): modulo: "todos", risco: "todos", origem: "todas",
- [src/pages/app/admin/AdminAuditoria.tsx:162](../../src/pages/app/admin/AdminAuditoria.tsx#L162): actorTipo: "todos", categoriaFinanceira: "", correlationId: "",
- [src/pages/app/admin/AdminAuditoria.tsx:175](../../src/pages/app/admin/AdminAuditoria.tsx#L175): const buscarTodosEventos = useCallback(async (): Promise<EventoAuditoria[]> => {
- [src/pages/app/admin/AdminAuditoria.tsx:179](../../src/pages/app/admin/AdminAuditoria.tsx#L179): p_modulo: aplicado.modulo === "todos" ? "todos" : aplicado.modulo,
- [src/pages/app/admin/AdminAuditoria.tsx:180](../../src/pages/app/admin/AdminAuditoria.tsx#L180): p_risco: aplicado.risco === "todos" ? "todos" : aplicado.risco,
- [src/pages/app/admin/AdminAuditoria.tsx:181](../../src/pages/app/admin/AdminAuditoria.tsx#L181): p_origem: aplicado.origem === "todas" ? "todos" : aplicado.origem,
- [src/pages/app/admin/AdminAuditoria.tsx:188](../../src/pages/app/admin/AdminAuditoria.tsx#L188): p_actor_tipo: aplicado.actorTipo \|\| "todos",
- [src/pages/app/admin/AdminAuditoria.tsx:199](../../src/pages/app/admin/AdminAuditoria.tsx#L199): const todos = await buscarTodosEventos();
- [src/pages/app/admin/AdminAuditoria.tsx:204](../../src/pages/app/admin/AdminAuditoria.tsx#L204): todos.forEach((e) => linhas.push([
- [src/pages/app/admin/AdminAuditoria.tsx:211](../../src/pages/app/admin/AdminAuditoria.tsx#L211): toast.success(`CSV gerado com ${todos.length} evento(s)`);
- [src/pages/app/admin/AdminAuditoria.tsx:222](../../src/pages/app/admin/AdminAuditoria.tsx#L222): const todos = await buscarTodosEventos();
- [src/pages/app/admin/AdminAuditoria.tsx:223](../../src/pages/app/admin/AdminAuditoria.tsx#L223): gerarPdfAuditoria({ filtros: aplicado, dashboard: dash \|\| {}, eventos: todos, totalEventos: total });
- [src/pages/app/admin/AdminAuditoria.tsx:305](../../src/pages/app/admin/AdminAuditoria.tsx#L305): <SelectItem value="todos">Todas</SelectItem>
- [src/pages/app/admin/AdminAuditoria.tsx:315](../../src/pages/app/admin/AdminAuditoria.tsx#L315): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminAuditoria.tsx:347](../../src/pages/app/admin/AdminAuditoria.tsx#L347): <SelectItem value="todos">Todos</SelectItem>

### AdminGamificacao.tsx

Fonte: [src/pages/app/admin/AdminGamificacao.tsx](../../src/pages/app/admin/AdminGamificacao.tsx) (557 linhas). Rotas: `/app/colaborador/gamificacao`.

Funções da interface, conforme títulos e descrições: Gamificação & Ranking; Configure pesos, regras premium, CPC, saldo e monitore campanhas..

Funções nomeadas: [src/pages/app/admin/AdminGamificacao.tsx:26](../../src/pages/app/admin/AdminGamificacao.tsx#L26) `pct`; [src/pages/app/admin/AdminGamificacao.tsx:42](../../src/pages/app/admin/AdminGamificacao.tsx#L42) `AdminGamificacao`; [src/pages/app/admin/AdminGamificacao.tsx:52](../../src/pages/app/admin/AdminGamificacao.tsx#L52) `carregar`; [src/pages/app/admin/AdminGamificacao.tsx:89](../../src/pages/app/admin/AdminGamificacao.tsx#L89) `salvar`; [src/pages/app/admin/AdminGamificacao.tsx:109](../../src/pages/app/admin/AdminGamificacao.tsx#L109) `recalcular`; [src/pages/app/admin/AdminGamificacao.tsx:122](../../src/pages/app/admin/AdminGamificacao.tsx#L122) `handleTogglePremium`; [src/pages/app/admin/AdminGamificacao.tsx:135](../../src/pages/app/admin/AdminGamificacao.tsx#L135) `updateConfig`; [src/pages/app/admin/AdminGamificacao.tsx:139](../../src/pages/app/admin/AdminGamificacao.tsx#L139) `updateConfigInt`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/admin/AdminGamificacao.tsx:69](../../src/pages/app/admin/AdminGamificacao.tsx#L69); `from((dinâmico))` [src/pages/app/admin/AdminGamificacao.tsx:75](../../src/pages/app/admin/AdminGamificacao.tsx#L75).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminGamificacao.tsx:16](../../src/pages/app/admin/AdminGamificacao.tsx#L16): getRankingConfig, salvarRankingConfig, recalcularRankingTodos, listarRankingTop,
- [src/pages/app/admin/AdminGamificacao.tsx:32](../../src/pages/app/admin/AdminGamificacao.tsx#L32): const AUDIT_MOCK: { id: string; data: string; usuario: string; tipo: AuditTipo; campo: string; anterior: string; novo: string }[] = [];
- [src/pages/app/admin/AdminGamificacao.tsx:50](../../src/pages/app/admin/AdminGamificacao.tsx#L50): const [auditFiltro, setAuditFiltro] = useState<AuditTipo \| "todos">("todos");
- [src/pages/app/admin/AdminGamificacao.tsx:112](../../src/pages/app/admin/AdminGamificacao.tsx#L112): await recalcularRankingTodos();
- [src/pages/app/admin/AdminGamificacao.tsx:314](../../src/pages/app/admin/AdminGamificacao.tsx#L314): Médicos que atingem TODOS os critérios abaixo recebem Premium automaticamente ao recalcular o ranking.
- [src/pages/app/admin/AdminGamificacao.tsx:481](../../src/pages/app/admin/AdminGamificacao.tsx#L481): <Badge variant="outline" className="text-[10px]">Mock</Badge>
- [src/pages/app/admin/AdminGamificacao.tsx:483](../../src/pages/app/admin/AdminGamificacao.tsx#L483): <Select value={auditFiltro} onValueChange={(v) => setAuditFiltro(v as AuditTipo \| "todos")}>
- [src/pages/app/admin/AdminGamificacao.tsx:489](../../src/pages/app/admin/AdminGamificacao.tsx#L489): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminGamificacao.tsx:500](../../src/pages/app/admin/AdminGamificacao.tsx#L500): const filtered = auditFiltro === "todos"
- [src/pages/app/admin/AdminGamificacao.tsx:501](../../src/pages/app/admin/AdminGamificacao.tsx#L501): ? AUDIT_MOCK
- [src/pages/app/admin/AdminGamificacao.tsx:502](../../src/pages/app/admin/AdminGamificacao.tsx#L502): : AUDIT_MOCK.filter((a) => a.tipo === auditFiltro);

### AdminGamificacaoFinanceiro.tsx

Fonte: [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx) (259 linhas). Rotas: `/app/colaborador/gamificacao/financeiro`.

Funções da interface, conforme títulos e descrições: Financeiro da Gamificação; Receita de assinaturas premium, consumo CPC, conversões e métricas de ROI.; Exportar CSV.

Funções nomeadas: [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:17](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L17) `downloadCsv`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:18](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L18) `escape`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:30](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L30) `pct`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:32](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L32) `AdminGamificacaoFinanceiro`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:74](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L74) `exportKpis`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:92](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L92) `exportCampanhas`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:110](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L110) `exportPremium`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:49](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L49).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:11](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L11): listarTodasCampanhas, listarTodosPremium, getConversoesPorCampanha,
- [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:42](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L42): listarTodosPremium(),

### ColaboradorPerfil.tsx

Fonte: [src/pages/app/colaborador/ColaboradorPerfil.tsx](../../src/pages/app/colaborador/ColaboradorPerfil.tsx) (6 linhas). Rotas: `/app/colaborador/perfil`.

Funções nomeadas: [src/pages/app/colaborador/ColaboradorPerfil.tsx:3](../../src/pages/app/colaborador/ColaboradorPerfil.tsx#L3) `ColaboradorPerfil`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/pages/app/shared/PerfilGenerico.tsx](../../src/pages/app/shared/PerfilGenerico.tsx).

### SecretariaAgenda.tsx

Fonte: [src/pages/app/secretaria/SecretariaAgenda.tsx](../../src/pages/app/secretaria/SecretariaAgenda.tsx) (215 linhas). Rotas: `/app/colaborador/agenda`.

Funções da interface, conforme títulos e descrições: Agenda operacional; Visão por médico e por dia. Reatribua consultas quando um profissional faltar.; Trocar profissional; Histórico de mudanças; Abrir conversa; Faça login para acessar a agenda..

Funções nomeadas: [src/pages/app/secretaria/SecretariaAgenda.tsx:23](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L23) `offsetDate`; [src/pages/app/secretaria/SecretariaAgenda.tsx:32](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L32) `SecretariaAgenda`; [src/pages/app/secretaria/SecretariaAgenda.tsx:44](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L44) `carregar`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/secretaria/SecretariaAgenda.tsx:60](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L60).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/shared/ConsultaHistoricoDialog.tsx](../../src/components/shared/ConsultaHistoricoDialog.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/secretaria/TrocarMedicoDialog.tsx](../../src/components/secretaria/TrocarMedicoDialog.tsx); [src/components/secretaria/NovoAgendamentoDialog.tsx](../../src/components/secretaria/NovoAgendamentoDialog.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaAgenda.tsx:35](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L35): const [medico, setMedico] = useState<string>("Todos");
- [src/pages/app/secretaria/SecretariaAgenda.tsx:58](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L58): (c) => medico === "Todos" \|\| c.medico_nome === medico,
- [src/pages/app/secretaria/SecretariaAgenda.tsx:84](../../src/pages/app/secretaria/SecretariaAgenda.tsx#L84): <option>Todos</option>

### SecretariaAgendamentos.tsx

Fonte: [src/pages/app/secretaria/SecretariaAgendamentos.tsx](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx) (249 linhas). Rotas: `/app/colaborador/agendamentos`.

Funções da interface, conforme títulos e descrições: Agendamentos; Lista cronológica de todas as consultas — busca, filtros e ações operacionais.; Trocar médico; Histórico da consulta; Ver paciente.

Funções nomeadas: [src/pages/app/secretaria/SecretariaAgendamentos.tsx:40](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L40) `formatData`; [src/pages/app/secretaria/SecretariaAgendamentos.tsx:44](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L44) `SecretariaAgendamentos`; [src/pages/app/secretaria/SecretariaAgendamentos.tsx:55](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L55) `carregar`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/secretaria/SecretariaAgendamentos.tsx:95](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L95).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/secretaria/TrocarMedicoDialog.tsx](../../src/components/secretaria/TrocarMedicoDialog.tsx); [src/components/shared/ConsultaHistoricoDialog.tsx](../../src/components/shared/ConsultaHistoricoDialog.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaAgendamentos.tsx:23](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L23): { key: "todos", label: "Todos" },
- [src/pages/app/secretaria/SecretariaAgendamentos.tsx:49](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L49): const [filtro, setFiltro] = useState<typeof filtros[number]["key"]>("todos");
- [src/pages/app/secretaria/SecretariaAgendamentos.tsx:78](../../src/pages/app/secretaria/SecretariaAgendamentos.tsx#L78): if (filtro !== "todos" && c.status !== filtro) return false;

### SecretariaCupons.tsx

Fonte: [src/pages/app/secretaria/SecretariaCupons.tsx](../../src/pages/app/secretaria/SecretariaCupons.tsx) (314 linhas). Rotas: `/app/colaborador/cupons`.

Funções da interface, conforme títulos e descrições: Cupons de desconto; Crie cupons globais ou restritos a um médico/especialidade.; Editar; Remover.

Funções nomeadas: [src/pages/app/secretaria/SecretariaCupons.tsx:23](../../src/pages/app/secretaria/SecretariaCupons.tsx#L23) `formatData`; [src/pages/app/secretaria/SecretariaCupons.tsx:28](../../src/pages/app/secretaria/SecretariaCupons.tsx#L28) `SecretariaCupons`; [src/pages/app/secretaria/SecretariaCupons.tsx:39](../../src/pages/app/secretaria/SecretariaCupons.tsx#L39) `carregar`; [src/pages/app/secretaria/SecretariaCupons.tsx:84](../../src/pages/app/secretaria/SecretariaCupons.tsx#L84) `confirmarExcluir`; [src/pages/app/secretaria/SecretariaCupons.tsx:96](../../src/pages/app/secretaria/SecretariaCupons.tsx#L96) `alternar`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/cupons.ts](../../src/lib/cupons.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/components/secretaria/CupomDialog.tsx](../../src/components/secretaria/CupomDialog.tsx); [src/lib/session.tsx](../../src/lib/session.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaCupons.tsx:36](../../src/pages/app/secretaria/SecretariaCupons.tsx#L36): const [filtroEscopo, setFiltroEscopo] = useState<"todos" \| "global" \| "medico" \| "especialidade">("todos");
- [src/pages/app/secretaria/SecretariaCupons.tsx:37](../../src/pages/app/secretaria/SecretariaCupons.tsx#L37): const [filtroStatus, setFiltroStatus] = useState<"todos" \| "ativos" \| "inativos" \| "expirados" \| "esgotados">("todos");
- [src/pages/app/secretaria/SecretariaCupons.tsx:52](../../src/pages/app/secretaria/SecretariaCupons.tsx#L52): if (filtroEscopo !== "todos" && c.escopo !== filtroEscopo) return false;
- [src/pages/app/secretaria/SecretariaCupons.tsx:120](../../src/pages/app/secretaria/SecretariaCupons.tsx#L120): { key: "todos", label: "Total", value: contadores.total },
- [src/pages/app/secretaria/SecretariaCupons.tsx:155](../../src/pages/app/secretaria/SecretariaCupons.tsx#L155): <SelectItem value="todos">Todos os escopos</SelectItem>
- [src/pages/app/secretaria/SecretariaCupons.tsx:164](../../src/pages/app/secretaria/SecretariaCupons.tsx#L164): <SelectItem value="todos">Todos status</SelectItem>

### SecretariaDashboard.tsx

Fonte: [src/pages/app/secretaria/SecretariaDashboard.tsx](../../src/pages/app/secretaria/SecretariaDashboard.tsx) (355 linhas). Rotas: `/app/colaborador/dashboard`.

Funções da interface, conforme títulos e descrições: Central operacional; Tudo o que precisa de ação agora — fila, tarefas e pendências do dia.; Abrir conversa; Confirmar; Remarcar; Cancelar.

Funções nomeadas: [src/pages/app/secretaria/SecretariaDashboard.tsx:41](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L41) `useDashboardData`; [src/pages/app/secretaria/SecretariaDashboard.tsx:52](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L52) `load`; [src/pages/app/secretaria/SecretariaDashboard.tsx:109](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L109) `SecretariaDashboard`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/secretaria/SecretariaDashboard.tsx:59](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L59).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/permissions/usePermission.ts](../../src/lib/permissions/usePermission.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaDashboard.tsx:3](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L3): Calendar, Users, MessageCircle, Wallet, ListTodo, Plus, Phone,
- [src/pages/app/secretaria/SecretariaDashboard.tsx:112](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L112): const [filaFiltro, setFilaFiltro] = useState<"todos" \| "urgente" \| "aguardando">("todos");
- [src/pages/app/secretaria/SecretariaDashboard.tsx:146](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L146): filaFiltro === "todos" ? true :
- [src/pages/app/secretaria/SecretariaDashboard.tsx:156](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L156): hint: "consultas começando em breve",
- [src/pages/app/secretaria/SecretariaDashboard.tsx:260](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L260): { k: "todos", label: "Todos" },
- [src/pages/app/secretaria/SecretariaDashboard.tsx:305](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L305): <Button size="icon" variant="ghost" title="Confirmar" onClick={() => toast.success("Consulta confirmada (em breve: ação real)")}>
- [src/pages/app/secretaria/SecretariaDashboard.tsx:308](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L308): <Button size="icon" variant="ghost" title="Remarcar" onClick={() => toast("Remarcação (em breve: ação real)")}>
- [src/pages/app/secretaria/SecretariaDashboard.tsx:311](../../src/pages/app/secretaria/SecretariaDashboard.tsx#L311): <Button size="icon" variant="ghost" title="Cancelar" onClick={() => toast("Cancelamento (em breve: ação real)")}>

### SecretariaFinanceiro.tsx

Fonte: [src/pages/app/secretaria/SecretariaFinanceiro.tsx](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx) (142 linhas). Rotas: `/app/colaborador/financeiro`.

Funções da interface, conforme títulos e descrições: Financeiro; Cobranças e pagamentos; Pagamentos pendentes e cobranças.

Funções nomeadas: [src/pages/app/secretaria/SecretariaFinanceiro.tsx:13](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L13) `fmt`; [src/pages/app/secretaria/SecretariaFinanceiro.tsx:15](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L15) `SecretariaFinanceiro`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:28](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L28); `rpc((dinâmico))` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:29](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L29); `from(pagamentos)` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:38](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L38); `from(cobrancas_links)` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:40](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L40); `from((dinâmico))` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:82](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L82); `from((dinâmico))` [src/pages/app/secretaria/SecretariaFinanceiro.tsx:110](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L110).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/components/financeiro/NovaCobrancaDialog.tsx](../../src/components/financeiro/NovaCobrancaDialog.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaFinanceiro.tsx:94](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L94): <td className="p-2">{p.metodo \|\| p.forma \|\| "—"}</td>

### SecretariaPacientes.tsx

Fonte: [src/pages/app/secretaria/SecretariaPacientes.tsx](../../src/pages/app/secretaria/SecretariaPacientes.tsx) (260 linhas). Rotas: `/app/colaborador/pacientes`.

Funções da interface, conforme títulos e descrições: Pacientes; Busca global, status operacional e ações rápidas.; Editar; Agendar.

Funções nomeadas: [src/pages/app/secretaria/SecretariaPacientes.tsx:31](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L31) `SecretariaPacientes`; [src/pages/app/secretaria/SecretariaPacientes.tsx:40](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L40) `carregar`; [src/pages/app/secretaria/SecretariaPacientes.tsx:103](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L103) `create`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/secretaria/SecretariaPacientes.tsx:42](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L42); `from(consultas)` [src/pages/app/secretaria/SecretariaPacientes.tsx:53](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L53); `from(pagamentos)` [src/pages/app/secretaria/SecretariaPacientes.tsx:61](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L61); `invoke(admin-criar-paciente)` [src/pages/app/secretaria/SecretariaPacientes.tsx:113](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L113).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/secretaria/SecretariaPacientes.tsx:16](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L16): type StatusFilter = "todos" \| "ativo" \| "aguardando" \| "inadimplente";
- [src/pages/app/secretaria/SecretariaPacientes.tsx:33](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L33): const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
- [src/pages/app/secretaria/SecretariaPacientes.tsx:90](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L90): if (statusFilter !== "todos" && statusLabel !== statusFilter) return false;
- [src/pages/app/secretaria/SecretariaPacientes.tsx:134](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L134): todos: "",
- [src/pages/app/secretaria/SecretariaPacientes.tsx:164](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L164): {(["todos", "ativo", "aguardando", "inadimplente"] as StatusFilter[]).map(s => (

### SecretariaRelatorios.tsx

Fonte: [src/pages/app/secretaria/SecretariaRelatorios.tsx](../../src/pages/app/secretaria/SecretariaRelatorios.tsx) (246 linhas). Rotas: `/app/colaborador/relatorios`.

Funções da interface, conforme títulos e descrições: Relatórios operacionais; Indicadores de operação clínica — visíveis para Secretaria com permissão de supervisão..

Funções nomeadas: [src/pages/app/secretaria/SecretariaRelatorios.tsx:19](../../src/pages/app/secretaria/SecretariaRelatorios.tsx#L19) `SecretariaRelatorios`; [src/pages/app/secretaria/SecretariaRelatorios.tsx:25](../../src/pages/app/secretaria/SecretariaRelatorios.tsx#L25) `carregar`; [src/pages/app/secretaria/SecretariaRelatorios.tsx:215](../../src/pages/app/secretaria/SecretariaRelatorios.tsx#L215) `ModalidadeBar`; [src/pages/app/secretaria/SecretariaRelatorios.tsx:230](../../src/pages/app/secretaria/SecretariaRelatorios.tsx#L230) `Linha`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/secretaria/SecretariaRelatorios.tsx:67](../../src/pages/app/secretaria/SecretariaRelatorios.tsx#L67).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/utils.ts](../../src/lib/utils.ts).

### ComunicacaoInterna.tsx

Fonte: [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) (571 linhas). Rotas: `/app/colaborador/comunicacao-interna`.

Funções da interface, conforme títulos e descrições: Comunicação interna; Faça login para acessar.; Comunicação interna da equipe; Mensagens entre Secretaria, Médicos, Admin e Empresas — separado das conversas com pacientes (WhatsApp)..

Funções nomeadas: [src/pages/app/shared/ComunicacaoInterna.tsx:81](../../src/pages/app/shared/ComunicacaoInterna.tsx#L81) `ComunicacaoInterna`; [src/pages/app/shared/ComunicacaoInterna.tsx:192](../../src/pages/app/shared/ComunicacaoInterna.tsx#L192) `enviarMensagem`; [src/pages/app/shared/ComunicacaoInterna.tsx:209](../../src/pages/app/shared/ComunicacaoInterna.tsx#L209) `criarThread`; [src/pages/app/shared/ComunicacaoInterna.tsx:235](../../src/pages/app/shared/ComunicacaoInterna.tsx#L235) `alterarStatus`; [src/pages/app/shared/ComunicacaoInterna.tsx:248](../../src/pages/app/shared/ComunicacaoInterna.tsx#L248) `alterarPrioridade`.

Dados e integrações diretas: `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:107](../../src/pages/app/shared/ComunicacaoInterna.tsx#L107); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:126](../../src/pages/app/shared/ComunicacaoInterna.tsx#L126); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:129](../../src/pages/app/shared/ComunicacaoInterna.tsx#L129); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:140](../../src/pages/app/shared/ComunicacaoInterna.tsx#L140); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:153](../../src/pages/app/shared/ComunicacaoInterna.tsx#L153); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:155](../../src/pages/app/shared/ComunicacaoInterna.tsx#L155); `channel(internal-msgs)` [src/pages/app/shared/ComunicacaoInterna.tsx:169](../../src/pages/app/shared/ComunicacaoInterna.tsx#L169); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:177](../../src/pages/app/shared/ComunicacaoInterna.tsx#L177); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:195](../../src/pages/app/shared/ComunicacaoInterna.tsx#L195); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:215](../../src/pages/app/shared/ComunicacaoInterna.tsx#L215); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:236](../../src/pages/app/shared/ComunicacaoInterna.tsx#L236); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:249](../../src/pages/app/shared/ComunicacaoInterna.tsx#L249).

Operações diretas detectadas: insert, update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/pacienteConversas.ts](../../src/lib/pacienteConversas.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/shared/ComunicacaoInterna.tsx:307](../../src/pages/app/shared/ComunicacaoInterna.tsx#L307): {c === "todas" ? "Todos" : c}

### CuponsUsoLog.tsx

Fonte: [src/pages/app/shared/CuponsUsoLog.tsx](../../src/pages/app/shared/CuponsUsoLog.tsx) (246 linhas). Rotas: `/app/colaborador/cupons/log`.

Funções da interface, conforme títulos e descrições: Log de uso de cupons; Histórico de aplicação de cupons.; Quem aplicou, quando, em qual consulta e quanto de desconto..

Funções nomeadas: [src/pages/app/shared/CuponsUsoLog.tsx:10](../../src/pages/app/shared/CuponsUsoLog.tsx#L10) `fmt`; [src/pages/app/shared/CuponsUsoLog.tsx:23](../../src/pages/app/shared/CuponsUsoLog.tsx#L23) `CuponsUsoLog`; [src/pages/app/shared/CuponsUsoLog.tsx:64](../../src/pages/app/shared/CuponsUsoLog.tsx#L64) `exportarCSV`; [src/pages/app/shared/CuponsUsoLog.tsx:238](../../src/pages/app/shared/CuponsUsoLog.tsx#L238) `Stat`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/cuponsUso.ts](../../src/lib/cuponsUso.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

### PacientePerfil.tsx

Fonte: [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) (980 linhas). Rotas: `/app/colaborador/pacientes/:id`.

Funções nomeadas: [src/pages/app/shared/PacientePerfil.tsx:135](../../src/pages/app/shared/PacientePerfil.tsx#L135) `fmtData`; [src/pages/app/shared/PacientePerfil.tsx:138](../../src/pages/app/shared/PacientePerfil.tsx#L138) `fmtDataHora`; [src/pages/app/shared/PacientePerfil.tsx:142](../../src/pages/app/shared/PacientePerfil.tsx#L142) `statusContaBadge`; [src/pages/app/shared/PacientePerfil.tsx:155](../../src/pages/app/shared/PacientePerfil.tsx#L155) `PacientePerfil`; [src/pages/app/shared/PacientePerfil.tsx:304](../../src/pages/app/shared/PacientePerfil.tsx#L304) `salvarObservacoes`; [src/pages/app/shared/PacientePerfil.tsx:328](../../src/pages/app/shared/PacientePerfil.tsx#L328) `criarReembolso`; [src/pages/app/shared/PacientePerfil.tsx:372](../../src/pages/app/shared/PacientePerfil.tsx#L372) `openStatusAction`; [src/pages/app/shared/PacientePerfil.tsx:380](../../src/pages/app/shared/PacientePerfil.tsx#L380) `executarStatusAction`; [src/pages/app/shared/PacientePerfil.tsx:957](../../src/pages/app/shared/PacientePerfil.tsx#L957) `Info`; [src/pages/app/shared/PacientePerfil.tsx:969](../../src/pages/app/shared/PacientePerfil.tsx#L969) `Kpi`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/shared/PacientePerfil.tsx:202](../../src/pages/app/shared/PacientePerfil.tsx#L202); `from(profiles)` [src/pages/app/shared/PacientePerfil.tsx:213](../../src/pages/app/shared/PacientePerfil.tsx#L213); `from(consultas)` [src/pages/app/shared/PacientePerfil.tsx:220](../../src/pages/app/shared/PacientePerfil.tsx#L220); `from(pagamentos)` [src/pages/app/shared/PacientePerfil.tsx:227](../../src/pages/app/shared/PacientePerfil.tsx#L227); `from(reembolsos)` [src/pages/app/shared/PacientePerfil.tsx:234](../../src/pages/app/shared/PacientePerfil.tsx#L234); `from(consultas)` [src/pages/app/shared/PacientePerfil.tsx:238](../../src/pages/app/shared/PacientePerfil.tsx#L238); `from(assinaturas)` [src/pages/app/shared/PacientePerfil.tsx:243](../../src/pages/app/shared/PacientePerfil.tsx#L243); `from(conversations)` [src/pages/app/shared/PacientePerfil.tsx:250](../../src/pages/app/shared/PacientePerfil.tsx#L250); `from(pacientes_auditoria)` [src/pages/app/shared/PacientePerfil.tsx:257](../../src/pages/app/shared/PacientePerfil.tsx#L257); `from(medicos)` [src/pages/app/shared/PacientePerfil.tsx:268](../../src/pages/app/shared/PacientePerfil.tsx#L268); `from(planos)` [src/pages/app/shared/PacientePerfil.tsx:278](../../src/pages/app/shared/PacientePerfil.tsx#L278); `from(pacientes)` [src/pages/app/shared/PacientePerfil.tsx:307](../../src/pages/app/shared/PacientePerfil.tsx#L307); `from(pacientes_auditoria)` [src/pages/app/shared/PacientePerfil.tsx:316](../../src/pages/app/shared/PacientePerfil.tsx#L316); `from(reembolsos)` [src/pages/app/shared/PacientePerfil.tsx:345](../../src/pages/app/shared/PacientePerfil.tsx#L345); `invoke(notificar-reembolso)` [src/pages/app/shared/PacientePerfil.tsx:360](../../src/pages/app/shared/PacientePerfil.tsx#L360); `rpc(alterar_status_conta_paciente)` [src/pages/app/shared/PacientePerfil.tsx:386](../../src/pages/app/shared/PacientePerfil.tsx#L386).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/components/permissions/RequirePermission.tsx](../../src/components/permissions/RequirePermission.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/shared/PacientePerfil.tsx:84](../../src/pages/app/shared/PacientePerfil.tsx#L84): metodo: string;
- [src/pages/app/shared/PacientePerfil.tsx:229](../../src/pages/app/shared/PacientePerfil.tsx#L229): .select("id,consulta_id,valor_centavos,status,metodo,created_at,paid_at,valor_reembolsado_centavos")
- [src/pages/app/shared/PacientePerfil.tsx:670](../../src/pages/app/shared/PacientePerfil.tsx#L670): <th className="pb-2 text-left pr-3">Método</th>
- [src/pages/app/shared/PacientePerfil.tsx:680](../../src/pages/app/shared/PacientePerfil.tsx#L680): <td className="py-2.5 pr-3 capitalize">{p.metodo}</td>
- [src/pages/app/shared/PacientePerfil.tsx:882](../../src/pages/app/shared/PacientePerfil.tsx#L882): {fmtData(p.created_at)} — {brl(p.valor_centavos)} ({p.metodo})

### PendenciasIntegracao.tsx

Fonte: [src/pages/app/shared/PendenciasIntegracao.tsx](../../src/pages/app/shared/PendenciasIntegracao.tsx) (237 linhas). Rotas: `/app/colaborador/pendencias-integracao`.

Funções da interface, conforme títulos e descrições: Pendências de integração · Feegow; Pendências registradas no banco e itens conhecidos aguardando resolução..

Funções nomeadas: [src/pages/app/shared/PendenciasIntegracao.tsx:70](../../src/pages/app/shared/PendenciasIntegracao.tsx#L70) `fmtDate`; [src/pages/app/shared/PendenciasIntegracao.tsx:74](../../src/pages/app/shared/PendenciasIntegracao.tsx#L74) `prioridadeColor`; [src/pages/app/shared/PendenciasIntegracao.tsx:79](../../src/pages/app/shared/PendenciasIntegracao.tsx#L79) `PendenciasIntegracao`; [src/pages/app/shared/PendenciasIntegracao.tsx:84](../../src/pages/app/shared/PendenciasIntegracao.tsx#L84) `fetchData`.

Dados e integrações diretas: `from(integracoes_pendencias)` [src/pages/app/shared/PendenciasIntegracao.tsx:87](../../src/pages/app/shared/PendenciasIntegracao.tsx#L87); `from(integracoes_logs)` [src/pages/app/shared/PendenciasIntegracao.tsx:93](../../src/pages/app/shared/PendenciasIntegracao.tsx#L93).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### Tarefas.tsx

Fonte: [src/pages/app/shared/Tarefas.tsx](../../src/pages/app/shared/Tarefas.tsx) (279 linhas). Rotas: `/app/colaborador/tarefas`.

Funções da interface, conforme títulos e descrições: Tarefas internas; Atribua, monitore e conclua atividades operacionais — prioridade e prazo automáticos..

Funções nomeadas: [src/pages/app/shared/Tarefas.tsx:58](../../src/pages/app/shared/Tarefas.tsx#L58) `prazoTone`; [src/pages/app/shared/Tarefas.tsx:62](../../src/pages/app/shared/Tarefas.tsx#L62) `prazoLabel`; [src/pages/app/shared/Tarefas.tsx:65](../../src/pages/app/shared/Tarefas.tsx#L65) `Tarefas`; [src/pages/app/shared/Tarefas.tsx:75](../../src/pages/app/shared/Tarefas.tsx#L75) `advance`; [src/pages/app/shared/Tarefas.tsx:80](../../src/pages/app/shared/Tarefas.tsx#L80) `create`; [src/pages/app/shared/Tarefas.tsx:90](../../src/pages/app/shared/Tarefas.tsx#L90) `cadastrarPaciente`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/shared/Tarefas.tsx:26](../../src/pages/app/shared/Tarefas.tsx#L26): prazoHoras: number; // mock — horas restantes
- [src/pages/app/shared/Tarefas.tsx:63](../../src/pages/app/shared/Tarefas.tsx#L63): h < 0 ? "atrasada" : h < 4 ? "vence em breve" : "no prazo";
- [src/pages/app/shared/Tarefas.tsx:110](../../src/pages/app/shared/Tarefas.tsx#L110): description: "Tarefa gerada e fila Feegow atualizada (mock).",

### SupervisorDashboard.tsx

Fonte: [src/pages/app/supervisor/SupervisorDashboard.tsx](../../src/pages/app/supervisor/SupervisorDashboard.tsx) (75 linhas). Rotas: `/app/colaborador/equipe`.

Funções da interface, conforme títulos e descrições: Visão da supervisão; Monitore atendimento, fila e desempenho operacional em tempo real..

Funções nomeadas: [src/pages/app/supervisor/SupervisorDashboard.tsx:12](../../src/pages/app/supervisor/SupervisorDashboard.tsx#L12) `SupervisorDashboard`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/supervisor/SupervisorDashboard.tsx:1](../../src/pages/app/supervisor/SupervisorDashboard.tsx#L1): import { Users, Activity, ListTodo, TrendingUp, Phone, Calendar } from "lucide-react";
- [src/pages/app/supervisor/SupervisorDashboard.tsx:23](../../src/pages/app/supervisor/SupervisorDashboard.tsx#L23): <StatCard label="Tarefas pendentes" value="11" icon={ListTodo} hint="3 atrasadas" />

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| invoke | `notificar-troca-medico` | [src/components/secretaria/TrocarMedicoDialog.tsx:74](../../src/components/secretaria/TrocarMedicoDialog.tsx#L74) | [supabase/functions/notificar-troca-medico/index.ts](../../supabase/functions/notificar-troca-medico/index.ts) |
| rpc | `agendar_retorno_gratuito` | [src/lib/clinico.ts:1074](../../src/lib/clinico.ts#L1074) | [supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql:69](../../supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql#L69) |
| rpc | `trocar_medico_consulta` | [src/lib/clinico.ts:1153](../../src/lib/clinico.ts#L1153) | [supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql:1](../../supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql#L1) |
| rpc | `reservar_slot_unificado` | [src/lib/clinico.ts:1360](../../src/lib/clinico.ts#L1360) | [supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql:3](../../supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql#L3); [supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql:2](../../supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql#L2) |
| rpc | `validar_e_aplicar_cupom` | [src/lib/cupons.ts:210](../../src/lib/cupons.ts#L210) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:1](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L1) |
| rpc | `remover_cupom_pagamento` | [src/lib/cupons.ts:235](../../src/lib/cupons.ts#L235) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:130](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L130) |
| rpc | `(dinâmico)` | [src/lib/gamificacao.ts:20](../../src/lib/gamificacao.ts#L20) | Definição não localizada pelo extrator |
| invoke | `google-calendar-sync` | [src/lib/googleCalendarSync.ts:13](../../src/lib/googleCalendarSync.ts#L13) | [supabase/functions/google-calendar-sync/index.ts](../../supabase/functions/google-calendar-sync/index.ts) |
| rpc | `mark_messages_read` | [src/lib/pacienteConversas.ts:101](../../src/lib/pacienteConversas.ts#L101) | [supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql:7](../../supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql#L7); [supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql:1](../../supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql#L1) |
| rpc | `(dinâmico)` | [src/lib/pagamentos.ts:189](../../src/lib/pagamentos.ts#L189) | Definição não localizada pelo extrator |
| invoke | `criar-checkout-stripe` | [src/lib/pagamentos.ts:306](../../src/lib/pagamentos.ts#L306) | [supabase/functions/criar-checkout-stripe/index.ts](../../supabase/functions/criar-checkout-stripe/index.ts) |
| rpc | `has_permissions_batch` | [src/lib/permissions/usePermission.ts:63](../../src/lib/permissions/usePermission.ts#L63) | [supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql:3](../../supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql#L3) |
| rpc | `has_permission` | [src/lib/permissions/usePermission.ts:75](../../src/lib/permissions/usePermission.ts#L75) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:127](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L127); [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:126](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L126); [supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql:75](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql#L75) |
| rpc | `auditoria_dashboard` | [src/pages/app/admin/AdminAuditoria.tsx:107](../../src/pages/app/admin/AdminAuditoria.tsx#L107) | [supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql:139](../../supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql#L139); [supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql:154](../../supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql#L154); [supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql:72](../../supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql#L72) |
| rpc | `auditoria_listar` | [src/pages/app/admin/AdminAuditoria.tsx:123](../../src/pages/app/admin/AdminAuditoria.tsx#L123) | [supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql:234](../../supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql#L234); [supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql:82](../../supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql#L82); [supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql:1](../../supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql#L1); [supabase/migrations/20260510155744_cd0085da-84b7-494b-bc4a-4839c2ec3059.sql:1](../../supabase/migrations/20260510155744_cd0085da-84b7-494b-bc4a-4839c2ec3059.sql#L1) |
| rpc | `(dinâmico)` | [src/pages/app/secretaria/SecretariaFinanceiro.tsx:28](../../src/pages/app/secretaria/SecretariaFinanceiro.tsx#L28) | Definição não localizada pelo extrator |
| invoke | `admin-criar-paciente` | [src/pages/app/secretaria/SecretariaPacientes.tsx:113](../../src/pages/app/secretaria/SecretariaPacientes.tsx#L113) | [supabase/functions/admin-criar-paciente/index.ts](../../supabase/functions/admin-criar-paciente/index.ts) |
| invoke | `notificar-reembolso` | [src/pages/app/shared/PacientePerfil.tsx:360](../../src/pages/app/shared/PacientePerfil.tsx#L360) | [supabase/functions/notificar-reembolso/index.ts](../../supabase/functions/notificar-reembolso/index.ts) |
| rpc | `alterar_status_conta_paciente` | [src/pages/app/shared/PacientePerfil.tsx:386](../../src/pages/app/shared/PacientePerfil.tsx#L386) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:203](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L203); [supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql:11](../../supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql#L11) |
