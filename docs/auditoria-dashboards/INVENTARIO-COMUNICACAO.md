# Inventário técnico — comunicacao

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (10)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/comunicacao/dashboard` | [src/pages/app/comunicacao/ComunicacaoDashboard.tsx](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:445](../../src/App.tsx#L445) |
| `/app/comunicacao/inbox` | [src/pages/app/comunicacao/Inbox.tsx](../../src/pages/app/comunicacao/Inbox.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:446](../../src/App.tsx#L446) |
| `/app/comunicacao/conversas` | Redireciona para `/app/comunicacao/inbox` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:447](../../src/App.tsx#L447) |
| `/app/comunicacao/whatsapp` | Redireciona para `/app/admin/integracoes/whatsapp` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:448](../../src/App.tsx#L448) |
| `/app/comunicacao/bot` | [src/pages/app/comunicacao/BotConfig.tsx](../../src/pages/app/comunicacao/BotConfig.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:449](../../src/App.tsx#L449) |
| `/app/comunicacao/ia` | [src/pages/app/comunicacao/IAAvatar.tsx](../../src/pages/app/comunicacao/IAAvatar.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:450](../../src/App.tsx#L450) |
| `/app/comunicacao/templates` | [src/pages/app/comunicacao/Templates.tsx](../../src/pages/app/comunicacao/Templates.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:451](../../src/App.tsx#L451) |
| `/app/comunicacao/automacoes` | [src/pages/app/comunicacao/Automacoes.tsx](../../src/pages/app/comunicacao/Automacoes.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:452](../../src/App.tsx#L452) |
| `/app/comunicacao/metricas` | [src/pages/app/comunicacao/Metricas.tsx](../../src/pages/app/comunicacao/Metricas.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:453](../../src/App.tsx#L453) |
| `/app/comunicacao/configuracoes` | [src/pages/app/comunicacao/InboxConfiguracoes.tsx](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:454](../../src/App.tsx#L454) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### Automacoes.tsx

Fonte: [src/pages/app/comunicacao/Automacoes.tsx](../../src/pages/app/comunicacao/Automacoes.tsx) (162 linhas). Rotas: `/app/comunicacao/automacoes`.

Funções da interface, conforme títulos e descrições: Automações; Eventos do sistema disparam mensagens, transferências ou tarefas..

Funções nomeadas: [src/pages/app/comunicacao/Automacoes.tsx:41](../../src/pages/app/comunicacao/Automacoes.tsx#L41) `Automacoes`; [src/pages/app/comunicacao/Automacoes.tsx:47](../../src/pages/app/comunicacao/Automacoes.tsx#L47) `load`; [src/pages/app/comunicacao/Automacoes.tsx:55](../../src/pages/app/comunicacao/Automacoes.tsx#L55) `salvar`; [src/pages/app/comunicacao/Automacoes.tsx:76](../../src/pages/app/comunicacao/Automacoes.tsx#L76) `remover`; [src/pages/app/comunicacao/Automacoes.tsx:82](../../src/pages/app/comunicacao/Automacoes.tsx#L82) `toggle`.

Dados e integrações diretas: `from(automation_rules)` [src/pages/app/comunicacao/Automacoes.tsx:48](../../src/pages/app/comunicacao/Automacoes.tsx#L48); `from(message_templates)` [src/pages/app/comunicacao/Automacoes.tsx:50](../../src/pages/app/comunicacao/Automacoes.tsx#L50); `from(automation_rules)` [src/pages/app/comunicacao/Automacoes.tsx:68](../../src/pages/app/comunicacao/Automacoes.tsx#L68); `from(automation_rules)` [src/pages/app/comunicacao/Automacoes.tsx:69](../../src/pages/app/comunicacao/Automacoes.tsx#L69); `from(automation_rules)` [src/pages/app/comunicacao/Automacoes.tsx:78](../../src/pages/app/comunicacao/Automacoes.tsx#L78); `from(automation_rules)` [src/pages/app/comunicacao/Automacoes.tsx:83](../../src/pages/app/comunicacao/Automacoes.tsx#L83).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### BotConfig.tsx

Fonte: [src/pages/app/comunicacao/BotConfig.tsx](../../src/pages/app/comunicacao/BotConfig.tsx) (263 linhas). Rotas: `/app/comunicacao/bot`.

Funções da interface, conforme títulos e descrições: Bot; Fluxos automáticos para responder pacientes via WhatsApp..

Funções nomeadas: [src/pages/app/comunicacao/BotConfig.tsx:43](../../src/pages/app/comunicacao/BotConfig.tsx#L43) `BotConfig`; [src/pages/app/comunicacao/BotConfig.tsx:52](../../src/pages/app/comunicacao/BotConfig.tsx#L52) `loadFlows`; [src/pages/app/comunicacao/BotConfig.tsx:56](../../src/pages/app/comunicacao/BotConfig.tsx#L56) `loadSteps`; [src/pages/app/comunicacao/BotConfig.tsx:64](../../src/pages/app/comunicacao/BotConfig.tsx#L64) `salvarFlow`; [src/pages/app/comunicacao/BotConfig.tsx:82](../../src/pages/app/comunicacao/BotConfig.tsx#L82) `duplicarFlow`; [src/pages/app/comunicacao/BotConfig.tsx:99](../../src/pages/app/comunicacao/BotConfig.tsx#L99) `removerFlow`; [src/pages/app/comunicacao/BotConfig.tsx:106](../../src/pages/app/comunicacao/BotConfig.tsx#L106) `salvarStep`; [src/pages/app/comunicacao/BotConfig.tsx:124](../../src/pages/app/comunicacao/BotConfig.tsx#L124) `removerStep`.

Dados e integrações diretas: `from(bot_flows)` [src/pages/app/comunicacao/BotConfig.tsx:53](../../src/pages/app/comunicacao/BotConfig.tsx#L53); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:57](../../src/pages/app/comunicacao/BotConfig.tsx#L57); `from(bot_flows)` [src/pages/app/comunicacao/BotConfig.tsx:74](../../src/pages/app/comunicacao/BotConfig.tsx#L74); `from(bot_flows)` [src/pages/app/comunicacao/BotConfig.tsx:75](../../src/pages/app/comunicacao/BotConfig.tsx#L75); `from(bot_flows)` [src/pages/app/comunicacao/BotConfig.tsx:83](../../src/pages/app/comunicacao/BotConfig.tsx#L83); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:88](../../src/pages/app/comunicacao/BotConfig.tsx#L88); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:90](../../src/pages/app/comunicacao/BotConfig.tsx#L90); `from(bot_flows)` [src/pages/app/comunicacao/BotConfig.tsx:101](../../src/pages/app/comunicacao/BotConfig.tsx#L101); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:117](../../src/pages/app/comunicacao/BotConfig.tsx#L117); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:118](../../src/pages/app/comunicacao/BotConfig.tsx#L118); `from(bot_steps)` [src/pages/app/comunicacao/BotConfig.tsx:125](../../src/pages/app/comunicacao/BotConfig.tsx#L125).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/comunicacao/BotConfig.tsx:100](../../src/pages/app/comunicacao/BotConfig.tsx#L100): if (!confirm("Remover fluxo e todos seus passos?")) return;
- [src/pages/app/comunicacao/BotConfig.tsx:236](../../src/pages/app/comunicacao/BotConfig.tsx#L236): <Button variant="outline" size="sm" disabled><Play className="mr-2 h-3 w-3" />Simular conversa (em breve)</Button>

### ComunicacaoDashboard.tsx

Fonte: [src/pages/app/comunicacao/ComunicacaoDashboard.tsx](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx) (116 linhas). Rotas: `/app/comunicacao/dashboard`.

Funções da interface, conforme títulos e descrições: Central de Comunicação; Visão consolidada de WhatsApp, bot e atendimento..

Funções nomeadas: [src/pages/app/comunicacao/ComunicacaoDashboard.tsx:14](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx#L14) `ComunicacaoDashboard`; [src/pages/app/comunicacao/ComunicacaoDashboard.tsx:20](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx#L20) `load`.

Dados e integrações diretas: `from(conversations)` [src/pages/app/comunicacao/ComunicacaoDashboard.tsx:22](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx#L22); `from(whatsapp_instances)` [src/pages/app/comunicacao/ComunicacaoDashboard.tsx:31](../../src/pages/app/comunicacao/ComunicacaoDashboard.tsx#L31).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts).

### Conversas.tsx

Fonte: [src/pages/app/comunicacao/Conversas.tsx](../../src/pages/app/comunicacao/Conversas.tsx) (10 linhas). Sem rota direta neste grupo.

Funções nomeadas: [src/pages/app/comunicacao/Conversas.tsx:7](../../src/pages/app/comunicacao/Conversas.tsx#L7) `Conversas`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: nenhuma.

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/comunicacao/Conversas.tsx:4](../../src/pages/app/comunicacao/Conversas.tsx#L4): * Conversas — componente legado (era mock de WhatsApp).

### IAAvatar.tsx

Fonte: [src/pages/app/comunicacao/IAAvatar.tsx](../../src/pages/app/comunicacao/IAAvatar.tsx) (649 linhas). Rotas: `/app/comunicacao/ia`.

Funções da interface, conforme títulos e descrições: IA Avatar; Atendente virtual inteligente. Configure prompt, transferência, segurança, modos operacionais e supervisão..

Funções nomeadas: [src/pages/app/comunicacao/IAAvatar.tsx:77](../../src/pages/app/comunicacao/IAAvatar.tsx#L77) `IAAvatar`; [src/pages/app/comunicacao/IAAvatar.tsx:129](../../src/pages/app/comunicacao/IAAvatar.tsx#L129) `salvar`; [src/pages/app/comunicacao/IAAvatar.tsx:163](../../src/pages/app/comunicacao/IAAvatar.tsx#L163) `salvarRegra`; [src/pages/app/comunicacao/IAAvatar.tsx:184](../../src/pages/app/comunicacao/IAAvatar.tsx#L184) `removerRegra`; [src/pages/app/comunicacao/IAAvatar.tsx:192](../../src/pages/app/comunicacao/IAAvatar.tsx#L192) `simular`; [src/pages/app/comunicacao/IAAvatar.tsx:209](../../src/pages/app/comunicacao/IAAvatar.tsx#L209) `openNewRule`; [src/pages/app/comunicacao/IAAvatar.tsx:561](../../src/pages/app/comunicacao/IAAvatar.tsx#L561) `OperacaoTab`.

Dados e integrações diretas: `from(ai_settings)` [src/pages/app/comunicacao/IAAvatar.tsx:94](../../src/pages/app/comunicacao/IAAvatar.tsx#L94); `from(ai_handoff_rules)` [src/pages/app/comunicacao/IAAvatar.tsx:117](../../src/pages/app/comunicacao/IAAvatar.tsx#L117); `from(ai_settings)` [src/pages/app/comunicacao/IAAvatar.tsx:154](../../src/pages/app/comunicacao/IAAvatar.tsx#L154); `from(ai_settings)` [src/pages/app/comunicacao/IAAvatar.tsx:155](../../src/pages/app/comunicacao/IAAvatar.tsx#L155); `from(ai_handoff_rules)` [src/pages/app/comunicacao/IAAvatar.tsx:175](../../src/pages/app/comunicacao/IAAvatar.tsx#L175); `from(ai_handoff_rules)` [src/pages/app/comunicacao/IAAvatar.tsx:176](../../src/pages/app/comunicacao/IAAvatar.tsx#L176); `from(ai_handoff_rules)` [src/pages/app/comunicacao/IAAvatar.tsx:185](../../src/pages/app/comunicacao/IAAvatar.tsx#L185); `invoke(ai-respond)` [src/pages/app/comunicacao/IAAvatar.tsx:197](../../src/pages/app/comunicacao/IAAvatar.tsx#L197).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/comunicacao/avatar/AiAvatarSupervisorDashboard.tsx](../../src/components/comunicacao/avatar/AiAvatarSupervisorDashboard.tsx).

### Inbox.tsx

Fonte: [src/pages/app/comunicacao/Inbox.tsx](../../src/pages/app/comunicacao/Inbox.tsx) (1376 linhas). Rotas: `/app/comunicacao/inbox`.

Funções da interface, conforme títulos e descrições: Forçar liberação (admin).

Funções nomeadas: [src/pages/app/comunicacao/Inbox.tsx:123](../../src/pages/app/comunicacao/Inbox.tsx#L123) `registrarAuditoria`; [src/pages/app/comunicacao/Inbox.tsx:140](../../src/pages/app/comunicacao/Inbox.tsx#L140) `isConvDentroJanela`; [src/pages/app/comunicacao/Inbox.tsx:152](../../src/pages/app/comunicacao/Inbox.tsx#L152) `ComunicacaoInbox`; [src/pages/app/comunicacao/Inbox.tsx:293](../../src/pages/app/comunicacao/Inbox.tsx#L293) `loadMsgs`; [src/pages/app/comunicacao/Inbox.tsx:306](../../src/pages/app/comunicacao/Inbox.tsx#L306) `loadTemplates`; [src/pages/app/comunicacao/Inbox.tsx:317](../../src/pages/app/comunicacao/Inbox.tsx#L317) `loadDetailData`; [src/pages/app/comunicacao/Inbox.tsx:425](../../src/pages/app/comunicacao/Inbox.tsx#L425) `check`; [src/pages/app/comunicacao/Inbox.tsx:514](../../src/pages/app/comunicacao/Inbox.tsx#L514) `enviar`; [src/pages/app/comunicacao/Inbox.tsx:609](../../src/pages/app/comunicacao/Inbox.tsx#L609) `aplicarTemplate`; [src/pages/app/comunicacao/Inbox.tsx:613](../../src/pages/app/comunicacao/Inbox.tsx#L613) `assumir`; [src/pages/app/comunicacao/Inbox.tsx:628](../../src/pages/app/comunicacao/Inbox.tsx#L628) `resolver`; [src/pages/app/comunicacao/Inbox.tsx:636](../../src/pages/app/comunicacao/Inbox.tsx#L636) `liberar`; [src/pages/app/comunicacao/Inbox.tsx:644](../../src/pages/app/comunicacao/Inbox.tsx#L644) `fechar`; [src/pages/app/comunicacao/Inbox.tsx:660](../../src/pages/app/comunicacao/Inbox.tsx#L660) `toggleBot`; [src/pages/app/comunicacao/Inbox.tsx:667](../../src/pages/app/comunicacao/Inbox.tsx#L667) `toggleAI`; [src/pages/app/comunicacao/Inbox.tsx:675](../../src/pages/app/comunicacao/Inbox.tsx#L675) `concederAcessoTemporario`; [src/pages/app/comunicacao/Inbox.tsx:701](../../src/pages/app/comunicacao/Inbox.tsx#L701) `getAtendimentoBadge`.

Dados e integrações diretas: `from(comunicacao_auditoria)` [src/pages/app/comunicacao/Inbox.tsx:130](../../src/pages/app/comunicacao/Inbox.tsx#L130); `from(medicos)` [src/pages/app/comunicacao/Inbox.tsx:209](../../src/pages/app/comunicacao/Inbox.tsx#L209); `from(app_settings)` [src/pages/app/comunicacao/Inbox.tsx:225](../../src/pages/app/comunicacao/Inbox.tsx#L225); `from(consultas)` [src/pages/app/comunicacao/Inbox.tsx:249](../../src/pages/app/comunicacao/Inbox.tsx#L249); `from(conversations)` [src/pages/app/comunicacao/Inbox.tsx:262](../../src/pages/app/comunicacao/Inbox.tsx#L262); `from(messages)` [src/pages/app/comunicacao/Inbox.tsx:295](../../src/pages/app/comunicacao/Inbox.tsx#L295); `from(conversations)` [src/pages/app/comunicacao/Inbox.tsx:303](../../src/pages/app/comunicacao/Inbox.tsx#L303); `from(message_templates)` [src/pages/app/comunicacao/Inbox.tsx:308](../../src/pages/app/comunicacao/Inbox.tsx#L308); `from(profiles)` [src/pages/app/comunicacao/Inbox.tsx:324](../../src/pages/app/comunicacao/Inbox.tsx#L324); `from(profiles)` [src/pages/app/comunicacao/Inbox.tsx:336](../../src/pages/app/comunicacao/Inbox.tsx#L336); `from(medicos)` [src/pages/app/comunicacao/Inbox.tsx:346](../../src/pages/app/comunicacao/Inbox.tsx#L346); `from(consultas)` [src/pages/app/comunicacao/Inbox.tsx:355](../../src/pages/app/comunicacao/Inbox.tsx#L355); `from(pacientes)` [src/pages/app/comunicacao/Inbox.tsx:382](../../src/pages/app/comunicacao/Inbox.tsx#L382); `rpc(get_meta_window_state)` [src/pages/app/comunicacao/Inbox.tsx:426](../../src/pages/app/comunicacao/Inbox.tsx#L426); `channel(inbox-realtime)` [src/pages/app/comunicacao/Inbox.tsx:441](../../src/pages/app/comunicacao/Inbox.tsx#L441); `invoke(observabilidade-ingest)` [src/pages/app/comunicacao/Inbox.tsx:535](../../src/pages/app/comunicacao/Inbox.tsx#L535); `invoke(whatsapp-enviar)` [src/pages/app/comunicacao/Inbox.tsx:550](../../src/pages/app/comunicacao/Inbox.tsx#L550); `invoke(observabilidade-ingest)` [src/pages/app/comunicacao/Inbox.tsx:568](../../src/pages/app/comunicacao/Inbox.tsx#L568); `from(messages)` [src/pages/app/comunicacao/Inbox.tsx:597](../../src/pages/app/comunicacao/Inbox.tsx#L597); `rpc((dinâmico))` [src/pages/app/comunicacao/Inbox.tsx:615](../../src/pages/app/comunicacao/Inbox.tsx#L615); `rpc((dinâmico))` [src/pages/app/comunicacao/Inbox.tsx:630](../../src/pages/app/comunicacao/Inbox.tsx#L630); `rpc(liberar_conversa)` [src/pages/app/comunicacao/Inbox.tsx:638](../../src/pages/app/comunicacao/Inbox.tsx#L638); `from(conversations)` [src/pages/app/comunicacao/Inbox.tsx:646](../../src/pages/app/comunicacao/Inbox.tsx#L646); `from(conversations)` [src/pages/app/comunicacao/Inbox.tsx:663](../../src/pages/app/comunicacao/Inbox.tsx#L663); `from(conversations)` [src/pages/app/comunicacao/Inbox.tsx:670](../../src/pages/app/comunicacao/Inbox.tsx#L670); `from(inbox_acesso_temporario)` [src/pages/app/comunicacao/Inbox.tsx:680](../../src/pages/app/comunicacao/Inbox.tsx#L680).

Operações diretas detectadas: insert, update, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/permissions/usePermission.ts](../../src/lib/permissions/usePermission.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/components/comunicacao/LockBadge.tsx](../../src/components/comunicacao/LockBadge.tsx); [src/components/comunicacao/TransferirConversaDialog.tsx](../../src/components/comunicacao/TransferirConversaDialog.tsx); [src/components/comunicacao/Janela24hMeta.tsx](../../src/components/comunicacao/Janela24hMeta.tsx); [src/components/comunicacao/PacientesVinculadosPanel.tsx](../../src/components/comunicacao/PacientesVinculadosPanel.tsx); [src/components/comunicacao/LGPDGate.tsx](../../src/components/comunicacao/LGPDGate.tsx); [src/components/comunicacao/AuditLogDrawer.tsx](../../src/components/comunicacao/AuditLogDrawer.tsx); [src/components/comunicacao/EnviarTemplateDialog.tsx](../../src/components/comunicacao/EnviarTemplateDialog.tsx); [src/components/comunicacao/JanelaExpiradaBanner.tsx](../../src/components/comunicacao/JanelaExpiradaBanner.tsx); [src/components/comunicacao/JanelaAtivaIndicator.tsx](../../src/components/comunicacao/JanelaAtivaIndicator.tsx); [src/components/comunicacao/ConversationSlaBadge.tsx](../../src/components/comunicacao/ConversationSlaBadge.tsx); [src/components/comunicacao/AttendantPresenceBadge.tsx](../../src/components/comunicacao/AttendantPresenceBadge.tsx); [src/components/comunicacao/ConversationQueuePanel.tsx](../../src/components/comunicacao/ConversationQueuePanel.tsx); [src/components/comunicacao/StatusOperacionalSelect.tsx](../../src/components/comunicacao/StatusOperacionalSelect.tsx); [src/components/comunicacao/TypingIndicator.tsx](../../src/components/comunicacao/TypingIndicator.tsx); [src/hooks/useAttendantPresence.ts](../../src/hooks/useAttendantPresence.ts); [src/hooks/useConversationTyping.ts](../../src/hooks/useConversationTyping.ts); [src/components/comunicacao/NovaConversaDialog.tsx](../../src/components/comunicacao/NovaConversaDialog.tsx); [src/components/comunicacao/SandboxBanner.tsx](../../src/components/comunicacao/SandboxBanner.tsx); [src/lib/comunicacao/openOrCreateConversation.ts](../../src/lib/comunicacao/openOrCreateConversation.ts); [src/components/comunicacao/avatar/ConversationAvatarPanel.tsx](../../src/components/comunicacao/avatar/ConversationAvatarPanel.tsx); [src/components/comunicacao/avatar/AiAvatarMemoryDrawer.tsx](../../src/components/comunicacao/avatar/AiAvatarMemoryDrawer.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/comunicacao/Inbox.tsx:166](../../src/pages/app/comunicacao/Inbox.tsx#L166): const [filtroStatus, setFiltroStatus] = useState<string>("todos");
- [src/pages/app/comunicacao/Inbox.tsx:168](../../src/pages/app/comunicacao/Inbox.tsx#L168): const [filtroTipo, setFiltroTipo] = useState<string>("todos");
- [src/pages/app/comunicacao/Inbox.tsx:169](../../src/pages/app/comunicacao/Inbox.tsx#L169): const [filtroSla, setFiltroSla] = useState<string>("todos"); // todos \| vencido
- [src/pages/app/comunicacao/Inbox.tsx:479](../../src/pages/app/comunicacao/Inbox.tsx#L479): } else if (filtroStatus !== "todos") {
- [src/pages/app/comunicacao/Inbox.tsx:679](../../src/pages/app/comunicacao/Inbox.tsx#L679): // TODO: inbox_acesso_temporario table pending migration
- [src/pages/app/comunicacao/Inbox.tsx:756](../../src/pages/app/comunicacao/Inbox.tsx#L756): <SelectItem value="todos">Status</SelectItem>
- [src/pages/app/comunicacao/Inbox.tsx:776](../../src/pages/app/comunicacao/Inbox.tsx#L776): <SelectItem value="todos">Tipo</SelectItem>
- [src/pages/app/comunicacao/Inbox.tsx:787](../../src/pages/app/comunicacao/Inbox.tsx#L787): <SelectItem value="todos">SLA</SelectItem>

### InboxConfiguracoes.tsx

Fonte: [src/pages/app/comunicacao/InboxConfiguracoes.tsx](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx) (167 linhas). Rotas: `/app/comunicacao/configuracoes`.

Funções da interface, conforme títulos e descrições: Configurações do Inbox; Regras de transferência automática, janela de acesso médico e permissões..

Funções nomeadas: [src/pages/app/comunicacao/InboxConfiguracoes.tsx:18](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx#L18) `InboxConfiguracoes`; [src/pages/app/comunicacao/InboxConfiguracoes.tsx:27](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx#L27) `load`; [src/pages/app/comunicacao/InboxConfiguracoes.tsx:49](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx#L49) `salvar`.

Dados e integrações diretas: `from(app_settings)` [src/pages/app/comunicacao/InboxConfiguracoes.tsx:29](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx#L29); `from(app_settings)` [src/pages/app/comunicacao/InboxConfiguracoes.tsx:57](../../src/pages/app/comunicacao/InboxConfiguracoes.tsx#L57).

Operações diretas detectadas: upsert.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### Metricas.tsx

Fonte: [src/pages/app/comunicacao/Metricas.tsx](../../src/pages/app/comunicacao/Metricas.tsx) (65 linhas). Rotas: `/app/comunicacao/metricas`.

Funções da interface, conforme títulos e descrições: Métricas de Comunicação; Indicadores operacionais do módulo..

Funções nomeadas: [src/pages/app/comunicacao/Metricas.tsx:6](../../src/pages/app/comunicacao/Metricas.tsx#L6) `Metricas`.

Dados e integrações diretas: `from(conversations)` [src/pages/app/comunicacao/Metricas.tsx:15](../../src/pages/app/comunicacao/Metricas.tsx#L15); `from(messages)` [src/pages/app/comunicacao/Metricas.tsx:16](../../src/pages/app/comunicacao/Metricas.tsx#L16); `from(automation_logs)` [src/pages/app/comunicacao/Metricas.tsx:17](../../src/pages/app/comunicacao/Metricas.tsx#L17); `from(automation_logs)` [src/pages/app/comunicacao/Metricas.tsx:18](../../src/pages/app/comunicacao/Metricas.tsx#L18).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/comunicacao/Metricas.tsx:54](../../src/pages/app/comunicacao/Metricas.tsx#L54): <CardHeader><CardTitle className="text-sm">Em breve</CardTitle></CardHeader>

### Templates.tsx

Fonte: [src/pages/app/comunicacao/Templates.tsx](../../src/pages/app/comunicacao/Templates.tsx) (160 linhas). Rotas: `/app/comunicacao/templates`.

Funções da interface, conforme títulos e descrições: Templates; Mensagens reaproveitáveis para WhatsApp e automações..

Funções nomeadas: [src/pages/app/comunicacao/Templates.tsx:32](../../src/pages/app/comunicacao/Templates.tsx#L32) `Templates`; [src/pages/app/comunicacao/Templates.tsx:37](../../src/pages/app/comunicacao/Templates.tsx#L37) `load`; [src/pages/app/comunicacao/Templates.tsx:43](../../src/pages/app/comunicacao/Templates.tsx#L43) `novo`; [src/pages/app/comunicacao/Templates.tsx:47](../../src/pages/app/comunicacao/Templates.tsx#L47) `editar`; [src/pages/app/comunicacao/Templates.tsx:49](../../src/pages/app/comunicacao/Templates.tsx#L49) `salvar`; [src/pages/app/comunicacao/Templates.tsx:69](../../src/pages/app/comunicacao/Templates.tsx#L69) `remover`.

Dados e integrações diretas: `from(message_templates)` [src/pages/app/comunicacao/Templates.tsx:38](../../src/pages/app/comunicacao/Templates.tsx#L38); `from(message_templates)` [src/pages/app/comunicacao/Templates.tsx:61](../../src/pages/app/comunicacao/Templates.tsx#L61); `from(message_templates)` [src/pages/app/comunicacao/Templates.tsx:62](../../src/pages/app/comunicacao/Templates.tsx#L62); `from(message_templates)` [src/pages/app/comunicacao/Templates.tsx:71](../../src/pages/app/comunicacao/Templates.tsx#L71).

Operações diretas detectadas: update, insert, delete.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| rpc | `(dinâmico)` | [src/components/comunicacao/ConversationQueuePanel.tsx:39](../../src/components/comunicacao/ConversationQueuePanel.tsx#L39) | Definição não localizada pelo extrator |
| invoke | `whatsapp-template-send` | [src/components/comunicacao/EnviarTemplateDialog.tsx:82](../../src/components/comunicacao/EnviarTemplateDialog.tsx#L82) | [supabase/functions/whatsapp-template-send/index.ts](../../supabase/functions/whatsapp-template-send/index.ts) |
| rpc | `confirmar_vinculo_paciente` | [src/components/comunicacao/PacientesVinculadosPanel.tsx:87](../../src/components/comunicacao/PacientesVinculadosPanel.tsx#L87) | [supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql:255](../../supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql#L255) |
| rpc | `definir_paciente_ativo_conversa` | [src/components/comunicacao/PacientesVinculadosPanel.tsx:101](../../src/components/comunicacao/PacientesVinculadosPanel.tsx#L101) | [supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql:274](../../supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql#L274) |
| rpc | `(dinâmico)` | [src/components/comunicacao/StatusOperacionalSelect.tsx:22](../../src/components/comunicacao/StatusOperacionalSelect.tsx#L22) | Definição não localizada pelo extrator |
| rpc | `transferir_conversa` | [src/components/comunicacao/TransferirConversaDialog.tsx:52](../../src/components/comunicacao/TransferirConversaDialog.tsx#L52) | [supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql:205](../../supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql#L205) |
| rpc | `vincular_paciente_conversa` | [src/components/comunicacao/VincularPacienteDialog.tsx:79](../../src/components/comunicacao/VincularPacienteDialog.tsx#L79) | [supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql:231](../../supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql#L231) |
| rpc | `ai_avatar_kill_switch` | [src/components/comunicacao/avatar/AiAvatarSupervisorDashboard.tsx:82](../../src/components/comunicacao/avatar/AiAvatarSupervisorDashboard.tsx#L82) | [supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql:236](../../supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql#L236) |
| rpc | `ai_avatar_pausar_conversa` | [src/components/comunicacao/avatar/ConversationAvatarPanel.tsx:114](../../src/components/comunicacao/avatar/ConversationAvatarPanel.tsx#L114) | [supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql:252](../../supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql#L252) |
| rpc | `ai_avatar_assumir_conversa` | [src/components/comunicacao/avatar/ConversationAvatarPanel.tsx:154](../../src/components/comunicacao/avatar/ConversationAvatarPanel.tsx#L154) | [supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql:274](../../supabase/migrations/20260508170340_fdb45bc8-499b-4ee5-a987-ef6496e0294a.sql#L274) |
| rpc | `(dinâmico)` | [src/hooks/useAttendantPresence.ts:8](../../src/hooks/useAttendantPresence.ts#L8) | Definição não localizada pelo extrator |
| rpc | `(dinâmico)` | [src/hooks/useConversationTyping.ts:13](../../src/hooks/useConversationTyping.ts#L13) | Definição não localizada pelo extrator |
| rpc | `has_permissions_batch` | [src/lib/permissions/usePermission.ts:63](../../src/lib/permissions/usePermission.ts#L63) | [supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql:3](../../supabase/migrations/20260501132607_9525df7e-109f-49ef-a3a4-5fa46599ec65.sql#L3) |
| rpc | `has_permission` | [src/lib/permissions/usePermission.ts:75](../../src/lib/permissions/usePermission.ts#L75) | [supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql:127](../../supabase/migrations/20260430160256_c3b8c24b-c638-4a84-b400-b6c676a54aa1.sql#L127); [supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql:126](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql#L126); [supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql:75](../../supabase/migrations/20260430184156_31372de7-12dd-4bc2-a17b-a3009a7e1067.sql#L75) |
| invoke | `ai-respond` | [src/pages/app/comunicacao/IAAvatar.tsx:197](../../src/pages/app/comunicacao/IAAvatar.tsx#L197) | [supabase/functions/ai-respond/index.ts](../../supabase/functions/ai-respond/index.ts) |
| rpc | `get_meta_window_state` | [src/pages/app/comunicacao/Inbox.tsx:426](../../src/pages/app/comunicacao/Inbox.tsx#L426) | [supabase/migrations/20260508162856_9b1d0f35-e7e6-4a33-81a8-bb3d7986a5cc.sql:40](../../supabase/migrations/20260508162856_9b1d0f35-e7e6-4a33-81a8-bb3d7986a5cc.sql#L40) |
| invoke | `observabilidade-ingest` | [src/pages/app/comunicacao/Inbox.tsx:535](../../src/pages/app/comunicacao/Inbox.tsx#L535) | [supabase/functions/observabilidade-ingest/index.ts](../../supabase/functions/observabilidade-ingest/index.ts) |
| invoke | `whatsapp-enviar` | [src/pages/app/comunicacao/Inbox.tsx:550](../../src/pages/app/comunicacao/Inbox.tsx#L550) | [supabase/functions/whatsapp-enviar/index.ts](../../supabase/functions/whatsapp-enviar/index.ts) |
| rpc | `(dinâmico)` | [src/pages/app/comunicacao/Inbox.tsx:615](../../src/pages/app/comunicacao/Inbox.tsx#L615) | Definição não localizada pelo extrator |
| rpc | `liberar_conversa` | [src/pages/app/comunicacao/Inbox.tsx:638](../../src/pages/app/comunicacao/Inbox.tsx#L638) | [supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql:190](../../supabase/migrations/20260508150832_bb974735-fee8-4bb7-b023-5eea519ddc7b.sql#L190) |
