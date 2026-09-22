# Inventário técnico — admin

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (75)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/admin/dashboard` | [src/pages/app/admin/AdminDashboard.tsx](../../src/pages/app/admin/AdminDashboard.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:355](../../src/App.tsx#L355) |
| `/app/admin/pacientes` | [src/pages/app/admin/AdminUsuarios.tsx](../../src/pages/app/admin/AdminUsuarios.tsx) | Permissão "pacientes.ver" (uma basta, se lista) | [src/App.tsx:356](../../src/App.tsx#L356) |
| `/app/admin/usuarios` | Redireciona para `/app/admin/pacientes` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:357](../../src/App.tsx#L357) |
| `/app/admin/medicos` | [src/pages/app/admin/MedicosAprovacao.tsx](../../src/pages/app/admin/MedicosAprovacao.tsx) | Permissão {["medicos.ver","medicos.aprovar"]} (uma basta, se lista) | [src/App.tsx:358](../../src/App.tsx#L358) |
| `/app/admin/medicos/contratos` | [src/pages/app/admin/AdminMedicosContratos.tsx](../../src/pages/app/admin/AdminMedicosContratos.tsx) | Permissão {["medicos.ver","medicos.aprovar"]} (uma basta, se lista) | [src/App.tsx:359](../../src/App.tsx#L359) |
| `/app/admin/medicos/contratos-modelo` | [src/pages/app/admin/AdminContratosModelo.tsx](../../src/pages/app/admin/AdminContratosModelo.tsx) | Permissão {["medicos.ver","medicos.aprovar"]} (uma basta, se lista) | [src/App.tsx:360](../../src/App.tsx#L360) |
| `/app/admin/colaboradores` | [src/pages/app/admin/AdminColaboradores.tsx](../../src/pages/app/admin/AdminColaboradores.tsx) | Permissão "colaboradores.ver" (uma basta, se lista) | [src/App.tsx:361](../../src/App.tsx#L361) |
| `/app/admin/secretaria` | Redireciona para `/app/admin/colaboradores` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:362](../../src/App.tsx#L362) |
| `/app/admin/empresas` | [src/pages/app/admin/AdminEmpresas.tsx](../../src/pages/app/admin/AdminEmpresas.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:363](../../src/App.tsx#L363) |
| `/app/admin/gestao-b2b` | [src/pages/app/admin/AdminGestaoB2B.tsx](../../src/pages/app/admin/AdminGestaoB2B.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:364](../../src/App.tsx#L364) |
| `/app/admin/relatorios-b2b` | [src/pages/app/admin/AdminRelatoriosB2B.tsx](../../src/pages/app/admin/AdminRelatoriosB2B.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:365](../../src/App.tsx#L365) |
| `/app/admin/faturamento-b2b` | [src/pages/app/admin/AdminFaturamentoB2B.tsx](../../src/pages/app/admin/AdminFaturamentoB2B.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:366](../../src/App.tsx#L366) |
| `/app/admin/contrato-b2b/:id` | [src/pages/app/admin/AdminContratoDetalhes.tsx](../../src/pages/app/admin/AdminContratoDetalhes.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:367](../../src/App.tsx#L367) |
| `/app/admin/propostas-b2b` | [src/pages/app/admin/AdminPropostasB2B.tsx](../../src/pages/app/admin/AdminPropostasB2B.tsx) | Permissão "empresas.ver" (uma basta, se lista) | [src/App.tsx:368](../../src/App.tsx#L368) |
| `/app/admin/agendamentos` | [src/pages/app/admin/AdminAgendamentos.tsx](../../src/pages/app/admin/AdminAgendamentos.tsx) | Permissão "agenda.ver_todas" (uma basta, se lista) | [src/App.tsx:369](../../src/App.tsx#L369) |
| `/app/admin/financeiro` | [src/pages/app/admin/AdminFinanceiroCentral.tsx](../../src/pages/app/admin/AdminFinanceiroCentral.tsx) | Permissão "financeiro.ver" (uma basta, se lista) | [src/App.tsx:370](../../src/App.tsx#L370) |
| `/app/admin/financeiro/repasse` | [src/pages/app/admin/AdminFinanceiroConfig.tsx](../../src/pages/app/admin/AdminFinanceiroConfig.tsx) | Permissão "financeiro.editar_comissao" (uma basta, se lista) | [src/App.tsx:371](../../src/App.tsx#L371) |
| `/app/admin/ia-medicos` | [src/pages/app/admin/AdminIAMedicos.tsx](../../src/pages/app/admin/AdminIAMedicos.tsx) | Permissão "gamificacao.ver" (uma basta, se lista) | [src/App.tsx:372](../../src/App.tsx#L372) |
| `/app/admin/financeiro/previa-repasse` | [src/pages/app/admin/AdminPreviaRepasse.tsx](../../src/pages/app/admin/AdminPreviaRepasse.tsx) | Permissão "financeiro.editar_comissao" (uma basta, se lista) | [src/App.tsx:373](../../src/App.tsx#L373) |
| `/app/admin/financeiro/saques-medicos` | [src/pages/app/admin/AdminSaquesMedicos.tsx](../../src/pages/app/admin/AdminSaquesMedicos.tsx) | Permissão "financeiro.saques.ver" (uma basta, se lista) | [src/App.tsx:374](../../src/App.tsx#L374) |
| `/app/admin/financeiro/reembolsos` | [src/pages/app/admin/AdminReembolsoConfig.tsx](../../src/pages/app/admin/AdminReembolsoConfig.tsx) | Permissão "financeiro.ver" (uma basta, se lista) | [src/App.tsx:375](../../src/App.tsx#L375) |
| `/app/admin/financeiro/ledger-observabilidade` | [src/pages/app/admin/AdminLedgerObservabilidade.tsx](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx) | Permissão "financeiro.ver" (uma basta, se lista) | [src/App.tsx:376](../../src/App.tsx#L376) |
| `/app/admin/noc` | [src/pages/app/admin/AdminNOC.tsx](../../src/pages/app/admin/AdminNOC.tsx) | Permissão "agenda.ver_todas" (uma basta, se lista) | [src/App.tsx:377](../../src/App.tsx#L377) |
| `/app/admin/planos` | [src/pages/app/admin/AdminPlanos.tsx](../../src/pages/app/admin/AdminPlanos.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:378](../../src/App.tsx#L378) |
| `/app/admin/planos-medicos` | [src/pages/app/admin/AdminPlanosMedicos.tsx](../../src/pages/app/admin/AdminPlanosMedicos.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:379](../../src/App.tsx#L379) |
| `/app/admin/planos-cancelamentos` | [src/pages/app/admin/AdminCancelamentosPlanos.tsx](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:380](../../src/App.tsx#L380) |
| `/app/admin/planos-empresariais` | [src/pages/app/admin/AdminPlanosEmpresariais.tsx](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:381](../../src/App.tsx#L381) |
| `/app/admin/gamificacao` | [src/pages/app/admin/AdminGamificacao.tsx](../../src/pages/app/admin/AdminGamificacao.tsx) | Permissão "gamificacao.configurar" (uma basta, se lista) | [src/App.tsx:382](../../src/App.tsx#L382) |
| `/app/admin/gamificacao/financeiro` | [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx) | Permissão "gamificacao.configurar" (uma basta, se lista) | [src/App.tsx:383](../../src/App.tsx#L383) |
| `/app/admin/termos-condicoes` | [src/pages/app/admin/AdminTermosCondicoes.tsx](../../src/pages/app/admin/AdminTermosCondicoes.tsx) | Permissão "termos.gerenciar" (uma basta, se lista) | [src/App.tsx:384](../../src/App.tsx#L384) |
| `/app/admin/comunicacao` | Redireciona para `/app/comunicacao/inbox` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:385](../../src/App.tsx#L385) |
| `/app/admin/whatsapp` | Redireciona para `/app/admin/integracoes/whatsapp` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:386](../../src/App.tsx#L386) |
| `/app/admin/integracoes/whatsapp` | [src/pages/app/admin/IntegracaoWhatsApp.tsx](../../src/pages/app/admin/IntegracaoWhatsApp.tsx) | Permissão "integracoes.configurar_whatsapp" (uma basta, se lista) | [src/App.tsx:387](../../src/App.tsx#L387) |
| `/app/admin/integracoes` | [src/pages/app/admin/AdminIntegracoes.tsx](../../src/pages/app/admin/AdminIntegracoes.tsx) | Permissão "integracoes.ver" (uma basta, se lista) | [src/App.tsx:388](../../src/App.tsx#L388) |
| `/app/admin/configuracoes` | [src/pages/app/admin/AdminConfiguracoes.tsx](../../src/pages/app/admin/AdminConfiguracoes.tsx) | Permissão "configuracoes.ver" (uma basta, se lista) | [src/App.tsx:390](../../src/App.tsx#L390) |
| `/app/admin/perfil` | [src/pages/app/admin/AdminPerfil.tsx](../../src/pages/app/admin/AdminPerfil.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:391](../../src/App.tsx#L391) |
| `/app/admin/permissoes` | [src/pages/app/admin/Permissoes.tsx](../../src/pages/app/admin/Permissoes.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:392](../../src/App.tsx#L392) |
| `/app/admin/permissoes/log` | [src/pages/app/admin/PermissoesLog.tsx](../../src/pages/app/admin/PermissoesLog.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:393](../../src/App.tsx#L393) |
| `/app/admin/permissoes-log` | Redireciona para `/app/admin/permissoes/log` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:394](../../src/App.tsx#L394) |
| `/app/admin/impersonar` | [src/pages/app/admin/AdminImpersonar.tsx](../../src/pages/app/admin/AdminImpersonar.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:395](../../src/App.tsx#L395) |
| `/app/admin/sessoes` | [src/pages/app/admin/AdminSessoes.tsx](../../src/pages/app/admin/AdminSessoes.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:396](../../src/App.tsx#L396) |
| `/app/admin/seguranca` | [src/pages/app/admin/AdminSeguranca.tsx](../../src/pages/app/admin/AdminSeguranca.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:397](../../src/App.tsx#L397) |
| `/app/admin/alertas-seguranca` | [src/pages/app/admin/AdminAlertasSeguranca.tsx](../../src/pages/app/admin/AdminAlertasSeguranca.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:398](../../src/App.tsx#L398) |
| `/app/admin/servicos` | [src/pages/app/admin/AdminServicos.tsx](../../src/pages/app/admin/AdminServicos.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:399](../../src/App.tsx#L399) |
| `/app/admin/atendimento-imediato` | [src/pages/app/admin/AdminAtendimentoImediato.tsx](../../src/pages/app/admin/AdminAtendimentoImediato.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:400](../../src/App.tsx#L400) |
| `/app/admin/treinamentos` | [src/pages/app/admin/AdminTreinamentos.tsx](../../src/pages/app/admin/AdminTreinamentos.tsx) | Permissão "colaboradores.alterar_permissoes" (uma basta, se lista) | [src/App.tsx:401](../../src/App.tsx#L401) |
| `/app/admin/analises` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:402](../../src/App.tsx#L402) |
| `/app/admin/analises/tempo-real` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:403](../../src/App.tsx#L403) |
| `/app/admin/analises/trafego` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:404](../../src/App.tsx#L404) |
| `/app/admin/analises/comportamento` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:405](../../src/App.tsx#L405) |
| `/app/admin/analises/conversao` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:406](../../src/App.tsx#L406) |
| `/app/admin/analises/financeiro` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão {["analises.ver","analises.financeiro"]} (todas) | [src/App.tsx:407](../../src/App.tsx#L407) |
| `/app/admin/analises/marketing` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão {["analises.ver","analises.marketing"]} (todas) | [src/App.tsx:408](../../src/App.tsx#L408) |
| `/app/admin/analises/comparativo` | [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) | Permissão "analises.ver" (uma basta, se lista) | [src/App.tsx:409](../../src/App.tsx#L409) |
| `/app/admin/relatorios` | [src/pages/app/admin/AdminRelatorios.tsx](../../src/pages/app/admin/AdminRelatorios.tsx) | Permissão "relatorios.ver" (uma basta, se lista) | [src/App.tsx:410](../../src/App.tsx#L410) |
| `/app/admin/relatorios/financeiro` | [src/pages/app/admin/AdminRelatorioFinanceiro.tsx](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx) | Permissão "relatorios.ver" (uma basta, se lista) | [src/App.tsx:411](../../src/App.tsx#L411) |
| `/app/admin/relatorios/auditoria` | Redireciona para `/app/admin/auditoria?tab=painel` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:412](../../src/App.tsx#L412) |
| `/app/admin/auditoria` | [src/pages/app/admin/AdminAuditoria.tsx](../../src/pages/app/admin/AdminAuditoria.tsx) | Permissão "auditoria.ver" (uma basta, se lista) | [src/App.tsx:413](../../src/App.tsx#L413) |
| `/app/admin/fluxo` | [src/pages/app/admin/FluxoOperacional.tsx](../../src/pages/app/admin/FluxoOperacional.tsx) | Permissão "agenda.ver_todas" (uma basta, se lista) | [src/App.tsx:414](../../src/App.tsx#L414) |
| `/app/admin/comunicacao-interna` | [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:415](../../src/App.tsx#L415) |
| `/app/admin/comunicacao/operacao` | [src/pages/app/admin/AdminComunicacaoOperacao.tsx](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:416](../../src/App.tsx#L416) |
| `/app/admin/comunicacao/producao` | [src/pages/app/admin/AdminProducaoCockpit.tsx](../../src/pages/app/admin/AdminProducaoCockpit.tsx) | Permissão "comunicacao.producao.ver" (uma basta, se lista) | [src/App.tsx:417](../../src/App.tsx#L417) |
| `/app/admin/whatsapp-cloud-test` | [src/pages/app/admin/AdminWhatsappCloudTest.tsx](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:418](../../src/App.tsx#L418) |
| `/app/admin/observabilidade` | [src/pages/app/admin/AdminObservabilidade.tsx](../../src/pages/app/admin/AdminObservabilidade.tsx) | Permissão "observabilidade.ver" (uma basta, se lista) | [src/App.tsx:419](../../src/App.tsx#L419) |
| `/app/admin/faq` | [src/pages/app/admin/AdminFaq.tsx](../../src/pages/app/admin/AdminFaq.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:420](../../src/App.tsx#L420) |
| `/app/admin/feedbacks` | [src/pages/app/admin/AdminFeedbacks.tsx](../../src/pages/app/admin/AdminFeedbacks.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:421](../../src/App.tsx#L421) |
| `/app/admin/saude` | [src/pages/app/admin/AdminSaude.tsx](../../src/pages/app/admin/AdminSaude.tsx) | Permissão "admin.dashboard" (uma basta, se lista) | [src/App.tsx:422](../../src/App.tsx#L422) |
| `/app/admin/pacientes/:id` | [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) | Permissão "pacientes.ver" (uma basta, se lista) | [src/App.tsx:423](../../src/App.tsx#L423) |
| `/app/admin/feegow` | [src/pages/app/admin/FeegowIntegracao.tsx](../../src/pages/app/admin/FeegowIntegracao.tsx) | Permissão "integracoes.configurar_feegow" (uma basta, se lista) | [src/App.tsx:424](../../src/App.tsx#L424) |
| `/app/admin/feegow/mapeamento` | [src/pages/app/admin/FeegowMapeamento.tsx](../../src/pages/app/admin/FeegowMapeamento.tsx) | Permissão "integracoes.configurar_feegow" (uma basta, se lista) | [src/App.tsx:425](../../src/App.tsx#L425) |
| `/app/admin/feegow/schema` | [src/pages/app/admin/FeegowSchema.tsx](../../src/pages/app/admin/FeegowSchema.tsx) | Permissão "integracoes.configurar_feegow" (uma basta, se lista) | [src/App.tsx:426](../../src/App.tsx#L426) |
| `/app/admin/feegow/profissionais` | [src/pages/app/admin/FeegowProfissionais.tsx](../../src/pages/app/admin/FeegowProfissionais.tsx) | Permissão "integracoes.configurar_feegow" (uma basta, se lista) | [src/App.tsx:427](../../src/App.tsx#L427) |
| `/app/admin/cupons` | [src/pages/app/secretaria/SecretariaCupons.tsx](../../src/pages/app/secretaria/SecretariaCupons.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:428](../../src/App.tsx#L428) |
| `/app/admin/cupons/log` | [src/pages/app/shared/CuponsUsoLog.tsx](../../src/pages/app/shared/CuponsUsoLog.tsx) | Permissão "financeiro.servicos_gerenciar" (uma basta, se lista) | [src/App.tsx:429](../../src/App.tsx#L429) |
| `/app/admin/pendencias-integracao` | [src/pages/app/shared/PendenciasIntegracao.tsx](../../src/pages/app/shared/PendenciasIntegracao.tsx) | Permissão "integracoes.ver_logs" (uma basta, se lista) | [src/App.tsx:430](../../src/App.tsx#L430) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### AdminAgendamentos.tsx

Fonte: [src/pages/app/admin/AdminAgendamentos.tsx](../../src/pages/app/admin/AdminAgendamentos.tsx) (736 linhas). Rotas: `/app/admin/agendamentos`.

Funções da interface, conforme títulos e descrições: Central de Agendamentos; Monitoramento, auditoria e otimização — não é uma agenda manual..

Funções nomeadas: [src/pages/app/admin/AdminAgendamentos.tsx:90](../../src/pages/app/admin/AdminAgendamentos.tsx#L90) `statusBadge`; [src/pages/app/admin/AdminAgendamentos.tsx:104](../../src/pages/app/admin/AdminAgendamentos.tsx#L104) `canalBadge`; [src/pages/app/admin/AdminAgendamentos.tsx:114](../../src/pages/app/admin/AdminAgendamentos.tsx#L114) `fmtDate`; [src/pages/app/admin/AdminAgendamentos.tsx:120](../../src/pages/app/admin/AdminAgendamentos.tsx#L120) `AdminAgendamentos`; [src/pages/app/admin/AdminAgendamentos.tsx:151](../../src/pages/app/admin/AdminAgendamentos.tsx#L151) `invalidateAll`; [src/pages/app/admin/AdminAgendamentos.tsx:237](../../src/pages/app/admin/AdminAgendamentos.tsx#L237) `forcarStatus`; [src/pages/app/admin/AdminAgendamentos.tsx:276](../../src/pages/app/admin/AdminAgendamentos.tsx#L276) `cancelarConsulta`; [src/pages/app/admin/AdminAgendamentos.tsx:294](../../src/pages/app/admin/AdminAgendamentos.tsx#L294) `reenviarLink`; [src/pages/app/admin/AdminAgendamentos.tsx:306](../../src/pages/app/admin/AdminAgendamentos.tsx#L306) `abrirAuditoria`.

Dados e integrações diretas: `invoke(consulta-insights)` [src/pages/app/admin/AdminAgendamentos.tsx:159](../../src/pages/app/admin/AdminAgendamentos.tsx#L159); `rpc(admin_consulta_forcar_confirmacao)` [src/pages/app/admin/AdminAgendamentos.tsx:249](../../src/pages/app/admin/AdminAgendamentos.tsx#L249); `rpc(admin_consulta_marcar_realizada)` [src/pages/app/admin/AdminAgendamentos.tsx:253](../../src/pages/app/admin/AdminAgendamentos.tsx#L253); `rpc(forcar_status_consulta)` [src/pages/app/admin/AdminAgendamentos.tsx:258](../../src/pages/app/admin/AdminAgendamentos.tsx#L258); `rpc(admin_consulta_cancelar)` [src/pages/app/admin/AdminAgendamentos.tsx:279](../../src/pages/app/admin/AdminAgendamentos.tsx#L279); `rpc(admin_consulta_reenviar_link)` [src/pages/app/admin/AdminAgendamentos.tsx:295](../../src/pages/app/admin/AdminAgendamentos.tsx#L295); `from(consultas_auditoria)` [src/pages/app/admin/AdminAgendamentos.tsx:310](../../src/pages/app/admin/AdminAgendamentos.tsx#L310); `from(consulta_status_log)` [src/pages/app/admin/AdminAgendamentos.tsx:311](../../src/pages/app/admin/AdminAgendamentos.tsx#L311).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/admin/queries.ts](../../src/lib/admin/queries.ts); [src/lib/admin/queries.ts](../../src/lib/admin/queries.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminAgendamentos.tsx:69](../../src/pages/app/admin/AdminAgendamentos.tsx#L69): const filtrosStatus: { key: Status \| "todos" \| "ativos"; label: string }[] = [
- [src/pages/app/admin/AdminAgendamentos.tsx:71](../../src/pages/app/admin/AdminAgendamentos.tsx#L71): { key: "todos", label: "Todos" },
- [src/pages/app/admin/AdminAgendamentos.tsx:125](../../src/pages/app/admin/AdminAgendamentos.tsx#L125): const [filtroData, setFiltroData] = useState<"hoje" \| "7d" \| "30d" \| "todos">("7d");
- [src/pages/app/admin/AdminAgendamentos.tsx:126](../../src/pages/app/admin/AdminAgendamentos.tsx#L126): const [filtroCanal, setFiltroCanal] = useState<string>("todos");
- [src/pages/app/admin/AdminAgendamentos.tsx:224](../../src/pages/app/admin/AdminAgendamentos.tsx#L224): } else if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
- [src/pages/app/admin/AdminAgendamentos.tsx:225](../../src/pages/app/admin/AdminAgendamentos.tsx#L225): if (filtroCanal !== "todos" && (r.canal_origem \|\| "app") !== filtroCanal) return false;
- [src/pages/app/admin/AdminAgendamentos.tsx:501](../../src/pages/app/admin/AdminAgendamentos.tsx#L501): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminAgendamentos.tsx:507](../../src/pages/app/admin/AdminAgendamentos.tsx#L507): <SelectItem value="todos">Todos os canais</SelectItem>

### AdminAiAssistant.tsx

Fonte: [src/pages/app/admin/AdminAiAssistant.tsx](../../src/pages/app/admin/AdminAiAssistant.tsx) (84 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: IA Assistiva; Copiloto operacional para o Inbox. Sugere, resume e alerta — sem enviar mensagens automaticamente..

Funções nomeadas: [src/pages/app/admin/AdminAiAssistant.tsx:21](../../src/pages/app/admin/AdminAiAssistant.tsx#L21) `AdminAiAssistant`; [src/pages/app/admin/AdminAiAssistant.tsx:30](../../src/pages/app/admin/AdminAiAssistant.tsx#L30) `save`.

Dados e integrações diretas: `from(ai_assistant_settings)` [src/pages/app/admin/AdminAiAssistant.tsx:26](../../src/pages/app/admin/AdminAiAssistant.tsx#L26); `from(ai_assistant_settings)` [src/pages/app/admin/AdminAiAssistant.tsx:33](../../src/pages/app/admin/AdminAiAssistant.tsx#L33).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### AdminAiDashboard.tsx

Fonte: [src/pages/app/admin/AdminAiDashboard.tsx](../../src/pages/app/admin/AdminAiDashboard.tsx) (53 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: IA Assistiva — Operação; Métricas dos últimos 7 dias..

Funções nomeadas: [src/pages/app/admin/AdminAiDashboard.tsx:6](../../src/pages/app/admin/AdminAiDashboard.tsx#L6) `AdminAiDashboard`.

Dados e integrações diretas: `from(ai_audit_logs)` [src/pages/app/admin/AdminAiDashboard.tsx:11](../../src/pages/app/admin/AdminAiDashboard.tsx#L11).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### AdminAiPrompts.tsx

Fonte: [src/pages/app/admin/AdminAiPrompts.tsx](../../src/pages/app/admin/AdminAiPrompts.tsx) (43 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: Prompts da IA Assistiva; Versões dos prompts usados pelo copiloto. Apenas um ativo por tipo..

Funções nomeadas: [src/pages/app/admin/AdminAiPrompts.tsx:12](../../src/pages/app/admin/AdminAiPrompts.tsx#L12) `AdminAiPrompts`; [src/pages/app/admin/AdminAiPrompts.tsx:14](../../src/pages/app/admin/AdminAiPrompts.tsx#L14) `load`; [src/pages/app/admin/AdminAiPrompts.tsx:17](../../src/pages/app/admin/AdminAiPrompts.tsx#L17) `save`.

Dados e integrações diretas: `from(ai_prompts)` [src/pages/app/admin/AdminAiPrompts.tsx:14](../../src/pages/app/admin/AdminAiPrompts.tsx#L14); `from(ai_prompts)` [src/pages/app/admin/AdminAiPrompts.tsx:18](../../src/pages/app/admin/AdminAiPrompts.tsx#L18).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### AdminAlertasSeguranca.tsx

Fonte: [src/pages/app/admin/AdminAlertasSeguranca.tsx](../../src/pages/app/admin/AdminAlertasSeguranca.tsx) (344 linhas). Rotas: `/app/admin/alertas-seguranca`.

Funções da interface, conforme títulos e descrições: Alertas de Segurança; Monitore atividades suspeitas detectadas automaticamente no sistema..

Funções nomeadas: [src/pages/app/admin/AdminAlertasSeguranca.tsx:50](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L50) `AdminAlertasSeguranca`; [src/pages/app/admin/AdminAlertasSeguranca.tsx:60](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L60) `load`; [src/pages/app/admin/AdminAlertasSeguranca.tsx:81](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L81) `scanNow`; [src/pages/app/admin/AdminAlertasSeguranca.tsx:95](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L95) `marcarLida`; [src/pages/app/admin/AdminAlertasSeguranca.tsx:105](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L105) `marcarTodasLidas`; [src/pages/app/admin/AdminAlertasSeguranca.tsx:333](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L333) `KpiCard`.

Dados e integrações diretas: `from(security_alerts)` [src/pages/app/admin/AdminAlertasSeguranca.tsx:62](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L62); `rpc(security_generate_alerts)` [src/pages/app/admin/AdminAlertasSeguranca.tsx:83](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L83); `from(security_alerts)` [src/pages/app/admin/AdminAlertasSeguranca.tsx:96](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L96); `from(security_alerts)` [src/pages/app/admin/AdminAlertasSeguranca.tsx:108](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L108).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminAlertasSeguranca.tsx:55](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L55): const [filtroTipo, setFiltroTipo] = useState("todos");
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:56](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L56): const [filtroSev, setFiltroSev] = useState("todos");
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:70](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L70): if (filtroTipo !== "todos") q = q.eq("tipo", filtroTipo);
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:71](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L71): if (filtroSev !== "todos") q = q.eq("severidade", filtroSev);
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:168](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L168): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:177](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L177): <SelectItem value="todos">Todas severidades</SelectItem>
- [src/pages/app/admin/AdminAlertasSeguranca.tsx:189](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L189): <SelectItem value="todos">Todos</SelectItem>

### AdminAnalises.tsx

Fonte: [src/pages/app/admin/AdminAnalises.tsx](../../src/pages/app/admin/AdminAnalises.tsx) (777 linhas). Rotas: `/app/admin/analises`, `/app/admin/analises/tempo-real`, `/app/admin/analises/trafego`, `/app/admin/analises/comportamento`, `/app/admin/analises/conversao`, `/app/admin/analises/financeiro`, `/app/admin/analises/marketing`, `/app/admin/analises/comparativo`.

Funções da interface, conforme títulos e descrições: Análises; Painel estratégico — tráfego, conversão, receita por canal e ROI de marketing.; Editar.

Funções nomeadas: [src/pages/app/admin/AdminAnalises.tsx:36](../../src/pages/app/admin/AdminAnalises.tsx#L36) `pct`; [src/pages/app/admin/AdminAnalises.tsx:42](../../src/pages/app/admin/AdminAnalises.tsx#L42) `AdminAnalises`; [src/pages/app/admin/AdminAnalises.tsx:60](../../src/pages/app/admin/AdminAnalises.tsx#L60) `carregar`; [src/pages/app/admin/AdminAnalises.tsx:79](../../src/pages/app/admin/AdminAnalises.tsx#L79) `carregarTempoReal`; [src/pages/app/admin/AdminAnalises.tsx:84](../../src/pages/app/admin/AdminAnalises.tsx#L84) `toggleCampanhaAtivo`; [src/pages/app/admin/AdminAnalises.tsx:100](../../src/pages/app/admin/AdminAnalises.tsx#L100) `overviewCSV`; [src/pages/app/admin/AdminAnalises.tsx:584](../../src/pages/app/admin/AdminAnalises.tsx#L584) `KpiSkeleton`; [src/pages/app/admin/AdminAnalises.tsx:598](../../src/pages/app/admin/AdminAnalises.tsx#L598) `Kpi`; [src/pages/app/admin/AdminAnalises.tsx:616](../../src/pages/app/admin/AdminAnalises.tsx#L616) `Empty`; [src/pages/app/admin/AdminAnalises.tsx:620](../../src/pages/app/admin/AdminAnalises.tsx#L620) `Funil`; [src/pages/app/admin/AdminAnalises.tsx:651](../../src/pages/app/admin/AdminAnalises.tsx#L651) `Comp`; [src/pages/app/admin/AdminAnalises.tsx:653](../../src/pages/app/admin/AdminAnalises.tsx#L653) `fmt`; [src/pages/app/admin/AdminAnalises.tsx:676](../../src/pages/app/admin/AdminAnalises.tsx#L676) `CampanhaSheet`; [src/pages/app/admin/AdminAnalises.tsx:704](../../src/pages/app/admin/AdminAnalises.tsx#L704) `salvar`.

Dados e integrações diretas: `rpc(analytics_overview)` [src/pages/app/admin/AdminAnalises.tsx:64](../../src/pages/app/admin/AdminAnalises.tsx#L64); `rpc(analytics_trafego)` [src/pages/app/admin/AdminAnalises.tsx:65](../../src/pages/app/admin/AdminAnalises.tsx#L65); `rpc(analytics_conversao)` [src/pages/app/admin/AdminAnalises.tsx:66](../../src/pages/app/admin/AdminAnalises.tsx#L66); `rpc(analytics_financeiro)` [src/pages/app/admin/AdminAnalises.tsx:67](../../src/pages/app/admin/AdminAnalises.tsx#L67); `from(marketing_campaigns)` [src/pages/app/admin/AdminAnalises.tsx:74](../../src/pages/app/admin/AdminAnalises.tsx#L74); `rpc(analytics_tempo_real)` [src/pages/app/admin/AdminAnalises.tsx:80](../../src/pages/app/admin/AdminAnalises.tsx#L80); `from(marketing_campaigns)` [src/pages/app/admin/AdminAnalises.tsx:85](../../src/pages/app/admin/AdminAnalises.tsx#L85); `from((dinâmico))` [src/pages/app/admin/AdminAnalises.tsx:587](../../src/pages/app/admin/AdminAnalises.tsx#L587); `from(marketing_campaigns)` [src/pages/app/admin/AdminAnalises.tsx:722](../../src/pages/app/admin/AdminAnalises.tsx#L722); `from(marketing_campaigns)` [src/pages/app/admin/AdminAnalises.tsx:725](../../src/pages/app/admin/AdminAnalises.tsx#L725).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/permissions/RequirePermission.tsx](../../src/components/permissions/RequirePermission.tsx).

### AdminAtendimentoImediato.tsx

Fonte: [src/pages/app/admin/AdminAtendimentoImediato.tsx](../../src/pages/app/admin/AdminAtendimentoImediato.tsx) (430 linhas). Rotas: `/app/admin/atendimento-imediato`.

Funções da interface, conforme títulos e descrições: Atendimento imediato; Edite preço, duração e repasse do serviço público de pronto atendimento. Mudanças refletem automaticamente no calendário compartilhado..

Funções nomeadas: [src/pages/app/admin/AdminAtendimentoImediato.tsx:49](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L49) `AdminAtendimentoImediato`; [src/pages/app/admin/AdminAtendimentoImediato.tsx:67](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L67) `load`; [src/pages/app/admin/AdminAtendimentoImediato.tsx:111](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L111) `trocarVinculo`; [src/pages/app/admin/AdminAtendimentoImediato.tsx:124](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L124) `salvarParams`; [src/pages/app/admin/AdminAtendimentoImediato.tsx:140](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L140) `salvarRepasse`.

Dados e integrações diretas: `from(servicos_financeiros)` [src/pages/app/admin/AdminAtendimentoImediato.tsx:81](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L81); `from(medico_servicos)` [src/pages/app/admin/AdminAtendimentoImediato.tsx:86](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L86); `from(app_settings)` [src/pages/app/admin/AdminAtendimentoImediato.tsx:113](../../src/pages/app/admin/AdminAtendimentoImediato.tsx#L113).

Operações diretas detectadas: update.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/financeiro/RepasseSplitInput.tsx](../../src/components/financeiro/RepasseSplitInput.tsx); [src/lib/format.ts](../../src/lib/format.ts); [src/lib/pa-types.ts](../../src/lib/pa-types.ts).

### AdminAuditoria.tsx

Fonte: [src/pages/app/admin/AdminAuditoria.tsx](../../src/pages/app/admin/AdminAuditoria.tsx) (645 linhas). Rotas: `/app/admin/auditoria`.

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

### AdminCancelamentosPlanos.tsx

Fonte: [src/pages/app/admin/AdminCancelamentosPlanos.tsx](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx) (255 linhas). Rotas: `/app/admin/planos-cancelamentos`.

Funções da interface, conforme títulos e descrições: Cancelamentos de Planos.

Funções nomeadas: [src/pages/app/admin/AdminCancelamentosPlanos.tsx:27](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L27) `AdminCancelamentosPlanos`; [src/pages/app/admin/AdminCancelamentosPlanos.tsx:37](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L37) `load`; [src/pages/app/admin/AdminCancelamentosPlanos.tsx:57](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L57) `handleAction`; [src/pages/app/admin/AdminCancelamentosPlanos.tsx:103](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L103) `openAction`.

Dados e integrações diretas: `from(plano_cancelamento_evento)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:40](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L40); `from(reembolso_planos)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:44](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L44); `from(plano_cancelamento_evento)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:62](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L62); `from(assinaturas)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:69](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L69); `from(plano_cancelamento_evento)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:74](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L74); `from(planos)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:81](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L81); `from(plano_cancelamento_evento)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:84](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L84); `from(planos)` [src/pages/app/admin/AdminCancelamentosPlanos.tsx:90](../../src/pages/app/admin/AdminCancelamentosPlanos.tsx#L90).

Operações diretas detectadas: update.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageShell.tsx](../../src/components/PageShell.tsx).

