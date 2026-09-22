# Inventário técnico — medico

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (24)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/medico/aguardando-aprovacao` | [src/pages/app/medico/MedicoAguardandoAprovacao.tsx](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:287](../../src/App.tsx#L287) |
| `/app/medico/dashboard` | [src/pages/app/medico/MedicoDashboard.tsx](../../src/pages/app/medico/MedicoDashboard.tsx) | MedicoGuard | [src/App.tsx:288](../../src/App.tsx#L288) |
| `/app/medico/agenda` | [src/pages/app/medico/MedicoAgenda.tsx](../../src/pages/app/medico/MedicoAgenda.tsx) | MedicoGuard | [src/App.tsx:289](../../src/App.tsx#L289) |
| `/app/medico/horarios` | [src/pages/app/medico/MedicoHorarios.tsx](../../src/pages/app/medico/MedicoHorarios.tsx) | MedicoGuard | [src/App.tsx:290](../../src/App.tsx#L290) |
| `/app/medico/consultas` | [src/pages/app/medico/MedicoConsultas.tsx](../../src/pages/app/medico/MedicoConsultas.tsx) | MedicoGuard | [src/App.tsx:291](../../src/App.tsx#L291) |
| `/app/medico/pacientes` | [src/pages/app/medico/MedicoPacientes.tsx](../../src/pages/app/medico/MedicoPacientes.tsx) | MedicoGuard | [src/App.tsx:292](../../src/App.tsx#L292) |
| `/app/medico/pacientes/:id` | [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) | MedicoGuard | [src/App.tsx:293](../../src/App.tsx#L293) |
| `/app/medico/documentos` | [src/pages/app/medico/MedicoDocumentos.tsx](../../src/pages/app/medico/MedicoDocumentos.tsx) | MedicoGuard | [src/App.tsx:294](../../src/App.tsx#L294) |
| `/app/medico/financeiro` | [src/pages/app/medico/MedicoFinanceiro.tsx](../../src/pages/app/medico/MedicoFinanceiro.tsx) | MedicoGuard | [src/App.tsx:295](../../src/App.tsx#L295) |
| `/app/medico/perfil` | [src/pages/app/medico/MedicoPerfil.tsx](../../src/pages/app/medico/MedicoPerfil.tsx) | MedicoGuard | [src/App.tsx:296](../../src/App.tsx#L296) |
| `/app/medico/configuracoes` | [src/pages/app/medico/MedicoConfiguracoes.tsx](../../src/pages/app/medico/MedicoConfiguracoes.tsx) | MedicoGuard | [src/App.tsx:297](../../src/App.tsx#L297) |
| `/app/medico/google-callback` | [src/pages/app/medico/MedicoGoogleCallback.tsx](../../src/pages/app/medico/MedicoGoogleCallback.tsx) | MedicoGuard | [src/App.tsx:298](../../src/App.tsx#L298) |
| `/app/medico/servicos` | [src/pages/app/medico/MedicoServicos.tsx](../../src/pages/app/medico/MedicoServicos.tsx) | MedicoGuard | [src/App.tsx:299](../../src/App.tsx#L299) |
| `/app/medico/treinamento` | [src/pages/app/medico/MedicoTreinamento.tsx](../../src/pages/app/medico/MedicoTreinamento.tsx) | MedicoGuard | [src/App.tsx:301](../../src/App.tsx#L301) |
| `/app/medico/mensagens` | Redireciona para `/app/medico/notificacoes` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:302](../../src/App.tsx#L302) |
| `/app/medico/notificacoes` | [src/pages/app/medico/MedicoNotificacoes.tsx](../../src/pages/app/medico/MedicoNotificacoes.tsx) | MedicoGuard | [src/App.tsx:303](../../src/App.tsx#L303) |
| `/app/medico/comunicacao-interna` | [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) | MedicoGuard | [src/App.tsx:304](../../src/App.tsx#L304) |
| `/app/medico/planos` | [src/pages/app/medico/MedicoPlanos.tsx](../../src/pages/app/medico/MedicoPlanos.tsx) | MedicoGuard | [src/App.tsx:305](../../src/App.tsx#L305) |
| `/app/medico/gamificacao` | [src/pages/app/medico/MedicoGamificacao.tsx](../../src/pages/app/medico/MedicoGamificacao.tsx) | MedicoGuard | [src/App.tsx:306](../../src/App.tsx#L306) |
| `/app/medico/premium` | [src/pages/app/medico/MedicoPremiumPage.tsx](../../src/pages/app/medico/MedicoPremiumPage.tsx) | MedicoGuard | [src/App.tsx:307](../../src/App.tsx#L307) |
| `/app/medico/campanhas` | [src/pages/app/medico/MedicoCampanhasPage.tsx](../../src/pages/app/medico/MedicoCampanhasPage.tsx) | MedicoGuard | [src/App.tsx:308](../../src/App.tsx#L308) |
| `/app/medico/roi` | [src/pages/app/medico/MedicoROIPage.tsx](../../src/pages/app/medico/MedicoROIPage.tsx) | MedicoGuard | [src/App.tsx:309](../../src/App.tsx#L309) |
| `/app/medico/corporativo` | [src/pages/app/medico/MedicoCorporativo.tsx](../../src/pages/app/medico/MedicoCorporativo.tsx) | MedicoGuard | [src/App.tsx:311](../../src/App.tsx#L311) |
| `/app/medico/propostas` | [src/pages/app/medico/MedicoPropostas.tsx](../../src/pages/app/medico/MedicoPropostas.tsx) | MedicoGuard | [src/App.tsx:312](../../src/App.tsx#L312) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### MedicoAgenda.tsx

Fonte: [src/pages/app/medico/MedicoAgenda.tsx](../../src/pages/app/medico/MedicoAgenda.tsx) (363 linhas). Rotas: `/app/medico/agenda`.

Funções da interface, conforme títulos e descrições: Agenda; Faça login como médico para acessar sua agenda.; Sua agenda com filtros por período, status e ações rápidas..

Funções nomeadas: [src/pages/app/medico/MedicoAgenda.tsx:43](../../src/pages/app/medico/MedicoAgenda.tsx#L43) `rangeFor`; [src/pages/app/medico/MedicoAgenda.tsx:65](../../src/pages/app/medico/MedicoAgenda.tsx#L65) `dataLabel`; [src/pages/app/medico/MedicoAgenda.tsx:69](../../src/pages/app/medico/MedicoAgenda.tsx#L69) `eq`; [src/pages/app/medico/MedicoAgenda.tsx:76](../../src/pages/app/medico/MedicoAgenda.tsx#L76) `MedicoAgenda`; [src/pages/app/medico/MedicoAgenda.tsx:87](../../src/pages/app/medico/MedicoAgenda.tsx#L87) `carregar`; [src/pages/app/medico/MedicoAgenda.tsx:119](../../src/pages/app/medico/MedicoAgenda.tsx#L119) `iniciarConsulta`; [src/pages/app/medico/MedicoAgenda.tsx:158](../../src/pages/app/medico/MedicoAgenda.tsx#L158) `continuarConsulta`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/medico/MedicoAgenda.tsx:134](../../src/pages/app/medico/MedicoAgenda.tsx#L134); `from(consultas)` [src/pages/app/medico/MedicoAgenda.tsx:140](../../src/pages/app/medico/MedicoAgenda.tsx#L140).

Operações diretas detectadas: update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/shared/ConsultaHistoricoDialog.tsx](../../src/components/shared/ConsultaHistoricoDialog.tsx); [src/components/medico/FinalizarAtendimentoDialog.tsx](../../src/components/medico/FinalizarAtendimentoDialog.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoAgenda.tsx:23](../../src/pages/app/medico/MedicoAgenda.tsx#L23): type Periodo = "hoje" \| "semana" \| "mes" \| "todos";
- [src/pages/app/medico/MedicoAgenda.tsx:29](../../src/pages/app/medico/MedicoAgenda.tsx#L29): { key: "todos", label: "Todos" },
- [src/pages/app/medico/MedicoAgenda.tsx:32](../../src/pages/app/medico/MedicoAgenda.tsx#L32): const statusOptions: { value: "todos" \| ConsultaStatus; label: string }[] = [
- [src/pages/app/medico/MedicoAgenda.tsx:33](../../src/pages/app/medico/MedicoAgenda.tsx#L33): { value: "todos", label: "Todos os status" },
- [src/pages/app/medico/MedicoAgenda.tsx:45](../../src/pages/app/medico/MedicoAgenda.tsx#L45): if (periodo === "todos") return {};
- [src/pages/app/medico/MedicoAgenda.tsx:79](../../src/pages/app/medico/MedicoAgenda.tsx#L79): const [statusFiltro, setStatusFiltro] = useState<(typeof statusOptions)[number]["value"]>("todos");
- [src/pages/app/medico/MedicoAgenda.tsx:98](../../src/pages/app/medico/MedicoAgenda.tsx#L98): // Lista filtrada por status (com sessão = banco / sem = mock para demo)
- [src/pages/app/medico/MedicoAgenda.tsx:101](../../src/pages/app/medico/MedicoAgenda.tsx#L101): if (statusFiltro === "todos") return dbConsultas;

### MedicoAguardandoAprovacao.tsx

Fonte: [src/pages/app/medico/MedicoAguardandoAprovacao.tsx](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx) (130 linhas). Rotas: `/app/medico/aguardando-aprovacao`.

Funções nomeadas: [src/pages/app/medico/MedicoAguardandoAprovacao.tsx:11](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx#L11) `MedicoAguardandoAprovacao`; [src/pages/app/medico/MedicoAguardandoAprovacao.tsx:16](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx#L16) `reload`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/medico/MedicoAguardandoAprovacao.tsx:20](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx#L20); `channel(medico-status)` [src/pages/app/medico/MedicoAguardandoAprovacao.tsx:32](../../src/pages/app/medico/MedicoAguardandoAprovacao.tsx#L32).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/medicoRegistro.ts](../../src/lib/medicoRegistro.ts).

### MedicoCampanhasPage.tsx

Fonte: [src/pages/app/medico/MedicoCampanhasPage.tsx](../../src/pages/app/medico/MedicoCampanhasPage.tsx) (294 linhas). Rotas: `/app/medico/campanhas`.

Funções da interface, conforme títulos e descrições: Campanhas; Gerencie suas campanhas CPC; Gerencie suas campanhas CPC de impulsionamento.

Funções nomeadas: [src/pages/app/medico/MedicoCampanhasPage.tsx:33](../../src/pages/app/medico/MedicoCampanhasPage.tsx#L33) `MedicoCampanhasPage`; [src/pages/app/medico/MedicoCampanhasPage.tsx:79](../../src/pages/app/medico/MedicoCampanhasPage.tsx#L79) `handleExpand`; [src/pages/app/medico/MedicoCampanhasPage.tsx:88](../../src/pages/app/medico/MedicoCampanhasPage.tsx#L88) `handleCreate`; [src/pages/app/medico/MedicoCampanhasPage.tsx:116](../../src/pages/app/medico/MedicoCampanhasPage.tsx#L116) `handleToggle`; [src/pages/app/medico/MedicoCampanhasPage.tsx:125](../../src/pages/app/medico/MedicoCampanhasPage.tsx#L125) `handleCancel`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

### MedicoConfiguracoes.tsx

Fonte: [src/pages/app/medico/MedicoConfiguracoes.tsx](../../src/pages/app/medico/MedicoConfiguracoes.tsx) (908 linhas). Rotas: `/app/medico/configuracoes`.

Funções da interface, conforme títulos e descrições: Configurações; Google Meet, atendimento e notificações.; Google Meet & Calendar; Em breve; Atendimento; Notificações.

Funções nomeadas: [src/pages/app/medico/MedicoConfiguracoes.tsx:19](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L19) `Field`; [src/pages/app/medico/MedicoConfiguracoes.tsx:27](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L27) `Input`; [src/pages/app/medico/MedicoConfiguracoes.tsx:31](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L31) `Section`; [src/pages/app/medico/MedicoConfiguracoes.tsx:55](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L55) `isClinicaGeral`; [src/pages/app/medico/MedicoConfiguracoes.tsx:61](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L61) `MedicoConfiguracoes`; [src/pages/app/medico/MedicoConfiguracoes.tsx:117](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L117) `handleGoogleConnect`; [src/pages/app/medico/MedicoConfiguracoes.tsx:140](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L140) `handleGoogleDisconnect`; [src/pages/app/medico/MedicoConfiguracoes.tsx:163](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L163) `salvarMeet`; [src/pages/app/medico/MedicoConfiguracoes.tsx:267](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L267) `updateLinha`; [src/pages/app/medico/MedicoConfiguracoes.tsx:271](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L271) `salvarAtendimento`; [src/pages/app/medico/MedicoConfiguracoes.tsx:347](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L347) `salvarNotificacoes`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/medico/MedicoConfiguracoes.tsx:86](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L86); `invoke(google-oauth)` [src/pages/app/medico/MedicoConfiguracoes.tsx:99](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L99); `invoke(google-oauth)` [src/pages/app/medico/MedicoConfiguracoes.tsx:121](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L121); `invoke(google-oauth)` [src/pages/app/medico/MedicoConfiguracoes.tsx:143](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L143); `from(medicos)` [src/pages/app/medico/MedicoConfiguracoes.tsx:187](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L187); `from(medico_notificacao_prefs)` [src/pages/app/medico/MedicoConfiguracoes.tsx:331](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L331); `from(medico_notificacao_prefs)` [src/pages/app/medico/MedicoConfiguracoes.tsx:351](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L351).

Operações diretas detectadas: update, upsert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoConfiguracoes.tsx:485](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L485): title="Em breve"
- [src/pages/app/medico/MedicoConfiguracoes.tsx:500](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L500): Em breve

### MedicoConsultas.tsx

Fonte: [src/pages/app/medico/MedicoConsultas.tsx](../../src/pages/app/medico/MedicoConsultas.tsx) (472 linhas). Rotas: `/app/medico/consultas`.

Funções da interface, conforme títulos e descrições: Configure seu link de sala padrão no perfil; Abrir conversa do paciente; Histórico de mudanças; Abrir dashboard Feegow; Reagendar (gerenciar horários); Cancelar; Consultas; Faça login para ver as suas consultas reais.; Fila de atendimento; Sua fila operacional — consultas do dia, ações rápidas e acompanhamento..

Funções nomeadas: [src/pages/app/medico/MedicoConsultas.tsx:29](../../src/pages/app/medico/MedicoConsultas.tsx#L29) `formatBRL`; [src/pages/app/medico/MedicoConsultas.tsx:44](../../src/pages/app/medico/MedicoConsultas.tsx#L44) `getGroup`; [src/pages/app/medico/MedicoConsultas.tsx:51](../../src/pages/app/medico/MedicoConsultas.tsx#L51) `MedicoConsultas`; [src/pages/app/medico/MedicoConsultas.tsx:63](../../src/pages/app/medico/MedicoConsultas.tsx#L63) `carregar`; [src/pages/app/medico/MedicoConsultas.tsx:113](../../src/pages/app/medico/MedicoConsultas.tsx#L113) `cancelar`; [src/pages/app/medico/MedicoConsultas.tsx:126](../../src/pages/app/medico/MedicoConsultas.tsx#L126) `iniciar`; [src/pages/app/medico/MedicoConsultas.tsx:196](../../src/pages/app/medico/MedicoConsultas.tsx#L196) `renderCard`.

Dados e integrações diretas: `invoke(google-calendar-sync)` [src/pages/app/medico/MedicoConsultas.tsx:161](../../src/pages/app/medico/MedicoConsultas.tsx#L161); `from(consultas)` [src/pages/app/medico/MedicoConsultas.tsx:164](../../src/pages/app/medico/MedicoConsultas.tsx#L164).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/shared/ConsultaHistoricoDialog.tsx](../../src/components/shared/ConsultaHistoricoDialog.tsx); [src/components/medico/FinalizarAtendimentoDialog.tsx](../../src/components/medico/FinalizarAtendimentoDialog.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/components/medico/RetornoGratuitoDialog.tsx](../../src/components/medico/RetornoGratuitoDialog.tsx).

### MedicoCorporativo.tsx

Fonte: [src/pages/app/medico/MedicoCorporativo.tsx](../../src/pages/app/medico/MedicoCorporativo.tsx) (550 linhas). Rotas: `/app/medico/corporativo`.

Funções da interface, conforme títulos e descrições: Corporativo; Consultas e pacientes vinculados a empresas parceiras e particulares..

Funções nomeadas: [src/pages/app/medico/MedicoCorporativo.tsx:27](../../src/pages/app/medico/MedicoCorporativo.tsx#L27) `brl`; [src/pages/app/medico/MedicoCorporativo.tsx:28](../../src/pages/app/medico/MedicoCorporativo.tsx#L28) `fmtData`; [src/pages/app/medico/MedicoCorporativo.tsx:29](../../src/pages/app/medico/MedicoCorporativo.tsx#L29) `fmtDataHora`; [src/pages/app/medico/MedicoCorporativo.tsx:50](../../src/pages/app/medico/MedicoCorporativo.tsx#L50) `MedicoCorporativo`; [src/pages/app/medico/MedicoCorporativo.tsx:189](../../src/pages/app/medico/MedicoCorporativo.tsx#L189) `clearFilters`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/medico/MedicoCorporativo.tsx:72](../../src/pages/app/medico/MedicoCorporativo.tsx#L72); `from((dinâmico))` [src/pages/app/medico/MedicoCorporativo.tsx:105](../../src/pages/app/medico/MedicoCorporativo.tsx#L105); `from((dinâmico))` [src/pages/app/medico/MedicoCorporativo.tsx:108](../../src/pages/app/medico/MedicoCorporativo.tsx#L108); `from(empresas_funcionarios)` [src/pages/app/medico/MedicoCorporativo.tsx:110](../../src/pages/app/medico/MedicoCorporativo.tsx#L110); `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoCorporativo.tsx:122](../../src/pages/app/medico/MedicoCorporativo.tsx#L122); `from((dinâmico))` [src/pages/app/medico/MedicoCorporativo.tsx:149](../../src/pages/app/medico/MedicoCorporativo.tsx#L149).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoCorporativo.tsx:48](../../src/pages/app/medico/MedicoCorporativo.tsx#L48): type VinculoStatus = "todos" \| "ativo" \| "inativo" \| "afastado" \| "desligado";
- [src/pages/app/medico/MedicoCorporativo.tsx:62](../../src/pages/app/medico/MedicoCorporativo.tsx#L62): const [filtroVinculo, setFiltroVinculo] = useState<VinculoStatus>("todos");
- [src/pages/app/medico/MedicoCorporativo.tsx:63](../../src/pages/app/medico/MedicoCorporativo.tsx#L63): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/medico/MedicoCorporativo.tsx:158](../../src/pages/app/medico/MedicoCorporativo.tsx#L158): if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
- [src/pages/app/medico/MedicoCorporativo.tsx:173](../../src/pages/app/medico/MedicoCorporativo.tsx#L173): if (filtroVinculo !== "todos") {
- [src/pages/app/medico/MedicoCorporativo.tsx:193](../../src/pages/app/medico/MedicoCorporativo.tsx#L193): setFiltroVinculo("todos");
- [src/pages/app/medico/MedicoCorporativo.tsx:194](../../src/pages/app/medico/MedicoCorporativo.tsx#L194): setFiltroStatus("todos");
- [src/pages/app/medico/MedicoCorporativo.tsx:197](../../src/pages/app/medico/MedicoCorporativo.tsx#L197): const hasActiveFilters = busca \|\| filtroEmpresa !== "todas" \|\| filtroOrigem !== "todas" \|\| filtroVinculo !== "todos" \|\| filtroStatus !== "todos";
- [src/pages/app/medico/MedicoCorporativo.tsx:276](../../src/pages/app/medico/MedicoCorporativo.tsx#L276): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/medico/MedicoCorporativo.tsx:290](../../src/pages/app/medico/MedicoCorporativo.tsx#L290): <SelectItem value="todos">Todos</SelectItem>

### MedicoDashboard.tsx

Fonte: [src/pages/app/medico/MedicoDashboard.tsx](../../src/pages/app/medico/MedicoDashboard.tsx) (752 linhas). Rotas: `/app/medico/dashboard`.

Funções da interface, conforme títulos e descrições: Cadastro não iniciado; Seu perfil médico ainda não foi criado na plataforma.; O que você precisa fazer agora — atendimentos, fila e alertas..

Funções nomeadas: [src/pages/app/medico/MedicoDashboard.tsx:30](../../src/pages/app/medico/MedicoDashboard.tsx#L30) `formatHora`; [src/pages/app/medico/MedicoDashboard.tsx:33](../../src/pages/app/medico/MedicoDashboard.tsx#L33) `diffMin`; [src/pages/app/medico/MedicoDashboard.tsx:36](../../src/pages/app/medico/MedicoDashboard.tsx#L36) `saudacao`; [src/pages/app/medico/MedicoDashboard.tsx:55](../../src/pages/app/medico/MedicoDashboard.tsx#L55) `MedicoDashboard`; [src/pages/app/medico/MedicoDashboard.tsx:93](../../src/pages/app/medico/MedicoDashboard.tsx#L93) `carregar`; [src/pages/app/medico/MedicoDashboard.tsx:182](../../src/pages/app/medico/MedicoDashboard.tsx#L182) `valorMedico`; [src/pages/app/medico/MedicoDashboard.tsx:232](../../src/pages/app/medico/MedicoDashboard.tsx#L232) `iniciarConsulta`.

Dados e integrações diretas: `from(medico_especialidades)` [src/pages/app/medico/MedicoDashboard.tsx:112](../../src/pages/app/medico/MedicoDashboard.tsx#L112); `from(medico_dados_bancarios)` [src/pages/app/medico/MedicoDashboard.tsx:118](../../src/pages/app/medico/MedicoDashboard.tsx#L118); `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoDashboard.tsx:146](../../src/pages/app/medico/MedicoDashboard.tsx#L146); `from(prescricoes)` [src/pages/app/medico/MedicoDashboard.tsx:203](../../src/pages/app/medico/MedicoDashboard.tsx#L203); `from(consultas)` [src/pages/app/medico/MedicoDashboard.tsx:252](../../src/pages/app/medico/MedicoDashboard.tsx#L252); `from(consultas)` [src/pages/app/medico/MedicoDashboard.tsx:258](../../src/pages/app/medico/MedicoDashboard.tsx#L258).

Operações diretas detectadas: update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/auth.tsx](../../src/lib/auth.tsx); [src/lib/permissions/usePermission.ts](../../src/lib/permissions/usePermission.ts); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/treinamentos.ts](../../src/lib/treinamentos.ts); [src/components/medico/LembreteTrocarLinkSala.tsx](../../src/components/medico/LembreteTrocarLinkSala.tsx); [src/lib/format.ts](../../src/lib/format.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoDashboard.tsx:343](../../src/pages/app/medico/MedicoDashboard.tsx#L343): ? "Todos os treinamentos obrigatórios concluídos."
- [src/pages/app/medico/MedicoDashboard.tsx:379](../../src/pages/app/medico/MedicoDashboard.tsx#L379): const todoConcluido = pendencias === 0;

### MedicoDocumentos.tsx

Fonte: [src/pages/app/medico/MedicoDocumentos.tsx](../../src/pages/app/medico/MedicoDocumentos.tsx) (329 linhas). Rotas: `/app/medico/documentos`.

Funções da interface, conforme títulos e descrições: Documentos & Prescrições; Histórico de prescrições, prontuários e anexos por consulta.; Já existe prescrição para esta consulta.

Funções nomeadas: [src/pages/app/medico/MedicoDocumentos.tsx:28](../../src/pages/app/medico/MedicoDocumentos.tsx#L28) `fmtDataHora`; [src/pages/app/medico/MedicoDocumentos.tsx:36](../../src/pages/app/medico/MedicoDocumentos.tsx#L36) `fmtData`; [src/pages/app/medico/MedicoDocumentos.tsx:43](../../src/pages/app/medico/MedicoDocumentos.tsx#L43) `diasAteVencimento`; [src/pages/app/medico/MedicoDocumentos.tsx:49](../../src/pages/app/medico/MedicoDocumentos.tsx#L49) `MedicoDocumentos`; [src/pages/app/medico/MedicoDocumentos.tsx:59](../../src/pages/app/medico/MedicoDocumentos.tsx#L59) `carregar`; [src/pages/app/medico/MedicoDocumentos.tsx:109](../../src/pages/app/medico/MedicoDocumentos.tsx#L109) `handleEmitir`; [src/pages/app/medico/MedicoDocumentos.tsx:121](../../src/pages/app/medico/MedicoDocumentos.tsx#L121) `toggleVisibilidadeEmpresa`; [src/pages/app/medico/MedicoDocumentos.tsx:305](../../src/pages/app/medico/MedicoDocumentos.tsx#L305) `StatCard`; [src/pages/app/medico/MedicoDocumentos.tsx:316](../../src/pages/app/medico/MedicoDocumentos.tsx#L316) `ChipStatus`.

Dados e integrações diretas: `from(anexos_consulta)` [src/pages/app/medico/MedicoDocumentos.tsx:67](../../src/pages/app/medico/MedicoDocumentos.tsx#L67); `from(anexos_consulta)` [src/pages/app/medico/MedicoDocumentos.tsx:123](../../src/pages/app/medico/MedicoDocumentos.tsx#L123).

Operações diretas detectadas: update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoDocumentos.tsx:16](../../src/pages/app/medico/MedicoDocumentos.tsx#L16): emitirPrescricaoSimulada,
- [src/pages/app/medico/MedicoDocumentos.tsx:22](../../src/pages/app/medico/MedicoDocumentos.tsx#L22): { key: "todos", label: "Todas as consultas" },
- [src/pages/app/medico/MedicoDocumentos.tsx:52](../../src/pages/app/medico/MedicoDocumentos.tsx#L52): const [filtro, setFiltro] = useState<DocumentoFiltro>("todos");
- [src/pages/app/medico/MedicoDocumentos.tsx:111](../../src/pages/app/medico/MedicoDocumentos.tsx#L111): const r = await emitirPrescricaoSimulada(consultaId);
- [src/pages/app/medico/MedicoDocumentos.tsx:117](../../src/pages/app/medico/MedicoDocumentos.tsx#L117): toast.success("Prescrição simulada emitida");

### MedicoFinanceiro.tsx

Fonte: [src/pages/app/medico/MedicoFinanceiro.tsx](../../src/pages/app/medico/MedicoFinanceiro.tsx) (354 linhas). Rotas: `/app/medico/financeiro`.

Funções da interface, conforme títulos e descrições: Financeiro; Extrato dos seus repasses por consulta e controle de saques..

Funções nomeadas: [src/pages/app/medico/MedicoFinanceiro.tsx:39](../../src/pages/app/medico/MedicoFinanceiro.tsx#L39) `statusBadge`; [src/pages/app/medico/MedicoFinanceiro.tsx:49](../../src/pages/app/medico/MedicoFinanceiro.tsx#L49) `MedicoFinanceiro`; [src/pages/app/medico/MedicoFinanceiro.tsx:63](../../src/pages/app/medico/MedicoFinanceiro.tsx#L63) `cutoffDate`; [src/pages/app/medico/MedicoFinanceiro.tsx:71](../../src/pages/app/medico/MedicoFinanceiro.tsx#L71) `carregar`; [src/pages/app/medico/MedicoFinanceiro.tsx:135](../../src/pages/app/medico/MedicoFinanceiro.tsx#L135) `carregarSaldo`.

Dados e integrações diretas: `from(consultas_financeiro)` [src/pages/app/medico/MedicoFinanceiro.tsx:78](../../src/pages/app/medico/MedicoFinanceiro.tsx#L78); `from((dinâmico))` [src/pages/app/medico/MedicoFinanceiro.tsx:100](../../src/pages/app/medico/MedicoFinanceiro.tsx#L100); `from(pacientes)` [src/pages/app/medico/MedicoFinanceiro.tsx:105](../../src/pages/app/medico/MedicoFinanceiro.tsx#L105); `from(profiles)` [src/pages/app/medico/MedicoFinanceiro.tsx:108](../../src/pages/app/medico/MedicoFinanceiro.tsx#L108).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/components/planos/ReceitaPorOrigem.tsx](../../src/components/planos/ReceitaPorOrigem.tsx); [src/lib/saques.ts](../../src/lib/saques.ts); [src/components/medico/SolicitarSaqueDialog.tsx](../../src/components/medico/SolicitarSaqueDialog.tsx); [src/components/medico/SaqueHistorico.tsx](../../src/components/medico/SaqueHistorico.tsx).

### MedicoGamificacao.tsx

Fonte: [src/pages/app/medico/MedicoGamificacao.tsx](../../src/pages/app/medico/MedicoGamificacao.tsx) (959 linhas). Rotas: `/app/medico/gamificacao`.

Funções da interface, conforme títulos e descrições: Gamificação & Ranking; Acompanhe sua performance, avaliações e posição no ranking da plataforma.; Pausar; Retomar; Cancelar.

Funções nomeadas: [src/pages/app/medico/MedicoGamificacao.tsx:41](../../src/pages/app/medico/MedicoGamificacao.tsx#L41) `pct`; [src/pages/app/medico/MedicoGamificacao.tsx:43](../../src/pages/app/medico/MedicoGamificacao.tsx#L43) `recenciaLabel`; [src/pages/app/medico/MedicoGamificacao.tsx:61](../../src/pages/app/medico/MedicoGamificacao.tsx#L61) `ScoreRadar`; [src/pages/app/medico/MedicoGamificacao.tsx:122](../../src/pages/app/medico/MedicoGamificacao.tsx#L122) `MedicoGamificacao`; [src/pages/app/medico/MedicoGamificacao.tsx:148](../../src/pages/app/medico/MedicoGamificacao.tsx#L148) `carregar`; [src/pages/app/medico/MedicoGamificacao.tsx:182](../../src/pages/app/medico/MedicoGamificacao.tsx#L182) `handleToggle`; [src/pages/app/medico/MedicoGamificacao.tsx:197](../../src/pages/app/medico/MedicoGamificacao.tsx#L197) `handleStatusCampanha`; [src/pages/app/medico/MedicoGamificacao.tsx:207](../../src/pages/app/medico/MedicoGamificacao.tsx#L207) `handleAtivarPremium`; [src/pages/app/medico/MedicoGamificacao.tsx:232](../../src/pages/app/medico/MedicoGamificacao.tsx#L232) `handleAceitarTermo`; [src/pages/app/medico/MedicoGamificacao.tsx:887](../../src/pages/app/medico/MedicoGamificacao.tsx#L887) `NovaCampanhaDialog`; [src/pages/app/medico/MedicoGamificacao.tsx:897](../../src/pages/app/medico/MedicoGamificacao.tsx#L897) `handleCriar`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/termos.ts](../../src/lib/termos.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoGamificacao.tsx:606](../../src/pages/app/medico/MedicoGamificacao.tsx#L606): <p className="text-sm font-medium">Parabéns! Você atingiu todos os requisitos.</p>

### MedicoGoogleCallback.tsx

Fonte: [src/pages/app/medico/MedicoGoogleCallback.tsx](../../src/pages/app/medico/MedicoGoogleCallback.tsx) (82 linhas). Rotas: `/app/medico/google-callback`.

Funções nomeadas: [src/pages/app/medico/MedicoGoogleCallback.tsx:6](../../src/pages/app/medico/MedicoGoogleCallback.tsx#L6) `MedicoGoogleCallback`.

Dados e integrações diretas: `invoke(google-oauth)` [src/pages/app/medico/MedicoGoogleCallback.tsx:42](../../src/pages/app/medico/MedicoGoogleCallback.tsx#L42).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### MedicoHorarios.tsx

Fonte: [src/pages/app/medico/MedicoHorarios.tsx](../../src/pages/app/medico/MedicoHorarios.tsx) (986 linhas). Rotas: `/app/medico/horarios`.

Funções da interface, conforme títulos e descrições: Meus horários; Configure sua disponibilidade e o sistema gera os slots automaticamente conforme a duração da consulta..

Funções nomeadas: [src/pages/app/medico/MedicoHorarios.tsx:69](../../src/pages/app/medico/MedicoHorarios.tsx#L69) `statusLabel`; [src/pages/app/medico/MedicoHorarios.tsx:78](../../src/pages/app/medico/MedicoHorarios.tsx#L78) `fmtDataHora`; [src/pages/app/medico/MedicoHorarios.tsx:83](../../src/pages/app/medico/MedicoHorarios.tsx#L83) `groupByDay`; [src/pages/app/medico/MedicoHorarios.tsx:106](../../src/pages/app/medico/MedicoHorarios.tsx#L106) `MedicoHorarios`; [src/pages/app/medico/MedicoHorarios.tsx:139](../../src/pages/app/medico/MedicoHorarios.tsx#L139) `refresh`; [src/pages/app/medico/MedicoHorarios.tsx:210](../../src/pages/app/medico/MedicoHorarios.tsx#L210) `toggleDia`; [src/pages/app/medico/MedicoHorarios.tsx:216](../../src/pages/app/medico/MedicoHorarios.tsx#L216) `setFaixa`; [src/pages/app/medico/MedicoHorarios.tsx:242](../../src/pages/app/medico/MedicoHorarios.tsx#L242) `gerarSemanal`; [src/pages/app/medico/MedicoHorarios.tsx:296](../../src/pages/app/medico/MedicoHorarios.tsx#L296) `gerarDia`; [src/pages/app/medico/MedicoHorarios.tsx:352](../../src/pages/app/medico/MedicoHorarios.tsx#L352) `onDelete`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/medico/MedicoHorarios.tsx:90](../../src/pages/app/medico/MedicoHorarios.tsx#L90); `from(medico_especialidades)` [src/pages/app/medico/MedicoHorarios.tsx:151](../../src/pages/app/medico/MedicoHorarios.tsx#L151); `from(especialidades)` [src/pages/app/medico/MedicoHorarios.tsx:159](../../src/pages/app/medico/MedicoHorarios.tsx#L159); `from(medico_servicos)` [src/pages/app/medico/MedicoHorarios.tsx:173](../../src/pages/app/medico/MedicoHorarios.tsx#L173); `from(servicos_financeiros)` [src/pages/app/medico/MedicoHorarios.tsx:181](../../src/pages/app/medico/MedicoHorarios.tsx#L181).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoHorarios.tsx:44](../../src/pages/app/medico/MedicoHorarios.tsx#L44): excluirTodosSlots,
- [src/pages/app/medico/MedicoHorarios.tsx:121](../../src/pages/app/medico/MedicoHorarios.tsx#L121): const [filtroCalendario, setFiltroCalendario] = useState<"todos" \| "particular" \| "servico">("todos");
- [src/pages/app/medico/MedicoHorarios.tsx:780](../../src/pages/app/medico/MedicoHorarios.tsx#L780): <Trash2 className="mr-1 h-3 w-3" /> Excluir todos
- [src/pages/app/medico/MedicoHorarios.tsx:786](../../src/pages/app/medico/MedicoHorarios.tsx#L786): { key: "todos", label: "Todos", count: slots.length },
- [src/pages/app/medico/MedicoHorarios.tsx:865](../../src/pages/app/medico/MedicoHorarios.tsx#L865): {!s.servico_id && filtroCalendario === "todos" && (
- [src/pages/app/medico/MedicoHorarios.tsx:926](../../src/pages/app/medico/MedicoHorarios.tsx#L926): <AlertDialogTitle>Excluir todos os horários do dia?</AlertDialogTitle>
- [src/pages/app/medico/MedicoHorarios.tsx:956](../../src/pages/app/medico/MedicoHorarios.tsx#L956): {/* Dialog excluir todos */}
- [src/pages/app/medico/MedicoHorarios.tsx:960](../../src/pages/app/medico/MedicoHorarios.tsx#L960): <AlertDialogTitle>Excluir todos os horários?</AlertDialogTitle>
- [src/pages/app/medico/MedicoHorarios.tsx:971](../../src/pages/app/medico/MedicoHorarios.tsx#L971): const res = await excluirTodosSlots();
- [src/pages/app/medico/MedicoHorarios.tsx:978](../../src/pages/app/medico/MedicoHorarios.tsx#L978): Excluir todos

### MedicoMensagensConsultas.tsx

Fonte: [src/pages/app/medico/MedicoMensagensConsultas.tsx](../../src/pages/app/medico/MedicoMensagensConsultas.tsx) (299 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: Notificações; Faça login para ver suas notificações.; Confirmações, lembretes e avisos das suas consultas.

Funções nomeadas: [src/pages/app/medico/MedicoMensagensConsultas.tsx:48](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L48) `MedicoMensagensConsultas`.

Dados e integrações diretas: `from(conversations)` [src/pages/app/medico/MedicoMensagensConsultas.tsx:63](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L63); `from(consultas)` [src/pages/app/medico/MedicoMensagensConsultas.tsx:73](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L73); `from(messages)` [src/pages/app/medico/MedicoMensagensConsultas.tsx:101](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L101); `rpc(mark_messages_read)` [src/pages/app/medico/MedicoMensagensConsultas.tsx:112](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L112); `channel((dinâmico))` [src/pages/app/medico/MedicoMensagensConsultas.tsx:120](../../src/pages/app/medico/MedicoMensagensConsultas.tsx#L120).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### MedicoNotificacoes.tsx

Fonte: [src/pages/app/medico/MedicoNotificacoes.tsx](../../src/pages/app/medico/MedicoNotificacoes.tsx) (140 linhas). Rotas: `/app/medico/notificacoes`.

Funções da interface, conforme títulos e descrições: Notificações; Eventos e alertas do sistema em tempo real.

Funções nomeadas: [src/pages/app/medico/MedicoNotificacoes.tsx:34](../../src/pages/app/medico/MedicoNotificacoes.tsx#L34) `MedicoNotificacoes`; [src/pages/app/medico/MedicoNotificacoes.tsx:43](../../src/pages/app/medico/MedicoNotificacoes.tsx#L43) `handleClick`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/hooks/useNotificacoes.ts](../../src/hooks/useNotificacoes.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoNotificacoes.tsx:27](../../src/pages/app/medico/MedicoNotificacoes.tsx#L27): { value: "todos", label: "Todos" },
- [src/pages/app/medico/MedicoNotificacoes.tsx:36](../../src/pages/app/medico/MedicoNotificacoes.tsx#L36): const [filtro, setFiltro] = useState("todos");
- [src/pages/app/medico/MedicoNotificacoes.tsx:39](../../src/pages/app/medico/MedicoNotificacoes.tsx#L39): const filtered = filtro === "todos"
- [src/pages/app/medico/MedicoNotificacoes.tsx:89](../../src/pages/app/medico/MedicoNotificacoes.tsx#L89): <p className="text-sm">Nenhuma notificação {filtro !== "todos" ? "neste filtro" : "ainda"}</p>

### MedicoPacientes.tsx

Fonte: [src/pages/app/medico/MedicoPacientes.tsx](../../src/pages/app/medico/MedicoPacientes.tsx) (245 linhas). Rotas: `/app/medico/pacientes`.

Funções da interface, conforme títulos e descrições: Pacientes; Pacientes que você atende ou já atendeu — busca, filtros e ações rápidas.; Ligar; Abrir conversa; Detalhes.

Funções nomeadas: [src/pages/app/medico/MedicoPacientes.tsx:22](../../src/pages/app/medico/MedicoPacientes.tsx#L22) `fmt`; [src/pages/app/medico/MedicoPacientes.tsx:27](../../src/pages/app/medico/MedicoPacientes.tsx#L27) `soDigitos`; [src/pages/app/medico/MedicoPacientes.tsx:31](../../src/pages/app/medico/MedicoPacientes.tsx#L31) `MedicoPacientes`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoPacientes.tsx:13](../../src/pages/app/medico/MedicoPacientes.tsx#L13): type FiltroTipo = "todos" \| "ativos" \| "pendentes" \| "empresariais";
- [src/pages/app/medico/MedicoPacientes.tsx:16](../../src/pages/app/medico/MedicoPacientes.tsx#L16): { key: "todos", label: "Todos" },
- [src/pages/app/medico/MedicoPacientes.tsx:35](../../src/pages/app/medico/MedicoPacientes.tsx#L35): const [filtro, setFiltro] = useState<FiltroTipo>("todos");

### MedicoPerfil.tsx

Fonte: [src/pages/app/medico/MedicoPerfil.tsx](../../src/pages/app/medico/MedicoPerfil.tsx) (457 linhas). Rotas: `/app/medico/perfil`.

Funções da interface, conforme títulos e descrições: Meu perfil; Gerencie seu perfil público, dados pessoais e dados bancários..

Funções nomeadas: [src/pages/app/medico/MedicoPerfil.tsx:31](../../src/pages/app/medico/MedicoPerfil.tsx#L31) `EMPTY_FORMACAO`; [src/pages/app/medico/MedicoPerfil.tsx:35](../../src/pages/app/medico/MedicoPerfil.tsx#L35) `MedicoPerfil`; [src/pages/app/medico/MedicoPerfil.tsx:76](../../src/pages/app/medico/MedicoPerfil.tsx#L76) `loadFormacoes`; [src/pages/app/medico/MedicoPerfil.tsx:97](../../src/pages/app/medico/MedicoPerfil.tsx#L97) `handleFotoChange`; [src/pages/app/medico/MedicoPerfil.tsx:105](../../src/pages/app/medico/MedicoPerfil.tsx#L105) `uploadFoto`; [src/pages/app/medico/MedicoPerfil.tsx:117](../../src/pages/app/medico/MedicoPerfil.tsx#L117) `salvarPerfilPublico`; [src/pages/app/medico/MedicoPerfil.tsx:137](../../src/pages/app/medico/MedicoPerfil.tsx#L137) `addFormacao`; [src/pages/app/medico/MedicoPerfil.tsx:143](../../src/pages/app/medico/MedicoPerfil.tsx#L143) `removeFormacao`; [src/pages/app/medico/MedicoPerfil.tsx:150](../../src/pages/app/medico/MedicoPerfil.tsx#L150) `updateFormacao`; [src/pages/app/medico/MedicoPerfil.tsx:154](../../src/pages/app/medico/MedicoPerfil.tsx#L154) `salvarFormacoes`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/medico/MedicoPerfil.tsx:59](../../src/pages/app/medico/MedicoPerfil.tsx#L59); `from(medico_formacoes)` [src/pages/app/medico/MedicoPerfil.tsx:77](../../src/pages/app/medico/MedicoPerfil.tsx#L77); `from(medico-avatars)` [src/pages/app/medico/MedicoPerfil.tsx:110](../../src/pages/app/medico/MedicoPerfil.tsx#L110); `from(medico-avatars)` [src/pages/app/medico/MedicoPerfil.tsx:113](../../src/pages/app/medico/MedicoPerfil.tsx#L113); `from(medico_formacoes)` [src/pages/app/medico/MedicoPerfil.tsx:169](../../src/pages/app/medico/MedicoPerfil.tsx#L169); `from(medico_formacoes)` [src/pages/app/medico/MedicoPerfil.tsx:171](../../src/pages/app/medico/MedicoPerfil.tsx#L171).

Operações diretas detectadas: upload, delete, insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/medico/MedicoDadosPessoais.tsx](../../src/components/medico/MedicoDadosPessoais.tsx); [src/components/medico/MedicoDadosBancarios.tsx](../../src/components/medico/MedicoDadosBancarios.tsx); [src/components/medico/MedicoDocumentosFiscais.tsx](../../src/components/medico/MedicoDocumentosFiscais.tsx); [src/components/shared/MeusAceites.tsx](../../src/components/shared/MeusAceites.tsx); [src/components/medico/MedicoContratoPlataforma.tsx](../../src/components/medico/MedicoContratoPlataforma.tsx).

### MedicoPlanos.tsx

Fonte: [src/pages/app/medico/MedicoPlanos.tsx](../../src/pages/app/medico/MedicoPlanos.tsx) (302 linhas). Rotas: `/app/medico/planos`.

Funções da interface, conforme títulos e descrições: Meus Planos; Encerrar plano.

Funções nomeadas: [src/pages/app/medico/MedicoPlanos.tsx:30](../../src/pages/app/medico/MedicoPlanos.tsx#L30) `MedicoPlanos`; [src/pages/app/medico/MedicoPlanos.tsx:50](../../src/pages/app/medico/MedicoPlanos.tsx#L50) `load`; [src/pages/app/medico/MedicoPlanos.tsx:63](../../src/pages/app/medico/MedicoPlanos.tsx#L63) `loadTermos`; [src/pages/app/medico/MedicoPlanos.tsx:79](../../src/pages/app/medico/MedicoPlanos.tsx#L79) `novoPlano`; [src/pages/app/medico/MedicoPlanos.tsx:86](../../src/pages/app/medico/MedicoPlanos.tsx#L86) `aceitarTermos`; [src/pages/app/medico/MedicoPlanos.tsx:88](../../src/pages/app/medico/MedicoPlanos.tsx#L88) `openCancelDialog`; [src/pages/app/medico/MedicoPlanos.tsx:104](../../src/pages/app/medico/MedicoPlanos.tsx#L104) `confirmarCancelamento`; [src/pages/app/medico/MedicoPlanos.tsx:138](../../src/pages/app/medico/MedicoPlanos.tsx#L138) `canCancel`.

Dados e integrações diretas: `from(planos)` [src/pages/app/medico/MedicoPlanos.tsx:53](../../src/pages/app/medico/MedicoPlanos.tsx#L53); `from(app_settings)` [src/pages/app/medico/MedicoPlanos.tsx:65](../../src/pages/app/medico/MedicoPlanos.tsx#L65); `from(app_settings)` [src/pages/app/medico/MedicoPlanos.tsx:66](../../src/pages/app/medico/MedicoPlanos.tsx#L66); `from(assinaturas)` [src/pages/app/medico/MedicoPlanos.tsx:94](../../src/pages/app/medico/MedicoPlanos.tsx#L94); `from(plano_cancelamento_evento)` [src/pages/app/medico/MedicoPlanos.tsx:109](../../src/pages/app/medico/MedicoPlanos.tsx#L109); `from(planos)` [src/pages/app/medico/MedicoPlanos.tsx:121](../../src/pages/app/medico/MedicoPlanos.tsx#L121).

Operações diretas detectadas: insert, update.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/components/PageShell.tsx](../../src/components/PageShell.tsx); [src/components/planos/PlanoBuilder.tsx](../../src/components/planos/PlanoBuilder.tsx); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoPlanos.tsx:126](../../src/pages/app/medico/MedicoPlanos.tsx#L126): toast.success("Solicitação de cancelamento enviada. O Admin revisará em breve.");
- [src/pages/app/medico/MedicoPlanos.tsx:265](../../src/pages/app/medico/MedicoPlanos.tsx#L265): <span>Estou ciente das responsabilidades e aceito cumprir o atendimento até o final do ciclo de todos os pacientes ativos.</span>

### MedicoPremiumPage.tsx

Fonte: [src/pages/app/medico/MedicoPremiumPage.tsx](../../src/pages/app/medico/MedicoPremiumPage.tsx) (368 linhas). Rotas: `/app/medico/premium`.

Funções da interface, conforme títulos e descrições: Checkout Premium; Finalize sua assinatura Premium; Premium; Bem-vindo ao Premium!; Impulsione seu crescimento profissional com campanhas patrocinadas e ferramentas avançadas..

Funções nomeadas: [src/pages/app/medico/MedicoPremiumPage.tsx:69](../../src/pages/app/medico/MedicoPremiumPage.tsx#L69) `MedicoPremiumPage`; [src/pages/app/medico/MedicoPremiumPage.tsx:118](../../src/pages/app/medico/MedicoPremiumPage.tsx#L118) `handleSubscribe`; [src/pages/app/medico/MedicoPremiumPage.tsx:133](../../src/pages/app/medico/MedicoPremiumPage.tsx#L133) `estimarAlcance`.

Dados e integrações diretas: `invoke(criar-checkout-premium)` [src/pages/app/medico/MedicoPremiumPage.tsx:105](../../src/pages/app/medico/MedicoPremiumPage.tsx#L105).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/stripe.ts](../../src/lib/stripe.ts); [src/lib/stripe.ts](../../src/lib/stripe.ts).

### MedicoPropostas.tsx

Fonte: [src/pages/app/medico/MedicoPropostas.tsx](../../src/pages/app/medico/MedicoPropostas.tsx) (449 linhas). Rotas: `/app/medico/propostas`.

Funções da interface, conforme títulos e descrições: Propostas Comerciais; Propostas de empresas para atendimento direto..

Funções nomeadas: [src/pages/app/medico/MedicoPropostas.tsx:27](../../src/pages/app/medico/MedicoPropostas.tsx#L27) `brl`; [src/pages/app/medico/MedicoPropostas.tsx:28](../../src/pages/app/medico/MedicoPropostas.tsx#L28) `fmtDate`; [src/pages/app/medico/MedicoPropostas.tsx:40](../../src/pages/app/medico/MedicoPropostas.tsx#L40) `MedicoPropostas`; [src/pages/app/medico/MedicoPropostas.tsx:59](../../src/pages/app/medico/MedicoPropostas.tsx#L59) `carregar`; [src/pages/app/medico/MedicoPropostas.tsx:95](../../src/pages/app/medico/MedicoPropostas.tsx#L95) `openProposta`; [src/pages/app/medico/MedicoPropostas.tsx:101](../../src/pages/app/medico/MedicoPropostas.tsx#L101) `aceitar`; [src/pages/app/medico/MedicoPropostas.tsx:200](../../src/pages/app/medico/MedicoPropostas.tsx#L200) `recusar`.

Dados e integrações diretas: `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoPropostas.tsx:63](../../src/pages/app/medico/MedicoPropostas.tsx#L63); `from(termos_condicoes)` [src/pages/app/medico/MedicoPropostas.tsx:69](../../src/pages/app/medico/MedicoPropostas.tsx#L69); `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoPropostas.tsx:114](../../src/pages/app/medico/MedicoPropostas.tsx#L114); `from(planos)` [src/pages/app/medico/MedicoPropostas.tsx:132](../../src/pages/app/medico/MedicoPropostas.tsx#L132); `from(plano_medicos)` [src/pages/app/medico/MedicoPropostas.tsx:157](../../src/pages/app/medico/MedicoPropostas.tsx#L157); `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoPropostas.tsx:165](../../src/pages/app/medico/MedicoPropostas.tsx#L165); `from(planos_auditoria)` [src/pages/app/medico/MedicoPropostas.tsx:174](../../src/pages/app/medico/MedicoPropostas.tsx#L174); `from(propostas_empresa_medico)` [src/pages/app/medico/MedicoPropostas.tsx:204](../../src/pages/app/medico/MedicoPropostas.tsx#L204); `from(planos_auditoria)` [src/pages/app/medico/MedicoPropostas.tsx:215](../../src/pages/app/medico/MedicoPropostas.tsx#L215).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx).

### MedicoROIPage.tsx

Fonte: [src/pages/app/medico/MedicoROIPage.tsx](../../src/pages/app/medico/MedicoROIPage.tsx) (264 linhas). Rotas: `/app/medico/roi`.

Funções da interface, conforme títulos e descrições: ROI Premium; Retorno sobre investimento; Análise do retorno sobre investimento das suas campanhas e assinatura Premium.

Funções nomeadas: [src/pages/app/medico/MedicoROIPage.tsx:21](../../src/pages/app/medico/MedicoROIPage.tsx#L21) `MedicoROIPage`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

### MedicoServicos.tsx

Fonte: [src/pages/app/medico/MedicoServicos.tsx](../../src/pages/app/medico/MedicoServicos.tsx) (153 linhas). Rotas: `/app/medico/servicos`.

Funções nomeadas: [src/pages/app/medico/MedicoServicos.tsx:30](../../src/pages/app/medico/MedicoServicos.tsx#L30) `MedicoServicos`; [src/pages/app/medico/MedicoServicos.tsx:38](../../src/pages/app/medico/MedicoServicos.tsx#L38) `load`; [src/pages/app/medico/MedicoServicos.tsx:67](../../src/pages/app/medico/MedicoServicos.tsx#L67) `toggle`.

Dados e integrações diretas: `from(servicos_financeiros)` [src/pages/app/medico/MedicoServicos.tsx:43](../../src/pages/app/medico/MedicoServicos.tsx#L43); `from(medico_servicos)` [src/pages/app/medico/MedicoServicos.tsx:44](../../src/pages/app/medico/MedicoServicos.tsx#L44); `rpc(fn_resolver_comissao)` [src/pages/app/medico/MedicoServicos.tsx:54](../../src/pages/app/medico/MedicoServicos.tsx#L54); `from(medico_servicos)` [src/pages/app/medico/MedicoServicos.tsx:71](../../src/pages/app/medico/MedicoServicos.tsx#L71); `from(medico_servicos)` [src/pages/app/medico/MedicoServicos.tsx:77](../../src/pages/app/medico/MedicoServicos.tsx#L77).

Operações diretas detectadas: upsert, update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useMedicoAtual.ts](../../src/lib/useMedicoAtual.ts); [src/lib/format.ts](../../src/lib/format.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts).

### MedicoTreinamento.tsx

Fonte: [src/pages/app/medico/MedicoTreinamento.tsx](../../src/pages/app/medico/MedicoTreinamento.tsx) (242 linhas). Rotas: `/app/medico/treinamento`.

Funções da interface, conforme títulos e descrições: Treinamento; Vídeos, aulas e boas práticas para uso da plataforma..

Funções nomeadas: [src/pages/app/medico/MedicoTreinamento.tsx:18](../../src/pages/app/medico/MedicoTreinamento.tsx#L18) `MedicoTreinamento`; [src/pages/app/medico/MedicoTreinamento.tsx:25](../../src/pages/app/medico/MedicoTreinamento.tsx#L25) `carregar`; [src/pages/app/medico/MedicoTreinamento.tsx:35](../../src/pages/app/medico/MedicoTreinamento.tsx#L35) `toggle`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: delete.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/treinamentos.ts](../../src/lib/treinamentos.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/medico/MedicoTreinamento.tsx:110](../../src/pages/app/medico/MedicoTreinamento.tsx#L110): <p className="text-xs">O administrador adicionará conteúdo em breve.</p>

### ComunicacaoInterna.tsx

Fonte: [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) (571 linhas). Rotas: `/app/medico/comunicacao-interna`.

Funções da interface, conforme títulos e descrições: Comunicação interna; Faça login para acessar.; Comunicação interna da equipe; Mensagens entre Secretaria, Médicos, Admin e Empresas — separado das conversas com pacientes (WhatsApp)..

Funções nomeadas: [src/pages/app/shared/ComunicacaoInterna.tsx:81](../../src/pages/app/shared/ComunicacaoInterna.tsx#L81) `ComunicacaoInterna`; [src/pages/app/shared/ComunicacaoInterna.tsx:192](../../src/pages/app/shared/ComunicacaoInterna.tsx#L192) `enviarMensagem`; [src/pages/app/shared/ComunicacaoInterna.tsx:209](../../src/pages/app/shared/ComunicacaoInterna.tsx#L209) `criarThread`; [src/pages/app/shared/ComunicacaoInterna.tsx:235](../../src/pages/app/shared/ComunicacaoInterna.tsx#L235) `alterarStatus`; [src/pages/app/shared/ComunicacaoInterna.tsx:248](../../src/pages/app/shared/ComunicacaoInterna.tsx#L248) `alterarPrioridade`.

Dados e integrações diretas: `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:107](../../src/pages/app/shared/ComunicacaoInterna.tsx#L107); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:126](../../src/pages/app/shared/ComunicacaoInterna.tsx#L126); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:129](../../src/pages/app/shared/ComunicacaoInterna.tsx#L129); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:140](../../src/pages/app/shared/ComunicacaoInterna.tsx#L140); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:153](../../src/pages/app/shared/ComunicacaoInterna.tsx#L153); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:155](../../src/pages/app/shared/ComunicacaoInterna.tsx#L155); `channel(internal-msgs)` [src/pages/app/shared/ComunicacaoInterna.tsx:169](../../src/pages/app/shared/ComunicacaoInterna.tsx#L169); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:177](../../src/pages/app/shared/ComunicacaoInterna.tsx#L177); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:195](../../src/pages/app/shared/ComunicacaoInterna.tsx#L195); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:215](../../src/pages/app/shared/ComunicacaoInterna.tsx#L215); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:236](../../src/pages/app/shared/ComunicacaoInterna.tsx#L236); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:249](../../src/pages/app/shared/ComunicacaoInterna.tsx#L249).

Operações diretas detectadas: insert, update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/pacienteConversas.ts](../../src/lib/pacienteConversas.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/shared/ComunicacaoInterna.tsx:307](../../src/pages/app/shared/ComunicacaoInterna.tsx#L307): {c === "todas" ? "Todos" : c}

### PacientePerfil.tsx

Fonte: [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) (980 linhas). Rotas: `/app/medico/pacientes/:id`.

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

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| rpc | `agendar_retorno_gratuito` | [src/lib/clinico.ts:1074](../../src/lib/clinico.ts#L1074) | [supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql:69](../../supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql#L69) |
| rpc | `trocar_medico_consulta` | [src/lib/clinico.ts:1153](../../src/lib/clinico.ts#L1153) | [supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql:1](../../supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql#L1) |
| rpc | `reservar_slot_unificado` | [src/lib/clinico.ts:1360](../../src/lib/clinico.ts#L1360) | [supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql:3](../../supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql#L3); [supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql:2](../../supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql#L2) |
| rpc | `(dinâmico)` | [src/lib/gamificacao.ts:20](../../src/lib/gamificacao.ts#L20) | Definição não localizada pelo extrator |
| rpc | `impersonation_iniciar` | [src/lib/impersonation.tsx:96](../../src/lib/impersonation.tsx#L96) | [supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql:42](../../supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql#L42) |
| rpc | `impersonation_finalizar` | [src/lib/impersonation.tsx:135](../../src/lib/impersonation.tsx#L135) | [supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql:105](../../supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql#L105) |
| invoke | `feegow-liberar-medico` | [src/lib/medicoRegistro.ts:235](../../src/lib/medicoRegistro.ts#L235) | [supabase/functions/feegow-liberar-medico/index.ts](../../supabase/functions/feegow-liberar-medico/index.ts) |
| rpc | `medico_colocar_em_analise` | [src/lib/medicoRegistro.ts:250](../../src/lib/medicoRegistro.ts#L250) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:40](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L40); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:13](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L13) |
| rpc | `medico_aprovar` | [src/lib/medicoRegistro.ts:255](../../src/lib/medicoRegistro.ts#L255) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:60](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L60); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:46](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L46) |
| rpc | `medico_reprovar` | [src/lib/medicoRegistro.ts:260](../../src/lib/medicoRegistro.ts#L260) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:87](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L87); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:91](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L91) |
| rpc | `medico_suspender` | [src/lib/medicoRegistro.ts:270](../../src/lib/medicoRegistro.ts#L270) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:109](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L109); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:125](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L125) |
| rpc | `medico_bloquear` | [src/lib/medicoRegistro.ts:281](../../src/lib/medicoRegistro.ts#L281) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:144](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L144); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:167](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L167) |
| rpc | `medico_reativar` | [src/lib/medicoRegistro.ts:288](../../src/lib/medicoRegistro.ts#L288) | [supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql:170](../../supabase/migrations/20260430161753_124bdc5e-9b0a-4d79-8058-3c53b4f28fe2.sql#L170); [supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql:204](../../supabase/migrations/20260502174202_040b591a-e8a2-4bb2-9720-244c2959b913.sql#L204) |
| rpc | `mark_messages_read` | [src/lib/pacienteConversas.ts:101](../../src/lib/pacienteConversas.ts#L101) | [supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql:7](../../supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql#L7); [supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql:1](../../supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql#L1) |
| rpc | `has_permissions_batch` | [src/lib/permissions/usePermission.ts:63](../../src/lib/permissions/usePermission.ts#L63) | [supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql:3](../../supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql#L3) |
| rpc | `has_permission` | [src/lib/permissions/usePermission.ts:75](../../src/lib/permissions/usePermission.ts#L75) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:127](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L127); [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:126](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L126); [supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql:75](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql#L75) |
| rpc | `plano_saude_financeira` | [src/lib/planos/saude.ts:21](../../src/lib/planos/saude.ts#L21) | [supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql:279](../../supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql#L279) |
| invoke | `google-oauth` | [src/pages/app/medico/MedicoConfiguracoes.tsx:99](../../src/pages/app/medico/MedicoConfiguracoes.tsx#L99) | [supabase/functions/google-oauth/index.ts](../../supabase/functions/google-oauth/index.ts) |
| invoke | `google-calendar-sync` | [src/pages/app/medico/MedicoConsultas.tsx:161](../../src/pages/app/medico/MedicoConsultas.tsx#L161) | [supabase/functions/google-calendar-sync/index.ts](../../supabase/functions/google-calendar-sync/index.ts) |
| invoke | `google-oauth` | [src/pages/app/medico/MedicoGoogleCallback.tsx:42](../../src/pages/app/medico/MedicoGoogleCallback.tsx#L42) | [supabase/functions/google-oauth/index.ts](../../supabase/functions/google-oauth/index.ts) |
| invoke | `criar-checkout-premium` | [src/pages/app/medico/MedicoPremiumPage.tsx:105](../../src/pages/app/medico/MedicoPremiumPage.tsx#L105) | [supabase/functions/criar-checkout-premium/index.ts](../../supabase/functions/criar-checkout-premium/index.ts) |
| rpc | `fn_resolver_comissao` | [src/pages/app/medico/MedicoServicos.tsx:54](../../src/pages/app/medico/MedicoServicos.tsx#L54) | [supabase/migrations/20260430210729_8bc099e7-416e-4adb-bb4c-41695e05ba39.sql:80](../../supabase/migrations/20260430210729_8bc099e7-416e-4adb-bb4c-41695e05ba39.sql#L80); [supabase/migrations/20260430215750_d4af972d-3ae9-4787-83b2-b202816b5389.sql:6](../../supabase/migrations/20260430215750_d4af972d-3ae9-4787-83b2-b202816b5389.sql#L6) |
| invoke | `notificar-reembolso` | [src/pages/app/shared/PacientePerfil.tsx:360](../../src/pages/app/shared/PacientePerfil.tsx#L360) | [supabase/functions/notificar-reembolso/index.ts](../../supabase/functions/notificar-reembolso/index.ts) |
| rpc | `alterar_status_conta_paciente` | [src/pages/app/shared/PacientePerfil.tsx:386](../../src/pages/app/shared/PacientePerfil.tsx#L386) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:203](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L203); [supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql:11](../../supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql#L11) |
