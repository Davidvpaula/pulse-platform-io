# Inventário técnico — paciente

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (18)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/paciente/dashboard` | [src/pages/app/paciente/PacienteDashboard.tsx](../../src/pages/app/paciente/PacienteDashboard.tsx) | PacienteGuard | [src/App.tsx:244](../../src/App.tsx#L244) |
| `/app/paciente/agendamentos` | [src/pages/app/paciente/PacienteAgendamentos.tsx](../../src/pages/app/paciente/PacienteAgendamentos.tsx) | PacienteGuard | [src/App.tsx:245](../../src/App.tsx#L245) |
| `/app/paciente/documentos` | [src/pages/app/paciente/PacienteDocumentos.tsx](../../src/pages/app/paciente/PacienteDocumentos.tsx) | PacienteGuard | [src/App.tsx:246](../../src/App.tsx#L246) |
| `/app/paciente/plano` | [src/pages/app/paciente/PacientePlano.tsx](../../src/pages/app/paciente/PacientePlano.tsx) | PacienteGuard | [src/App.tsx:247](../../src/App.tsx#L247) |
| `/app/paciente/montar-plano` | [src/pages/app/paciente/PacienteMontarPlano.tsx](../../src/pages/app/paciente/PacienteMontarPlano.tsx) | PacienteGuard | [src/App.tsx:248](../../src/App.tsx#L248) |
| `/app/paciente/plano-checkout-retorno` | [src/pages/app/paciente/PlanoCheckoutRetorno.tsx](../../src/pages/app/paciente/PlanoCheckoutRetorno.tsx) | PacienteGuard | [src/App.tsx:249](../../src/App.tsx#L249) |
| `/app/paciente/assinar-plano/:planoId` | [src/pages/app/paciente/PacienteAssinarPlano.tsx](../../src/pages/app/paciente/PacienteAssinarPlano.tsx) | PacienteGuard | [src/App.tsx:250](../../src/App.tsx#L250) |
| `/app/paciente/financeiro` | [src/pages/app/paciente/PacienteFinanceiro.tsx](../../src/pages/app/paciente/PacienteFinanceiro.tsx) | PacienteGuard | [src/App.tsx:251](../../src/App.tsx#L251) |
| `/app/paciente/perfil` | [src/pages/app/paciente/PacientePerfilPage.tsx](../../src/pages/app/paciente/PacientePerfilPage.tsx) | PacienteGuard | [src/App.tsx:252](../../src/App.tsx#L252) |
| `/app/paciente/mensagens` | Redireciona para `/app/paciente/notificacoes` | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:253](../../src/App.tsx#L253) |
| `/app/paciente/notificacoes` | [src/pages/app/paciente/PacienteNotificacoes.tsx](../../src/pages/app/paciente/PacienteNotificacoes.tsx) | PacienteGuard | [src/App.tsx:254](../../src/App.tsx#L254) |
| `/app/paciente/dependentes` | [src/pages/app/paciente/PacienteDependentes.tsx](../../src/pages/app/paciente/PacienteDependentes.tsx) | PacienteGuard | [src/App.tsx:255](../../src/App.tsx#L255) |
| `/app/paciente/checkout/:sessionId` | [src/pages/app/paciente/PacienteCheckout.tsx](../../src/pages/app/paciente/PacienteCheckout.tsx) | PacienteGuard + PacienteParamGuard | [src/App.tsx:256](../../src/App.tsx#L256) |
| `/app/paciente/pagamento/sucesso` | [src/pages/app/paciente/PacientePagamentoSucesso.tsx](../../src/pages/app/paciente/PacientePagamentoSucesso.tsx) | PacienteGuard | [src/App.tsx:266](../../src/App.tsx#L266) |
| `/app/paciente/pagamento/cancelado` | [src/pages/app/paciente/PacientePagamentoCancelado.tsx](../../src/pages/app/paciente/PacientePagamentoCancelado.tsx) | PacienteGuard | [src/App.tsx:267](../../src/App.tsx#L267) |
| `/app/paciente/agendar/confirmar/:slotId` | AgendamentoRedirect | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:269](../../src/App.tsx#L269) |
| `/app/agendamento/confirmar/:slotId` | [src/pages/app/agendamento/AgendamentoConfirmar.tsx](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx) | PacienteParamGuard | [src/App.tsx:275](../../src/App.tsx#L275) |
| `/app/paciente/*` | [src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx](../../src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx) | Somente sessão no layout /app; verificar controles internos | [src/App.tsx:284](../../src/App.tsx#L284) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### AgendamentoConfirmar.tsx

Fonte: [src/pages/app/agendamento/AgendamentoConfirmar.tsx](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx) (587 linhas). Rotas: `/app/agendamento/confirmar/:slotId`.

Funções da interface, conforme títulos e descrições: Horário indisponível; Este horário não está mais disponível para reserva.; Confirmar dados e agendar; Preencha seus dados para reservar o horário. A reserva fica garantida por 15 minutos para você concluir o pagamento..

Funções nomeadas: [src/pages/app/agendamento/AgendamentoConfirmar.tsx:56](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L56) `onlyDigits`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:74](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L74) `maskFone`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:79](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L79) `maskCEP`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:80](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L80) `formatBRL`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:83](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L83) `carregarSlotInfo`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:180](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L180) `AgendamentoConfirmar`; [src/pages/app/agendamento/AgendamentoConfirmar.tsx:352](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L352) `onSubmit`.

Dados e integrações diretas: `from(agenda_slots)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:85](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L85); `from(medicos)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:93](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L93); `from(medico_especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:103](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L103); `from(medico_especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:113](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L113); `from(especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:124](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L124); `from(servicos_financeiros)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:128](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L128); `from(consultas)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:144](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L144); `from(especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:146](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L146); `from(medico_especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:151](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L151); `from(especialidades)` [src/pages/app/agendamento/AgendamentoConfirmar.tsx:161](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L161).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts); [src/lib/termos.ts](../../src/lib/termos.ts); [src/lib/sanitize.ts](../../src/lib/sanitize.ts); [src/lib/analytics/tracker.ts](../../src/lib/analytics/tracker.ts); [src/components/paciente/SeletorPacienteAtendido.tsx](../../src/components/paciente/SeletorPacienteAtendido.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/agendamento/AgendamentoConfirmar.tsx:354](../../src/pages/app/agendamento/AgendamentoConfirmar.tsx#L354): toast.error("Você precisa aceitar todos os termos para continuar.");

### PacienteAgendamentos.tsx

Fonte: [src/pages/app/paciente/PacienteAgendamentos.tsx](../../src/pages/app/paciente/PacienteAgendamentos.tsx) (393 linhas). Rotas: `/app/paciente/agendamentos`.

Funções da interface, conforme títulos e descrições: Meus agendamentos; Histórico completo de consultas, com ações rápidas para entrar, remarcar ou cancelar..

Funções nomeadas: [src/pages/app/paciente/PacienteAgendamentos.tsx:40](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L40) `PacienteAgendamentos`; [src/pages/app/paciente/PacienteAgendamentos.tsx:99](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L99) `confirmarCancelamento`; [src/pages/app/paciente/PacienteAgendamentos.tsx:360](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L360) `EmptyState`.

Dados e integrações diretas: `invoke(audit-log)` [src/pages/app/paciente/PacienteAgendamentos.tsx:111](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L111).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/components/FloatingWhatsApp.tsx](../../src/components/FloatingWhatsApp.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/paciente/AgendarRetornoDialog.tsx](../../src/components/paciente/AgendarRetornoDialog.tsx); [src/components/paciente/AvaliarMedicoDialog.tsx](../../src/components/paciente/AvaliarMedicoDialog.tsx); [src/components/paciente/MeusProfissionaisPlano.tsx](../../src/components/paciente/MeusProfissionaisPlano.tsx); [src/components/paciente/CancelarConsultaDialog.tsx](../../src/components/paciente/CancelarConsultaDialog.tsx); [src/lib/paciente/queries.ts](../../src/lib/paciente/queries.ts); [src/components/paciente/PacienteStates.tsx](../../src/components/paciente/PacienteStates.tsx); [src/components/paciente/EntrarTeleconsulta.tsx](../../src/components/paciente/EntrarTeleconsulta.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteAgendamentos.tsx:202](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L202): <SelectItem value="todas">Todos pacientes</SelectItem>

### PacienteAgendarConfirmar.tsx

Fonte: [src/pages/app/paciente/PacienteAgendarConfirmar.tsx](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx) (416 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: Horário indisponível; Este horário não está mais disponível para reserva.; Confirmar dados e agendar; Preencha seus dados para reservar o horário. A reserva fica garantida por 15 minutos para você concluir o pagamento..

Funções nomeadas: [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:35](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L35) `onlyDigits`; [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:69](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L69) `maskFone`; [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:75](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L75) `maskCEP`; [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:78](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L78) `formatBRL`; [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:83](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L83) `PacienteAgendarConfirmar`; [src/pages/app/paciente/PacienteAgendarConfirmar.tsx:189](../../src/pages/app/paciente/PacienteAgendarConfirmar.tsx#L189) `onSubmit`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx); [src/lib/analytics/tracker.ts](../../src/lib/analytics/tracker.ts).

### PacienteAssinarPlano.tsx

Fonte: [src/pages/app/paciente/PacienteAssinarPlano.tsx](../../src/pages/app/paciente/PacienteAssinarPlano.tsx) (240 linhas). Rotas: `/app/paciente/assinar-plano/:planoId`.

Funções da interface, conforme títulos e descrições: Assinar Plano.

Funções nomeadas: [src/pages/app/paciente/PacienteAssinarPlano.tsx:27](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L27) `PacienteAssinarPlano`.

Dados e integrações diretas: `from(planos)` [src/pages/app/paciente/PacienteAssinarPlano.tsx:44](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L44); `from(plano_beneficios)` [src/pages/app/paciente/PacienteAssinarPlano.tsx:59](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L59); `from(pacientes)` [src/pages/app/paciente/PacienteAssinarPlano.tsx:71](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L71); `from(assinaturas)` [src/pages/app/paciente/PacienteAssinarPlano.tsx:78](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L78); `invoke(criar-checkout-plano)` [src/pages/app/paciente/PacienteAssinarPlano.tsx:97](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L97).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/format.ts](../../src/lib/format.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/components/PageShell.tsx](../../src/components/PageShell.tsx); [src/lib/stripe.ts](../../src/lib/stripe.ts).

### PacienteCheckout.tsx

Fonte: [src/pages/app/paciente/PacienteCheckout.tsx](../../src/pages/app/paciente/PacienteCheckout.tsx) (636 linhas). Rotas: `/app/paciente/checkout/:sessionId`.

Funções da interface, conforme títulos e descrições: Sessão de pagamento; Não encontrada.; Pagamento já confirmado; Esta sessão já foi paga.; Finalizar pagamento; Pagamento processado com segurança pelo Stripe.; Ambiente de demonstração — nenhum valor real é cobrado.; Remover cupom.

Funções nomeadas: [src/pages/app/paciente/PacienteCheckout.tsx:41](../../src/pages/app/paciente/PacienteCheckout.tsx#L41) `PacienteCheckout`; [src/pages/app/paciente/PacienteCheckout.tsx:65](../../src/pages/app/paciente/PacienteCheckout.tsx#L65) `carregar`; [src/pages/app/paciente/PacienteCheckout.tsx:161](../../src/pages/app/paciente/PacienteCheckout.tsx#L161) `aplicarCupom`; [src/pages/app/paciente/PacienteCheckout.tsx:188](../../src/pages/app/paciente/PacienteCheckout.tsx#L188) `removerCupom`; [src/pages/app/paciente/PacienteCheckout.tsx:205](../../src/pages/app/paciente/PacienteCheckout.tsx#L205) `pagar`; [src/pages/app/paciente/PacienteCheckout.tsx:251](../../src/pages/app/paciente/PacienteCheckout.tsx#L251) `cancelar`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/paciente/PacienteCheckout.tsx:86](../../src/pages/app/paciente/PacienteCheckout.tsx#L86); `from(pacientes)` [src/pages/app/paciente/PacienteCheckout.tsx:107](../../src/pages/app/paciente/PacienteCheckout.tsx#L107).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/analytics/tracker.ts](../../src/lib/analytics/tracker.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/components/payments/StripeEmbeddedCheckout.tsx](../../src/components/payments/StripeEmbeddedCheckout.tsx); [src/lib/cupons.ts](../../src/lib/cupons.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteCheckout.tsx:19](../../src/pages/app/paciente/PacienteCheckout.tsx#L19): type PagamentoMetodo,
- [src/pages/app/paciente/PacienteCheckout.tsx:47](../../src/pages/app/paciente/PacienteCheckout.tsx#L47): const [metodo, setMetodo] = useState<PagamentoMetodo>("pix");
- [src/pages/app/paciente/PacienteCheckout.tsx:210](../../src/pages/app/paciente/PacienteCheckout.tsx#L210): await confirmarPagamento(pagamento.id, metodo);
- [src/pages/app/paciente/PacienteCheckout.tsx:361](../../src/pages/app/paciente/PacienteCheckout.tsx#L361): // ─── Branch MOCK (legado / desenvolvimento) ────────────────────────
- [src/pages/app/paciente/PacienteCheckout.tsx:373](../../src/pages/app/paciente/PacienteCheckout.tsx#L373): <strong>Modo simulado.</strong> A integração real com Stripe será conectada
- [src/pages/app/paciente/PacienteCheckout.tsx:408](../../src/pages/app/paciente/PacienteCheckout.tsx#L408): value={metodo}
- [src/pages/app/paciente/PacienteCheckout.tsx:409](../../src/pages/app/paciente/PacienteCheckout.tsx#L409): onValueChange={(v) => setMetodo(v as PagamentoMetodo)}
- [src/pages/app/paciente/PacienteCheckout.tsx:415](../../src/pages/app/paciente/PacienteCheckout.tsx#L415): metodo === "pix" ? "border-primary bg-primary/5" : "border-border"
- [src/pages/app/paciente/PacienteCheckout.tsx:432](../../src/pages/app/paciente/PacienteCheckout.tsx#L432): metodo === "cartao" ? "border-primary bg-primary/5" : "border-border"
- [src/pages/app/paciente/PacienteCheckout.tsx:445](../../src/pages/app/paciente/PacienteCheckout.tsx#L445): {metodo === "cartao" && (
- [src/pages/app/paciente/PacienteCheckout.tsx:462](../../src/pages/app/paciente/PacienteCheckout.tsx#L462): Os dados não são processados — modo simulado.
- [src/pages/app/paciente/PacienteCheckout.tsx:467](../../src/pages/app/paciente/PacienteCheckout.tsx#L467): {metodo === "pix" && (
- [src/pages/app/paciente/PacienteCheckout.tsx:484](../../src/pages/app/paciente/PacienteCheckout.tsx#L484): Conexão segura. Pagamentos processados pelo Stripe (em breve).

### PacienteDashboard.tsx

Fonte: [src/pages/app/paciente/PacienteDashboard.tsx](../../src/pages/app/paciente/PacienteDashboard.tsx) (463 linhas). Rotas: `/app/paciente/dashboard`.

Funções da interface, conforme títulos e descrições: Sua central de saúde — ações rápidas, próximas consultas e suporte direto..

Funções nomeadas: [src/pages/app/paciente/PacienteDashboard.tsx:39](../../src/pages/app/paciente/PacienteDashboard.tsx#L39) `PacienteDashboard`; [src/pages/app/paciente/PacienteDashboard.tsx:322](../../src/pages/app/paciente/PacienteDashboard.tsx#L322) `mapConvToStatus`; [src/pages/app/paciente/PacienteDashboard.tsx:329](../../src/pages/app/paciente/PacienteDashboard.tsx#L329) `ComunicacaoCanais`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/components/FloatingWhatsApp.tsx](../../src/components/FloatingWhatsApp.tsx); [src/components/paciente/AvaliacaoPendenteBanner.tsx](../../src/components/paciente/AvaliacaoPendenteBanner.tsx); [src/components/paciente/HistoricoCancelamentos.tsx](../../src/components/paciente/HistoricoCancelamentos.tsx); [src/lib/auth.tsx](../../src/lib/auth.tsx); [src/lib/usePacienteAtual.ts](../../src/lib/usePacienteAtual.ts); [src/components/paciente/PacienteStates.tsx](../../src/components/paciente/PacienteStates.tsx); [src/components/paciente/ConsultaCountdown.tsx](../../src/components/paciente/ConsultaCountdown.tsx); [src/components/paciente/EntrarTeleconsulta.tsx](../../src/components/paciente/EntrarTeleconsulta.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/lib/format.ts](../../src/lib/format.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/paciente/queries.ts](../../src/lib/paciente/queries.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/pacienteConversas.ts](../../src/lib/pacienteConversas.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteDashboard.tsx:208](../../src/pages/app/paciente/PacienteDashboard.tsx#L208): <TooltipContent>Em breve — remarcação online</TooltipContent>
- [src/pages/app/paciente/PacienteDashboard.tsx:247](../../src/pages/app/paciente/PacienteDashboard.tsx#L247): <Link to="/app/paciente/agendamentos">Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Link>
- [src/pages/app/paciente/PacienteDashboard.tsx:281](../../src/pages/app/paciente/PacienteDashboard.tsx#L281): <TooltipContent>Em breve</TooltipContent>

### PacienteDependentes.tsx

Fonte: [src/pages/app/paciente/PacienteDependentes.tsx](../../src/pages/app/paciente/PacienteDependentes.tsx) (318 linhas). Rotas: `/app/paciente/dependentes`.

Funções da interface, conforme títulos e descrições: Dependentes; Gerencie pessoas sob sua responsabilidade para agendamentos futuros..

Funções nomeadas: [src/pages/app/paciente/PacienteDependentes.tsx:49](../../src/pages/app/paciente/PacienteDependentes.tsx#L49) `PacienteDependentes`; [src/pages/app/paciente/PacienteDependentes.tsx:67](../../src/pages/app/paciente/PacienteDependentes.tsx#L67) `fetchDependentes`; [src/pages/app/paciente/PacienteDependentes.tsx:86](../../src/pages/app/paciente/PacienteDependentes.tsx#L86) `resetForm`; [src/pages/app/paciente/PacienteDependentes.tsx:91](../../src/pages/app/paciente/PacienteDependentes.tsx#L91) `openAdd`; [src/pages/app/paciente/PacienteDependentes.tsx:96](../../src/pages/app/paciente/PacienteDependentes.tsx#L96) `openEdit`; [src/pages/app/paciente/PacienteDependentes.tsx:107](../../src/pages/app/paciente/PacienteDependentes.tsx#L107) `handleSave`; [src/pages/app/paciente/PacienteDependentes.tsx:161](../../src/pages/app/paciente/PacienteDependentes.tsx#L161) `handleToggleStatus`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/paciente/PacienteDependentes.tsx:70](../../src/pages/app/paciente/PacienteDependentes.tsx#L70); `from(pacientes)` [src/pages/app/paciente/PacienteDependentes.tsx:128](../../src/pages/app/paciente/PacienteDependentes.tsx#L128); `from(pacientes)` [src/pages/app/paciente/PacienteDependentes.tsx:135](../../src/pages/app/paciente/PacienteDependentes.tsx#L135); `from(dependente_consentimentos)` [src/pages/app/paciente/PacienteDependentes.tsx:143](../../src/pages/app/paciente/PacienteDependentes.tsx#L143); `from(pacientes)` [src/pages/app/paciente/PacienteDependentes.tsx:163](../../src/pages/app/paciente/PacienteDependentes.tsx#L163).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/usePacienteAtual.ts](../../src/lib/usePacienteAtual.ts); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts).

### PacienteDocumentos.tsx

Fonte: [src/pages/app/paciente/PacienteDocumentos.tsx](../../src/pages/app/paciente/PacienteDocumentos.tsx) (647 linhas). Rotas: `/app/paciente/documentos`.

Funções da interface, conforme títulos e descrições: Meus documentos; Faça login para acessar e enviar seus documentos.; Receitas e laudos emitidos por médicos, anexos das consultas e seus próprios documentos..

Funções nomeadas: [src/pages/app/paciente/PacienteDocumentos.tsx:73](../../src/pages/app/paciente/PacienteDocumentos.tsx#L73) `formatBytes`; [src/pages/app/paciente/PacienteDocumentos.tsx:82](../../src/pages/app/paciente/PacienteDocumentos.tsx#L82) `PacienteDocumentos`; [src/pages/app/paciente/PacienteDocumentos.tsx:105](../../src/pages/app/paciente/PacienteDocumentos.tsx#L105) `carregar`; [src/pages/app/paciente/PacienteDocumentos.tsx:210](../../src/pages/app/paciente/PacienteDocumentos.tsx#L210) `abrirPreview`; [src/pages/app/paciente/PacienteDocumentos.tsx:230](../../src/pages/app/paciente/PacienteDocumentos.tsx#L230) `baixar`; [src/pages/app/paciente/PacienteDocumentos.tsx:248](../../src/pages/app/paciente/PacienteDocumentos.tsx#L248) `apagar`; [src/pages/app/paciente/PacienteDocumentos.tsx:256](../../src/pages/app/paciente/PacienteDocumentos.tsx#L256) `importarFeegow`; [src/pages/app/paciente/PacienteDocumentos.tsx:377](../../src/pages/app/paciente/PacienteDocumentos.tsx#L377) `fetchTitularId`.

Dados e integrações diretas: `from(pacientes)` [src/pages/app/paciente/PacienteDocumentos.tsx:113](../../src/pages/app/paciente/PacienteDocumentos.tsx#L113); `from(prescricoes)` [src/pages/app/paciente/PacienteDocumentos.tsx:140](../../src/pages/app/paciente/PacienteDocumentos.tsx#L140); `from(prontuarios)` [src/pages/app/paciente/PacienteDocumentos.tsx:145](../../src/pages/app/paciente/PacienteDocumentos.tsx#L145); `invoke(feegow-importar-documentos)` [src/pages/app/paciente/PacienteDocumentos.tsx:261](../../src/pages/app/paciente/PacienteDocumentos.tsx#L261).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/components/paciente/UploadDocumentoDialog.tsx](../../src/components/paciente/UploadDocumentoDialog.tsx); [src/components/paciente/DocStatusChip.tsx](../../src/components/paciente/DocStatusChip.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteDocumentos.tsx:90](../../src/pages/app/paciente/PacienteDocumentos.tsx#L90): const [filtroTipo, setFiltroTipo] = useState<DocumentoPacienteTipo \| "todos">("todos");
- [src/pages/app/paciente/PacienteDocumentos.tsx:103](../../src/pages/app/paciente/PacienteDocumentos.tsx#L103): const [filtroPaciente, setFiltroPaciente] = useState<string>("todos"); // "todos" \| paciente_id
- [src/pages/app/paciente/PacienteDocumentos.tsx:170](../../src/pages/app/paciente/PacienteDocumentos.tsx#L170): if (filtroPaciente !== "todos") arr = arr.filter((d) => d.paciente_id === filtroPaciente);
- [src/pages/app/paciente/PacienteDocumentos.tsx:171](../../src/pages/app/paciente/PacienteDocumentos.tsx#L171): if (filtroTipo !== "todos") arr = arr.filter((d) => d.tipo === filtroTipo);
- [src/pages/app/paciente/PacienteDocumentos.tsx:275](../../src/pages/app/paciente/PacienteDocumentos.tsx#L275): toast.info(`Todos os ${dup} documento(s) já estavam importados.`);
- [src/pages/app/paciente/PacienteDocumentos.tsx:364](../../src/pages/app/paciente/PacienteDocumentos.tsx#L364): onClick={() => setFiltroPaciente("todos")}
- [src/pages/app/paciente/PacienteDocumentos.tsx:367](../../src/pages/app/paciente/PacienteDocumentos.tsx#L367): filtroPaciente === "todos"
- [src/pages/app/paciente/PacienteDocumentos.tsx:372](../../src/pages/app/paciente/PacienteDocumentos.tsx#L372): Todos
- [src/pages/app/paciente/PacienteDocumentos.tsx:385](../../src/pages/app/paciente/PacienteDocumentos.tsx#L385): filtroPaciente !== "todos" && !dependentes.some(d => d.id === filtroPaciente)
- [src/pages/app/paciente/PacienteDocumentos.tsx:444](../../src/pages/app/paciente/PacienteDocumentos.tsx#L444): <SelectItem value="todos">Todos os tipos</SelectItem>
- [src/pages/app/paciente/PacienteDocumentos.tsx:450](../../src/pages/app/paciente/PacienteDocumentos.tsx#L450): {filtroTipo !== "todos" && (
- [src/pages/app/paciente/PacienteDocumentos.tsx:451](../../src/pages/app/paciente/PacienteDocumentos.tsx#L451): <Button variant="ghost" size="sm" onClick={() => setFiltroTipo("todos")}>
- [src/pages/app/paciente/PacienteDocumentos.tsx:469](../../src/pages/app/paciente/PacienteDocumentos.tsx#L469): {filtroTipo === "todos"

### PacienteFinanceiro.tsx

Fonte: [src/pages/app/paciente/PacienteFinanceiro.tsx](../../src/pages/app/paciente/PacienteFinanceiro.tsx) (454 linhas). Rotas: `/app/paciente/financeiro`.

Funções da interface, conforme títulos e descrições: Financeiro; Faça login para ver suas faturas.; Histórico de pagamentos, faturas pendentes e recibos das suas consultas.

Funções nomeadas: [src/pages/app/paciente/PacienteFinanceiro.tsx:66](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L66) `formatData`; [src/pages/app/paciente/PacienteFinanceiro.tsx:70](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L70) `formatDataHora`; [src/pages/app/paciente/PacienteFinanceiro.tsx:77](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L77) `PacienteFinanceiro`; [src/pages/app/paciente/PacienteFinanceiro.tsx:109](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L109) `pagar`; [src/pages/app/paciente/PacienteFinanceiro.tsx:128](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L128) `copiar`; [src/pages/app/paciente/PacienteFinanceiro.tsx:417](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L417) `CardTotal`; [src/pages/app/paciente/PacienteFinanceiro.tsx:441](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L441) `Linha2`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/paciente/queries.ts](../../src/lib/paciente/queries.ts); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/reciboPdf.ts](../../src/lib/reciboPdf.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteFinanceiro.tsx:20](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L20): import { formatBRL, abrirCheckout, criarCheckoutSession, type PagamentoStatus, type PagamentoMetodo } from "@/lib/pagamentos";
- [src/pages/app/paciente/PacienteFinanceiro.tsx:30](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L30): metodo: PagamentoMetodo;
- [src/pages/app/paciente/PacienteFinanceiro.tsx:59](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L59): const metodoLabel: Record<string, string> = {
- [src/pages/app/paciente/PacienteFinanceiro.tsx:63](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L63): simulado: "Sandbox",
- [src/pages/app/paciente/PacienteFinanceiro.tsx:81](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L81): const [filtroStatus, setFiltroStatus] = useState<"todos" \| PagamentoStatus>("todos");
- [src/pages/app/paciente/PacienteFinanceiro.tsx:88](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L88): if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
- [src/pages/app/paciente/PacienteFinanceiro.tsx:175](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L175): <SelectItem value="todos">Todos os status</SelectItem>
- [src/pages/app/paciente/PacienteFinanceiro.tsx:227](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L227): {l.consulta?.especialidade_nome} · {formatData(l.consulta?.inicio ?? l.created_at)} · {metodoLabel[l.metodo] ?? l.metodo}
- [src/pages/app/paciente/PacienteFinanceiro.tsx:337](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L337): <Linha2 label="Método" value={metodoLabel[detalhe.metodo] ?? detalhe.metodo} />
- [src/pages/app/paciente/PacienteFinanceiro.tsx:385](../../src/pages/app/paciente/PacienteFinanceiro.tsx#L385): metodo: detalhe.metodo,

### PacienteMensagens.tsx

Fonte: [src/pages/app/paciente/PacienteMensagens.tsx](../../src/pages/app/paciente/PacienteMensagens.tsx) (298 linhas). Sem rota direta neste grupo.

Funções da interface, conforme títulos e descrições: Notificações; Faça login para ver suas notificações.; Acompanhe avisos e lembretes das suas consultas; Confirmações, lembretes e avisos das suas consultas.

Funções nomeadas: [src/pages/app/paciente/PacienteMensagens.tsx:36](../../src/pages/app/paciente/PacienteMensagens.tsx#L36) `PacienteMensagens`; [src/pages/app/paciente/PacienteMensagens.tsx:273](../../src/pages/app/paciente/PacienteMensagens.tsx#L273) `EmptyCenter`; [src/pages/app/paciente/PacienteMensagens.tsx:287](../../src/pages/app/paciente/PacienteMensagens.tsx#L287) `WhatsAppCTA`.

Dados e integrações diretas: `channel((dinâmico))` [src/pages/app/paciente/PacienteMensagens.tsx:77](../../src/pages/app/paciente/PacienteMensagens.tsx#L77).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/pacienteConversas.ts](../../src/lib/pacienteConversas.ts); [src/components/FloatingWhatsApp.tsx](../../src/components/FloatingWhatsApp.tsx).

### PacienteMontarPlano.tsx

Fonte: [src/pages/app/paciente/PacienteMontarPlano.tsx](../../src/pages/app/paciente/PacienteMontarPlano.tsx) (543 linhas). Rotas: `/app/paciente/montar-plano`.

Funções da interface, conforme títulos e descrições: Monte seu Plano.

Funções nomeadas: [src/pages/app/paciente/PacienteMontarPlano.tsx:44](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L44) `PacienteMontarPlano`; [src/pages/app/paciente/PacienteMontarPlano.tsx:64](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L64) `loadData`; [src/pages/app/paciente/PacienteMontarPlano.tsx:128](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L128) `toggle`; [src/pages/app/paciente/PacienteMontarPlano.tsx:199](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L199) `iniciarCheckout`.

Dados e integrações diretas: `from(planos)` [src/pages/app/paciente/PacienteMontarPlano.tsx:68](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L68); `from(medicos)` [src/pages/app/paciente/PacienteMontarPlano.tsx:76](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L76); `from(desconto_progressivo_regras)` [src/pages/app/paciente/PacienteMontarPlano.tsx:84](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L84); `from(assinaturas)` [src/pages/app/paciente/PacienteMontarPlano.tsx:90](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L90); `invoke(criar-checkout-plano)` [src/pages/app/paciente/PacienteMontarPlano.tsx:184](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L184); `from((dinâmico))` [src/pages/app/paciente/PacienteMontarPlano.tsx:186](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L186); `from((dinâmico))` [src/pages/app/paciente/PacienteMontarPlano.tsx:221](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L221).

Operações diretas detectadas: delete.

Dependências locais diretas: [src/lib/format.ts](../../src/lib/format.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/components/PageShell.tsx](../../src/components/PageShell.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx); [src/lib/stripe.ts](../../src/lib/stripe.ts).

### PacienteNotificacoes.tsx

Fonte: [src/pages/app/paciente/PacienteNotificacoes.tsx](../../src/pages/app/paciente/PacienteNotificacoes.tsx) (138 linhas). Rotas: `/app/paciente/notificacoes`.

Funções da interface, conforme títulos e descrições: Notificações; Eventos e alertas do sistema em tempo real.

Funções nomeadas: [src/pages/app/paciente/PacienteNotificacoes.tsx:34](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L34) `PacienteNotificacoes`; [src/pages/app/paciente/PacienteNotificacoes.tsx:43](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L43) `handleClick`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/hooks/useNotificacoes.ts](../../src/hooks/useNotificacoes.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacienteNotificacoes.tsx:27](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L27): { value: "todos", label: "Todos" },
- [src/pages/app/paciente/PacienteNotificacoes.tsx:36](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L36): const [filtro, setFiltro] = useState("todos");
- [src/pages/app/paciente/PacienteNotificacoes.tsx:39](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L39): const filtered = filtro === "todos"
- [src/pages/app/paciente/PacienteNotificacoes.tsx:87](../../src/pages/app/paciente/PacienteNotificacoes.tsx#L87): <p className="text-sm">Nenhuma notificação {filtro !== "todos" ? "neste filtro" : "ainda"}</p>

### PacientePagamentoCancelado.tsx

Fonte: [src/pages/app/paciente/PacientePagamentoCancelado.tsx](../../src/pages/app/paciente/PacientePagamentoCancelado.tsx) (30 linhas). Rotas: `/app/paciente/pagamento/cancelado`.

Funções da interface, conforme títulos e descrições: Pagamento cancelado; Nenhum valor foi cobrado..

Funções nomeadas: [src/pages/app/paciente/PacientePagamentoCancelado.tsx:6](../../src/pages/app/paciente/PacientePagamentoCancelado.tsx#L6) `PacientePagamentoCancelado`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### PacientePagamentoSucesso.tsx

Fonte: [src/pages/app/paciente/PacientePagamentoSucesso.tsx](../../src/pages/app/paciente/PacientePagamentoSucesso.tsx) (178 linhas). Rotas: `/app/paciente/pagamento/sucesso`.

Funções nomeadas: [src/pages/app/paciente/PacientePagamentoSucesso.tsx:8](../../src/pages/app/paciente/PacientePagamentoSucesso.tsx#L8) `PacientePagamentoSucesso`; [src/pages/app/paciente/PacientePagamentoSucesso.tsx:18](../../src/pages/app/paciente/PacientePagamentoSucesso.tsx#L18) `tick`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/lib/pagamentos.ts](../../src/lib/pagamentos.ts).

### PacienteParamGuard.tsx

Fonte: [src/pages/app/paciente/PacienteParamGuard.tsx](../../src/pages/app/paciente/PacienteParamGuard.tsx) (35 linhas). Sem rota direta neste grupo.

Funções nomeadas: [src/pages/app/paciente/PacienteParamGuard.tsx:9](../../src/pages/app/paciente/PacienteParamGuard.tsx#L9) `PacienteParamGuard`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx](../../src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx).

### PacientePerfilPage.tsx

Fonte: [src/pages/app/paciente/PacientePerfilPage.tsx](../../src/pages/app/paciente/PacientePerfilPage.tsx) (409 linhas). Rotas: `/app/paciente/perfil`.

Funções da interface, conforme títulos e descrições: Meu perfil; Faça login para gerenciar seus dados.; Mantenha seus dados atualizados — eles são usados nos agendamentos, prescrições e comunicação..

Funções nomeadas: [src/pages/app/paciente/PacientePerfilPage.tsx:26](../../src/pages/app/paciente/PacientePerfilPage.tsx#L26) `onlyDigits`; [src/pages/app/paciente/PacientePerfilPage.tsx:94](../../src/pages/app/paciente/PacientePerfilPage.tsx#L94) `PacientePerfilPage`; [src/pages/app/paciente/PacientePerfilPage.tsx:134](../../src/pages/app/paciente/PacientePerfilPage.tsx#L134) `set`; [src/pages/app/paciente/PacientePerfilPage.tsx:138](../../src/pages/app/paciente/PacientePerfilPage.tsx#L138) `buscarCep`; [src/pages/app/paciente/PacientePerfilPage.tsx:158](../../src/pages/app/paciente/PacientePerfilPage.tsx#L158) `salvar`; [src/pages/app/paciente/PacientePerfilPage.tsx:401](../../src/pages/app/paciente/PacientePerfilPage.tsx#L401) `Field`.

Dados e integrações diretas: `from(profiles)` [src/pages/app/paciente/PacientePerfilPage.tsx:106](../../src/pages/app/paciente/PacientePerfilPage.tsx#L106).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/shared/MeusAceites.tsx](../../src/components/shared/MeusAceites.tsx); [src/lib/session.tsx](../../src/lib/session.tsx); [src/lib/clinico.ts](../../src/lib/clinico.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/components/shared/ContaSeguranca.tsx](../../src/components/shared/ContaSeguranca.tsx).

### PacientePlano.tsx

Fonte: [src/pages/app/paciente/PacientePlano.tsx](../../src/pages/app/paciente/PacientePlano.tsx) (166 linhas). Rotas: `/app/paciente/plano`.

Funções da interface, conforme títulos e descrições: Meu plano; Gerencie todos os seus planos e assinaturas.

Funções nomeadas: [src/pages/app/paciente/PacientePlano.tsx:18](../../src/pages/app/paciente/PacientePlano.tsx#L18) `PacientePlano`; [src/pages/app/paciente/PacientePlano.tsx:63](../../src/pages/app/paciente/PacientePlano.tsx#L63) `countActive`; [src/pages/app/paciente/PacientePlano.tsx:104](../../src/pages/app/paciente/PacientePlano.tsx#L104) `TabBadge`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/paciente/plano-helpers.tsx](../../src/components/paciente/plano-helpers.tsx); [src/components/paciente/PlanoPlataformaTab.tsx](../../src/components/paciente/PlanoPlataformaTab.tsx); [src/components/paciente/PlanoPersonalizadoTab.tsx](../../src/components/paciente/PlanoPersonalizadoTab.tsx); [src/components/paciente/PlanoEmpresaTab.tsx](../../src/components/paciente/PlanoEmpresaTab.tsx); [src/lib/usePacienteAtual.ts](../../src/lib/usePacienteAtual.ts); [src/lib/paciente/queries.ts](../../src/lib/paciente/queries.ts); [src/components/paciente/PacienteStates.tsx](../../src/components/paciente/PacienteStates.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/paciente/PacientePlano.tsx:68](../../src/pages/app/paciente/PacientePlano.tsx#L68): <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />
- [src/pages/app/paciente/PacientePlano.tsx:82](../../src/pages/app/paciente/PacientePlano.tsx#L82): <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />
- [src/pages/app/paciente/PacientePlano.tsx:115](../../src/pages/app/paciente/PacientePlano.tsx#L115): <PageHeader title="Meu plano" description="Gerencie todos os seus planos e assinaturas" />

### PacienteRotaNaoEncontrada.tsx

Fonte: [src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx](../../src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx) (106 linhas). Rotas: `/app/paciente/*`.

Funções da interface, conforme títulos e descrições: Rota não encontrada; Não conseguimos localizar a página que você tentou abrir..

Funções nomeadas: [src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx:35](../../src/pages/app/paciente/PacienteRotaNaoEncontrada.tsx#L35) `PacienteRotaNaoEncontrada`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx).

### PlanoCheckoutRetorno.tsx

Fonte: [src/pages/app/paciente/PlanoCheckoutRetorno.tsx](../../src/pages/app/paciente/PlanoCheckoutRetorno.tsx) (69 linhas). Rotas: `/app/paciente/plano-checkout-retorno`.

Funções da interface, conforme títulos e descrições: Resultado do Pagamento.

Funções nomeadas: [src/pages/app/paciente/PlanoCheckoutRetorno.tsx:8](../../src/pages/app/paciente/PlanoCheckoutRetorno.tsx#L8) `PlanoCheckoutRetorno`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageShell.tsx](../../src/components/PageShell.tsx).

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| invoke | `audit-log` | [src/components/paciente/EntrarTeleconsulta.tsx:62](../../src/components/paciente/EntrarTeleconsulta.tsx#L62) | [supabase/functions/audit-log/index.ts](../../supabase/functions/audit-log/index.ts) |
| rpc | `agendar_retorno_gratuito` | [src/lib/clinico.ts:1074](../../src/lib/clinico.ts#L1074) | [supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql:69](../../supabase/migrations/20260430130152_76730d50-d74e-4bb6-a84c-672d7ff3c7ef.sql#L69) |
| rpc | `trocar_medico_consulta` | [src/lib/clinico.ts:1153](../../src/lib/clinico.ts#L1153) | [supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql:1](../../supabase/migrations/20260430130642_fd1013c7-4625-4564-8466-c9f6e4fb5a8c.sql#L1) |
| rpc | `reservar_slot_unificado` | [src/lib/clinico.ts:1360](../../src/lib/clinico.ts#L1360) | [supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql:3](../../supabase/migrations/20260504231545_c7880069-faa3-4df3-a569-6491bb6cb77c.sql#L3); [supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql:2](../../supabase/migrations/20260505110645_5a7ca4ed-b452-4045-98de-b895b65ebd8c.sql#L2) |
| rpc | `validar_e_aplicar_cupom` | [src/lib/cupons.ts:210](../../src/lib/cupons.ts#L210) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:1](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L1) |
| rpc | `remover_cupom_pagamento` | [src/lib/cupons.ts:235](../../src/lib/cupons.ts#L235) | [supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql:130](../../supabase/migrations/20260430141053_3a564250-cb68-4ddf-876b-e8dde96a7de5.sql#L130) |
| rpc | `(dinâmico)` | [src/lib/gamificacao.ts:20](../../src/lib/gamificacao.ts#L20) | Definição não localizada pelo extrator |
| invoke | `google-calendar-sync` | [src/lib/googleCalendarSync.ts:13](../../src/lib/googleCalendarSync.ts#L13) | [supabase/functions/google-calendar-sync/index.ts](../../supabase/functions/google-calendar-sync/index.ts) |
| rpc | `impersonation_iniciar` | [src/lib/impersonation.tsx:96](../../src/lib/impersonation.tsx#L96) | [supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql:42](../../supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql#L42) |
| rpc | `impersonation_finalizar` | [src/lib/impersonation.tsx:135](../../src/lib/impersonation.tsx#L135) | [supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql:105](../../supabase/migrations/20260430204107_b988209c-ed65-488e-b721-e28b9635d7ac.sql#L105) |
| rpc | `mark_messages_read` | [src/lib/pacienteConversas.ts:101](../../src/lib/pacienteConversas.ts#L101) | [supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql:7](../../supabase/migrations/20260501220753_7f619ec2-5a5e-491a-90e4-9845bc44a5db.sql#L7); [supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql:1](../../supabase/migrations/20260504205209_e8695645-42e9-4e4f-aefa-70238e697b8a.sql#L1) |
| rpc | `(dinâmico)` | [src/lib/pagamentos.ts:189](../../src/lib/pagamentos.ts#L189) | Definição não localizada pelo extrator |
| invoke | `criar-checkout-stripe` | [src/lib/pagamentos.ts:306](../../src/lib/pagamentos.ts#L306) | [supabase/functions/criar-checkout-stripe/index.ts](../../supabase/functions/criar-checkout-stripe/index.ts) |
| invoke | `audit-log` | [src/pages/app/paciente/PacienteAgendamentos.tsx:111](../../src/pages/app/paciente/PacienteAgendamentos.tsx#L111) | [supabase/functions/audit-log/index.ts](../../supabase/functions/audit-log/index.ts) |
| invoke | `criar-checkout-plano` | [src/pages/app/paciente/PacienteAssinarPlano.tsx:97](../../src/pages/app/paciente/PacienteAssinarPlano.tsx#L97) | [supabase/functions/criar-checkout-plano/index.ts](../../supabase/functions/criar-checkout-plano/index.ts) |
| invoke | `feegow-importar-documentos` | [src/pages/app/paciente/PacienteDocumentos.tsx:261](../../src/pages/app/paciente/PacienteDocumentos.tsx#L261) | [supabase/functions/feegow-importar-documentos/index.ts](../../supabase/functions/feegow-importar-documentos/index.ts) |
| invoke | `criar-checkout-plano` | [src/pages/app/paciente/PacienteMontarPlano.tsx:184](../../src/pages/app/paciente/PacienteMontarPlano.tsx#L184) | [supabase/functions/criar-checkout-plano/index.ts](../../supabase/functions/criar-checkout-plano/index.ts) |