### AdminColaboradores.tsx

Fonte: [src/pages/app/admin/AdminColaboradores.tsx](../../src/pages/app/admin/AdminColaboradores.tsx) (814 linhas). Rotas: `/app/admin/colaboradores`.

Funções da interface, conforme títulos e descrições: Gestão de colaboradores internos; Cadastre colaboradores, defina funções, permissões e acessos à comunicação da plataforma.; Total; Ativos; Pendentes; Suspensos; Bloqueados.

Funções nomeadas: [src/pages/app/admin/AdminColaboradores.tsx:202](../../src/pages/app/admin/AdminColaboradores.tsx#L202) `statusBadge`; [src/pages/app/admin/AdminColaboradores.tsx:214](../../src/pages/app/admin/AdminColaboradores.tsx#L214) `funcaoLabel`; [src/pages/app/admin/AdminColaboradores.tsx:219](../../src/pages/app/admin/AdminColaboradores.tsx#L219) `AdminColaboradores`; [src/pages/app/admin/AdminColaboradores.tsx:401](../../src/pages/app/admin/AdminColaboradores.tsx#L401) `KpiCard`; [src/pages/app/admin/AdminColaboradores.tsx:416](../../src/pages/app/admin/AdminColaboradores.tsx#L416) `Th`; [src/pages/app/admin/AdminColaboradores.tsx:419](../../src/pages/app/admin/AdminColaboradores.tsx#L419) `Td`; [src/pages/app/admin/AdminColaboradores.tsx:424](../../src/pages/app/admin/AdminColaboradores.tsx#L424) `NovoColaboradorDialog`; [src/pages/app/admin/AdminColaboradores.tsx:437](../../src/pages/app/admin/AdminColaboradores.tsx#L437) `submit`; [src/pages/app/admin/AdminColaboradores.tsx:529](../../src/pages/app/admin/AdminColaboradores.tsx#L529) `EditarColaboradorDialog`; [src/pages/app/admin/AdminColaboradores.tsx:543](../../src/pages/app/admin/AdminColaboradores.tsx#L543) `submit`; [src/pages/app/admin/AdminColaboradores.tsx:598](../../src/pages/app/admin/AdminColaboradores.tsx#L598) `StatusDialog`; [src/pages/app/admin/AdminColaboradores.tsx:614](../../src/pages/app/admin/AdminColaboradores.tsx#L614) `submit`; [src/pages/app/admin/AdminColaboradores.tsx:685](../../src/pages/app/admin/AdminColaboradores.tsx#L685) `PermissoesSheet`; [src/pages/app/admin/AdminColaboradores.tsx:691](../../src/pages/app/admin/AdminColaboradores.tsx#L691) `load`; [src/pages/app/admin/AdminColaboradores.tsx:721](../../src/pages/app/admin/AdminColaboradores.tsx#L721) `efetivo`; [src/pages/app/admin/AdminColaboradores.tsx:727](../../src/pages/app/admin/AdminColaboradores.tsx#L727) `setPerm`; [src/pages/app/admin/AdminColaboradores.tsx:806](../../src/pages/app/admin/AdminColaboradores.tsx#L806) `Field`.

Dados e integrações diretas: `invoke(admin-invite-colaborador)` [src/pages/app/admin/AdminColaboradores.tsx:443](../../src/pages/app/admin/AdminColaboradores.tsx#L443); `rpc(colaborador_atualizar)` [src/pages/app/admin/AdminColaboradores.tsx:545](../../src/pages/app/admin/AdminColaboradores.tsx#L545); `rpc(colaborador_alterar_status)` [src/pages/app/admin/AdminColaboradores.tsx:628](../../src/pages/app/admin/AdminColaboradores.tsx#L628); `from(permissoes_colaborador)` [src/pages/app/admin/AdminColaboradores.tsx:694](../../src/pages/app/admin/AdminColaboradores.tsx#L694); `from(user_roles)` [src/pages/app/admin/AdminColaboradores.tsx:703](../../src/pages/app/admin/AdminColaboradores.tsx#L703); `from(permissoes_perfil)` [src/pages/app/admin/AdminColaboradores.tsx:707](../../src/pages/app/admin/AdminColaboradores.tsx#L707); `rpc(colaborador_remover_permissao)` [src/pages/app/admin/AdminColaboradores.tsx:731](../../src/pages/app/admin/AdminColaboradores.tsx#L731); `rpc(colaborador_set_permissao)` [src/pages/app/admin/AdminColaboradores.tsx:738](../../src/pages/app/admin/AdminColaboradores.tsx#L738).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/admin/queries.ts](../../src/lib/admin/queries.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminColaboradores.tsx:66](../../src/pages/app/admin/AdminColaboradores.tsx#L66): { key: "todos", label: "Todos" },
- [src/pages/app/admin/AdminColaboradores.tsx:223](../../src/pages/app/admin/AdminColaboradores.tsx#L223): const [filtro, setFiltro] = useState<typeof FILTROS[number]["key"]>("todos");
- [src/pages/app/admin/AdminColaboradores.tsx:234](../../src/pages/app/admin/AdminColaboradores.tsx#L234): if (filtro !== "todos") {

### AdminComunicacaoOperacao.tsx

Fonte: [src/pages/app/admin/AdminComunicacaoOperacao.tsx](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx) (132 linhas). Rotas: `/app/admin/comunicacao/operacao`.

Funções da interface, conforme títulos e descrições: Operação da Comunicação; Visão central das filas, atendentes, SLA e desempenho do Inbox..

Funções nomeadas: [src/pages/app/admin/AdminComunicacaoOperacao.tsx:21](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx#L21) `AdminComunicacaoOperacao`; [src/pages/app/admin/AdminComunicacaoOperacao.tsx:58](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx#L58) `Kpi`.

Dados e integrações diretas: `from(conversation_assignments)` [src/pages/app/admin/AdminComunicacaoOperacao.tsx:27](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx#L27); `from(conversations)` [src/pages/app/admin/AdminComunicacaoOperacao.tsx:36](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx#L36); `from(conversations)` [src/pages/app/admin/AdminComunicacaoOperacao.tsx:38](../../src/pages/app/admin/AdminComunicacaoOperacao.tsx#L38).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/hooks/useOperacaoMetricas.ts](../../src/hooks/useOperacaoMetricas.ts); [src/components/comunicacao/AttendantPresenceBadge.tsx](../../src/components/comunicacao/AttendantPresenceBadge.tsx); [src/components/comunicacao/ConversationSlaBadge.tsx](../../src/components/comunicacao/ConversationSlaBadge.tsx).

### AdminConfiguracoes.tsx

Fonte: [src/pages/app/admin/AdminConfiguracoes.tsx](../../src/pages/app/admin/AdminConfiguracoes.tsx) (369 linhas). Rotas: `/app/admin/configuracoes`.

Funções da interface, conforme títulos e descrições: Configurações da plataforma; Especialidades disponíveis no site e atalhos para módulos de gestão.; Pagamentos; Será habilitado quando ligarmos o Stripe; Especialidades cadastradas; Recolocar todas em ordem alfabética; Mover para cima; Mover para baixo; Excluir.

Funções nomeadas: [src/pages/app/admin/AdminConfiguracoes.tsx:13](../../src/pages/app/admin/AdminConfiguracoes.tsx#L13) `Field`; [src/pages/app/admin/AdminConfiguracoes.tsx:21](../../src/pages/app/admin/AdminConfiguracoes.tsx#L21) `Input`; [src/pages/app/admin/AdminConfiguracoes.tsx:25](../../src/pages/app/admin/AdminConfiguracoes.tsx#L25) `Section`; [src/pages/app/admin/AdminConfiguracoes.tsx:38](../../src/pages/app/admin/AdminConfiguracoes.tsx#L38) `slugify`; [src/pages/app/admin/AdminConfiguracoes.tsx:47](../../src/pages/app/admin/AdminConfiguracoes.tsx#L47) `AdminConfiguracoes`; [src/pages/app/admin/AdminConfiguracoes.tsx:59](../../src/pages/app/admin/AdminConfiguracoes.tsx#L59) `load`; [src/pages/app/admin/AdminConfiguracoes.tsx:73](../../src/pages/app/admin/AdminConfiguracoes.tsx#L73) `criarEspecialidade`; [src/pages/app/admin/AdminConfiguracoes.tsx:94](../../src/pages/app/admin/AdminConfiguracoes.tsx#L94) `moverEspecialidade`; [src/pages/app/admin/AdminConfiguracoes.tsx:118](../../src/pages/app/admin/AdminConfiguracoes.tsx#L118) `reordenarAlfabetico`; [src/pages/app/admin/AdminConfiguracoes.tsx:131](../../src/pages/app/admin/AdminConfiguracoes.tsx#L131) `toggleAtivo`; [src/pages/app/admin/AdminConfiguracoes.tsx:141](../../src/pages/app/admin/AdminConfiguracoes.tsx#L141) `excluir`.

Dados e integrações diretas: `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:61](../../src/pages/app/admin/AdminConfiguracoes.tsx#L61); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:77](../../src/pages/app/admin/AdminConfiguracoes.tsx#L77); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:109](../../src/pages/app/admin/AdminConfiguracoes.tsx#L109); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:110](../../src/pages/app/admin/AdminConfiguracoes.tsx#L110); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:124](../../src/pages/app/admin/AdminConfiguracoes.tsx#L124); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:132](../../src/pages/app/admin/AdminConfiguracoes.tsx#L132); `from(medico_especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:143](../../src/pages/app/admin/AdminConfiguracoes.tsx#L143); `from(medico_especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:155](../../src/pages/app/admin/AdminConfiguracoes.tsx#L155); `from(especialidades)` [src/pages/app/admin/AdminConfiguracoes.tsx:164](../../src/pages/app/admin/AdminConfiguracoes.tsx#L164).

Operações diretas detectadas: insert, update, delete.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/lib/permissions/usePermission.ts](../../src/lib/permissions/usePermission.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminConfiguracoes.tsx:57](../../src/pages/app/admin/AdminConfiguracoes.tsx#L57): const [provider, setProvider] = useState<PagamentoProvider>("mock");
- [src/pages/app/admin/AdminConfiguracoes.tsx:221](../../src/pages/app/admin/AdminConfiguracoes.tsx#L221): {provider === "stripe" ? "Stripe conectado" : "Modo simulado (dev)"}
- [src/pages/app/admin/AdminConfiguracoes.tsx:231](../../src/pages/app/admin/AdminConfiguracoes.tsx#L231): {provider === "mock"
- [src/pages/app/admin/AdminConfiguracoes.tsx:232](../../src/pages/app/admin/AdminConfiguracoes.tsx#L232): ? "Checkout simulado para desenvolvimento. Nenhum valor é cobrado e os pagamentos são confirmados localmente."
- [src/pages/app/admin/AdminConfiguracoes.tsx:237](../../src/pages/app/admin/AdminConfiguracoes.tsx#L237): Conectar Stripe (em breve)
- [src/pages/app/admin/AdminConfiguracoes.tsx:240](../../src/pages/app/admin/AdminConfiguracoes.tsx#L240): {provider === "mock" && (

### AdminContratoDetalhes.tsx

Fonte: [src/pages/app/admin/AdminContratoDetalhes.tsx](../../src/pages/app/admin/AdminContratoDetalhes.tsx) (370 linhas). Rotas: `/app/admin/contrato-b2b/:id`.

Funções da interface, conforme títulos e descrições: Detalhes do contrato B2B.

Funções nomeadas: [src/pages/app/admin/AdminContratoDetalhes.tsx:16](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L16) `brl`; [src/pages/app/admin/AdminContratoDetalhes.tsx:18](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L18) `fmtDate`; [src/pages/app/admin/AdminContratoDetalhes.tsx:20](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L20) `fmtDateTime`; [src/pages/app/admin/AdminContratoDetalhes.tsx:66](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L66) `AdminContratoDetalhes`; [src/pages/app/admin/AdminContratoDetalhes.tsx:77](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L77) `carregarDados`; [src/pages/app/admin/AdminContratoDetalhes.tsx:362](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L362) `Row`.

Dados e integrações diretas: `from(empresas_contratos)` [src/pages/app/admin/AdminContratoDetalhes.tsx:80](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L80); `from(empresas_auditoria)` [src/pages/app/admin/AdminContratoDetalhes.tsx:112](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L112); `from(empresas_funcionarios)` [src/pages/app/admin/AdminContratoDetalhes.tsx:121](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L121).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminContratoDetalhes.tsx:153](../../src/pages/app/admin/AdminContratoDetalhes.tsx#L153): list.push({ tipo: "warning", icon: Clock, msg: `Contrato vence em ${fmtDate(contrato.data_fim)} — renove em breve.` });

### AdminContratosModelo.tsx

Fonte: [src/pages/app/admin/AdminContratosModelo.tsx](../../src/pages/app/admin/AdminContratosModelo.tsx) (244 linhas). Rotas: `/app/admin/medicos/contratos-modelo`.

Funções da interface, conforme títulos e descrições: Contrato modelo (PDF); Gerencie as versões do PDF oficial de contrato que os médicos baixam, assinam e reenviam.; Baixar PDF; Ativar este modelo; Excluir.

Funções nomeadas: [src/pages/app/admin/AdminContratosModelo.tsx:26](../../src/pages/app/admin/AdminContratosModelo.tsx#L26) `AdminContratosModelo`; [src/pages/app/admin/AdminContratosModelo.tsx:51](../../src/pages/app/admin/AdminContratosModelo.tsx#L51) `resetForm`; [src/pages/app/admin/AdminContratosModelo.tsx:56](../../src/pages/app/admin/AdminContratosModelo.tsx#L56) `salvar`; [src/pages/app/admin/AdminContratosModelo.tsx:92](../../src/pages/app/admin/AdminContratosModelo.tsx#L92) `baixar`; [src/pages/app/admin/AdminContratosModelo.tsx:99](../../src/pages/app/admin/AdminContratosModelo.tsx#L99) `ativar`; [src/pages/app/admin/AdminContratosModelo.tsx:111](../../src/pages/app/admin/AdminContratosModelo.tsx#L111) `excluir`.

Dados e integrações diretas: `from(contratos_modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:40](../../src/pages/app/admin/AdminContratosModelo.tsx#L40); `from(contratos-modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:66](../../src/pages/app/admin/AdminContratosModelo.tsx#L66); `from(contratos_modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:71](../../src/pages/app/admin/AdminContratosModelo.tsx#L71); `from(contratos-modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:93](../../src/pages/app/admin/AdminContratosModelo.tsx#L93); `from(contratos_modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:101](../../src/pages/app/admin/AdminContratosModelo.tsx#L101); `from(contratos-modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:115](../../src/pages/app/admin/AdminContratosModelo.tsx#L115); `from(contratos_modelo)` [src/pages/app/admin/AdminContratosModelo.tsx:116](../../src/pages/app/admin/AdminContratosModelo.tsx#L116).

Operações diretas detectadas: upload, insert, createSignedUrl, update, delete.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

### AdminDashboard.tsx

Fonte: [src/pages/app/admin/AdminDashboard.tsx](../../src/pages/app/admin/AdminDashboard.tsx) (304 linhas). Rotas: `/app/admin/dashboard`.

Funções da interface, conforme títulos e descrições: Visão geral da operação; Indicadores em tempo real da plataforma Nova Saúde..

Funções nomeadas: [src/pages/app/admin/AdminDashboard.tsx:25](../../src/pages/app/admin/AdminDashboard.tsx#L25) `fmtBRL`; [src/pages/app/admin/AdminDashboard.tsx:28](../../src/pages/app/admin/AdminDashboard.tsx#L28) `fmtNum`; [src/pages/app/admin/AdminDashboard.tsx:30](../../src/pages/app/admin/AdminDashboard.tsx#L30) `fmtHora`; [src/pages/app/admin/AdminDashboard.tsx:33](../../src/pages/app/admin/AdminDashboard.tsx#L33) `fmtData`; [src/pages/app/admin/AdminDashboard.tsx:36](../../src/pages/app/admin/AdminDashboard.tsx#L36) `AdminDashboard`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/mock.ts](../../src/lib/mock.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/components/planos/ReceitaPorOrigem.tsx](../../src/components/planos/ReceitaPorOrigem.tsx); [src/lib/admin/queries.ts](../../src/lib/admin/queries.ts); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminDashboard.tsx:10](../../src/pages/app/admin/AdminDashboard.tsx#L10): import type { Status } from "@/lib/mock";
- [src/pages/app/admin/AdminDashboard.tsx:170](../../src/pages/app/admin/AdminDashboard.tsx#L170): <Link to="/app/admin/agendamentos">Ver todos</Link>

### AdminEmpresas.tsx

Fonte: [src/pages/app/admin/AdminEmpresas.tsx](../../src/pages/app/admin/AdminEmpresas.tsx) (425 linhas). Rotas: `/app/admin/empresas`.

Funções da interface, conforme títulos e descrições: Empresas B2B; Gestão completa de empresas contratantes, clínicas parceiras e parceiros de saúde ocupacional..

Funções nomeadas: [src/pages/app/admin/AdminEmpresas.tsx:65](../../src/pages/app/admin/AdminEmpresas.tsx#L65) `fmtBRL`; [src/pages/app/admin/AdminEmpresas.tsx:66](../../src/pages/app/admin/AdminEmpresas.tsx#L66) `fmtCNPJ`; [src/pages/app/admin/AdminEmpresas.tsx:96](../../src/pages/app/admin/AdminEmpresas.tsx#L96) `AdminEmpresas`; [src/pages/app/admin/AdminEmpresas.tsx:118](../../src/pages/app/admin/AdminEmpresas.tsx#L118) `invalidate`; [src/pages/app/admin/AdminEmpresas.tsx:144](../../src/pages/app/admin/AdminEmpresas.tsx#L144) `onCriar`; [src/pages/app/admin/AdminEmpresas.tsx:145](../../src/pages/app/admin/AdminEmpresas.tsx#L145) `onEditar`; [src/pages/app/admin/AdminEmpresas.tsx:175](../../src/pages/app/admin/AdminEmpresas.tsx#L175) `onSalvar`; [src/pages/app/admin/AdminEmpresas.tsx:388](../../src/pages/app/admin/AdminEmpresas.tsx#L388) `Field`; [src/pages/app/admin/AdminEmpresas.tsx:392](../../src/pages/app/admin/AdminEmpresas.tsx#L392) `EmpresaSheet`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminEmpresas.tsx:101](../../src/pages/app/admin/AdminEmpresas.tsx#L101); `from(empresas)` [src/pages/app/admin/AdminEmpresas.tsx:146](../../src/pages/app/admin/AdminEmpresas.tsx#L146); `from(empresas)` [src/pages/app/admin/AdminEmpresas.tsx:186](../../src/pages/app/admin/AdminEmpresas.tsx#L186); `from(empresas)` [src/pages/app/admin/AdminEmpresas.tsx:187](../../src/pages/app/admin/AdminEmpresas.tsx#L187); `from(empresas)` [src/pages/app/admin/AdminEmpresas.tsx:396](../../src/pages/app/admin/AdminEmpresas.tsx#L396).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminEmpresas.tsx:110](../../src/pages/app/admin/AdminEmpresas.tsx#L110): const [filtroTipo, setFiltroTipo] = useState<string>("todos");
- [src/pages/app/admin/AdminEmpresas.tsx:111](../../src/pages/app/admin/AdminEmpresas.tsx#L111): const [filtroStatus, setFiltroStatus] = useState<string>("todos");
- [src/pages/app/admin/AdminEmpresas.tsx:123](../../src/pages/app/admin/AdminEmpresas.tsx#L123): if (filtroTipo !== "todos" && r.tipo_empresa !== filtroTipo) return false;
- [src/pages/app/admin/AdminEmpresas.tsx:222](../../src/pages/app/admin/AdminEmpresas.tsx#L222): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminEmpresas.tsx:229](../../src/pages/app/admin/AdminEmpresas.tsx#L229): <SelectItem value="todos">Todos os status</SelectItem>

### AdminFaq.tsx

Fonte: [src/pages/app/admin/AdminFaq.tsx](../../src/pages/app/admin/AdminFaq.tsx) (191 linhas). Rotas: `/app/admin/faq`.

Funções da interface, conforme títulos e descrições: FAQ do Site; Gerencie as perguntas frequentes exibidas na página pública.; Mover para cima; Mover para baixo.

Funções nomeadas: [src/pages/app/admin/AdminFaq.tsx:25](../../src/pages/app/admin/AdminFaq.tsx#L25) `AdminFaq`; [src/pages/app/admin/AdminFaq.tsx:33](../../src/pages/app/admin/AdminFaq.tsx#L33) `load`; [src/pages/app/admin/AdminFaq.tsx:45](../../src/pages/app/admin/AdminFaq.tsx#L45) `openNew`; [src/pages/app/admin/AdminFaq.tsx:51](../../src/pages/app/admin/AdminFaq.tsx#L51) `openEdit`; [src/pages/app/admin/AdminFaq.tsx:57](../../src/pages/app/admin/AdminFaq.tsx#L57) `save`; [src/pages/app/admin/AdminFaq.tsx:79](../../src/pages/app/admin/AdminFaq.tsx#L79) `remove`; [src/pages/app/admin/AdminFaq.tsx:87](../../src/pages/app/admin/AdminFaq.tsx#L87) `toggleAtivo`; [src/pages/app/admin/AdminFaq.tsx:93](../../src/pages/app/admin/AdminFaq.tsx#L93) `moveUp`; [src/pages/app/admin/AdminFaq.tsx:104](../../src/pages/app/admin/AdminFaq.tsx#L104) `moveDown`.

Dados e integrações diretas: `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:35](../../src/pages/app/admin/AdminFaq.tsx#L35); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:66](../../src/pages/app/admin/AdminFaq.tsx#L66); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:70](../../src/pages/app/admin/AdminFaq.tsx#L70); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:81](../../src/pages/app/admin/AdminFaq.tsx#L81); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:88](../../src/pages/app/admin/AdminFaq.tsx#L88); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:98](../../src/pages/app/admin/AdminFaq.tsx#L98); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:99](../../src/pages/app/admin/AdminFaq.tsx#L99); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:109](../../src/pages/app/admin/AdminFaq.tsx#L109); `from(faqs)` [src/pages/app/admin/AdminFaq.tsx:110](../../src/pages/app/admin/AdminFaq.tsx#L110).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### AdminFaturamentoB2B.tsx

Fonte: [src/pages/app/admin/AdminFaturamentoB2B.tsx](../../src/pages/app/admin/AdminFaturamentoB2B.tsx) (549 linhas). Rotas: `/app/admin/faturamento-b2b`.

Funções da interface, conforme títulos e descrições: Faturamento B2B; Faturas corporativas detalhadas por empresa, competência e status.; Baixar PDF; Ver detalhes.

Funções nomeadas: [src/pages/app/admin/AdminFaturamentoB2B.tsx:24](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L24) `brl`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:26](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L26) `fmtDate`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:63](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L63) `gerarAnosDisponiveis`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:68](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L68) `AdminFaturamentoB2B`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:83](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L83) `toggleSort`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:93](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L93) `SortIcon`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:103](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L103) `carregarMedicosFatura`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:132](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L132) `abrirDetalhe`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:146](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L146) `carregar`; [src/pages/app/admin/AdminFaturamentoB2B.tsx:231](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L231) `exportarCSV`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/admin/AdminFaturamentoB2B.tsx:65](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L65); `from(consultas)` [src/pages/app/admin/AdminFaturamentoB2B.tsx:106](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L106); `from((dinâmico))` [src/pages/app/admin/AdminFaturamentoB2B.tsx:124](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L124); `from((dinâmico))` [src/pages/app/admin/AdminFaturamentoB2B.tsx:141](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L141); `from(empresas_faturas)` [src/pages/app/admin/AdminFaturamentoB2B.tsx:149](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L149); `from((dinâmico))` [src/pages/app/admin/AdminFaturamentoB2B.tsx:400](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L400).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/gerarFaturaPdf.ts](../../src/lib/gerarFaturaPdf.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminFaturamentoB2B.tsx:49](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L49): { value: "todos", label: "Todos" },
- [src/pages/app/admin/AdminFaturamentoB2B.tsx:72](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L72): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminFaturamentoB2B.tsx:187](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L187): if (filtroStatus !== "todos") arr = arr.filter(f => f.status === filtroStatus);
- [src/pages/app/admin/AdminFaturamentoB2B.tsx:188](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L188): if (filtroAno !== "todos") arr = arr.filter(f => String(f.competencia_ano) === filtroAno);
- [src/pages/app/admin/AdminFaturamentoB2B.tsx:306](../../src/pages/app/admin/AdminFaturamentoB2B.tsx#L306): <SelectItem value="todos">Todos</SelectItem>

### AdminFeedbacks.tsx

Fonte: [src/pages/app/admin/AdminFeedbacks.tsx](../../src/pages/app/admin/AdminFeedbacks.tsx) (214 linhas). Rotas: `/app/admin/feedbacks`.

Funções da interface, conforme títulos e descrições: Feedbacks do site.

Funções nomeadas: [src/pages/app/admin/AdminFeedbacks.tsx:24](../../src/pages/app/admin/AdminFeedbacks.tsx#L24) `AdminFeedbacks`; [src/pages/app/admin/AdminFeedbacks.tsx:32](../../src/pages/app/admin/AdminFeedbacks.tsx#L32) `load`; [src/pages/app/admin/AdminFeedbacks.tsx:50](../../src/pages/app/admin/AdminFeedbacks.tsx#L50) `setItemStatus`; [src/pages/app/admin/AdminFeedbacks.tsx:203](../../src/pages/app/admin/AdminFeedbacks.tsx#L203) `Row`.

Dados e integrações diretas: `from(feedbacks_site)` [src/pages/app/admin/AdminFeedbacks.tsx:34](../../src/pages/app/admin/AdminFeedbacks.tsx#L34); `from(feedbacks_site)` [src/pages/app/admin/AdminFeedbacks.tsx:51](../../src/pages/app/admin/AdminFeedbacks.tsx#L51).

Operações diretas detectadas: update.

Dependências locais diretas: [src/components/PageShell.tsx](../../src/components/PageShell.tsx); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminFeedbacks.tsx:28](../../src/pages/app/admin/AdminFeedbacks.tsx#L28): const [tipo, setTipo] = useState<string>("todos");
- [src/pages/app/admin/AdminFeedbacks.tsx:35](../../src/pages/app/admin/AdminFeedbacks.tsx#L35): if (tipo !== "todos") q = q.eq("tipo", tipo as any);
- [src/pages/app/admin/AdminFeedbacks.tsx:36](../../src/pages/app/admin/AdminFeedbacks.tsx#L36): if (status !== "todos") q = q.eq("status", status as any);
- [src/pages/app/admin/AdminFeedbacks.tsx:78](../../src/pages/app/admin/AdminFeedbacks.tsx#L78): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminFeedbacks.tsx:86](../../src/pages/app/admin/AdminFeedbacks.tsx#L86): <SelectItem value="todos">Todos os status</SelectItem>

### AdminFinanceiroCentral.tsx

Fonte: [src/pages/app/admin/AdminFinanceiroCentral.tsx](../../src/pages/app/admin/AdminFinanceiroCentral.tsx) (407 linhas). Rotas: `/app/admin/financeiro`.

Funções da interface, conforme títulos e descrições: Central Financeira; Pagamentos, reembolsos, links, faturas, repasses e relatórios; Nova cobrança manual.

Funções nomeadas: [src/pages/app/admin/AdminFinanceiroCentral.tsx:24](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L24) `fmtData`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:26](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L26) `useFinanceiroData`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:78](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L78) `AdminFinanceiroCentral`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:114](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L114) `togglePagamento`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:115](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L115) `toggleTodos`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:120](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L120) `aprovarLote`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:133](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L133) `cancelarLote`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:146](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L146) `abrirDetalhe`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:158](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L158) `confirmarPagamento`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:163](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L163) `cancelarPagamento`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:169](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L169) `decidirReembolso`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:185](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L185) `marcarPagoRepasse`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:190](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L190) `bloquearRepasse`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:197](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L197) `dentroPeriodo`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:202](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L202) `exportarPagamentos`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:207](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L207) `exportarReembolsos`; [src/pages/app/admin/AdminFinanceiroCentral.tsx:212](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L212) `exportarLinks`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:31](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L31); `from(pagamentos)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:32](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L32); `from(reembolsos)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:33](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L33); `from(cobrancas_links)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:36](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L36); `from(fechamentos_mensais)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:37](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L37); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:125](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L125); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:138](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L138); `from(consultas_financeiro)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:150](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L150); `from(reembolsos)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:153](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L153); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:159](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L159); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:165](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L165); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:173](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L173); `invoke(notificar-reembolso)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:174](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L174); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:177](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L177); `invoke(notificar-reembolso)` [src/pages/app/admin/AdminFinanceiroCentral.tsx:178](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L178); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:186](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L186); `rpc((dinâmico))` [src/pages/app/admin/AdminFinanceiroCentral.tsx:193](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L193).

Operações diretas detectadas: delete.

Dependências locais diretas: [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/components/admin/financeiro/FinanceiroKpis.tsx](../../src/components/admin/financeiro/FinanceiroKpis.tsx); [src/components/admin/financeiro/FinanceiroStatusBadge.tsx](../../src/components/admin/financeiro/FinanceiroStatusBadge.tsx); [src/components/admin/financeiro/PagamentosTable.tsx](../../src/components/admin/financeiro/PagamentosTable.tsx); [src/components/admin/financeiro/ReembolsosTable.tsx](../../src/components/admin/financeiro/ReembolsosTable.tsx); [src/components/admin/financeiro/RepassesTable.tsx](../../src/components/admin/financeiro/RepassesTable.tsx); [src/components/admin/financeiro/CobrancasLinksTable.tsx](../../src/components/admin/financeiro/CobrancasLinksTable.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/components/financeiro/NovaCobrancaDialog.tsx](../../src/components/financeiro/NovaCobrancaDialog.tsx); [src/components/financeiro/FinanceiroErrorBoundary.tsx](../../src/components/financeiro/FinanceiroErrorBoundary.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminFinanceiroCentral.tsx:98](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L98): const [pgStatus, setPgStatus] = useState("todos");
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:101](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L101): const [lkStatus, setLkStatus] = useState("todos");
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:111](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L111): const todosPendentesSelecionados = pendentes.length > 0 && pendentes.every(p => selecionados.has(p.id));
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:115](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L115): const toggleTodos = () => setSelecionados(s => {
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:116](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L116): if (todosPendentesSelecionados) { const n = new Set(s); pendentes.forEach(p => n.delete(p.id)); return n; }
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:204](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L204): pagamentos.filter(p => dentroPeriodo(p.created_at)).forEach(p => rows.push([p.id, p.status, brl((p.valor_bruto_centavos \|\| p.valor_centavos) ?? 0), p.metodo \|\| p.forma \|\| "", fmtData(p.data_pagamento \|\| p.paid_at), fmtData(p.created_at)]));
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:256](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L256): todosPendentesSelecionados={todosPendentesSelecionados} toggleTodos={toggleTodos}
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:326](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L326): {loteRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Cancelar todos
- [src/pages/app/admin/AdminFinanceiroCentral.tsx:370](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L370): <div><span className="text-muted-foreground">Forma de pagamento</span><div>{detalhe.metodo \|\| detalhe.forma \|\| "—"}</div></div>

### AdminFinanceiroConfig.tsx

Fonte: [src/pages/app/admin/AdminFinanceiroConfig.tsx](../../src/pages/app/admin/AdminFinanceiroConfig.tsx) (640 linhas). Rotas: `/app/admin/financeiro/repasse`.

Funções da interface, conforme títulos e descrições: Repasse financeiro; Defina a divisão entre médico e plataforma para consultas particulares (especialidades). Serviços da plataforma usam regra própria.; Repasse global · Consultas particulares; Aplica a todas as consultas de especialidade sem serviço da plataforma vinculado, exceto médicos com exceção configurada.; Exceções de repasse por médico; Defina um % de repasse específico para médicos individuais (sobrepõe a regra global em consultas particulares).; Editar; Remover; Como funciona a hierarquia; Ordem de prioridade aplicada automaticamente em cada consulta agendada.; Confirmar novo repasse global; O médico voltará a seguir a regra global de repasse em novas consultas..

Funções nomeadas: [src/pages/app/admin/AdminFinanceiroConfig.tsx:33](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L33) `Section`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:65](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L65) `Input`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:75](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L75) `AdminFinanceiroConfig`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:86](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L86) `loadGlobal`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:104](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L104) `salvarGlobal`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:116](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L116) `confirmarGlobal`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:136](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L136) `loadOverrides`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:153](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L153) `removerOverride`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:155](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L155) `confirmarRemover`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:168](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L168) `togglar`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:170](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L170) `confirmarToggle`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:447](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L447) `ExcecaoModal`; [src/pages/app/admin/AdminFinanceiroConfig.tsx:493](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L493) `salvar`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/financeiroConfig.ts](../../src/lib/financeiroConfig.ts); [src/components/financeiro/MotivoDialog.tsx](../../src/components/financeiro/MotivoDialog.tsx); [src/components/financeiro/RepasseAuditoriaCard.tsx](../../src/components/financeiro/RepasseAuditoriaCard.tsx); [src/components/financeiro/RepasseSplitInput.tsx](../../src/components/financeiro/RepasseSplitInput.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminFinanceiroConfig.tsx:268](../../src/pages/app/admin/AdminFinanceiroConfig.tsx#L268): Nenhuma exceção cadastrada. Todos os médicos seguem a regra global.

### AdminGamificacao.tsx

Fonte: [src/pages/app/admin/AdminGamificacao.tsx](../../src/pages/app/admin/AdminGamificacao.tsx) (557 linhas). Rotas: `/app/admin/gamificacao`.

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

Fonte: [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx) (259 linhas). Rotas: `/app/admin/gamificacao/financeiro`.

Funções da interface, conforme títulos e descrições: Financeiro da Gamificação; Receita de assinaturas premium, consumo CPC, conversões e métricas de ROI.; Exportar CSV.

Funções nomeadas: [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:17](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L17) `downloadCsv`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:18](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L18) `escape`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:30](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L30) `pct`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:32](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L32) `AdminGamificacaoFinanceiro`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:74](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L74) `exportKpis`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:92](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L92) `exportCampanhas`; [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:110](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L110) `exportPremium`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:49](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L49).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:11](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L11): listarTodasCampanhas, listarTodosPremium, getConversoesPorCampanha,
- [src/pages/app/admin/AdminGamificacaoFinanceiro.tsx:42](../../src/pages/app/admin/AdminGamificacaoFinanceiro.tsx#L42): listarTodosPremium(),

### AdminGestaoB2B.tsx

Fonte: [src/pages/app/admin/AdminGestaoB2B.tsx](../../src/pages/app/admin/AdminGestaoB2B.tsx) (398 linhas). Rotas: `/app/admin/gestao-b2b`.

Funções da interface, conforme títulos e descrições: Gestão B2B Centralizada; Visão consolidada de contratos, faturamento e utilização corporativa..

Funções nomeadas: [src/pages/app/admin/AdminGestaoB2B.tsx:17](../../src/pages/app/admin/AdminGestaoB2B.tsx#L17) `brl`; [src/pages/app/admin/AdminGestaoB2B.tsx:21](../../src/pages/app/admin/AdminGestaoB2B.tsx#L21) `fmtDate`; [src/pages/app/admin/AdminGestaoB2B.tsx:22](../../src/pages/app/admin/AdminGestaoB2B.tsx#L22) `safeNum`; [src/pages/app/admin/AdminGestaoB2B.tsx:26](../../src/pages/app/admin/AdminGestaoB2B.tsx#L26) `safeStr`; [src/pages/app/admin/AdminGestaoB2B.tsx:57](../../src/pages/app/admin/AdminGestaoB2B.tsx#L57) `AdminGestaoB2B`; [src/pages/app/admin/AdminGestaoB2B.tsx:68](../../src/pages/app/admin/AdminGestaoB2B.tsx#L68) `carregarDados`; [src/pages/app/admin/AdminGestaoB2B.tsx:191](../../src/pages/app/admin/AdminGestaoB2B.tsx#L191) `statusBadge`.

Dados e integrações diretas: `from(empresas_contratos)` [src/pages/app/admin/AdminGestaoB2B.tsx:72](../../src/pages/app/admin/AdminGestaoB2B.tsx#L72); `from(empresas_faturas)` [src/pages/app/admin/AdminGestaoB2B.tsx:76](../../src/pages/app/admin/AdminGestaoB2B.tsx#L76).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### AdminIAMedicos.tsx

Fonte: [src/pages/app/admin/AdminIAMedicos.tsx](../../src/pages/app/admin/AdminIAMedicos.tsx) (981 linhas). Rotas: `/app/admin/ia-medicos`.

Funções da interface, conforme títulos e descrições: Relatório Médico Interno IA; Auditoria operacional, compliance, antifraude, ações admin e recomendações estratégicas por IA..

Funções nomeadas: [src/pages/app/admin/AdminIAMedicos.tsx:85](../../src/pages/app/admin/AdminIAMedicos.tsx#L85) `scoreBar`; [src/pages/app/admin/AdminIAMedicos.tsx:99](../../src/pages/app/admin/AdminIAMedicos.tsx#L99) `AcaoAdminModal`; [src/pages/app/admin/AdminIAMedicos.tsx:110](../../src/pages/app/admin/AdminIAMedicos.tsx#L110) `handleSubmit`; [src/pages/app/admin/AdminIAMedicos.tsx:181](../../src/pages/app/admin/AdminIAMedicos.tsx#L181) `AdminIAMedicos`; [src/pages/app/admin/AdminIAMedicos.tsx:234](../../src/pages/app/admin/AdminIAMedicos.tsx#L234) `handleAnalisarMedico`; [src/pages/app/admin/AdminIAMedicos.tsx:247](../../src/pages/app/admin/AdminIAMedicos.tsx#L247) `handleAnalisarTodos`; [src/pages/app/admin/AdminIAMedicos.tsx:260](../../src/pages/app/admin/AdminIAMedicos.tsx#L260) `handleDetectarAnomalias`; [src/pages/app/admin/AdminIAMedicos.tsx:270](../../src/pages/app/admin/AdminIAMedicos.tsx#L270) `handleStatusAlerta`; [src/pages/app/admin/AdminIAMedicos.tsx:280](../../src/pages/app/admin/AdminIAMedicos.tsx#L280) `handleStatusAnomalia`; [src/pages/app/admin/AdminIAMedicos.tsx:290](../../src/pages/app/admin/AdminIAMedicos.tsx#L290) `handleRemoverRestricao`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/admin/AdminIAMedicos.tsx:206](../../src/pages/app/admin/AdminIAMedicos.tsx#L206).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/gamificacao.ts](../../src/lib/gamificacao.ts); [src/lib/ia-auditoria.ts](../../src/lib/ia-auditoria.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminIAMedicos.tsx:22](../../src/pages/app/admin/AdminIAMedicos.tsx#L22): import { listarRankingTop, recalcularRankingTodos, type MedicoRanking } from "@/lib/gamificacao";
- [src/pages/app/admin/AdminIAMedicos.tsx:193](../../src/pages/app/admin/AdminIAMedicos.tsx#L193): const [filtroSeveridade, setFiltroSeveridade] = useState("todos");
- [src/pages/app/admin/AdminIAMedicos.tsx:194](../../src/pages/app/admin/AdminIAMedicos.tsx#L194): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminIAMedicos.tsx:247](../../src/pages/app/admin/AdminIAMedicos.tsx#L247): const handleAnalisarTodos = async () => {
- [src/pages/app/admin/AdminIAMedicos.tsx:337](../../src/pages/app/admin/AdminIAMedicos.tsx#L337): if (filtroSeveridade !== "todos" && a.severidade !== filtroSeveridade) return false;
- [src/pages/app/admin/AdminIAMedicos.tsx:338](../../src/pages/app/admin/AdminIAMedicos.tsx#L338): if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
- [src/pages/app/admin/AdminIAMedicos.tsx:351](../../src/pages/app/admin/AdminIAMedicos.tsx#L351): await recalcularRankingTodos();
- [src/pages/app/admin/AdminIAMedicos.tsx:361](../../src/pages/app/admin/AdminIAMedicos.tsx#L361): <Button size="sm" onClick={handleAnalisarTodos} disabled={analisandoBatch}>
- [src/pages/app/admin/AdminIAMedicos.tsx:363](../../src/pages/app/admin/AdminIAMedicos.tsx#L363): {analisandoBatch ? "Analisando…" : "Analisar Todos"}
- [src/pages/app/admin/AdminIAMedicos.tsx:730](../../src/pages/app/admin/AdminIAMedicos.tsx#L730): <SelectItem value="todos">Todas</SelectItem>
- [src/pages/app/admin/AdminIAMedicos.tsx:740](../../src/pages/app/admin/AdminIAMedicos.tsx#L740): <SelectItem value="todos">Todos</SelectItem>

### AdminImpersonar.tsx

Fonte: [src/pages/app/admin/AdminImpersonar.tsx](../../src/pages/app/admin/AdminImpersonar.tsx) (269 linhas). Rotas: `/app/admin/impersonar`.

Funções da interface, conforme títulos e descrições: Visualizar como; Inspecione o sistema do ponto de vista de outro usuário (modo somente leitura). Toda sessão é registrada para auditoria..

Funções nomeadas: [src/pages/app/admin/AdminImpersonar.tsx:40](../../src/pages/app/admin/AdminImpersonar.tsx#L40) `AdminImpersonar`; [src/pages/app/admin/AdminImpersonar.tsx:54](../../src/pages/app/admin/AdminImpersonar.tsx#L54) `buscar`; [src/pages/app/admin/AdminImpersonar.tsx:64](../../src/pages/app/admin/AdminImpersonar.tsx#L64) `carregarHistorico`; [src/pages/app/admin/AdminImpersonar.tsx:79](../../src/pages/app/admin/AdminImpersonar.tsx#L79) `confirmar`.

Dados e integrações diretas: `rpc(impersonation_listar_alvos)` [src/pages/app/admin/AdminImpersonar.tsx:56](../../src/pages/app/admin/AdminImpersonar.tsx#L56); `from(impersonation_log)` [src/pages/app/admin/AdminImpersonar.tsx:65](../../src/pages/app/admin/AdminImpersonar.tsx#L65).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/impersonation.tsx](../../src/lib/impersonation.tsx); [src/lib/profiles.ts](../../src/lib/profiles.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminImpersonar.tsx:91](../../src/pages/app/admin/AdminImpersonar.tsx#L91): // Redireciona para a primeira rota do perfil simulado

### AdminIntegracoes.tsx

Fonte: [src/pages/app/admin/AdminIntegracoes.tsx](../../src/pages/app/admin/AdminIntegracoes.tsx) (718 linhas). Rotas: `/app/admin/integracoes`.

Funções da interface, conforme títulos e descrições: Central de Integrações; Configure, monitore e teste todas as conexões externas da plataforma..

Funções nomeadas: [src/pages/app/admin/AdminIntegracoes.tsx:76](../../src/pages/app/admin/AdminIntegracoes.tsx#L76) `fmtData`; [src/pages/app/admin/AdminIntegracoes.tsx:80](../../src/pages/app/admin/AdminIntegracoes.tsx#L80) `AdminIntegracoes`; [src/pages/app/admin/AdminIntegracoes.tsx:93](../../src/pages/app/admin/AdminIntegracoes.tsx#L93) `carregar`; [src/pages/app/admin/AdminIntegracoes.tsx:114](../../src/pages/app/admin/AdminIntegracoes.tsx#L114) `testarConexao`; [src/pages/app/admin/AdminIntegracoes.tsx:132](../../src/pages/app/admin/AdminIntegracoes.tsx#L132) `reprocessarEvento`; [src/pages/app/admin/AdminIntegracoes.tsx:377](../../src/pages/app/admin/AdminIntegracoes.tsx#L377) `KpiMini`; [src/pages/app/admin/AdminIntegracoes.tsx:398](../../src/pages/app/admin/AdminIntegracoes.tsx#L398) `CardIntegracao`; [src/pages/app/admin/AdminIntegracoes.tsx:460](../../src/pages/app/admin/AdminIntegracoes.tsx#L460) `BadgeEvento`; [src/pages/app/admin/AdminIntegracoes.tsx:471](../../src/pages/app/admin/AdminIntegracoes.tsx#L471) `BadgeLog`; [src/pages/app/admin/AdminIntegracoes.tsx:478](../../src/pages/app/admin/AdminIntegracoes.tsx#L478) `SheetConfig`; [src/pages/app/admin/AdminIntegracoes.tsx:500](../../src/pages/app/admin/AdminIntegracoes.tsx#L500) `salvar`; [src/pages/app/admin/AdminIntegracoes.tsx:587](../../src/pages/app/admin/AdminIntegracoes.tsx#L587) `Info`; [src/pages/app/admin/AdminIntegracoes.tsx:596](../../src/pages/app/admin/AdminIntegracoes.tsx#L596) `CamposPorTipo`; [src/pages/app/admin/AdminIntegracoes.tsx:600](../../src/pages/app/admin/AdminIntegracoes.tsx#L600) `set`; [src/pages/app/admin/AdminIntegracoes.tsx:707](../../src/pages/app/admin/AdminIntegracoes.tsx#L707) `Field`.

Dados e integrações diretas: `from(integracoes_config)` [src/pages/app/admin/AdminIntegracoes.tsx:96](../../src/pages/app/admin/AdminIntegracoes.tsx#L96); `rpc(integracoes_dashboard)` [src/pages/app/admin/AdminIntegracoes.tsx:97](../../src/pages/app/admin/AdminIntegracoes.tsx#L97); `from(event_queue)` [src/pages/app/admin/AdminIntegracoes.tsx:98](../../src/pages/app/admin/AdminIntegracoes.tsx#L98); `from(integracoes_logs)` [src/pages/app/admin/AdminIntegracoes.tsx:99](../../src/pages/app/admin/AdminIntegracoes.tsx#L99); `from(integracoes_pendencias)` [src/pages/app/admin/AdminIntegracoes.tsx:100](../../src/pages/app/admin/AdminIntegracoes.tsx#L100); `from(integracoes_status_mapping)` [src/pages/app/admin/AdminIntegracoes.tsx:101](../../src/pages/app/admin/AdminIntegracoes.tsx#L101); `invoke(integracoes-test)` [src/pages/app/admin/AdminIntegracoes.tsx:117](../../src/pages/app/admin/AdminIntegracoes.tsx#L117); `rpc(event_reprocessar)` [src/pages/app/admin/AdminIntegracoes.tsx:133](../../src/pages/app/admin/AdminIntegracoes.tsx#L133); `from(integracoes_config)` [src/pages/app/admin/AdminIntegracoes.tsx:501](../../src/pages/app/admin/AdminIntegracoes.tsx#L501).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/permissions/RequirePermission.tsx](../../src/components/permissions/RequirePermission.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminIntegracoes.tsx:25](../../src/pages/app/admin/AdminIntegracoes.tsx#L25): type IntegracaoStatus = "nao_configurado"\|"aguardando_configuracao"\|"conectado"\|"erro"\|"simulado"\|"manutencao";
- [src/pages/app/admin/AdminIntegracoes.tsx:31](../../src/pages/app/admin/AdminIntegracoes.tsx#L31): status: IntegracaoStatus; ambiente: string; modo_simulado: boolean; ativo: boolean;
- [src/pages/app/admin/AdminIntegracoes.tsx:67](../../src/pages/app/admin/AdminIntegracoes.tsx#L67): simulado: { label: "Modo simulado", variant: "outline", icon: TestTube2 },
- [src/pages/app/admin/AdminIntegracoes.tsx:88](../../src/pages/app/admin/AdminIntegracoes.tsx#L88): const [filtroEvento, setFiltroEvento] = useState<EventStatus \| "todos">("todos");
- [src/pages/app/admin/AdminIntegracoes.tsx:89](../../src/pages/app/admin/AdminIntegracoes.tsx#L89): const [filtroLogStatus, setFiltroLogStatus] = useState<string>("todos");
- [src/pages/app/admin/AdminIntegracoes.tsx:139](../../src/pages/app/admin/AdminIntegracoes.tsx#L139): () => filtroEvento === "todos" ? eventos : eventos.filter(e => e.status === filtroEvento),
- [src/pages/app/admin/AdminIntegracoes.tsx:143](../../src/pages/app/admin/AdminIntegracoes.tsx#L143): () => filtroLogStatus === "todos" ? logs : logs.filter(l => l.status === filtroLogStatus),
- [src/pages/app/admin/AdminIntegracoes.tsx:163](../../src/pages/app/admin/AdminIntegracoes.tsx#L163): <KpiMini icon={TestTube2} label="Simuladas" value={dashboard.simuladas ?? 0} tone="warning" />
- [src/pages/app/admin/AdminIntegracoes.tsx:193](../../src/pages/app/admin/AdminIntegracoes.tsx#L193): <Select value={filtroEvento} onValueChange={(v) => setFiltroEvento(v as EventStatus \| "todos")}>
- [src/pages/app/admin/AdminIntegracoes.tsx:196](../../src/pages/app/admin/AdminIntegracoes.tsx#L196): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminIntegracoes.tsx:256](../../src/pages/app/admin/AdminIntegracoes.tsx#L256): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminIntegracoes.tsx:438](../../src/pages/app/admin/AdminIntegracoes.tsx#L438): {intg.modo_simulado && <Badge variant="outline" className="text-xs"><TestTube2 className="mr-1 h-3 w-3" />Simulado</Badge>}
- [src/pages/app/admin/AdminIntegracoes.tsx:486](../../src/pages/app/admin/AdminIntegracoes.tsx#L486): const [modoSimulado, setModoSimulado] = useState(true);
- [src/pages/app/admin/AdminIntegracoes.tsx:493](../../src/pages/app/admin/AdminIntegracoes.tsx#L493): setModoSimulado(integracao.modo_simulado);
- [src/pages/app/admin/AdminIntegracoes.tsx:503](../../src/pages/app/admin/AdminIntegracoes.tsx#L503): .update({ config: config as never, ambiente, modo_simulado: modoSimulado, ativo })
- [src/pages/app/admin/AdminIntegracoes.tsx:534](../../src/pages/app/admin/AdminIntegracoes.tsx#L534): <Switch checked={modoSimulado} onCheckedChange={setModoSimulado} id="sim" />
- [src/pages/app/admin/AdminIntegracoes.tsx:535](../../src/pages/app/admin/AdminIntegracoes.tsx#L535): <Label htmlFor="sim" className="text-sm">Modo simulado</Label>

### AdminLedgerObservabilidade.tsx

Fonte: [src/pages/app/admin/AdminLedgerObservabilidade.tsx](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx) (276 linhas). Rotas: `/app/admin/financeiro/ledger-observabilidade`.

Funções da interface, conforme títulos e descrições: Ledger Financeiro — Observabilidade; Painel técnico interno. Read-only. Sem impacto operacional..

Funções nomeadas: [src/pages/app/admin/AdminLedgerObservabilidade.tsx:14](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L14) `fmt`; [src/pages/app/admin/AdminLedgerObservabilidade.tsx:15](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L15) `sint`; [src/pages/app/admin/AdminLedgerObservabilidade.tsx:26](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L26) `StatusBadge`; [src/pages/app/admin/AdminLedgerObservabilidade.tsx:38](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L38) `AdminLedgerObservabilidade`; [src/pages/app/admin/AdminLedgerObservabilidade.tsx:53](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L53) `rodarReconciliacao`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminLedgerObservabilidade.tsx:45](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L45); `rpc((dinâmico))` [src/pages/app/admin/AdminLedgerObservabilidade.tsx:56](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L56).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts).

### AdminMedicosContratos.tsx

Fonte: [src/pages/app/admin/AdminMedicosContratos.tsx](../../src/pages/app/admin/AdminMedicosContratos.tsx) (225 linhas). Rotas: `/app/admin/medicos/contratos`.

Funções da interface, conforme títulos e descrições: Contratos médicos; Analise e aprove os contratos assinados enviados pelos médicos.; Baixar PDF assinado; Aprovar; Reprovar.

Funções nomeadas: [src/pages/app/admin/AdminMedicosContratos.tsx:41](../../src/pages/app/admin/AdminMedicosContratos.tsx#L41) `AdminMedicosContratos`; [src/pages/app/admin/AdminMedicosContratos.tsx:75](../../src/pages/app/admin/AdminMedicosContratos.tsx#L75) `baixar`; [src/pages/app/admin/AdminMedicosContratos.tsx:82](../../src/pages/app/admin/AdminMedicosContratos.tsx#L82) `aprovar`; [src/pages/app/admin/AdminMedicosContratos.tsx:94](../../src/pages/app/admin/AdminMedicosContratos.tsx#L94) `confirmarReprovacao`.

Dados e integrações diretas: `from(medicos_contratos)` [src/pages/app/admin/AdminMedicosContratos.tsx:52](../../src/pages/app/admin/AdminMedicosContratos.tsx#L52); `from(medico-docs)` [src/pages/app/admin/AdminMedicosContratos.tsx:76](../../src/pages/app/admin/AdminMedicosContratos.tsx#L76); `from(medicos_contratos)` [src/pages/app/admin/AdminMedicosContratos.tsx:84](../../src/pages/app/admin/AdminMedicosContratos.tsx#L84); `from(medicos_contratos)` [src/pages/app/admin/AdminMedicosContratos.tsx:97](../../src/pages/app/admin/AdminMedicosContratos.tsx#L97).

Operações diretas detectadas: createSignedUrl, update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminMedicosContratos.tsx:65](../../src/pages/app/admin/AdminMedicosContratos.tsx#L65): if (filtro !== "todos" && r.status !== filtro) return false;
- [src/pages/app/admin/AdminMedicosContratos.tsx:126](../../src/pages/app/admin/AdminMedicosContratos.tsx#L126): <SelectItem value="todos">Todos</SelectItem>

### AdminNOC.tsx

Fonte: [src/pages/app/admin/AdminNOC.tsx](../../src/pages/app/admin/AdminNOC.tsx) (604 linhas). Rotas: `/app/admin/noc`.

Funções da interface, conforme títulos e descrições: NOC — Operação; Central de monitoramento operacional em tempo real.

Funções nomeadas: [src/pages/app/admin/AdminNOC.tsx:64](../../src/pages/app/admin/AdminNOC.tsx#L64) `fmtTime`; [src/pages/app/admin/AdminNOC.tsx:66](../../src/pages/app/admin/AdminNOC.tsx#L66) `fmtDateTime`; [src/pages/app/admin/AdminNOC.tsx:69](../../src/pages/app/admin/AdminNOC.tsx#L69) `Kpi`; [src/pages/app/admin/AdminNOC.tsx:85](../../src/pages/app/admin/AdminNOC.tsx#L85) `SeveridadeBadge`; [src/pages/app/admin/AdminNOC.tsx:94](../../src/pages/app/admin/AdminNOC.tsx#L94) `RiscoBadge`; [src/pages/app/admin/AdminNOC.tsx:103](../../src/pages/app/admin/AdminNOC.tsx#L103) `AdminNOC`; [src/pages/app/admin/AdminNOC.tsx:203](../../src/pages/app/admin/AdminNOC.tsx#L203) `reconhecerAlerta`; [src/pages/app/admin/AdminNOC.tsx:212](../../src/pages/app/admin/AdminNOC.tsx#L212) `resolverAlerta`; [src/pages/app/admin/AdminNOC.tsx:226](../../src/pages/app/admin/AdminNOC.tsx#L226) `gerarResumoIA`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:110](../../src/pages/app/admin/AdminNOC.tsx#L110); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:122](../../src/pages/app/admin/AdminNOC.tsx#L122); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:136](../../src/pages/app/admin/AdminNOC.tsx#L136); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:155](../../src/pages/app/admin/AdminNOC.tsx#L155); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:157](../../src/pages/app/admin/AdminNOC.tsx#L157); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:159](../../src/pages/app/admin/AdminNOC.tsx#L159); `channel(operacao_alertas_realtime)` [src/pages/app/admin/AdminNOC.tsx:180](../../src/pages/app/admin/AdminNOC.tsx#L180); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:204](../../src/pages/app/admin/AdminNOC.tsx#L204); `from((dinâmico))` [src/pages/app/admin/AdminNOC.tsx:214](../../src/pages/app/admin/AdminNOC.tsx#L214); `invoke(noc-ia-auditora)` [src/pages/app/admin/AdminNOC.tsx:229](../../src/pages/app/admin/AdminNOC.tsx#L229).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx).

### AdminObservabilidade.tsx

Fonte: [src/pages/app/admin/AdminObservabilidade.tsx](../../src/pages/app/admin/AdminObservabilidade.tsx) (218 linhas). Rotas: `/app/admin/observabilidade`.

Funções da interface, conforme títulos e descrições: Observabilidade; Eventos de comunicação, IA e produção registrados em tempo real..

Funções nomeadas: [src/pages/app/admin/AdminObservabilidade.tsx:29](../../src/pages/app/admin/AdminObservabilidade.tsx#L29) `AdminObservabilidade`; [src/pages/app/admin/AdminObservabilidade.tsx:40](../../src/pages/app/admin/AdminObservabilidade.tsx#L40) `checkPerm`; [src/pages/app/admin/AdminObservabilidade.tsx:50](../../src/pages/app/admin/AdminObservabilidade.tsx#L50) `load`; [src/pages/app/admin/AdminObservabilidade.tsx:75](../../src/pages/app/admin/AdminObservabilidade.tsx#L75) `exportCsv`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminObservabilidade.tsx:43](../../src/pages/app/admin/AdminObservabilidade.tsx#L43); `from(observabilidade_eventos)` [src/pages/app/admin/AdminObservabilidade.tsx:53](../../src/pages/app/admin/AdminObservabilidade.tsx#L53).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/comunicacao/producao/EventoSeveridadeBadge.tsx](../../src/components/comunicacao/producao/EventoSeveridadeBadge.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminObservabilidade.tsx:134](../../src/pages/app/admin/AdminObservabilidade.tsx#L134): <SelectItem value="all">Todos os módulos</SelectItem>

### AdminPerfil.tsx

Fonte: [src/pages/app/admin/AdminPerfil.tsx](../../src/pages/app/admin/AdminPerfil.tsx) (6 linhas). Rotas: `/app/admin/perfil`.

Funções nomeadas: [src/pages/app/admin/AdminPerfil.tsx:3](../../src/pages/app/admin/AdminPerfil.tsx#L3) `AdminPerfil`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/pages/app/shared/PerfilGenerico.tsx](../../src/pages/app/shared/PerfilGenerico.tsx).

### AdminPlanos.tsx

Fonte: [src/pages/app/admin/AdminPlanos.tsx](../../src/pages/app/admin/AdminPlanos.tsx) (397 linhas). Rotas: `/app/admin/planos`.

Funções da interface, conforme títulos e descrições: Planos e assinaturas; Crie, edite, analise e otimize todos os planos da plataforma.; Editar; Duplicar; Ativar/Desativar; Excluir.

Funções nomeadas: [src/pages/app/admin/AdminPlanos.tsx:21](../../src/pages/app/admin/AdminPlanos.tsx#L21) `AdminPlanos`; [src/pages/app/admin/AdminPlanos.tsx:36](../../src/pages/app/admin/AdminPlanos.tsx#L36) `carregar`; [src/pages/app/admin/AdminPlanos.tsx:119](../../src/pages/app/admin/AdminPlanos.tsx#L119) `toggleAtivo`; [src/pages/app/admin/AdminPlanos.tsx:127](../../src/pages/app/admin/AdminPlanos.tsx#L127) `duplicar`; [src/pages/app/admin/AdminPlanos.tsx:145](../../src/pages/app/admin/AdminPlanos.tsx#L145) `excluir`; [src/pages/app/admin/AdminPlanos.tsx:153](../../src/pages/app/admin/AdminPlanos.tsx#L153) `editar`; [src/pages/app/admin/AdminPlanos.tsx:154](../../src/pages/app/admin/AdminPlanos.tsx#L154) `novo`; [src/pages/app/admin/AdminPlanos.tsx:375](../../src/pages/app/admin/AdminPlanos.tsx#L375) `Kpi`; [src/pages/app/admin/AdminPlanos.tsx:386](../../src/pages/app/admin/AdminPlanos.tsx#L386) `FilterSelect`.

Dados e integrações diretas: `from(planos)` [src/pages/app/admin/AdminPlanos.tsx:39](../../src/pages/app/admin/AdminPlanos.tsx#L39); `from(assinaturas)` [src/pages/app/admin/AdminPlanos.tsx:46](../../src/pages/app/admin/AdminPlanos.tsx#L46); `from(planos_auditoria)` [src/pages/app/admin/AdminPlanos.tsx:52](../../src/pages/app/admin/AdminPlanos.tsx#L52); `rpc(plano_saude_financeira)` [src/pages/app/admin/AdminPlanos.tsx:66](../../src/pages/app/admin/AdminPlanos.tsx#L66); `from(planos)` [src/pages/app/admin/AdminPlanos.tsx:121](../../src/pages/app/admin/AdminPlanos.tsx#L121); `from(planos)` [src/pages/app/admin/AdminPlanos.tsx:130](../../src/pages/app/admin/AdminPlanos.tsx#L130); `from(plano_beneficios)` [src/pages/app/admin/AdminPlanos.tsx:132](../../src/pages/app/admin/AdminPlanos.tsx#L132); `from(plano_beneficios)` [src/pages/app/admin/AdminPlanos.tsx:139](../../src/pages/app/admin/AdminPlanos.tsx#L139); `from(planos)` [src/pages/app/admin/AdminPlanos.tsx:147](../../src/pages/app/admin/AdminPlanos.tsx#L147).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/planos/PlanoBuilder.tsx](../../src/components/planos/PlanoBuilder.tsx); [src/components/planos/DescontoProgressivoConfig.tsx](../../src/components/planos/DescontoProgressivoConfig.tsx); [src/components/planos/TaxaPlataformaConfig.tsx](../../src/components/planos/TaxaPlataformaConfig.tsx); [src/lib/planos/saude.ts](../../src/lib/planos/saude.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminPlanos.tsx:29](../../src/pages/app/admin/AdminPlanos.tsx#L29): const [filtroPublico, setFiltroPublico] = useState<string>("todos");
- [src/pages/app/admin/AdminPlanos.tsx:30](../../src/pages/app/admin/AdminPlanos.tsx#L30): const [filtroStatus, setFiltroStatus] = useState<string>("todos");
- [src/pages/app/admin/AdminPlanos.tsx:31](../../src/pages/app/admin/AdminPlanos.tsx#L31): const [filtroSaude, setFiltroSaude] = useState<string>("todos");
- [src/pages/app/admin/AdminPlanos.tsx:111](../../src/pages/app/admin/AdminPlanos.tsx#L111): if (filtroPublico !== "todos" && p.publico !== filtroPublico) return false;
- [src/pages/app/admin/AdminPlanos.tsx:114](../../src/pages/app/admin/AdminPlanos.tsx#L114): if (filtroSaude !== "todos" && saudes[p.id]?.classificacao !== filtroSaude) return false;
- [src/pages/app/admin/AdminPlanos.tsx:160](../../src/pages/app/admin/AdminPlanos.tsx#L160): description="Crie, edite, analise e otimize todos os planos da plataforma."
- [src/pages/app/admin/AdminPlanos.tsx:222](../../src/pages/app/admin/AdminPlanos.tsx#L222): <FilterSelect label="Público" value={filtroPublico} onChange={setFiltroPublico} options={[["todos","Todos"],["paciente","Paciente"],["empresa","Empresa"],["ambos","Ambos"]]} />
- [src/pages/app/admin/AdminPlanos.tsx:223](../../src/pages/app/admin/AdminPlanos.tsx#L223): <FilterSelect label="Status" value={filtroStatus} onChange={setFiltroStatus} options={[["todos","Todos"],["ativos","Ativos"],["inativos","Inativos"]]} />
- [src/pages/app/admin/AdminPlanos.tsx:224](../../src/pages/app/admin/AdminPlanos.tsx#L224): <FilterSelect label="Saúde" value={filtroSaude} onChange={setFiltroSaude} options={[["todos","Todos"],["saudavel","Saudável"],["atencao","Atenção"],["risco_alto","Risco alto"],["prejuizo","Prejuízo"],["sem_dados","Sem dados"]]} />

### AdminPlanosEmpresariais.tsx

Fonte: [src/pages/app/admin/AdminPlanosEmpresariais.tsx](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx) (218 linhas). Rotas: `/app/admin/planos-empresariais`.

Funções da interface, conforme títulos e descrições: Planos Empresariais; Gerencie planos B2B com valor por vida, coparticipação, SLA e regras de uso por especialidade.; Editar.

Funções nomeadas: [src/pages/app/admin/AdminPlanosEmpresariais.tsx:22](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L22) `brl`; [src/pages/app/admin/AdminPlanosEmpresariais.tsx:32](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L32) `AdminPlanosEmpresariais`; [src/pages/app/admin/AdminPlanosEmpresariais.tsx:41](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L41) `carregar`; [src/pages/app/admin/AdminPlanosEmpresariais.tsx:81](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L81) `getEspecNomes`.

Dados e integrações diretas: `from(planos)` [src/pages/app/admin/AdminPlanosEmpresariais.tsx:45](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L45); `from(especialidades)` [src/pages/app/admin/AdminPlanosEmpresariais.tsx:50](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L50).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/planos/PlanoBuilder.tsx](../../src/components/planos/PlanoBuilder.tsx); [src/lib/utils.ts](../../src/lib/utils.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminPlanosEmpresariais.tsx:36](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L36): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminPlanosEmpresariais.tsx:120](../../src/pages/app/admin/AdminPlanosEmpresariais.tsx#L120): <SelectItem value="todos">Todos</SelectItem>

### AdminPlanosMedicos.tsx

Fonte: [src/pages/app/admin/AdminPlanosMedicos.tsx](../../src/pages/app/admin/AdminPlanosMedicos.tsx) (227 linhas). Rotas: `/app/admin/planos-medicos`.

Funções da interface, conforme títulos e descrições: Planos de Médicos; Planos personalizados criados pelos médicos — aprovação e controle..

Funções nomeadas: [src/pages/app/admin/AdminPlanosMedicos.tsx:26](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L26) `AdminPlanosMedicos`; [src/pages/app/admin/AdminPlanosMedicos.tsx:33](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L33) `load`; [src/pages/app/admin/AdminPlanosMedicos.tsx:74](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L74) `toggleAprovacao`; [src/pages/app/admin/AdminPlanosMedicos.tsx:82](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L82) `toggleAtivo`.

Dados e integrações diretas: `from(planos)` [src/pages/app/admin/AdminPlanosMedicos.tsx:35](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L35); `from(planos)` [src/pages/app/admin/AdminPlanosMedicos.tsx:76](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L76); `from(planos)` [src/pages/app/admin/AdminPlanosMedicos.tsx:84](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L84).

Operações diretas detectadas: update.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminPlanosMedicos.tsx:30](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L30): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminPlanosMedicos.tsx:31](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L31): const [filtroAprovacao, setFiltroAprovacao] = useState("todos");
- [src/pages/app/admin/AdminPlanosMedicos.tsx:48](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L48): if (filtroStatus !== "todos") arr = arr.filter(p => p.status === filtroStatus);
- [src/pages/app/admin/AdminPlanosMedicos.tsx:136](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L136): <SelectItem value="todos">Todos status</SelectItem>
- [src/pages/app/admin/AdminPlanosMedicos.tsx:150](../../src/pages/app/admin/AdminPlanosMedicos.tsx#L150): <SelectItem value="todos">Todas aprovações</SelectItem>

### AdminPreviaRepasse.tsx

Fonte: [src/pages/app/admin/AdminPreviaRepasse.tsx](../../src/pages/app/admin/AdminPreviaRepasse.tsx) (528 linhas). Rotas: `/app/admin/financeiro/previa-repasse`.

Funções da interface, conforme títulos e descrições: Prévia de impacto do repasse; Simule alterações no repasse e veja o impacto em consultas particulares já agendadas e em slots futuros. Esta tela é somente leitura — nada é alterado no banco..

Funções nomeadas: [src/pages/app/admin/AdminPreviaRepasse.tsx:56](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L56) `fmtBRL`; [src/pages/app/admin/AdminPreviaRepasse.tsx:59](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L59) `AdminPreviaRepasse`; [src/pages/app/admin/AdminPreviaRepasse.tsx:218](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L218) `exportarCsv`; [src/pages/app/admin/AdminPreviaRepasse.tsx:501](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L501) `ResumoItem`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/admin/AdminPreviaRepasse.tsx:160](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L160).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/financeiroPrevia.ts](../../src/lib/financeiroPrevia.ts); [src/components/financeiro/PreviaRepasseSimuladorForm.tsx](../../src/components/financeiro/PreviaRepasseSimuladorForm.tsx); [src/components/financeiro/PreviaRepasseTabela.tsx](../../src/components/financeiro/PreviaRepasseTabela.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminPreviaRepasse.tsx:33](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L33): type RegraSimulada,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:39](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L39): PreviaRepasseSimuladorForm,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:41](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L41): } from "@/components/financeiro/PreviaRepasseSimuladorForm";
- [src/pages/app/admin/AdminPreviaRepasse.tsx:68](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L68): const [statusFiltro, setStatusFiltro] = useState<"todos" \| StatusConsultaPrevia>(
- [src/pages/app/admin/AdminPreviaRepasse.tsx:69](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L69): "todos",
- [src/pages/app/admin/AdminPreviaRepasse.tsx:74](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L74): const [simulada, setSimulada] = useState<RegraSimulada>({ tipo: "vigente" });
- [src/pages/app/admin/AdminPreviaRepasse.tsx:123](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L123): statusFiltro === "todos"
- [src/pages/app/admin/AdminPreviaRepasse.tsx:179](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L179): if (!regras) return { n: 0, atual: 0, simulado: 0, delta: 0 };
- [src/pages/app/admin/AdminPreviaRepasse.tsx:182](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L182): let simuladoTotal = 0;
- [src/pages/app/admin/AdminPreviaRepasse.tsx:190](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L190): const sim = simularRepasse(c.valor_centavos, c.medico_id, regras, simulada);
- [src/pages/app/admin/AdminPreviaRepasse.tsx:192](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L192): simuladoTotal += sim.valorMedicoCentavos;
- [src/pages/app/admin/AdminPreviaRepasse.tsx:197](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L197): simulado: simuladoTotal,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:198](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L198): delta: simuladoTotal - atual,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:202](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L202): let simuladoTotal = 0;
- [src/pages/app/admin/AdminPreviaRepasse.tsx:206](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L206): const sim = simularRepasse(s.preco_centavos, s.medico_id, regras, simulada);
- [src/pages/app/admin/AdminPreviaRepasse.tsx:207](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L207): simuladoTotal += sim.valorMedicoCentavos;
- [src/pages/app/admin/AdminPreviaRepasse.tsx:212](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L212): simulado: simuladoTotal,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:213](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L213): delta: simuladoTotal - vig,
- [src/pages/app/admin/AdminPreviaRepasse.tsx:216](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L216): }, [regras, aba, consultasFiltradas, slotsFiltrados, simulada]);
- [src/pages/app/admin/AdminPreviaRepasse.tsx:230](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L230): "pct_simulado",
- [src/pages/app/admin/AdminPreviaRepasse.tsx:231](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L231): "medico_simulado",
- [src/pages/app/admin/AdminPreviaRepasse.tsx:243](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L243): const sim = simularRepasse(c.valor_centavos, c.medico_id, regras, simulada);
- [src/pages/app/admin/AdminPreviaRepasse.tsx:267](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L267): "pct_simulado",
- [src/pages/app/admin/AdminPreviaRepasse.tsx:268](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L268): "medico_simulado",
- [src/pages/app/admin/AdminPreviaRepasse.tsx:276](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L276): const sim = simularRepasse(s.preco_centavos, s.medico_id, regras, simulada);
- [src/pages/app/admin/AdminPreviaRepasse.tsx:348](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L348): setStatusFiltro(v as "todos" \| StatusConsultaPrevia)
- [src/pages/app/admin/AdminPreviaRepasse.tsx:355](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L355): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminPreviaRepasse.tsx:390](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L390): label="Soma médico (simulado)"
- [src/pages/app/admin/AdminPreviaRepasse.tsx:391](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L391): valor={fmtBRL(resumo.simulado)}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:435](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L435): "simulado" indicam o que <em>seria</em> caso a regra simulada fosse
- [src/pages/app/admin/AdminPreviaRepasse.tsx:442](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L442): simulada={simulada}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:455](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L455): simulada={simulada}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:465](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L465): {/* Coluna lateral: simulador */}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:468](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L468): <PreviaRepasseSimuladorForm
- [src/pages/app/admin/AdminPreviaRepasse.tsx:471](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L471): value={simulada}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:472](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L472): onChange={setSimulada}
- [src/pages/app/admin/AdminPreviaRepasse.tsx:482](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L482): ao médico, comparado a quanto seria se a regra simulada estivesse vigente
- [src/pages/app/admin/AdminPreviaRepasse.tsx:487](../../src/pages/app/admin/AdminPreviaRepasse.tsx#L487): cada slot fosse agendado agora com as regras simuladas.

### AdminProducaoCockpit.tsx

Fonte: [src/pages/app/admin/AdminProducaoCockpit.tsx](../../src/pages/app/admin/AdminProducaoCockpit.tsx) (246 linhas). Rotas: `/app/admin/comunicacao/producao`.

Funções da interface, conforme títulos e descrições: Cockpit de Produção — Comunicação; Status do canal WhatsApp, checklist go-live e ativação controlada de produção..

Funções nomeadas: [src/pages/app/admin/AdminProducaoCockpit.tsx:31](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L31) `AdminProducaoCockpit`; [src/pages/app/admin/AdminProducaoCockpit.tsx:40](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L40) `loadAll`; [src/pages/app/admin/AdminProducaoCockpit.tsx:81](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L81) `ativarProducao`; [src/pages/app/admin/AdminProducaoCockpit.tsx:100](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L100) `rollbackSandbox`; [src/pages/app/admin/AdminProducaoCockpit.tsx:117](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L117) `syncTemplates`.

Dados e integrações diretas: `from(app_settings)` [src/pages/app/admin/AdminProducaoCockpit.tsx:44](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L44); `from(meta_waba_health)` [src/pages/app/admin/AdminProducaoCockpit.tsx:45](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L45); `from(producao_checklist)` [src/pages/app/admin/AdminProducaoCockpit.tsx:51](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L51); `from(producao_checklist_status)` [src/pages/app/admin/AdminProducaoCockpit.tsx:56](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L56); `rpc((dinâmico))` [src/pages/app/admin/AdminProducaoCockpit.tsx:89](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L89); `from(app_settings)` [src/pages/app/admin/AdminProducaoCockpit.tsx:104](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L104); `invoke(meta-template-sync)` [src/pages/app/admin/AdminProducaoCockpit.tsx:120](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L120).

Operações diretas detectadas: upsert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/comunicacao/producao/ProducaoStatusBadge.tsx](../../src/components/comunicacao/producao/ProducaoStatusBadge.tsx); [src/components/comunicacao/producao/WabaHealthCard.tsx](../../src/components/comunicacao/producao/WabaHealthCard.tsx); [src/components/comunicacao/producao/ChecklistGoLiveItem.tsx](../../src/components/comunicacao/producao/ChecklistGoLiveItem.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminProducaoCockpit.tsx:156](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L156): <code className="text-xs">mock_sent</code>. Complete o checklist e a verificação de

### AdminPropostasB2B.tsx

Fonte: [src/pages/app/admin/AdminPropostasB2B.tsx](../../src/pages/app/admin/AdminPropostasB2B.tsx) (572 linhas). Rotas: `/app/admin/propostas-b2b`.

Funções da interface, conforme títulos e descrições: Propostas Empresa → Médico; Gerencie propostas comerciais com intermediação da plataforma..

Funções nomeadas: [src/pages/app/admin/AdminPropostasB2B.tsx:31](../../src/pages/app/admin/AdminPropostasB2B.tsx#L31) `fmtDate`; [src/pages/app/admin/AdminPropostasB2B.tsx:52](../../src/pages/app/admin/AdminPropostasB2B.tsx#L52) `calcRepasse`; [src/pages/app/admin/AdminPropostasB2B.tsx:59](../../src/pages/app/admin/AdminPropostasB2B.tsx#L59) `AdminPropostasB2B`; [src/pages/app/admin/AdminPropostasB2B.tsx:81](../../src/pages/app/admin/AdminPropostasB2B.tsx#L81) `carregarTaxaDefault`; [src/pages/app/admin/AdminPropostasB2B.tsx:88](../../src/pages/app/admin/AdminPropostasB2B.tsx#L88) `carregar`; [src/pages/app/admin/AdminPropostasB2B.tsx:126](../../src/pages/app/admin/AdminPropostasB2B.tsx#L126) `openReview`; [src/pages/app/admin/AdminPropostasB2B.tsx:133](../../src/pages/app/admin/AdminPropostasB2B.tsx#L133) `aprovar`; [src/pages/app/admin/AdminPropostasB2B.tsx:175](../../src/pages/app/admin/AdminPropostasB2B.tsx#L175) `rejeitar`; [src/pages/app/admin/AdminPropostasB2B.tsx:212](../../src/pages/app/admin/AdminPropostasB2B.tsx#L212) `salvarTaxaRapida`.

Dados e integrações diretas: `from(propostas_empresa_medico)` [src/pages/app/admin/AdminPropostasB2B.tsx:91](../../src/pages/app/admin/AdminPropostasB2B.tsx#L91); `from(propostas_empresa_medico)` [src/pages/app/admin/AdminPropostasB2B.tsx:140](../../src/pages/app/admin/AdminPropostasB2B.tsx#L140); `from(planos_auditoria)` [src/pages/app/admin/AdminPropostasB2B.tsx:154](../../src/pages/app/admin/AdminPropostasB2B.tsx#L154); `from(propostas_empresa_medico)` [src/pages/app/admin/AdminPropostasB2B.tsx:179](../../src/pages/app/admin/AdminPropostasB2B.tsx#L179); `from(planos_auditoria)` [src/pages/app/admin/AdminPropostasB2B.tsx:190](../../src/pages/app/admin/AdminPropostasB2B.tsx#L190); `from(propostas_empresa_medico)` [src/pages/app/admin/AdminPropostasB2B.tsx:221](../../src/pages/app/admin/AdminPropostasB2B.tsx#L221); `from(planos_auditoria)` [src/pages/app/admin/AdminPropostasB2B.tsx:228](../../src/pages/app/admin/AdminPropostasB2B.tsx#L228).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/financeiroConfig.ts](../../src/lib/financeiroConfig.ts); [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminPropostasB2B.tsx:63](../../src/pages/app/admin/AdminPropostasB2B.tsx#L63): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminPropostasB2B.tsx:115](../../src/pages/app/admin/AdminPropostasB2B.tsx#L115): if (filtroStatus !== "todos") arr = arr.filter(p => p.status === filtroStatus);
- [src/pages/app/admin/AdminPropostasB2B.tsx:305](../../src/pages/app/admin/AdminPropostasB2B.tsx#L305): <SelectItem value="todos">Todos os status</SelectItem>

### AdminReembolsoConfig.tsx

Fonte: [src/pages/app/admin/AdminReembolsoConfig.tsx](../../src/pages/app/admin/AdminReembolsoConfig.tsx) (533 linhas). Rotas: `/app/admin/financeiro/reembolsos`.

Funções da interface, conforme títulos e descrições: Editar; Remover; Políticas de reembolso; Configure regras de reembolso para cancelamentos e situações especiais. Regras por médico sobrepõem a regra global.; Regras globais de reembolso; Aplicadas a todos os médicos que não possuem regra específica.; Situações cobertas; Regras por médico; Exceções de reembolso para médicos específicos. Sobrepõem a regra global..

Funções nomeadas: [src/pages/app/admin/AdminReembolsoConfig.tsx:45](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L45) `Section`; [src/pages/app/admin/AdminReembolsoConfig.tsx:74](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L74) `PolicyCard`; [src/pages/app/admin/AdminReembolsoConfig.tsx:137](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L137) `AdminReembolsoConfig`; [src/pages/app/admin/AdminReembolsoConfig.tsx:144](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L144) `load`; [src/pages/app/admin/AdminReembolsoConfig.tsx:159](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L159) `handleToggle`; [src/pages/app/admin/AdminReembolsoConfig.tsx:169](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L169) `handleDelete`; [src/pages/app/admin/AdminReembolsoConfig.tsx:315](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L315) `PolicyModal`; [src/pages/app/admin/AdminReembolsoConfig.tsx:364](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L364) `salvar`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/reembolsoConfig.ts](../../src/lib/reembolsoConfig.ts); [src/lib/financeiroConfig.ts](../../src/lib/financeiroConfig.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminReembolsoConfig.tsx:198](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L198): description="Aplicadas a todos os médicos que não possuem regra específica."
- [src/pages/app/admin/AdminReembolsoConfig.tsx:281](../../src/pages/app/admin/AdminReembolsoConfig.tsx#L281): Nenhuma exceção por médico. Todos seguem as regras globais.

### AdminRelatorioAuditoria.tsx

Fonte: [src/pages/app/admin/AdminRelatorioAuditoria.tsx](../../src/pages/app/admin/AdminRelatorioAuditoria.tsx) (4 linhas). Sem rota direta neste grupo.

Funções nomeadas: nenhuma declaração nomeada detectada.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: nenhuma.

### AdminRelatorioFinanceiro.tsx

Fonte: [src/pages/app/admin/AdminRelatorioFinanceiro.tsx](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx) (357 linhas). Rotas: `/app/admin/relatorios/financeiro`.

Funções da interface, conforme títulos e descrições: Relatório Financeiro; Indicadores baseados em snapshots imutáveis de pagamentos e consultas concluídas..

Funções nomeadas: [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:28](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L28) `deltaPct`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:34](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L34) `AdminRelatorioFinanceiro`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:43](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L43) `carregar`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:75](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L75) `exportarCSV`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:116](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L116) `exportarPDF`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:295](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L295) `TabelaPorMedico`; [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:325](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L325) `TabelaSimples`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:46](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L46).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/relatorios/KpiCard.tsx](../../src/components/relatorios/KpiCard.tsx); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/relatorios/pdfFinanceiro.ts](../../src/lib/relatorios/pdfFinanceiro.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:105](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L105): ["--- Por método de pagamento ---"],
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:106](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L106): ["Método", "Pagamentos", "Receita"],
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:107](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L107): ...(data.por_metodo \|\| []).map((s: any) => [s.metodo, s.pagamentos, brl(s.receita_centavos)]),
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:126](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L126): por_metodo: data.por_metodo,
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:226](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L226): <TabsTrigger value="metodo">Método</TabsTrigger>
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:267](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L267): <TabsContent value="metodo" className="mt-4">
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:270](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L270): titulo="Por método de pagamento"
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:271](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L271): lista={data.por_metodo}
- [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:272](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L272): campo="metodo"

### AdminRelatorios.tsx

Fonte: [src/pages/app/admin/AdminRelatorios.tsx](../../src/pages/app/admin/AdminRelatorios.tsx) (151 linhas). Rotas: `/app/admin/relatorios`.

Funções da interface, conforme títulos e descrições: Relatórios; Centro de inteligência da plataforma — operação, financeiro, comunicação, marketing e mais..

Funções nomeadas: [src/pages/app/admin/AdminRelatorios.tsx:31](../../src/pages/app/admin/AdminRelatorios.tsx#L31) `LinkAba`; [src/pages/app/admin/AdminRelatorios.tsx:44](../../src/pages/app/admin/AdminRelatorios.tsx#L44) `PlaceholderAba`; [src/pages/app/admin/AdminRelatorios.tsx:55](../../src/pages/app/admin/AdminRelatorios.tsx#L55) `AdminRelatorios`; [src/pages/app/admin/AdminRelatorios.tsx:64](../../src/pages/app/admin/AdminRelatorios.tsx#L64) `exportarPdf`.

Dados e integrações diretas: `rpc(relatorios_executivo)` [src/pages/app/admin/AdminRelatorios.tsx:69](../../src/pages/app/admin/AdminRelatorios.tsx#L69); `rpc(relatorios_clinica)` [src/pages/app/admin/AdminRelatorios.tsx:70](../../src/pages/app/admin/AdminRelatorios.tsx#L70); `rpc(relatorios_financeiro)` [src/pages/app/admin/AdminRelatorios.tsx:75](../../src/pages/app/admin/AdminRelatorios.tsx#L75).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/relatorios/FiltrosGlobaisBar.tsx](../../src/components/relatorios/FiltrosGlobaisBar.tsx); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/components/relatorios/VisaoExecutivaTab.tsx](../../src/components/relatorios/VisaoExecutivaTab.tsx); [src/components/relatorios/OperacaoClinicaTab.tsx](../../src/components/relatorios/OperacaoClinicaTab.tsx); [src/components/relatorios/FinanceiroTab.tsx](../../src/components/relatorios/FinanceiroTab.tsx); [src/components/relatorios/MedicosTab.tsx](../../src/components/relatorios/MedicosTab.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/pdfRelatoriosGeral.ts](../../src/lib/relatorios/pdfRelatoriosGeral.ts).

### AdminRelatoriosB2B.tsx

Fonte: [src/pages/app/admin/AdminRelatoriosB2B.tsx](../../src/pages/app/admin/AdminRelatoriosB2B.tsx) (696 linhas). Rotas: `/app/admin/relatorios-b2b`.

Funções da interface, conforme títulos e descrições: Relatórios B2B Corporativos; Consumo por funcionário, coparticipação, taxas & repasses e faturamento detalhado..

Funções nomeadas: [src/pages/app/admin/AdminRelatoriosB2B.tsx:28](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L28) `fmtDate`; [src/pages/app/admin/AdminRelatoriosB2B.tsx:78](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L78) `AdminRelatoriosB2B`; [src/pages/app/admin/AdminRelatoriosB2B.tsx:94](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L94) `carregar`; [src/pages/app/admin/AdminRelatoriosB2B.tsx:262](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L262) `exportCsv`; [src/pages/app/admin/AdminRelatoriosB2B.tsx:299](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L299) `empNome`; [src/pages/app/admin/AdminRelatoriosB2B.tsx:675](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L675) `DatePick`.

Dados e integrações diretas: `from(empresas)` [src/pages/app/admin/AdminRelatoriosB2B.tsx:101](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L101); `from(consultas)` [src/pages/app/admin/AdminRelatoriosB2B.tsx:102](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L102); `from(empresas_funcionarios)` [src/pages/app/admin/AdminRelatoriosB2B.tsx:107](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L107); `from(empresas_faturas)` [src/pages/app/admin/AdminRelatoriosB2B.tsx:108](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L108); `from(propostas_empresa_medico)` [src/pages/app/admin/AdminRelatoriosB2B.tsx:112](../../src/pages/app/admin/AdminRelatoriosB2B.tsx#L112).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/format.ts](../../src/lib/format.ts).

### AdminSaquesMedicos.tsx

Fonte: [src/pages/app/admin/AdminSaquesMedicos.tsx](../../src/pages/app/admin/AdminSaquesMedicos.tsx) (404 linhas). Rotas: `/app/admin/financeiro/saques-medicos`.

Funções da interface, conforme títulos e descrições: Saques Médicos; Gerencie solicitações de saque dos médicos..

Funções nomeadas: [src/pages/app/admin/AdminSaquesMedicos.tsx:33](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L33) `AdminSaquesMedicos`; [src/pages/app/admin/AdminSaquesMedicos.tsx:48](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L48) `loadConfig`; [src/pages/app/admin/AdminSaquesMedicos.tsx:54](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L54) `load`; [src/pages/app/admin/AdminSaquesMedicos.tsx:70](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L70) `mudarStatus`; [src/pages/app/admin/AdminSaquesMedicos.tsx:81](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L81) `openDetalhe`; [src/pages/app/admin/AdminSaquesMedicos.tsx:103](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L103) `salvarConfig`.

Dados e integrações diretas: `from(saques_medicos)` [src/pages/app/admin/AdminSaquesMedicos.tsx:56](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L56); `from(saques_medicos)` [src/pages/app/admin/AdminSaquesMedicos.tsx:75](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L75); `from(saque_medico_itens)` [src/pages/app/admin/AdminSaquesMedicos.tsx:83](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L83); `from(medico_nfes)` [src/pages/app/admin/AdminSaquesMedicos.tsx:88](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L88); `from(app_settings)` [src/pages/app/admin/AdminSaquesMedicos.tsx:114](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L114); `from(financeiro_auditoria)` [src/pages/app/admin/AdminSaquesMedicos.tsx:119](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L119).

Operações diretas detectadas: update, upsert, insert.

Dependências locais diretas: [src/components/permissions/RequirePermission.tsx](../../src/components/permissions/RequirePermission.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/saques.ts](../../src/lib/saques.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminSaquesMedicos.tsx:36](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L36): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminSaquesMedicos.tsx:64](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L64): if (filtroStatus !== "todos") q = q.eq("status", filtroStatus as any);
- [src/pages/app/admin/AdminSaquesMedicos.tsx:161](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L161): <SelectItem value="todos">Todos</SelectItem>
- [src/pages/app/admin/AdminSaquesMedicos.tsx:185](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L185): <th className="px-4 py-2 text-left">Método</th>
- [src/pages/app/admin/AdminSaquesMedicos.tsx:204](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L204): <td className="px-4 py-2.5 uppercase text-xs">{s.metodo}</td>
- [src/pages/app/admin/AdminSaquesMedicos.tsx:293](../../src/pages/app/admin/AdminSaquesMedicos.tsx#L293): <div><span className="text-muted-foreground text-xs">Método:</span><p className="uppercase">{detalheSaque.metodo}</p></div>

### AdminSaude.tsx

Fonte: [src/pages/app/admin/AdminSaude.tsx](../../src/pages/app/admin/AdminSaude.tsx) (281 linhas). Rotas: `/app/admin/saude`.

Funções da interface, conforme títulos e descrições: Saúde do Sistema; Visão interna de readiness do Dashboard Admin.

Funções nomeadas: [src/pages/app/admin/AdminSaude.tsx:22](../../src/pages/app/admin/AdminSaude.tsx#L22) `statusIcon`; [src/pages/app/admin/AdminSaude.tsx:30](../../src/pages/app/admin/AdminSaude.tsx#L30) `statusBadge`; [src/pages/app/admin/AdminSaude.tsx:50](../../src/pages/app/admin/AdminSaude.tsx#L50) `AdminSaude`; [src/pages/app/admin/AdminSaude.tsx:54](../../src/pages/app/admin/AdminSaude.tsx#L54) `runChecks`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/AdminSaude.tsx:71](../../src/pages/app/admin/AdminSaude.tsx#L71); `from((dinâmico))` [src/pages/app/admin/AdminSaude.tsx:89](../../src/pages/app/admin/AdminSaude.tsx#L89); `from(user_roles)` [src/pages/app/admin/AdminSaude.tsx:119](../../src/pages/app/admin/AdminSaude.tsx#L119); `from(audit_log)` [src/pages/app/admin/AdminSaude.tsx:132](../../src/pages/app/admin/AdminSaude.tsx#L132); `from(pagamentos)` [src/pages/app/admin/AdminSaude.tsx:145](../../src/pages/app/admin/AdminSaude.tsx#L145); `from((dinâmico))` [src/pages/app/admin/AdminSaude.tsx:158](../../src/pages/app/admin/AdminSaude.tsx#L158); `from((dinâmico))` [src/pages/app/admin/AdminSaude.tsx:171](../../src/pages/app/admin/AdminSaude.tsx#L171); `from((dinâmico))` [src/pages/app/admin/AdminSaude.tsx:234](../../src/pages/app/admin/AdminSaude.tsx#L234).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### AdminSeguranca.tsx

Fonte: [src/pages/app/admin/AdminSeguranca.tsx](../../src/pages/app/admin/AdminSeguranca.tsx) (250 linhas). Rotas: `/app/admin/seguranca`.

Funções nomeadas: [src/pages/app/admin/AdminSeguranca.tsx:32](../../src/pages/app/admin/AdminSeguranca.tsx#L32) `AdminSeguranca`; [src/pages/app/admin/AdminSeguranca.tsx:39](../../src/pages/app/admin/AdminSeguranca.tsx#L39) `load`; [src/pages/app/admin/AdminSeguranca.tsx:52](../../src/pages/app/admin/AdminSeguranca.tsx#L52) `save`.

Dados e integrações diretas: `from(password_policy)` [src/pages/app/admin/AdminSeguranca.tsx:42](../../src/pages/app/admin/AdminSeguranca.tsx#L42); `from(login_attempts)` [src/pages/app/admin/AdminSeguranca.tsx:43](../../src/pages/app/admin/AdminSeguranca.tsx#L43); `from(password_policy)` [src/pages/app/admin/AdminSeguranca.tsx:55](../../src/pages/app/admin/AdminSeguranca.tsx#L55).

Operações diretas detectadas: update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminSeguranca.tsx:37](../../src/pages/app/admin/AdminSeguranca.tsx#L37): const [filtroResultado, setFiltroResultado] = useState<string>("todos");
- [src/pages/app/admin/AdminSeguranca.tsx:96](../../src/pages/app/admin/AdminSeguranca.tsx#L96): <CardDescription>Aplicadas a todos os usuários.</CardDescription>
- [src/pages/app/admin/AdminSeguranca.tsx:192](../../src/pages/app/admin/AdminSeguranca.tsx#L192): <SelectItem value="todos">Todos</SelectItem>

### AdminServicos.tsx

Fonte: [src/pages/app/admin/AdminServicos.tsx](../../src/pages/app/admin/AdminServicos.tsx) (506 linhas). Rotas: `/app/admin/servicos`.

Funções nomeadas: [src/pages/app/admin/AdminServicos.tsx:66](../../src/pages/app/admin/AdminServicos.tsx#L66) `slugify`; [src/pages/app/admin/AdminServicos.tsx:72](../../src/pages/app/admin/AdminServicos.tsx#L72) `AdminServicos`; [src/pages/app/admin/AdminServicos.tsx:85](../../src/pages/app/admin/AdminServicos.tsx#L85) `load`; [src/pages/app/admin/AdminServicos.tsx:115](../../src/pages/app/admin/AdminServicos.tsx#L115) `toggleAtivo`; [src/pages/app/admin/AdminServicos.tsx:122](../../src/pages/app/admin/AdminServicos.tsx#L122) `save`.

Dados e integrações diretas: `from(servicos_financeiros)` [src/pages/app/admin/AdminServicos.tsx:88](../../src/pages/app/admin/AdminServicos.tsx#L88); `from(especialidades)` [src/pages/app/admin/AdminServicos.tsx:89](../../src/pages/app/admin/AdminServicos.tsx#L89); `from(medico_servicos)` [src/pages/app/admin/AdminServicos.tsx:90](../../src/pages/app/admin/AdminServicos.tsx#L90); `from(app_settings)` [src/pages/app/admin/AdminServicos.tsx:91](../../src/pages/app/admin/AdminServicos.tsx#L91); `from(servicos_financeiros)` [src/pages/app/admin/AdminServicos.tsx:116](../../src/pages/app/admin/AdminServicos.tsx#L116); `from(servicos_financeiros)` [src/pages/app/admin/AdminServicos.tsx:158](../../src/pages/app/admin/AdminServicos.tsx#L158); `from(servicos_financeiros)` [src/pages/app/admin/AdminServicos.tsx:160](../../src/pages/app/admin/AdminServicos.tsx#L160).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/components/financeiro/RepasseSplitInput.tsx](../../src/components/financeiro/RepasseSplitInput.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/admin/ServicoImagemUploader.tsx](../../src/components/admin/ServicoImagemUploader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminServicos.tsx:78](../../src/pages/app/admin/AdminServicos.tsx#L78): const [filtroTipo, setFiltroTipo] = useState<string>("todos");
- [src/pages/app/admin/AdminServicos.tsx:79](../../src/pages/app/admin/AdminServicos.tsx#L79): const [filtroAtivo, setFiltroAtivo] = useState<string>("todos");
- [src/pages/app/admin/AdminServicos.tsx:108](../../src/pages/app/admin/AdminServicos.tsx#L108): if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
- [src/pages/app/admin/AdminServicos.tsx:245](../../src/pages/app/admin/AdminServicos.tsx#L245): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminServicos.tsx:254](../../src/pages/app/admin/AdminServicos.tsx#L254): <SelectItem value="todos">Todos</SelectItem>

### AdminSessoes.tsx

Fonte: [src/pages/app/admin/AdminSessoes.tsx](../../src/pages/app/admin/AdminSessoes.tsx) (260 linhas). Rotas: `/app/admin/sessoes`.

Funções da interface, conforme títulos e descrições: IP mascarado (LGPD).

Funções nomeadas: [src/pages/app/admin/AdminSessoes.tsx:30](../../src/pages/app/admin/AdminSessoes.tsx#L30) `timeAgo`; [src/pages/app/admin/AdminSessoes.tsx:41](../../src/pages/app/admin/AdminSessoes.tsx#L41) `maskIp`; [src/pages/app/admin/AdminSessoes.tsx:54](../../src/pages/app/admin/AdminSessoes.tsx#L54) `useSessoes`; [src/pages/app/admin/AdminSessoes.tsx:89](../../src/pages/app/admin/AdminSessoes.tsx#L89) `AdminSessoes`; [src/pages/app/admin/AdminSessoes.tsx:95](../../src/pages/app/admin/AdminSessoes.tsx#L95) `invalidate`; [src/pages/app/admin/AdminSessoes.tsx:97](../../src/pages/app/admin/AdminSessoes.tsx#L97) `revoke`; [src/pages/app/admin/AdminSessoes.tsx:104](../../src/pages/app/admin/AdminSessoes.tsx#L104) `revokeAll`.

Dados e integrações diretas: `from(user_sessions)` [src/pages/app/admin/AdminSessoes.tsx:58](../../src/pages/app/admin/AdminSessoes.tsx#L58); `from((dinâmico))` [src/pages/app/admin/AdminSessoes.tsx:66](../../src/pages/app/admin/AdminSessoes.tsx#L66); `from(colaboradores)` [src/pages/app/admin/AdminSessoes.tsx:70](../../src/pages/app/admin/AdminSessoes.tsx#L70); `from(medicos)` [src/pages/app/admin/AdminSessoes.tsx:71](../../src/pages/app/admin/AdminSessoes.tsx#L71); `from(pacientes)` [src/pages/app/admin/AdminSessoes.tsx:72](../../src/pages/app/admin/AdminSessoes.tsx#L72); `rpc((dinâmico))` [src/pages/app/admin/AdminSessoes.tsx:98](../../src/pages/app/admin/AdminSessoes.tsx#L98); `rpc((dinâmico))` [src/pages/app/admin/AdminSessoes.tsx:109](../../src/pages/app/admin/AdminSessoes.tsx#L109).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts).

### AdminTermosCondicoes.tsx

Fonte: [src/pages/app/admin/AdminTermosCondicoes.tsx](../../src/pages/app/admin/AdminTermosCondicoes.tsx) (487 linhas). Rotas: `/app/admin/termos-condicoes`.

Funções da interface, conforme títulos e descrições: Visualizar; Editar rascunho; Ver aceites; Termos & Condições; Gerencie todos os termos legais da plataforma com versionamento completo..

Funções nomeadas: [src/pages/app/admin/AdminTermosCondicoes.tsx:30](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L30) `AdminTermosCondicoes`; [src/pages/app/admin/AdminTermosCondicoes.tsx:82](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L82) `clearFilters`; [src/pages/app/admin/AdminTermosCondicoes.tsx:103](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L103) `handleCriar`; [src/pages/app/admin/AdminTermosCondicoes.tsx:130](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L130) `handleToggle`; [src/pages/app/admin/AdminTermosCondicoes.tsx:145](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L145) `handleVerAceites`; [src/pages/app/admin/AdminTermosCondicoes.tsx:158](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L158) `handleOpenEdit`; [src/pages/app/admin/AdminTermosCondicoes.tsx:164](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L164) `handleSalvarEdicao`; [src/pages/app/admin/AdminTermosCondicoes.tsx:179](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L179) `handleNovaVersao`; [src/pages/app/admin/AdminTermosCondicoes.tsx:188](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L188) `termosPorTipo`; [src/pages/app/admin/AdminTermosCondicoes.tsx:189](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L189) `termoAtivo`; [src/pages/app/admin/AdminTermosCondicoes.tsx:191](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L191) `renderCategoria`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/termos.ts](../../src/lib/termos.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/sanitize.ts](../../src/lib/sanitize.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminTermosCondicoes.tsx:43](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L43): const [filterTipo, setFilterTipo] = useState<string>("todos");
- [src/pages/app/admin/AdminTermosCondicoes.tsx:44](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L44): const [filterStatus, setFilterStatus] = useState<string>("todos");
- [src/pages/app/admin/AdminTermosCondicoes.tsx:70](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L70): if (filterTipo !== "todos" && t.tipo !== filterTipo) return false;
- [src/pages/app/admin/AdminTermosCondicoes.tsx:71](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L71): if (filterStatus !== "todos" && t.status !== filterStatus) return false;
- [src/pages/app/admin/AdminTermosCondicoes.tsx:80](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L80): const hasActiveFilters = searchQuery \|\| filterTipo !== "todos" \|\| filterStatus !== "todos" \|\| filterVersao !== "todas";
- [src/pages/app/admin/AdminTermosCondicoes.tsx:84](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L84): setFilterTipo("todos");
- [src/pages/app/admin/AdminTermosCondicoes.tsx:85](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L85): setFilterStatus("todos");
- [src/pages/app/admin/AdminTermosCondicoes.tsx:105](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L105): toast.error("Preencha todos os campos");
- [src/pages/app/admin/AdminTermosCondicoes.tsx:292](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L292): <PageHeader title="Termos & Condições" description="Gerencie todos os termos legais da plataforma com versionamento completo." />
- [src/pages/app/admin/AdminTermosCondicoes.tsx:312](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L312): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/admin/AdminTermosCondicoes.tsx:324](../../src/pages/app/admin/AdminTermosCondicoes.tsx#L324): <SelectItem value="todos">Todos</SelectItem>

### AdminTreinamentos.tsx

Fonte: [src/pages/app/admin/AdminTreinamentos.tsx](../../src/pages/app/admin/AdminTreinamentos.tsx) (544 linhas). Rotas: `/app/admin/treinamentos`.

Funções da interface, conforme títulos e descrições: Gestão de Treinamento; Crie módulos, adicione vídeos e acompanhe a conclusão dos médicos..

Funções nomeadas: [src/pages/app/admin/AdminTreinamentos.tsx:35](../../src/pages/app/admin/AdminTreinamentos.tsx#L35) `AdminTreinamentos`; [src/pages/app/admin/AdminTreinamentos.tsx:55](../../src/pages/app/admin/AdminTreinamentos.tsx#L55) `carregar`; [src/pages/app/admin/AdminTreinamentos.tsx:71](../../src/pages/app/admin/AdminTreinamentos.tsx#L71) `salvarModulo`; [src/pages/app/admin/AdminTreinamentos.tsx:96](../../src/pages/app/admin/AdminTreinamentos.tsx#L96) `excluirModulo`; [src/pages/app/admin/AdminTreinamentos.tsx:104](../../src/pages/app/admin/AdminTreinamentos.tsx#L104) `toggleModulo`; [src/pages/app/admin/AdminTreinamentos.tsx:111](../../src/pages/app/admin/AdminTreinamentos.tsx#L111) `salvarAula`; [src/pages/app/admin/AdminTreinamentos.tsx:142](../../src/pages/app/admin/AdminTreinamentos.tsx#L142) `excluirAula`; [src/pages/app/admin/AdminTreinamentos.tsx:150](../../src/pages/app/admin/AdminTreinamentos.tsx#L150) `toggleAula`; [src/pages/app/admin/AdminTreinamentos.tsx:160](../../src/pages/app/admin/AdminTreinamentos.tsx#L160) `medicoCompletou`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/admin/AdminTreinamentos.tsx:60](../../src/pages/app/admin/AdminTreinamentos.tsx#L60).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/treinamentos.ts](../../src/lib/treinamentos.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminTreinamentos.tsx:44](../../src/pages/app/admin/AdminTreinamentos.tsx#L44): const [filtroStatus, setFiltroStatus] = useState("todos");
- [src/pages/app/admin/AdminTreinamentos.tsx:350](../../src/pages/app/admin/AdminTreinamentos.tsx#L350): <SelectItem value="todos">Todos</SelectItem>

### AdminUsuarios.tsx

Fonte: [src/pages/app/admin/AdminUsuarios.tsx](../../src/pages/app/admin/AdminUsuarios.tsx) (658 linhas). Rotas: `/app/admin/pacientes`.

Funções da interface, conforme títulos e descrições: Gestão de usuários/pacientes; Cadastro, vínculo e ações administrativas sobre contas de pacientes.; Pagamento pendente.

Funções nomeadas: [src/pages/app/admin/AdminUsuarios.tsx:73](../../src/pages/app/admin/AdminUsuarios.tsx#L73) `statusContaBadge`; [src/pages/app/admin/AdminUsuarios.tsx:86](../../src/pages/app/admin/AdminUsuarios.tsx#L86) `formatDate`; [src/pages/app/admin/AdminUsuarios.tsx:91](../../src/pages/app/admin/AdminUsuarios.tsx#L91) `AdminUsuarios`; [src/pages/app/admin/AdminUsuarios.tsx:115](../../src/pages/app/admin/AdminUsuarios.tsx#L115) `carregar`; [src/pages/app/admin/AdminUsuarios.tsx:234](../../src/pages/app/admin/AdminUsuarios.tsx#L234) `abrirDialog`; [src/pages/app/admin/AdminUsuarios.tsx:244](../../src/pages/app/admin/AdminUsuarios.tsx#L244) `confirmar`; [src/pages/app/admin/AdminUsuarios.tsx:269](../../src/pages/app/admin/AdminUsuarios.tsx#L269) `criarPaciente`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/admin/AdminUsuarios.tsx:119](../../src/pages/app/admin/AdminUsuarios.tsx#L119); `from(pacientes)` [src/pages/app/admin/AdminUsuarios.tsx:127](../../src/pages/app/admin/AdminUsuarios.tsx#L127); `from(profiles)` [src/pages/app/admin/AdminUsuarios.tsx:144](../../src/pages/app/admin/AdminUsuarios.tsx#L144); `from(consultas)` [src/pages/app/admin/AdminUsuarios.tsx:156](../../src/pages/app/admin/AdminUsuarios.tsx#L156); `from(consultas)` [src/pages/app/admin/AdminUsuarios.tsx:166](../../src/pages/app/admin/AdminUsuarios.tsx#L166); `from(pagamentos)` [src/pages/app/admin/AdminUsuarios.tsx:177](../../src/pages/app/admin/AdminUsuarios.tsx#L177); `rpc(alterar_status_conta_paciente)` [src/pages/app/admin/AdminUsuarios.tsx:252](../../src/pages/app/admin/AdminUsuarios.tsx#L252); `invoke(admin-criar-paciente)` [src/pages/app/admin/AdminUsuarios.tsx:279](../../src/pages/app/admin/AdminUsuarios.tsx#L279).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/AdminUsuarios.tsx:51](../../src/pages/app/admin/AdminUsuarios.tsx#L51): { key: "todos", label: "Todos" },
- [src/pages/app/admin/AdminUsuarios.tsx:96](../../src/pages/app/admin/AdminUsuarios.tsx#L96): const [filtro, setFiltro] = useState<typeof filtrosPrincipais[number]["key"]>("todos");

### AdminWhatsappCloudTest.tsx

Fonte: [src/pages/app/admin/AdminWhatsappCloudTest.tsx](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx) (207 linhas). Rotas: `/app/admin/whatsapp-cloud-test`.

Funções da interface, conforme títulos e descrições: WhatsApp Cloud — Teste real (isolado); Envio direto à Cloud API da Meta usando v21.0. Não toca em sandbox, produção, webhook ou Inbox..

Funções nomeadas: [src/pages/app/admin/AdminWhatsappCloudTest.tsx:28](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L28) `AdminWhatsappCloudTest`; [src/pages/app/admin/AdminWhatsappCloudTest.tsx:36](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L36) `loadLogs`; [src/pages/app/admin/AdminWhatsappCloudTest.tsx:57](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L57) `enviar`.

Dados e integrações diretas: `from((dinâmico))` [src/pages/app/admin/AdminWhatsappCloudTest.tsx:39](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L39); `invoke(whatsapp-cloud-test)` [src/pages/app/admin/AdminWhatsappCloudTest.tsx:70](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L70).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### FeegowIntegracao.tsx

Fonte: [src/pages/app/admin/FeegowIntegracao.tsx](../../src/pages/app/admin/FeegowIntegracao.tsx) (474 linhas). Rotas: `/app/admin/feegow`.

Funções da interface, conforme títulos e descrições: Integração · Feegow; Status real da integração com a API Feegow. Dados lidos do banco e edge functions..

Funções nomeadas: [src/pages/app/admin/FeegowIntegracao.tsx:60](../../src/pages/app/admin/FeegowIntegracao.tsx#L60) `statusBadge`; [src/pages/app/admin/FeegowIntegracao.tsx:67](../../src/pages/app/admin/FeegowIntegracao.tsx#L67) `connStatusColor`; [src/pages/app/admin/FeegowIntegracao.tsx:74](../../src/pages/app/admin/FeegowIntegracao.tsx#L74) `connStatusLabel`; [src/pages/app/admin/FeegowIntegracao.tsx:77](../../src/pages/app/admin/FeegowIntegracao.tsx#L77) `fmtDate`; [src/pages/app/admin/FeegowIntegracao.tsx:82](../../src/pages/app/admin/FeegowIntegracao.tsx#L82) `FeegowIntegracao`; [src/pages/app/admin/FeegowIntegracao.tsx:130](../../src/pages/app/admin/FeegowIntegracao.tsx#L130) `testarConexao`; [src/pages/app/admin/FeegowIntegracao.tsx:152](../../src/pages/app/admin/FeegowIntegracao.tsx#L152) `executarAcaoSegura`.

Dados e integrações diretas: `from(integracoes_config)` [src/pages/app/admin/FeegowIntegracao.tsx:100](../../src/pages/app/admin/FeegowIntegracao.tsx#L100); `from(integracoes_logs)` [src/pages/app/admin/FeegowIntegracao.tsx:105](../../src/pages/app/admin/FeegowIntegracao.tsx#L105); `from(integracoes_pendencias)` [src/pages/app/admin/FeegowIntegracao.tsx:111](../../src/pages/app/admin/FeegowIntegracao.tsx#L111); `from(pacientes)` [src/pages/app/admin/FeegowIntegracao.tsx:115](../../src/pages/app/admin/FeegowIntegracao.tsx#L115); `invoke(integracoes-test)` [src/pages/app/admin/FeegowIntegracao.tsx:133](../../src/pages/app/admin/FeegowIntegracao.tsx#L133); `invoke(integracoes-test)` [src/pages/app/admin/FeegowIntegracao.tsx:155](../../src/pages/app/admin/FeegowIntegracao.tsx#L155).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/FeegowIntegracao.tsx:22](../../src/pages/app/admin/FeegowIntegracao.tsx#L22): modo_simulado: boolean;
- [src/pages/app/admin/FeegowIntegracao.tsx:102](../../src/pages/app/admin/FeegowIntegracao.tsx#L102): .select("id, status, ambiente, modo_simulado, ativo, secrets_keys, ultimo_teste_at, ultimo_teste_ok, ultimo_erro, ultima_sincronizacao_at")
- [src/pages/app/admin/FeegowIntegracao.tsx:188](../../src/pages/app/admin/FeegowIntegracao.tsx#L188): {conn?.modo_simulado && (
- [src/pages/app/admin/FeegowIntegracao.tsx:192](../../src/pages/app/admin/FeegowIntegracao.tsx#L192): <p className="font-semibold">Modo simulado ativo</p>
- [src/pages/app/admin/FeegowIntegracao.tsx:194](../../src/pages/app/admin/FeegowIntegracao.tsx#L194): A integração está em modo simulado. Para ativar comunicação real, desative o modo simulado na Central de Integrações.
- [src/pages/app/admin/FeegowIntegracao.tsx:200](../../src/pages/app/admin/FeegowIntegracao.tsx#L200): {!conn?.modo_simulado && conn?.status !== "erro" && (
- [src/pages/app/admin/FeegowIntegracao.tsx:222](../../src/pages/app/admin/FeegowIntegracao.tsx#L222): Modo: <strong>{conn?.modo_simulado ? "simulado" : "real"}</strong> ·

### FeegowMapeamento.tsx

Fonte: [src/pages/app/admin/FeegowMapeamento.tsx](../../src/pages/app/admin/FeegowMapeamento.tsx) (200 linhas). Rotas: `/app/admin/feegow/mapeamento`.

Funções da interface, conforme títulos e descrições: Mapeamento de status · Feegow; Mapeamentos reais entre status internos e status Feegow, lidos do banco de dados..

Funções nomeadas: [src/pages/app/admin/FeegowMapeamento.tsx:22](../../src/pages/app/admin/FeegowMapeamento.tsx#L22) `FeegowMapeamento`.

Dados e integrações diretas: `from(integracoes_status_mapping)` [src/pages/app/admin/FeegowMapeamento.tsx:32](../../src/pages/app/admin/FeegowMapeamento.tsx#L32); `from(pacientes)` [src/pages/app/admin/FeegowMapeamento.tsx:37](../../src/pages/app/admin/FeegowMapeamento.tsx#L37); `from(documentos_paciente)` [src/pages/app/admin/FeegowMapeamento.tsx:41](../../src/pages/app/admin/FeegowMapeamento.tsx#L41); `from(medicos)` [src/pages/app/admin/FeegowMapeamento.tsx:45](../../src/pages/app/admin/FeegowMapeamento.tsx#L45).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### FeegowProfissionais.tsx

Fonte: [src/pages/app/admin/FeegowProfissionais.tsx](../../src/pages/app/admin/FeegowProfissionais.tsx) (712 linhas). Rotas: `/app/admin/feegow/profissionais`.

Funções da interface, conforme títulos e descrições: Profissionais · Vínculo Feegow; Vincule médicos locais a profissionais da Feegow. Apenas vínculo manual — sem sincronização automática.; Ver agenda Feegow; Diagnóstico endpoints; Ver detalhes.

Funções nomeadas: [src/pages/app/admin/FeegowProfissionais.tsx:71](../../src/pages/app/admin/FeegowProfissionais.tsx#L71) `fmtDate`; [src/pages/app/admin/FeegowProfissionais.tsx:76](../../src/pages/app/admin/FeegowProfissionais.tsx#L76) `todayStr`; [src/pages/app/admin/FeegowProfissionais.tsx:77](../../src/pages/app/admin/FeegowProfissionais.tsx#L77) `weekLaterStr`; [src/pages/app/admin/FeegowProfissionais.tsx:79](../../src/pages/app/admin/FeegowProfissionais.tsx#L79) `FeegowProfissionais`; [src/pages/app/admin/FeegowProfissionais.tsx:125](../../src/pages/app/admin/FeegowProfissionais.tsx#L125) `buscarProfissionaisFeegow`; [src/pages/app/admin/FeegowProfissionais.tsx:140](../../src/pages/app/admin/FeegowProfissionais.tsx#L140) `abrirVinculacao`; [src/pages/app/admin/FeegowProfissionais.tsx:146](../../src/pages/app/admin/FeegowProfissionais.tsx#L146) `vincular`; [src/pages/app/admin/FeegowProfissionais.tsx:165](../../src/pages/app/admin/FeegowProfissionais.tsx#L165) `desvincular`; [src/pages/app/admin/FeegowProfissionais.tsx:183](../../src/pages/app/admin/FeegowProfissionais.tsx#L183) `verDetalhes`; [src/pages/app/admin/FeegowProfissionais.tsx:189](../../src/pages/app/admin/FeegowProfissionais.tsx#L189) `abrirAgenda`; [src/pages/app/admin/FeegowProfissionais.tsx:199](../../src/pages/app/admin/FeegowProfissionais.tsx#L199) `consultarAgenda`; [src/pages/app/admin/FeegowProfissionais.tsx:224](../../src/pages/app/admin/FeegowProfissionais.tsx#L224) `abrirDiagnostico`; [src/pages/app/admin/FeegowProfissionais.tsx:231](../../src/pages/app/admin/FeegowProfissionais.tsx#L231) `executarDiagnostico`.

Dados e integrações diretas: `from(medicos)` [src/pages/app/admin/FeegowProfissionais.tsx:111](../../src/pages/app/admin/FeegowProfissionais.tsx#L111); `invoke(feegow-profissionais)` [src/pages/app/admin/FeegowProfissionais.tsx:128](../../src/pages/app/admin/FeegowProfissionais.tsx#L128); `invoke(feegow-vincular-profissional)` [src/pages/app/admin/FeegowProfissionais.tsx:149](../../src/pages/app/admin/FeegowProfissionais.tsx#L149); `invoke(feegow-vincular-profissional)` [src/pages/app/admin/FeegowProfissionais.tsx:169](../../src/pages/app/admin/FeegowProfissionais.tsx#L169); `invoke(feegow-agenda-readonly)` [src/pages/app/admin/FeegowProfissionais.tsx:206](../../src/pages/app/admin/FeegowProfissionais.tsx#L206); `invoke(feegow-agenda-readonly)` [src/pages/app/admin/FeegowProfissionais.tsx:237](../../src/pages/app/admin/FeegowProfissionais.tsx#L237).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/FeegowProfissionais.tsx:64](../../src/pages/app/admin/FeegowProfissionais.tsx#L64): metodo: string;

### FeegowSchema.tsx

Fonte: [src/pages/app/admin/FeegowSchema.tsx](../../src/pages/app/admin/FeegowSchema.tsx) (145 linhas). Rotas: `/app/admin/feegow/schema`.

Funções da interface, conforme títulos e descrições: Endpoints API · Feegow; Status real dos endpoints da API Feegow testados via edge functions..

Funções nomeadas: [src/pages/app/admin/FeegowSchema.tsx:29](../../src/pages/app/admin/FeegowSchema.tsx#L29) `statusIcon`; [src/pages/app/admin/FeegowSchema.tsx:35](../../src/pages/app/admin/FeegowSchema.tsx#L35) `statusLabel`; [src/pages/app/admin/FeegowSchema.tsx:41](../../src/pages/app/admin/FeegowSchema.tsx#L41) `statusText`; [src/pages/app/admin/FeegowSchema.tsx:47](../../src/pages/app/admin/FeegowSchema.tsx#L47) `FeegowSchema`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/FeegowSchema.tsx:94](../../src/pages/app/admin/FeegowSchema.tsx#L94): <span>Método</span>

### FluxoOperacional.tsx

Fonte: [src/pages/app/admin/FluxoOperacional.tsx](../../src/pages/app/admin/FluxoOperacional.tsx) (172 linhas). Rotas: `/app/admin/fluxo`.

Funções da interface, conforme títulos e descrições: Fluxo operacional; Visão interna da jornada: cadastro → agenda → atendimento → financeiro → comunicação.; Sem agendamentos hoje; Nenhuma consulta marcada para o dia atual..

Funções nomeadas: [src/pages/app/admin/FluxoOperacional.tsx:40](../../src/pages/app/admin/FluxoOperacional.tsx#L40) `FluxoOperacional`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/admin/FluxoOperacional.tsx:54](../../src/pages/app/admin/FluxoOperacional.tsx#L54); `from(consultas)` [src/pages/app/admin/FluxoOperacional.tsx:56](../../src/pages/app/admin/FluxoOperacional.tsx#L56); `from(consultas)` [src/pages/app/admin/FluxoOperacional.tsx:62](../../src/pages/app/admin/FluxoOperacional.tsx#L62).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/lib/utils.ts](../../src/lib/utils.ts).

### IntegracaoWhatsApp.tsx

Fonte: [src/pages/app/admin/IntegracaoWhatsApp.tsx](../../src/pages/app/admin/IntegracaoWhatsApp.tsx) (300 linhas). Rotas: `/app/admin/integracoes/whatsapp`.

Funções da interface, conforme títulos e descrições: WhatsApp Business API; Caixas conectadas via Meta Cloud API. Configuração final acontece quando ativarmos a integração com a Meta..

Funções nomeadas: [src/pages/app/admin/IntegracaoWhatsApp.tsx:35](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L35) `IntegracaoWhatsApp`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:41](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L41) `load`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:54](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L54) `salvar`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:72](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L72) `testar`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:207](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L207) `TestePanel`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:212](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L212) `disparar`; [src/pages/app/admin/IntegracaoWhatsApp.tsx:268](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L268) `ResumoMeta`.

Dados e integrações diretas: `from(whatsapp_instances)` [src/pages/app/admin/IntegracaoWhatsApp.tsx:43](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L43); `from(whatsapp_instances)` [src/pages/app/admin/IntegracaoWhatsApp.tsx:56](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L56); `from(whatsapp_instances)` [src/pages/app/admin/IntegracaoWhatsApp.tsx:74](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L74); `invoke(whatsapp-test-send)` [src/pages/app/admin/IntegracaoWhatsApp.tsx:216](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L216).

Operações diretas detectadas: insert, update.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/IntegracaoWhatsApp.tsx:73](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L73): toast.info("Teste de conexão simulado — ativação real virá quando configurarmos as credenciais Meta.");

### MedicosAprovacao.tsx

Fonte: [src/pages/app/admin/MedicosAprovacao.tsx](../../src/pages/app/admin/MedicosAprovacao.tsx) (637 linhas). Rotas: `/app/admin/medicos`.

Funções da interface, conforme títulos e descrições: documento.

Funções nomeadas: [src/pages/app/admin/MedicosAprovacao.tsx:36](../../src/pages/app/admin/MedicosAprovacao.tsx#L36) `validarFeegow`; [src/pages/app/admin/MedicosAprovacao.tsx:55](../../src/pages/app/admin/MedicosAprovacao.tsx#L55) `MedicosAprovacao`; [src/pages/app/admin/MedicosAprovacao.tsx:73](../../src/pages/app/admin/MedicosAprovacao.tsx#L73) `reload`; [src/pages/app/admin/MedicosAprovacao.tsx:134](../../src/pages/app/admin/MedicosAprovacao.tsx#L134) `openDialog`; [src/pages/app/admin/MedicosAprovacao.tsx:142](../../src/pages/app/admin/MedicosAprovacao.tsx#L142) `calcAte`; [src/pages/app/admin/MedicosAprovacao.tsx:153](../../src/pages/app/admin/MedicosAprovacao.tsx#L153) `executar`; [src/pages/app/admin/MedicosAprovacao.tsx:196](../../src/pages/app/admin/MedicosAprovacao.tsx#L196) `handlePreview`; [src/pages/app/admin/MedicosAprovacao.tsx:203](../../src/pages/app/admin/MedicosAprovacao.tsx#L203) `handleDownload`; [src/pages/app/admin/MedicosAprovacao.tsx:577](../../src/pages/app/admin/MedicosAprovacao.tsx#L577) `StatusBadge`; [src/pages/app/admin/MedicosAprovacao.tsx:589](../../src/pages/app/admin/MedicosAprovacao.tsx#L589) `DataField`; [src/pages/app/admin/MedicosAprovacao.tsx:600](../../src/pages/app/admin/MedicosAprovacao.tsx#L600) `fmtDate`; [src/pages/app/admin/MedicosAprovacao.tsx:612](../../src/pages/app/admin/MedicosAprovacao.tsx#L612) `FeegowCard`.

Dados e integrações diretas: `channel(medicos-admin)` [src/pages/app/admin/MedicosAprovacao.tsx:86](../../src/pages/app/admin/MedicosAprovacao.tsx#L86).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/permissions/RequirePermission.tsx](../../src/components/permissions/RequirePermission.tsx); [src/lib/medicoRegistro.ts](../../src/lib/medicoRegistro.ts); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/MedicosAprovacao.tsx:57](../../src/pages/app/admin/MedicosAprovacao.tsx#L57): const [filter, setFilter] = useState<MedicoStatus \| "todos">("todos");
- [src/pages/app/admin/MedicosAprovacao.tsx:101](../../src/pages/app/admin/MedicosAprovacao.tsx#L101): if (filter !== "todos" && m.status !== filter) return false;
- [src/pages/app/admin/MedicosAprovacao.tsx:231](../../src/pages/app/admin/MedicosAprovacao.tsx#L231): onClick={() => setFilter(filter === s ? "todos" : s)}
- [src/pages/app/admin/MedicosAprovacao.tsx:273](../../src/pages/app/admin/MedicosAprovacao.tsx#L273): onChange={e => setFilter(e.target.value as MedicoStatus \| "todos")}
- [src/pages/app/admin/MedicosAprovacao.tsx:276](../../src/pages/app/admin/MedicosAprovacao.tsx#L276): <option value="todos">Todos</option>

### Permissoes.tsx

Fonte: [src/pages/app/admin/Permissoes.tsx](../../src/pages/app/admin/Permissoes.tsx) (277 linhas). Rotas: `/app/admin/permissoes`.

Funções da interface, conforme títulos e descrições: Permissões; Gerencie acessos por perfil, função interna ou colaborador específico — sem precisar criar dashboards separados.; Nenhum colaborador encontrado.

Funções nomeadas: [src/pages/app/admin/Permissoes.tsx:33](../../src/pages/app/admin/Permissoes.tsx#L33) `usePermissoesData`; [src/pages/app/admin/Permissoes.tsx:58](../../src/pages/app/admin/Permissoes.tsx#L58) `Permissoes`; [src/pages/app/admin/Permissoes.tsx:266](../../src/pages/app/admin/Permissoes.tsx#L266) `KpiMini`.

Dados e integrações diretas: `rpc((dinâmico))` [src/pages/app/admin/Permissoes.tsx:38](../../src/pages/app/admin/Permissoes.tsx#L38); `from(colaboradores)` [src/pages/app/admin/Permissoes.tsx:39](../../src/pages/app/admin/Permissoes.tsx#L39); `from(permission_audit_logs)` [src/pages/app/admin/Permissoes.tsx:43](../../src/pages/app/admin/Permissoes.tsx#L43).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/admin/AdminStates.tsx](../../src/components/admin/AdminStates.tsx); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/permissions/ColaboradorPermissoesDrawer.tsx](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx); [src/components/permissions/MatrizPermissoes.tsx](../../src/components/permissions/MatrizPermissoes.tsx); [src/lib/permissions/constants.ts](../../src/lib/permissions/constants.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/Permissoes.tsx:61](../../src/pages/app/admin/Permissoes.tsx#L61): const [filtroFuncao, setFiltroFuncao] = useState<string>("todos");
- [src/pages/app/admin/Permissoes.tsx:62](../../src/pages/app/admin/Permissoes.tsx#L62): const [filtroStatus, setFiltroStatus] = useState<string>("todos");
- [src/pages/app/admin/Permissoes.tsx:77](../../src/pages/app/admin/Permissoes.tsx#L77): if (filtroFuncao !== "todos" && c.funcao_interna !== filtroFuncao) return false;
- [src/pages/app/admin/Permissoes.tsx:78](../../src/pages/app/admin/Permissoes.tsx#L78): if (filtroStatus !== "todos" && c.status_conta !== filtroStatus) return false;
- [src/pages/app/admin/Permissoes.tsx:121](../../src/pages/app/admin/Permissoes.tsx#L121): <SelectItem value="todos">Todas as funções</SelectItem>
- [src/pages/app/admin/Permissoes.tsx:128](../../src/pages/app/admin/Permissoes.tsx#L128): <SelectItem value="todos">Todos os status</SelectItem>
- [src/pages/app/admin/Permissoes.tsx:189](../../src/pages/app/admin/Permissoes.tsx#L189): Estas permissões valem para <strong>todos</strong> os colaboradores com esta função.
- [src/pages/app/admin/Permissoes.tsx:205](../../src/pages/app/admin/Permissoes.tsx#L205): Define o padrão para todos os usuários deste perfil base.

### PermissoesLog.tsx

Fonte: [src/pages/app/admin/PermissoesLog.tsx](../../src/pages/app/admin/PermissoesLog.tsx) (369 linhas). Rotas: `/app/admin/permissoes/log`.

Funções da interface, conforme títulos e descrições: Histórico de permissões; Auditoria completa de quem alterou o quê, quando e por quê. Use os filtros para investigar mudanças específicas..

Funções nomeadas: [src/pages/app/admin/PermissoesLog.tsx:47](../../src/pages/app/admin/PermissoesLog.tsx#L47) `PermissoesLog`; [src/pages/app/admin/PermissoesLog.tsx:65](../../src/pages/app/admin/PermissoesLog.tsx#L65) `carregar`; [src/pages/app/admin/PermissoesLog.tsx:130](../../src/pages/app/admin/PermissoesLog.tsx#L130) `nomeUsuario`; [src/pages/app/admin/PermissoesLog.tsx:135](../../src/pages/app/admin/PermissoesLog.tsx#L135) `nomeAlvo`; [src/pages/app/admin/PermissoesLog.tsx:142](../../src/pages/app/admin/PermissoesLog.tsx#L142) `exportarCSV`; [src/pages/app/admin/PermissoesLog.tsx:350](../../src/pages/app/admin/PermissoesLog.tsx#L350) `Info`; [src/pages/app/admin/PermissoesLog.tsx:359](../../src/pages/app/admin/PermissoesLog.tsx#L359) `DiffBox`.

Dados e integrações diretas: `from(permission_audit_logs)` [src/pages/app/admin/PermissoesLog.tsx:69](../../src/pages/app/admin/PermissoesLog.tsx#L69); `from((dinâmico))` [src/pages/app/admin/PermissoesLog.tsx:103](../../src/pages/app/admin/PermissoesLog.tsx#L103); `from(colaboradores)` [src/pages/app/admin/PermissoesLog.tsx:108](../../src/pages/app/admin/PermissoesLog.tsx#L108).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/permissions/constants.ts](../../src/lib/permissions/constants.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/admin/PermissoesLog.tsx:54](../../src/pages/app/admin/PermissoesLog.tsx#L54): const [scope, setScope] = useState<string>("todos");
- [src/pages/app/admin/PermissoesLog.tsx:55](../../src/pages/app/admin/PermissoesLog.tsx#L55): const [acao, setAcao] = useState<string>("todos");
- [src/pages/app/admin/PermissoesLog.tsx:56](../../src/pages/app/admin/PermissoesLog.tsx#L56): const [target, setTarget] = useState<string>("todos");
- [src/pages/app/admin/PermissoesLog.tsx:76](../../src/pages/app/admin/PermissoesLog.tsx#L76): if (scope !== "todos") q = q.eq("scope", scope);
- [src/pages/app/admin/PermissoesLog.tsx:77](../../src/pages/app/admin/PermissoesLog.tsx#L77): if (acao !== "todos") q = q.eq("acao", acao);
- [src/pages/app/admin/PermissoesLog.tsx:78](../../src/pages/app/admin/PermissoesLog.tsx#L78): if (target !== "todos") {
- [src/pages/app/admin/PermissoesLog.tsx:221](../../src/pages/app/admin/PermissoesLog.tsx#L221): <Select value={scope} onValueChange={v => { setScope(v); setTarget("todos"); }}>
- [src/pages/app/admin/PermissoesLog.tsx:224](../../src/pages/app/admin/PermissoesLog.tsx#L224): <SelectItem value="todos">Todos os escopos</SelectItem>
- [src/pages/app/admin/PermissoesLog.tsx:233](../../src/pages/app/admin/PermissoesLog.tsx#L233): <SelectItem value="todos">Todos os alvos</SelectItem>
- [src/pages/app/admin/PermissoesLog.tsx:240](../../src/pages/app/admin/PermissoesLog.tsx#L240): <SelectItem value="todos">Todas as ações</SelectItem>

### WhatsAppCentral.tsx

Fonte: [src/pages/app/admin/WhatsAppCentral.tsx](../../src/pages/app/admin/WhatsAppCentral.tsx) (53 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: WhatsApp Business API; Conexões oficiais e estado das duas caixas..

Funções nomeadas: [src/pages/app/admin/WhatsAppCentral.tsx:6](../../src/pages/app/admin/WhatsAppCentral.tsx#L6) `WhatsAppCentral`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx).

### SecretariaCupons.tsx

Fonte: [src/pages/app/secretaria/SecretariaCupons.tsx](../../src/pages/app/secretaria/SecretariaCupons.tsx) (314 linhas). Rotas: `/app/admin/cupons`.

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

### ComunicacaoInterna.tsx

Fonte: [src/pages/app/shared/ComunicacaoInterna.tsx](../../src/pages/app/shared/ComunicacaoInterna.tsx) (571 linhas). Rotas: `/app/admin/comunicacao-interna`.

Funções da interface, conforme títulos e descrições: Comunicação interna; Faça login para acessar.; Comunicação interna da equipe; Mensagens entre Secretaria, Médicos, Admin e Empresas — separado das conversas com pacientes (WhatsApp)..

Funções nomeadas: [src/pages/app/shared/ComunicacaoInterna.tsx:81](../../src/pages/app/shared/ComunicacaoInterna.tsx#L81) `ComunicacaoInterna`; [src/pages/app/shared/ComunicacaoInterna.tsx:192](../../src/pages/app/shared/ComunicacaoInterna.tsx#L192) `enviarMensagem`; [src/pages/app/shared/ComunicacaoInterna.tsx:209](../../src/pages/app/shared/ComunicacaoInterna.tsx#L209) `criarThread`; [src/pages/app/shared/ComunicacaoInterna.tsx:235](../../src/pages/app/shared/ComunicacaoInterna.tsx#L235) `alterarStatus`; [src/pages/app/shared/ComunicacaoInterna.tsx:248](../../src/pages/app/shared/ComunicacaoInterna.tsx#L248) `alterarPrioridade`.

Dados e integrações diretas: `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:107](../../src/pages/app/shared/ComunicacaoInterna.tsx#L107); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:126](../../src/pages/app/shared/ComunicacaoInterna.tsx#L126); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:129](../../src/pages/app/shared/ComunicacaoInterna.tsx#L129); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:140](../../src/pages/app/shared/ComunicacaoInterna.tsx#L140); `from((dinâmico))` [src/pages/app/shared/ComunicacaoInterna.tsx:153](../../src/pages/app/shared/ComunicacaoInterna.tsx#L153); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:155](../../src/pages/app/shared/ComunicacaoInterna.tsx#L155); `channel(internal-msgs)` [src/pages/app/shared/ComunicacaoInterna.tsx:169](../../src/pages/app/shared/ComunicacaoInterna.tsx#L169); `from(profiles)` [src/pages/app/shared/ComunicacaoInterna.tsx:177](../../src/pages/app/shared/ComunicacaoInterna.tsx#L177); `from(internal_messages)` [src/pages/app/shared/ComunicacaoInterna.tsx:195](../../src/pages/app/shared/ComunicacaoInterna.tsx#L195); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:215](../../src/pages/app/shared/ComunicacaoInterna.tsx#L215); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:236](../../src/pages/app/shared/ComunicacaoInterna.tsx#L236); `from(internal_threads)` [src/pages/app/shared/ComunicacaoInterna.tsx:249](../../src/pages/app/shared/ComunicacaoInterna.tsx#L249).

Operações diretas detectadas: insert, update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/pacienteConversas.ts](../../src/lib/pacienteConversas.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/shared/ComunicacaoInterna.tsx:307](../../src/pages/app/shared/ComunicacaoInterna.tsx#L307): {c === "todas" ? "Todos" : c}

### CuponsUsoLog.tsx

Fonte: [src/pages/app/shared/CuponsUsoLog.tsx](../../src/pages/app/shared/CuponsUsoLog.tsx) (246 linhas). Rotas: `/app/admin/cupons/log`.

Funções da interface, conforme títulos e descrições: Log de uso de cupons; Histórico de aplicação de cupons.; Quem aplicou, quando, em qual consulta e quanto de desconto..

Funções nomeadas: [src/pages/app/shared/CuponsUsoLog.tsx:10](../../src/pages/app/shared/CuponsUsoLog.tsx#L10) `fmt`; [src/pages/app/shared/CuponsUsoLog.tsx:23](../../src/pages/app/shared/CuponsUsoLog.tsx#L23) `CuponsUsoLog`; [src/pages/app/shared/CuponsUsoLog.tsx:64](../../src/pages/app/shared/CuponsUsoLog.tsx#L64) `exportarCSV`; [src/pages/app/shared/CuponsUsoLog.tsx:238](../../src/pages/app/shared/CuponsUsoLog.tsx#L238) `Stat`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/cuponsUso.ts](../../src/lib/cuponsUso.ts); [src/lib/utils.ts](../../src/lib/utils.ts).

### PacientePerfil.tsx

Fonte: [src/pages/app/shared/PacientePerfil.tsx](../../src/pages/app/shared/PacientePerfil.tsx) (980 linhas). Rotas: `/app/admin/pacientes/:id`.

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

Fonte: [src/pages/app/shared/PendenciasIntegracao.tsx](../../src/pages/app/shared/PendenciasIntegracao.tsx) (237 linhas). Rotas: `/app/admin/pendencias-integracao`.

Funções da interface, conforme títulos e descrições: Pendências de integração · Feegow; Pendências registradas no banco e itens conhecidos aguardando resolução..

Funções nomeadas: [src/pages/app/shared/PendenciasIntegracao.tsx:70](../../src/pages/app/shared/PendenciasIntegracao.tsx#L70) `fmtDate`; [src/pages/app/shared/PendenciasIntegracao.tsx:74](../../src/pages/app/shared/PendenciasIntegracao.tsx#L74) `prioridadeColor`; [src/pages/app/shared/PendenciasIntegracao.tsx:79](../../src/pages/app/shared/PendenciasIntegracao.tsx#L79) `PendenciasIntegracao`; [src/pages/app/shared/PendenciasIntegracao.tsx:84](../../src/pages/app/shared/PendenciasIntegracao.tsx#L84) `fetchData`.

Dados e integrações diretas: `from(integracoes_pendencias)` [src/pages/app/shared/PendenciasIntegracao.tsx:87](../../src/pages/app/shared/PendenciasIntegracao.tsx#L87); `from(integracoes_logs)` [src/pages/app/shared/PendenciasIntegracao.tsx:93](../../src/pages/app/shared/PendenciasIntegracao.tsx#L93).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| invoke | `meta-health-check` | [src/components/comunicacao/producao/WabaHealthCard.tsx:44](../../src/components/comunicacao/producao/WabaHealthCard.tsx#L44) | [supabase/functions/meta-health-check/index.ts](../../supabase/functions/meta-health-check/index.ts) |
| rpc | `permissoes_efetivas` | [src/components/permissions/ColaboradorPermissoesDrawer.tsx:45](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx#L45) | [supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql:348](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql#L348) |
| rpc | `colaborador_remover_permissao` | [src/components/permissions/ColaboradorPermissoesDrawer.tsx:72](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx#L72) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:278](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L278) |
| rpc | `colaborador_set_permissao` | [src/components/permissions/ColaboradorPermissoesDrawer.tsx:76](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx#L76) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:250](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L250) |
| rpc | `relatorios_financeiro` | [src/components/relatorios/FinanceiroTab.tsx:26](../../src/components/relatorios/FinanceiroTab.tsx#L26) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:480](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L480); [supabase/migrations/20260503142842_9fb8bf1c-94f1-4ee9-bc42-7d56f83622bc.sql:2](../../supabase/migrations/20260503142842_9fb8bf1c-94f1-4ee9-bc42-7d56f83622bc.sql#L2) |
| rpc | `relatorios_medicos_performance` | [src/components/relatorios/MedicosTab.tsx:36](../../src/components/relatorios/MedicosTab.tsx#L36) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:409](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L409) |
| rpc | `relatorios_clinica` | [src/components/relatorios/OperacaoClinicaTab.tsx:25](../../src/components/relatorios/OperacaoClinicaTab.tsx#L25) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:286](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L286) |
| rpc | `relatorios_executivo` | [src/components/relatorios/VisaoExecutivaTab.tsx:30](../../src/components/relatorios/VisaoExecutivaTab.tsx#L30) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:83](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L83) |
| rpc | `relatorios_consultas_diarias` | [src/components/relatorios/VisaoExecutivaTab.tsx:31](../../src/components/relatorios/VisaoExecutivaTab.tsx#L31) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:225](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L225) |
| rpc | `relatorios_clinica` | [src/components/relatorios/VisaoExecutivaTab.tsx:32](../../src/components/relatorios/VisaoExecutivaTab.tsx#L32) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:286](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L286) |
| rpc | `(dinâmico)` | [src/lib/admin/queries.ts:55](../../src/lib/admin/queries.ts#L55) | Definição não localizada pelo extrator |
| rpc | `colaborador_alterar_status` | [src/lib/admin/queries.ts:103](../../src/lib/admin/queries.ts#L103) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:210](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L210) |
| rpc | `colaborador_atualizar` | [src/lib/admin/queries.ts:114](../../src/lib/admin/queries.ts#L114) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:178](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L178) |
| rpc | `admin_agendamentos_overview` | [src/lib/admin/queries.ts:217](../../src/lib/admin/queries.ts#L217) | [supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql:7](../../supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql#L7); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:21](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L21) |
| rpc | `agendar_retorno_gratuito` | [src/lib/clinico.ts:1074](../../src/lib/clinico.ts#L1074) | [supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql:69](../../supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql#L69) |
| rpc | `trocar_medico_consulta` | [src/lib/clinico.ts:1153](../../src/lib/clinico.ts#L1153) | [supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql:1](../../supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql#L1) |
| rpc | `reservar_slot_unificado` | [src/lib/clinico.ts:1360](../../src/lib/clinico.ts#L1360) | [supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql:3](../../supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql#L3); [supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql:2](../../supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql#L2) |
| rpc | `validar_e_aplicar_cupom` | [src/lib/cupons.ts:210](../../src/lib/cupons.ts#L210) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:1](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L1) |
| rpc | `remover_cupom_pagamento` | [src/lib/cupons.ts:235](../../src/lib/cupons.ts#L235) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:130](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L130) |
| rpc | `set_audit_motivo` | [src/lib/financeiroConfig.ts:57](../../src/lib/financeiroConfig.ts#L57) | [supabase/migrations/20260430224951_7770622e-25fa-4ab8-85f8-20224e05cd35.sql:6](../../supabase/migrations/20260430224951_7770622e-25fa-4ab8-85f8-20224e05cd35.sql#L6) |
| rpc | `(dinâmico)` | [src/lib/gamificacao.ts:20](../../src/lib/gamificacao.ts#L20) | Definição não localizada pelo extrator |
| invoke | `google-calendar-sync` | [src/lib/googleCalendarSync.ts:13](../../src/lib/googleCalendarSync.ts#L13) | [supabase/functions/google-calendar-sync/index.ts](../../supabase/functions/google-calendar-sync/index.ts) |
| rpc | `(dinâmico)` | [src/lib/ia-auditoria.ts:295](../../src/lib/ia-auditoria.ts#L295) | Definição não localizada pelo extrator |
| invoke | `ia-auditoria-medica` | [src/lib/ia-auditoria.ts:384](../../src/lib/ia-auditoria.ts#L384) | [supabase/functions/ia-auditoria-medica/index.ts](../../supabase/functions/ia-auditoria-medica/index.ts) |
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
| rpc | `(dinâmico)` | [src/lib/pagamentos.ts:189](../../src/lib/pagamentos.ts#L189) | Definição não localizada pelo extrator |
| invoke | `criar-checkout-stripe` | [src/lib/pagamentos.ts:306](../../src/lib/pagamentos.ts#L306) | [supabase/functions/criar-checkout-stripe/index.ts](../../supabase/functions/criar-checkout-stripe/index.ts) |
| rpc | `has_permissions_batch` | [src/lib/permissions/usePermission.ts:63](../../src/lib/permissions/usePermission.ts#L63) | [supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql:3](../../supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql#L3) |
| rpc | `has_permission` | [src/lib/permissions/usePermission.ts:75](../../src/lib/permissions/usePermission.ts#L75) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:127](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L127); [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:126](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L126); [supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql:75](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql#L75) |
| rpc | `has_role` | [src/lib/permissions/usePermissionsBatch.ts:67](../../src/lib/permissions/usePermissionsBatch.ts#L67) | [supabase/migrations/20260428210721_f8bf3c5f-8c77-4c85-8416-30c24296d7b9.sql:37](../../supabase/migrations/20260428210721_f8bf3c5f-8c77-4c85-8416-30c24296d7b9.sql#L37); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:11](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L11) |
| rpc | `has_permissions_batch` | [src/lib/permissions/usePermissionsBatch.ts:107](../../src/lib/permissions/usePermissionsBatch.ts#L107) | [supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql:3](../../supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql#L3) |
| rpc | `plano_saude_financeira` | [src/lib/planos/saude.ts:21](../../src/lib/planos/saude.ts#L21) | [supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql:279](../../supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql#L279) |
| invoke | `consulta-insights` | [src/pages/app/admin/AdminAgendamentos.tsx:159](../../src/pages/app/admin/AdminAgendamentos.tsx#L159) | [supabase/functions/consulta-insights/index.ts](../../supabase/functions/consulta-insights/index.ts) |
| rpc | `admin_consulta_forcar_confirmacao` | [src/pages/app/admin/AdminAgendamentos.tsx:249](../../src/pages/app/admin/AdminAgendamentos.tsx#L249) | [supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql:287](../../supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql#L287); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:73](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L73) |
| rpc | `admin_consulta_marcar_realizada` | [src/pages/app/admin/AdminAgendamentos.tsx:253](../../src/pages/app/admin/AdminAgendamentos.tsx#L253) | [supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql:309](../../supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql#L309); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:105](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L105) |
| rpc | `forcar_status_consulta` | [src/pages/app/admin/AdminAgendamentos.tsx:258](../../src/pages/app/admin/AdminAgendamentos.tsx#L258) | [supabase/migrations/20260430161135_aeec6b1e-c565-4af1-bda0-d3d5a68a5f64.sql:81](../../supabase/migrations/20260430161135_aeec6b1e-c565-4af1-bda0-d3d5a68a5f64.sql#L81); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:120](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L120) |
| rpc | `admin_consulta_cancelar` | [src/pages/app/admin/AdminAgendamentos.tsx:279](../../src/pages/app/admin/AdminAgendamentos.tsx#L279) | [supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql:189](../../supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql#L189); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:88](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L88) |
| rpc | `admin_consulta_reenviar_link` | [src/pages/app/admin/AdminAgendamentos.tsx:295](../../src/pages/app/admin/AdminAgendamentos.tsx#L295) | [supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql:261](../../supabase/migrations/20260430164927_c80d639c-5dce-45fa-8c20-66d93e835d5e.sql#L261); [supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql:135](../../supabase/migrations/20260502180317_e76300cc-af54-450b-af76-0a4217fceafa.sql#L135) |
| rpc | `security_generate_alerts` | [src/pages/app/admin/AdminAlertasSeguranca.tsx:83](../../src/pages/app/admin/AdminAlertasSeguranca.tsx#L83) | [supabase/migrations/20260502210815_d1dbddc8-31fd-4944-99e9-3f43952917bd.sql:42](../../supabase/migrations/20260502210815_d1dbddc8-31fd-4944-99e9-3f43952917bd.sql#L42) |
| rpc | `analytics_overview` | [src/pages/app/admin/AdminAnalises.tsx:64](../../src/pages/app/admin/AdminAnalises.tsx#L64) | [supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql:162](../../supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql#L162); [supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql:14](../../supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql#L14) |
| rpc | `analytics_trafego` | [src/pages/app/admin/AdminAnalises.tsx:65](../../src/pages/app/admin/AdminAnalises.tsx#L65) | [supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql:201](../../supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql#L201); [supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql:51](../../supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql#L51) |
| rpc | `analytics_conversao` | [src/pages/app/admin/AdminAnalises.tsx:66](../../src/pages/app/admin/AdminAnalises.tsx#L66) | [supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql:246](../../supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql#L246); [supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql:122](../../supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql#L122) |
| rpc | `analytics_financeiro` | [src/pages/app/admin/AdminAnalises.tsx:67](../../src/pages/app/admin/AdminAnalises.tsx#L67) | [supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql:291](../../supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql#L291); [supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql:177](../../supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql#L177) |
| rpc | `analytics_tempo_real` | [src/pages/app/admin/AdminAnalises.tsx:80](../../src/pages/app/admin/AdminAnalises.tsx#L80) | [supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql:354](../../supabase/migrations/20260430185138_0c87ffab-0082-45d5-bdd9-2d2e26754d48.sql#L354); [supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql:250](../../supabase/migrations/20260502212300_6cff2b98-99f9-4a47-a868-5e65f9fdd181.sql#L250) |
| rpc | `auditoria_dashboard` | [src/pages/app/admin/AdminAuditoria.tsx:107](../../src/pages/app/admin/AdminAuditoria.tsx#L107) | [supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql:139](../../supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql#L139); [supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql:154](../../supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql#L154); [supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql:72](../../supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql#L72) |
| rpc | `auditoria_listar` | [src/pages/app/admin/AdminAuditoria.tsx:123](../../src/pages/app/admin/AdminAuditoria.tsx#L123) | [supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql:234](../../supabase/migrations/20260430182104_e61cf704-f415-4980-b4b8-200a7cff062c.sql#L234); [supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql:82](../../supabase/migrations/20260503141020_32465ac0-a2a8-4384-bbfe-195fcaa49702.sql#L82); [supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql:1](../../supabase/migrations/20260508133250_a5a0c8c9-df43-461c-8fb9-969576e4609c.sql#L1); [supabase/migrations/20260510155744_cd0085da-84b7-494b-bc4a-4839c2ec3059.sql:1](../../supabase/migrations/20260510155744_cd0085da-84b7-494b-bc4a-4839c2ec3059.sql#L1) |
| invoke | `admin-invite-colaborador` | [src/pages/app/admin/AdminColaboradores.tsx:443](../../src/pages/app/admin/AdminColaboradores.tsx#L443) | [supabase/functions/admin-invite-colaborador/index.ts](../../supabase/functions/admin-invite-colaborador/index.ts) |
| rpc | `colaborador_atualizar` | [src/pages/app/admin/AdminColaboradores.tsx:545](../../src/pages/app/admin/AdminColaboradores.tsx#L545) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:178](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L178) |
| rpc | `colaborador_alterar_status` | [src/pages/app/admin/AdminColaboradores.tsx:628](../../src/pages/app/admin/AdminColaboradores.tsx#L628) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:210](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L210) |
| rpc | `colaborador_remover_permissao` | [src/pages/app/admin/AdminColaboradores.tsx:731](../../src/pages/app/admin/AdminColaboradores.tsx#L731) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:278](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L278) |
| rpc | `colaborador_set_permissao` | [src/pages/app/admin/AdminColaboradores.tsx:738](../../src/pages/app/admin/AdminColaboradores.tsx#L738) | [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:250](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L250) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminEmpresas.tsx:101](../../src/pages/app/admin/AdminEmpresas.tsx#L101) | Definição não localizada pelo extrator |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminFinanceiroCentral.tsx:31](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L31) | Definição não localizada pelo extrator |
| invoke | `notificar-reembolso` | [src/pages/app/admin/AdminFinanceiroCentral.tsx:174](../../src/pages/app/admin/AdminFinanceiroCentral.tsx#L174) | [supabase/functions/notificar-reembolso/index.ts](../../supabase/functions/notificar-reembolso/index.ts) |
| rpc | `impersonation_listar_alvos` | [src/pages/app/admin/AdminImpersonar.tsx:56](../../src/pages/app/admin/AdminImpersonar.tsx#L56) | [supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql:123](../../supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql#L123) |
| rpc | `integracoes_dashboard` | [src/pages/app/admin/AdminIntegracoes.tsx:97](../../src/pages/app/admin/AdminIntegracoes.tsx#L97) | [supabase/migrations/20260430182929_fc286944-8669-46d1-a783-5191bd6127c4.sql:196](../../supabase/migrations/20260430182929_fc286944-8669-46d1-a783-5191bd6127c4.sql#L196); [supabase/migrations/20260502203034_9d9637d7-dba4-488e-825f-2c035e7f4771.sql:5](../../supabase/migrations/20260502203034_9d9637d7-dba4-488e-825f-2c035e7f4771.sql#L5) |
| invoke | `integracoes-test` | [src/pages/app/admin/AdminIntegracoes.tsx:117](../../src/pages/app/admin/AdminIntegracoes.tsx#L117) | [supabase/functions/integracoes-test/index.ts](../../supabase/functions/integracoes-test/index.ts) |
| rpc | `event_reprocessar` | [src/pages/app/admin/AdminIntegracoes.tsx:133](../../src/pages/app/admin/AdminIntegracoes.tsx#L133) | [supabase/migrations/20260430182929_fc286944-8669-46d1-a783-5191bd6127c4.sql:219](../../supabase/migrations/20260430182929_fc286944-8669-46d1-a783-5191bd6127c4.sql#L219); [supabase/migrations/20260502203034_9d9637d7-dba4-488e-825f-2c035e7f4771.sql:27](../../supabase/migrations/20260502203034_9d9637d7-dba4-488e-825f-2c035e7f4771.sql#L27) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminLedgerObservabilidade.tsx:45](../../src/pages/app/admin/AdminLedgerObservabilidade.tsx#L45) | Definição não localizada pelo extrator |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminNOC.tsx:110](../../src/pages/app/admin/AdminNOC.tsx#L110) | Definição não localizada pelo extrator |
| invoke | `noc-ia-auditora` | [src/pages/app/admin/AdminNOC.tsx:229](../../src/pages/app/admin/AdminNOC.tsx#L229) | [supabase/functions/noc-ia-auditora/index.ts](../../supabase/functions/noc-ia-auditora/index.ts) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminObservabilidade.tsx:43](../../src/pages/app/admin/AdminObservabilidade.tsx#L43) | Definição não localizada pelo extrator |
| rpc | `plano_saude_financeira` | [src/pages/app/admin/AdminPlanos.tsx:66](../../src/pages/app/admin/AdminPlanos.tsx#L66) | [supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql:279](../../supabase/migrations/20260430174406_17b4fd11-fead-4514-abd2-2ea2e77db44e.sql#L279) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminProducaoCockpit.tsx:89](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L89) | Definição não localizada pelo extrator |
| invoke | `meta-template-sync` | [src/pages/app/admin/AdminProducaoCockpit.tsx:120](../../src/pages/app/admin/AdminProducaoCockpit.tsx#L120) | [supabase/functions/meta-template-sync/index.ts](../../supabase/functions/meta-template-sync/index.ts) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminRelatorioFinanceiro.tsx:46](../../src/pages/app/admin/AdminRelatorioFinanceiro.tsx#L46) | Definição não localizada pelo extrator |
| rpc | `relatorios_executivo` | [src/pages/app/admin/AdminRelatorios.tsx:69](../../src/pages/app/admin/AdminRelatorios.tsx#L69) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:83](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L83) |
| rpc | `relatorios_clinica` | [src/pages/app/admin/AdminRelatorios.tsx:70](../../src/pages/app/admin/AdminRelatorios.tsx#L70) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:286](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L286) |
| rpc | `relatorios_financeiro` | [src/pages/app/admin/AdminRelatorios.tsx:75](../../src/pages/app/admin/AdminRelatorios.tsx#L75) | [supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql:480](../../supabase/migrations/20260430181308_e289f685-ae06-47d4-ab21-e44b459db70b.sql#L480); [supabase/migrations/20260503142842_9fb8bf1c-94f1-4ee9-bc42-7d56f83622bc.sql:2](../../supabase/migrations/20260503142842_9fb8bf1c-94f1-4ee9-bc42-7d56f83622bc.sql#L2) |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminSaude.tsx:71](../../src/pages/app/admin/AdminSaude.tsx#L71) | Definição não localizada pelo extrator |
| rpc | `(dinâmico)` | [src/pages/app/admin/AdminSessoes.tsx:98](../../src/pages/app/admin/AdminSessoes.tsx#L98) | Definição não localizada pelo extrator |
| rpc | `alterar_status_conta_paciente` | [src/pages/app/admin/AdminUsuarios.tsx:252](../../src/pages/app/admin/AdminUsuarios.tsx#L252) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:203](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L203); [supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql:11](../../supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql#L11) |
| invoke | `admin-criar-paciente` | [src/pages/app/admin/AdminUsuarios.tsx:279](../../src/pages/app/admin/AdminUsuarios.tsx#L279) | [supabase/functions/admin-criar-paciente/index.ts](../../supabase/functions/admin-criar-paciente/index.ts) |
| invoke | `whatsapp-cloud-test` | [src/pages/app/admin/AdminWhatsappCloudTest.tsx:70](../../src/pages/app/admin/AdminWhatsappCloudTest.tsx#L70) | [supabase/functions/whatsapp-cloud-test/index.ts](../../supabase/functions/whatsapp-cloud-test/index.ts) |
| invoke | `integracoes-test` | [src/pages/app/admin/FeegowIntegracao.tsx:133](../../src/pages/app/admin/FeegowIntegracao.tsx#L133) | [supabase/functions/integracoes-test/index.ts](../../supabase/functions/integracoes-test/index.ts) |
| invoke | `feegow-profissionais` | [src/pages/app/admin/FeegowProfissionais.tsx:128](../../src/pages/app/admin/FeegowProfissionais.tsx#L128) | [supabase/functions/feegow-profissionais/index.ts](../../supabase/functions/feegow-profissionais/index.ts) |
| invoke | `feegow-vincular-profissional` | [src/pages/app/admin/FeegowProfissionais.tsx:149](../../src/pages/app/admin/FeegowProfissionais.tsx#L149) | [supabase/functions/feegow-vincular-profissional/index.ts](../../supabase/functions/feegow-vincular-profissional/index.ts) |
| invoke | `feegow-agenda-readonly` | [src/pages/app/admin/FeegowProfissionais.tsx:206](../../src/pages/app/admin/FeegowProfissionais.tsx#L206) | [supabase/functions/feegow-agenda-readonly/index.ts](../../supabase/functions/feegow-agenda-readonly/index.ts) |
| invoke | `whatsapp-test-send` | [src/pages/app/admin/IntegracaoWhatsApp.tsx:216](../../src/pages/app/admin/IntegracaoWhatsApp.tsx#L216) | [supabase/functions/whatsapp-test-send/index.ts](../../supabase/functions/whatsapp-test-send/index.ts) |
| rpc | `(dinâmico)` | [src/pages/app/admin/Permissoes.tsx:38](../../src/pages/app/admin/Permissoes.tsx#L38) | Definição não localizada pelo extrator |
| invoke | `notificar-reembolso` | [src/pages/app/shared/PacientePerfil.tsx:360](../../src/pages/app/shared/PacientePerfil.tsx#L360) | [supabase/functions/notificar-reembolso/index.ts](../../supabase/functions/notificar-reembolso/index.ts) |
| rpc | `alterar_status_conta_paciente` | [src/pages/app/shared/PacientePerfil.tsx:386](../../src/pages/app/shared/PacientePerfil.tsx#L386) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:203](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L203); [supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql:11](../../supabase/migrations/20260502183807_c4db0b97-43bd-4e59-86ba-0109089d48d6.sql#L11) |
