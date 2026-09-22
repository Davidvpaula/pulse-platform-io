import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PageBoundary from "@/components/PageBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { LOCAL_PREVIEW } from "@/lib/local-preview";
const VisualEditor = lazy(() => import("@/pages/local/VisualEditor"));
import { BrowserRouter, Route, Routes, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AnalyticsTracker } from "@/lib/analytics/AnalyticsTracker";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/lib/auth";
import { SessionProvider, useSession } from "@/lib/session";
import { ImpersonationProvider } from "@/lib/impersonation";
const Auth = lazy(() => import("@/pages/auth/Auth"));
import PublicLayout from "@/layouts/PublicLayout";
import AppLayout from "@/layouts/AppLayout";
import NotFound from "./pages/NotFound";

const Home = lazy(() => import("@/pages/public/Home"));
const Especialidades = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Especialidades })));
const Medicos = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Medicos })));
const MedicoDetalhe = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.MedicoDetalhe })));
const Agendar = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Agendar })));
const Planos = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Planos })));
const Empresas = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Empresas })));
const ParaMedicos = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.ParaMedicos })));
const Faq = lazy(() => import("@/pages/public/PublicPages").then(module => ({ default: module.Faq })));
const CadastroMedico = lazy(() => import("@/pages/public/CadastroMedico"));
const AtendimentoImediato = lazy(() => import("@/pages/public/AtendimentoImediato"));
const Servicos = lazy(() => import("@/pages/public/Servicos"));
const Sobre = lazy(() => import("@/pages/public/Sobre"));
const TermosPublico = lazy(() => import("@/pages/public/TermoPublico").then(module => ({ default: module.TermosPublico })));
const PrivacidadePublica = lazy(() => import("@/pages/public/TermoPublico").then(module => ({ default: module.PrivacidadePublica })));
const LgpdPublico = lazy(() => import("@/pages/public/TermoPublico").then(module => ({ default: module.LgpdPublico })));
const ServicoDetalhe = lazy(() => import("@/pages/public/ServicoDetalhe"));
const MedicoAguardandoAprovacao = lazy(() => import("@/pages/app/medico/MedicoAguardandoAprovacao"));
const MedicosAprovacao = lazy(() => import("@/pages/app/admin/MedicosAprovacao"));
const AdminMedicosContratos = lazy(() => import("@/pages/app/admin/AdminMedicosContratos"));
const AdminContratosModelo = lazy(() => import("@/pages/app/admin/AdminContratosModelo"));
import MedicoGuard from "@/components/MedicoGuard";
import PacienteGuard from "@/components/PacienteGuard";

const Placeholder = lazy(() => import("@/pages/app/_Placeholder"));
const PacienteDashboard = lazy(() => import("@/pages/app/paciente/PacienteDashboard"));
const PacienteCheckout = lazy(() => import("@/pages/app/paciente/PacienteCheckout"));
const PacientePagamentoSucesso = lazy(() => import("@/pages/app/paciente/PacientePagamentoSucesso"));
const PacientePagamentoCancelado = lazy(() => import("@/pages/app/paciente/PacientePagamentoCancelado"));
const PacienteAgendarConfirmar = lazy(() => import("@/pages/app/paciente/PacienteAgendarConfirmar"));
const AgendamentoConfirmar = lazy(() => import("@/pages/app/agendamento/AgendamentoConfirmar"));
const PacienteAgendamentos = lazy(() => import("@/pages/app/paciente/PacienteAgendamentos"));
const PacientePerfilPage = lazy(() => import("@/pages/app/paciente/PacientePerfilPage"));
const PacienteDocumentos = lazy(() => import("@/pages/app/paciente/PacienteDocumentos"));
const PacientePlano = lazy(() => import("@/pages/app/paciente/PacientePlano"));
const PacienteMensagens = lazy(() => import("@/pages/app/paciente/PacienteMensagens"));
const PacienteFinanceiro = lazy(() => import("@/pages/app/paciente/PacienteFinanceiro"));
const PacienteDependentes = lazy(() => import("@/pages/app/paciente/PacienteDependentes"));
const PacienteRotaNaoEncontrada = lazy(() => import("@/pages/app/paciente/PacienteRotaNaoEncontrada"));
import {
  PacienteParamGuard,
  UUID_RE,
  CHECKOUT_SESSION_RE,
} from "@/pages/app/paciente/PacienteParamGuard";
const MedicoAgenda = lazy(() => import("@/pages/app/medico/MedicoAgenda"));
const MedicoHorarios = lazy(() => import("@/pages/app/medico/MedicoHorarios"));
const MedicoPacientes = lazy(() => import("@/pages/app/medico/MedicoPacientes"));
const MedicoConfiguracoes = lazy(() => import("@/pages/app/medico/MedicoConfiguracoes"));
const MedicoGoogleCallback = lazy(() => import("@/pages/app/medico/MedicoGoogleCallback"));
const MedicoPerfil = lazy(() => import("@/pages/app/medico/MedicoPerfil"));
const MedicoConsultas = lazy(() => import("@/pages/app/medico/MedicoConsultas"));
const MedicoFinanceiro = lazy(() => import("@/pages/app/medico/MedicoFinanceiro"));

const MedicoTreinamento = lazy(() => import("@/pages/app/medico/MedicoTreinamento"));
const MedicoDashboard = lazy(() => import("@/pages/app/medico/MedicoDashboard"));
const MedicoDocumentos = lazy(() => import("@/pages/app/medico/MedicoDocumentos"));
const SecretariaDashboard = lazy(() => import("@/pages/app/secretaria/SecretariaDashboard"));
const SecretariaPacientes = lazy(() => import("@/pages/app/secretaria/SecretariaPacientes"));
const SecretariaAgenda = lazy(() => import("@/pages/app/secretaria/SecretariaAgenda"));
const SecretariaAgendamentos = lazy(() => import("@/pages/app/secretaria/SecretariaAgendamentos"));
const SecretariaCupons = lazy(() => import("@/pages/app/secretaria/SecretariaCupons"));
const SecretariaFinanceiro = lazy(() => import("@/pages/app/secretaria/SecretariaFinanceiro"));
const SecretariaRelatorios = lazy(() => import("@/pages/app/secretaria/SecretariaRelatorios"));
const CuponsUsoLog = lazy(() => import("@/pages/app/shared/CuponsUsoLog"));
const AdminDashboard = lazy(() => import("@/pages/app/admin/AdminDashboard"));
const AdminTermosCondicoes = lazy(() => import("@/pages/app/admin/AdminTermosCondicoes"));
const AdminConfiguracoes = lazy(() => import("@/pages/app/admin/AdminConfiguracoes"));
const AdminUsuarios = lazy(() => import("@/pages/app/admin/AdminUsuarios"));
const EmpresaDashboard = lazy(() => import("@/pages/app/empresa/EmpresaDashboard"));
const EmpresaFuncionarios = lazy(() => import("@/pages/app/empresa/EmpresaFuncionarios"));
const EmpresaAgendamentos = lazy(() => import("@/pages/app/empresa/EmpresaAgendamentos"));
const EmpresaRelatorios = lazy(() => import("@/pages/app/empresa/EmpresaRelatorios"));
const EmpresaFinanceiro = lazy(() => import("@/pages/app/empresa/EmpresaFinanceiro"));
const EmpresaPerfilPage = lazy(() => import("@/pages/app/empresa/EmpresaPerfilPage"));
const EmpresaDocumentos = lazy(() => import("@/pages/app/empresa/EmpresaDocumentos"));
const EmpresaTermos = lazy(() => import("@/pages/app/empresa/EmpresaTermos"));
import { EmpresaGuard } from "@/components/empresa/EmpresaGuard";
const ComunicacaoDashboard = lazy(() => import("@/pages/app/comunicacao/ComunicacaoDashboard"));
const Conversas = lazy(() => import("@/pages/app/comunicacao/Conversas"));
const MedicoMensagensConsultas = lazy(() => import("@/pages/app/medico/MedicoMensagensConsultas"));
const MedicoNotificacoes = lazy(() => import("@/pages/app/medico/MedicoNotificacoes"));
const PacienteNotificacoes = lazy(() => import("@/pages/app/paciente/PacienteNotificacoes"));
const Templates = lazy(() => import("@/pages/app/comunicacao/Templates"));
const Automacoes = lazy(() => import("@/pages/app/comunicacao/Automacoes"));
const Metricas = lazy(() => import("@/pages/app/comunicacao/Metricas"));
const BotConfig = lazy(() => import("@/pages/app/comunicacao/BotConfig"));

const AdminIntegracoes = lazy(() => import("@/pages/app/admin/AdminIntegracoes"));
const Tarefas = lazy(() => import("@/pages/app/shared/Tarefas"));
const Permissoes = lazy(() => import("@/pages/app/admin/Permissoes"));
const PermissoesLog = lazy(() => import("@/pages/app/admin/PermissoesLog"));
const AdminImpersonar = lazy(() => import("@/pages/app/admin/AdminImpersonar"));
const AdminSessoes = lazy(() => import("@/pages/app/admin/AdminSessoes"));
const AdminSeguranca = lazy(() => import("@/pages/app/admin/AdminSeguranca"));
const AdminAlertasSeguranca = lazy(() => import("@/pages/app/admin/AdminAlertasSeguranca"));
const AdminServicos = lazy(() => import("@/pages/app/admin/AdminServicos"));
const AdminTreinamentos = lazy(() => import("@/pages/app/admin/AdminTreinamentos"));
const MedicoServicos = lazy(() => import("@/pages/app/medico/MedicoServicos"));
const TrocarSenha = lazy(() => import("@/pages/auth/TrocarSenha"));
import { SecurityWatcher } from "@/components/security/SecurityWatcher";
const AdminAnalises = lazy(() => import("@/pages/app/admin/AdminAnalises"));
const WhatsAppCentral = lazy(() => import("@/pages/app/admin/WhatsAppCentral"));
const IntegracaoWhatsApp = lazy(() => import("@/pages/app/admin/IntegracaoWhatsApp"));
const Inbox = lazy(() => import("@/pages/app/comunicacao/Inbox"));
const IAAvatar = lazy(() => import("@/pages/app/comunicacao/IAAvatar"));
const InboxConfiguracoes = lazy(() => import("@/pages/app/comunicacao/InboxConfiguracoes"));
const SupervisorEquipe = lazy(() => import("@/pages/app/supervisor/SupervisorDashboard"));
const ComunicacaoInterna = lazy(() => import("@/pages/app/shared/ComunicacaoInterna"));
const FluxoOperacional = lazy(() => import("@/pages/app/admin/FluxoOperacional"));
const AdminAgendamentos = lazy(() => import("@/pages/app/admin/AdminAgendamentos"));
const AdminFinanceiroCentral = lazy(() => import("@/pages/app/admin/AdminFinanceiroCentral"));
const AdminFinanceiroConfig = lazy(() => import("@/pages/app/admin/AdminFinanceiroConfig"));
const AdminLedgerObservabilidade = lazy(() => import("@/pages/app/admin/AdminLedgerObservabilidade"));
const AdminNOC = lazy(() => import("@/pages/app/admin/AdminNOC"));
const AdminIAMedicos = lazy(() => import("@/pages/app/admin/AdminIAMedicos"));
const AdminPreviaRepasse = lazy(() => import("@/pages/app/admin/AdminPreviaRepasse"));
const AdminAtendimentoImediato = lazy(() => import("@/pages/app/admin/AdminAtendimentoImediato"));
const AdminPlanos = lazy(() => import("@/pages/app/admin/AdminPlanos"));
const AdminRelatorios = lazy(() => import("@/pages/app/admin/AdminRelatorios"));
const AdminRelatorioFinanceiro = lazy(() => import("@/pages/app/admin/AdminRelatorioFinanceiro"));
// AdminRelatorioAuditoria unificado com AdminAuditoria — rota redireciona via Navigate
const AdminAuditoria = lazy(() => import("@/pages/app/admin/AdminAuditoria"));
const AdminFaq = lazy(() => import("@/pages/app/admin/AdminFaq"));
const AdminFeedbacks = lazy(() => import("@/pages/app/admin/AdminFeedbacks"));
const AdminComunicacaoOperacao = lazy(() => import("@/pages/app/admin/AdminComunicacaoOperacao"));
const AdminProducaoCockpit = lazy(() => import("@/pages/app/admin/AdminProducaoCockpit"));
const AdminWhatsappCloudTest = lazy(() => import("@/pages/app/admin/AdminWhatsappCloudTest"));
const AdminObservabilidade = lazy(() => import("@/pages/app/admin/AdminObservabilidade"));
const AdminColaboradores = lazy(() => import("@/pages/app/admin/AdminColaboradores"));
const AdminEmpresas = lazy(() => import("@/pages/app/admin/AdminEmpresas"));
const AdminPlanosEmpresariais = lazy(() => import("@/pages/app/admin/AdminPlanosEmpresariais"));
const AdminGestaoB2B = lazy(() => import("@/pages/app/admin/AdminGestaoB2B"));
const AdminRelatoriosB2B = lazy(() => import("@/pages/app/admin/AdminRelatoriosB2B"));
const AdminFaturamentoB2B = lazy(() => import("@/pages/app/admin/AdminFaturamentoB2B"));
const AdminContratoDetalhes = lazy(() => import("@/pages/app/admin/AdminContratoDetalhes"));
const AdminPropostasB2B = lazy(() => import("@/pages/app/admin/AdminPropostasB2B"));
const MedicoCorporativo = lazy(() => import("@/pages/app/medico/MedicoCorporativo"));
const MedicoPropostas = lazy(() => import("@/pages/app/medico/MedicoPropostas"));
const EmpresaPropostas = lazy(() => import("@/pages/app/empresa/EmpresaPropostas"));
const PacientePerfil = lazy(() => import("@/pages/app/shared/PacientePerfil"));
const FeegowIntegracao = lazy(() => import("@/pages/app/admin/FeegowIntegracao"));
const FeegowMapeamento = lazy(() => import("@/pages/app/admin/FeegowMapeamento"));
const FeegowSchema = lazy(() => import("@/pages/app/admin/FeegowSchema"));
const FeegowProfissionais = lazy(() => import("@/pages/app/admin/FeegowProfissionais"));
const PendenciasIntegracao = lazy(() => import("@/pages/app/shared/PendenciasIntegracao"));
const MedicoPlanos = lazy(() => import("@/pages/app/medico/MedicoPlanos"));
const MedicoGamificacao = lazy(() => import("@/pages/app/medico/MedicoGamificacao"));
const MedicoPremiumPage = lazy(() => import("@/pages/app/medico/MedicoPremiumPage"));
const MedicoCampanhasPage = lazy(() => import("@/pages/app/medico/MedicoCampanhasPage"));
const MedicoROIPage = lazy(() => import("@/pages/app/medico/MedicoROIPage"));
const AdminGamificacao = lazy(() => import("@/pages/app/admin/AdminGamificacao"));
const AdminGamificacaoFinanceiro = lazy(() => import("@/pages/app/admin/AdminGamificacaoFinanceiro"));
const AdminPlanosMedicos = lazy(() => import("@/pages/app/admin/AdminPlanosMedicos"));
const AdminCancelamentosPlanos = lazy(() => import("@/pages/app/admin/AdminCancelamentosPlanos"));
const AdminSaquesMedicos = lazy(() => import("@/pages/app/admin/AdminSaquesMedicos"));
const AdminReembolsoConfig = lazy(() => import("@/pages/app/admin/AdminReembolsoConfig"));
const PacienteMontarPlano = lazy(() => import("@/pages/app/paciente/PacienteMontarPlano"));
const PlanoCheckoutRetorno = lazy(() => import("@/pages/app/paciente/PlanoCheckoutRetorno"));
const PacienteAssinarPlano = lazy(() => import("@/pages/app/paciente/PacienteAssinarPlano"));
const AdminPerfil = lazy(() => import("@/pages/app/admin/AdminPerfil"));
const AdminSaude = lazy(() => import("@/pages/app/admin/AdminSaude"));
const ColaboradorPerfil = lazy(() => import("@/pages/app/colaborador/ColaboradorPerfil"));
import { RequireRoutePermission as G } from "@/components/permissions/RequireRoutePermission";

const queryClient = new QueryClient();

function SmartRedirect() {
  const { profileKey } = useAuth();
  const { loading } = useSession();
  if (loading) return null;
  return <Navigate to={`/app/${profileKey}/dashboard`} replace />;
}

function AgendamentoRedirect() {
  const { slotId } = useParams();
  const [sp] = useSearchParams();
  const qs = sp.toString();
  return <Navigate to={`/app/agendamento/confirmar/${slotId}${qs ? `?${qs}` : "?tipo=especialidade"}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
      <ImpersonationProvider>
      <AuthProvider>
        <BrowserRouter>
          <AnalyticsTracker />
          <SecurityWatcher />
          <PageBoundary><Routes>
            {LOCAL_PREVIEW && <Route path="/editor-visual" element={<Suspense fallback={<p>Carregando editor…</p>}><VisualEditor /></Suspense>} />}
            {/* PUBLIC */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/especialidades" element={<Especialidades />} />
              <Route path="/atendimento-imediato" element={<AtendimentoImediato />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/servicos/:slug" element={<ServicoDetalhe />} />
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/medicos/:slug" element={<MedicoDetalhe />} />
              <Route path="/agendar" element={<Agendar />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/para-medicos" element={<ParaMedicos />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/termos" element={<TermosPublico />} />
              <Route path="/privacidade" element={<PrivacidadePublica />} />
              <Route path="/lgpd" element={<LgpdPublico />} />
              {/* /login removed — use /auth */}
              <Route path="/cadastro/medico" element={<CadastroMedico />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            <Route path="/trocar-senha" element={<TrocarSenha />} />

            {/* APP */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<SmartRedirect />} />

              {/* Paciente */}
              <Route path="paciente/dashboard" element={<PacienteGuard><PacienteDashboard /></PacienteGuard>} />
              <Route path="paciente/agendamentos" element={<PacienteGuard><PacienteAgendamentos /></PacienteGuard>} />
              <Route path="paciente/documentos" element={<PacienteGuard><PacienteDocumentos /></PacienteGuard>} />
              <Route path="paciente/plano" element={<PacienteGuard><PacientePlano /></PacienteGuard>} />
              <Route path="paciente/montar-plano" element={<PacienteGuard><PacienteMontarPlano /></PacienteGuard>} />
              <Route path="paciente/plano-checkout-retorno" element={<PacienteGuard><PlanoCheckoutRetorno /></PacienteGuard>} />
              <Route path="paciente/assinar-plano/:planoId" element={<PacienteGuard><PacienteAssinarPlano /></PacienteGuard>} />
              <Route path="paciente/financeiro" element={<PacienteGuard><PacienteFinanceiro /></PacienteGuard>} />
              <Route path="paciente/perfil" element={<PacienteGuard><PacientePerfilPage /></PacienteGuard>} />
              <Route path="paciente/mensagens" element={<Navigate to="/app/paciente/notificacoes" replace />} />
              <Route path="paciente/notificacoes" element={<PacienteGuard><PacienteNotificacoes /></PacienteGuard>} />
              <Route path="paciente/dependentes" element={<PacienteGuard><PacienteDependentes /></PacienteGuard>} />
              <Route
                path="paciente/checkout/:sessionId"
                element={
                  <PacienteGuard>
                    <PacienteParamGuard param="sessionId" pattern={CHECKOUT_SESSION_RE}>
                      <PacienteCheckout />
                    </PacienteParamGuard>
                  </PacienteGuard>
                }
              />
              <Route path="paciente/pagamento/sucesso" element={<PacienteGuard><PacientePagamentoSucesso /></PacienteGuard>} />
              <Route path="paciente/pagamento/cancelado" element={<PacienteGuard><PacientePagamentoCancelado /></PacienteGuard>} />
              {/* Rota legada → redirect para rota unificada */}
              <Route
                path="paciente/agendar/confirmar/:slotId"
                element={<AgendamentoRedirect />}
              />

              {/* Rota unificada de agendamento */}
              <Route
                path="agendamento/confirmar/:slotId"
                element={
                  <PacienteParamGuard param="slotId" pattern={UUID_RE}>
                    <AgendamentoConfirmar />
                  </PacienteParamGuard>
                }
              />
              {/* Catch-all do paciente: qualquer /app/paciente/* desconhecido */}
              <Route path="paciente/*" element={<PacienteRotaNaoEncontrada />} />

              {/* Médico — todas as rotas operacionais protegidas pelo MedicoGuard */}
              <Route path="medico/aguardando-aprovacao" element={<MedicoAguardandoAprovacao />} />
              <Route path="medico/dashboard" element={<MedicoGuard><MedicoDashboard /></MedicoGuard>} />
              <Route path="medico/agenda" element={<MedicoGuard><MedicoAgenda /></MedicoGuard>} />
              <Route path="medico/horarios" element={<MedicoGuard><MedicoHorarios /></MedicoGuard>} />
              <Route path="medico/consultas" element={<MedicoGuard><MedicoConsultas /></MedicoGuard>} />
               <Route path="medico/pacientes" element={<MedicoGuard><MedicoPacientes /></MedicoGuard>} />
               <Route path="medico/pacientes/:id" element={<MedicoGuard><PacientePerfil /></MedicoGuard>} />
              <Route path="medico/documentos" element={<MedicoGuard><MedicoDocumentos /></MedicoGuard>} />
              <Route path="medico/financeiro" element={<MedicoGuard><MedicoFinanceiro /></MedicoGuard>} />
              <Route path="medico/perfil" element={<MedicoGuard><MedicoPerfil /></MedicoGuard>} />
              <Route path="medico/configuracoes" element={<MedicoGuard><MedicoConfiguracoes /></MedicoGuard>} />
              <Route path="medico/google-callback" element={<MedicoGuard><MedicoGoogleCallback /></MedicoGuard>} />
              <Route path="medico/servicos" element={<MedicoGuard><MedicoServicos /></MedicoGuard>} />
              
              <Route path="medico/treinamento" element={<MedicoGuard><MedicoTreinamento /></MedicoGuard>} />
              <Route path="medico/mensagens" element={<Navigate to="/app/medico/notificacoes" replace />} />
              <Route path="medico/notificacoes" element={<MedicoGuard><MedicoNotificacoes /></MedicoGuard>} />
              <Route path="medico/comunicacao-interna" element={<MedicoGuard><ComunicacaoInterna /></MedicoGuard>} />
              <Route path="medico/planos" element={<MedicoGuard><MedicoPlanos /></MedicoGuard>} />
              <Route path="medico/gamificacao" element={<MedicoGuard><MedicoGamificacao /></MedicoGuard>} />
              <Route path="medico/premium" element={<MedicoGuard><MedicoPremiumPage /></MedicoGuard>} />
              <Route path="medico/campanhas" element={<MedicoGuard><MedicoCampanhasPage /></MedicoGuard>} />
              <Route path="medico/roi" element={<MedicoGuard><MedicoROIPage /></MedicoGuard>} />

              <Route path="medico/corporativo" element={<MedicoGuard><MedicoCorporativo /></MedicoGuard>} />
              <Route path="medico/propostas" element={<MedicoGuard><MedicoPropostas /></MedicoGuard>} />

              {/* Secretaria → Colaborador (redirects de compatibilidade) */}
              <Route path="secretaria/dashboard" element={<Navigate to="/app/colaborador/dashboard" replace />} />
              <Route path="secretaria/pacientes/:id" element={<Navigate to="/app/colaborador/pacientes/:id" replace />} />
              <Route path="secretaria/pacientes" element={<Navigate to="/app/colaborador/pacientes" replace />} />
              <Route path="secretaria/agenda" element={<Navigate to="/app/colaborador/agenda" replace />} />
              <Route path="secretaria/agendamentos" element={<Navigate to="/app/colaborador/agendamentos" replace />} />
              <Route path="secretaria/cupons/log" element={<Navigate to="/app/colaborador/cupons/log" replace />} />
              <Route path="secretaria/cupons" element={<Navigate to="/app/colaborador/cupons" replace />} />
              <Route path="secretaria/comunicacao" element={<Navigate to="/app/colaborador/dashboard" replace />} />
              <Route path="secretaria/financeiro" element={<Navigate to="/app/colaborador/financeiro" replace />} />
              <Route path="secretaria/tarefas" element={<Navigate to="/app/colaborador/tarefas" replace />} />
              <Route path="secretaria/equipe" element={<Navigate to="/app/colaborador/equipe" replace />} />
              <Route path="secretaria/relatorios" element={<Navigate to="/app/colaborador/relatorios" replace />} />
              <Route path="secretaria/comunicacao-interna" element={<Navigate to="/app/colaborador/comunicacao-interna" replace />} />
              <Route path="secretaria/perfil" element={<Navigate to="/app/colaborador/perfil" replace />} />
              <Route path="secretaria/pendencias-integracao" element={<Navigate to="/app/colaborador/pendencias-integracao" replace />} />

              {/* Compat: redireciona rotas antigas de Supervisor para Colaborador */}
              <Route path="supervisor/*" element={<Navigate to="/app/colaborador/dashboard" replace />} />

              {/* Colaborador — aliases das mesmas páginas, protegidos por has_permission */}
              <Route path="colaborador/dashboard" element={<SecretariaDashboard />} />
              <Route path="colaborador/pacientes" element={<G perm="pacientes.ver"><SecretariaPacientes /></G>} />
              <Route path="colaborador/pacientes/:id" element={<G perm="pacientes.ver"><PacientePerfil /></G>} />
              <Route path="colaborador/agenda" element={<G perm="agenda.ver_todas"><SecretariaAgenda /></G>} />
              <Route path="colaborador/agendamentos" element={<G perm="agenda.ver_todas"><SecretariaAgendamentos /></G>} />
              <Route path="colaborador/cupons" element={<G perm="financeiro.servicos_gerenciar"><SecretariaCupons /></G>} />
              <Route path="colaborador/cupons/log" element={<G perm="financeiro.servicos_gerenciar"><CuponsUsoLog /></G>} />
              <Route path="colaborador/financeiro" element={<G perm="financeiro.ver"><SecretariaFinanceiro /></G>} />
              <Route path="colaborador/tarefas" element={<Tarefas />} />
              <Route path="colaborador/equipe" element={<G perm="supervisor.fila_geral"><SupervisorEquipe /></G>} />
              <Route path="colaborador/relatorios" element={<G perm="relatorios.ver_operacional"><SecretariaRelatorios /></G>} />
              <Route path="colaborador/produtividade" element={<Navigate to="/app/colaborador/equipe" replace />} />
              <Route path="colaborador/comunicacao-interna" element={<ComunicacaoInterna />} />
              <Route path="colaborador/perfil" element={<ColaboradorPerfil />} />
              <Route path="colaborador/pendencias-integracao" element={<G perm="supervisor.pendencias_feegow"><PendenciasIntegracao /></G>} />
              <Route path="colaborador/auditoria" element={<G perm="auditoria.ver"><AdminAuditoria /></G>} />
              <Route path="colaborador/gamificacao" element={<G perm="gamificacao.configurar"><AdminGamificacao /></G>} />
              <Route path="colaborador/gamificacao/financeiro" element={<G perm="gamificacao.configurar"><AdminGamificacaoFinanceiro /></G>} />

              {/* Admin — todas as rotas protegidas por RequireRoutePermission */}
              <Route path="admin/dashboard" element={<G perm="admin.dashboard"><AdminDashboard /></G>} />
              <Route path="admin/pacientes" element={<G perm="pacientes.ver"><AdminUsuarios /></G>} />
              <Route path="admin/usuarios" element={<Navigate to="/app/admin/pacientes" replace />} />
              <Route path="admin/medicos" element={<G perm={["medicos.ver","medicos.aprovar"]}><MedicosAprovacao /></G>} />
              <Route path="admin/medicos/contratos" element={<G perm={["medicos.ver","medicos.aprovar"]}><AdminMedicosContratos /></G>} />
              <Route path="admin/medicos/contratos-modelo" element={<G perm={["medicos.ver","medicos.aprovar"]}><AdminContratosModelo /></G>} />
              <Route path="admin/colaboradores" element={<G perm="colaboradores.ver"><AdminColaboradores /></G>} />
              <Route path="admin/secretaria" element={<Navigate to="/app/admin/colaboradores" replace />} />
              <Route path="admin/empresas" element={<G perm="empresas.ver"><AdminEmpresas /></G>} />
              <Route path="admin/gestao-b2b" element={<G perm="empresas.ver"><AdminGestaoB2B /></G>} />
              <Route path="admin/relatorios-b2b" element={<G perm="empresas.ver"><AdminRelatoriosB2B /></G>} />
              <Route path="admin/faturamento-b2b" element={<G perm="empresas.ver"><AdminFaturamentoB2B /></G>} />
              <Route path="admin/contrato-b2b/:id" element={<G perm="empresas.ver"><AdminContratoDetalhes /></G>} />
              <Route path="admin/propostas-b2b" element={<G perm="empresas.ver"><AdminPropostasB2B /></G>} />
              <Route path="admin/agendamentos" element={<G perm="agenda.ver_todas"><AdminAgendamentos /></G>} />
              <Route path="admin/financeiro" element={<G perm="financeiro.ver"><AdminFinanceiroCentral /></G>} />
              <Route path="admin/financeiro/repasse" element={<G perm="financeiro.editar_comissao"><AdminFinanceiroConfig /></G>} />
              <Route path="admin/ia-medicos" element={<G perm="gamificacao.ver"><AdminIAMedicos /></G>} />
              <Route path="admin/financeiro/previa-repasse" element={<G perm="financeiro.editar_comissao"><AdminPreviaRepasse /></G>} />
              <Route path="admin/financeiro/saques-medicos" element={<G perm="financeiro.saques.ver"><AdminSaquesMedicos /></G>} />
              <Route path="admin/financeiro/reembolsos" element={<G perm="financeiro.ver"><AdminReembolsoConfig /></G>} />
              <Route path="admin/financeiro/ledger-observabilidade" element={<G perm="financeiro.ver"><AdminLedgerObservabilidade /></G>} />
              <Route path="admin/noc" element={<G perm="agenda.ver_todas"><AdminNOC /></G>} />
              <Route path="admin/planos" element={<G perm="financeiro.servicos_gerenciar"><AdminPlanos /></G>} />
              <Route path="admin/planos-medicos" element={<G perm="financeiro.servicos_gerenciar"><AdminPlanosMedicos /></G>} />
              <Route path="admin/planos-cancelamentos" element={<G perm="financeiro.servicos_gerenciar"><AdminCancelamentosPlanos /></G>} />
              <Route path="admin/planos-empresariais" element={<G perm="financeiro.servicos_gerenciar"><AdminPlanosEmpresariais /></G>} />
              <Route path="admin/gamificacao" element={<G perm="gamificacao.configurar"><AdminGamificacao /></G>} />
              <Route path="admin/gamificacao/financeiro" element={<G perm="gamificacao.configurar"><AdminGamificacaoFinanceiro /></G>} />
              <Route path="admin/termos-condicoes" element={<G perm="termos.gerenciar"><AdminTermosCondicoes /></G>} />
              <Route path="admin/comunicacao" element={<Navigate to="/app/comunicacao/inbox" replace />} />
              <Route path="admin/whatsapp" element={<Navigate to="/app/admin/integracoes/whatsapp" replace />} />
              <Route path="admin/integracoes/whatsapp" element={<G perm="integracoes.configurar_whatsapp"><IntegracaoWhatsApp /></G>} />
              <Route path="admin/integracoes" element={<G perm="integracoes.ver"><AdminIntegracoes /></G>} />
              
              <Route path="admin/configuracoes" element={<G perm="configuracoes.ver"><AdminConfiguracoes /></G>} />
              <Route path="admin/perfil" element={<G perm="admin.dashboard"><AdminPerfil /></G>} />
              <Route path="admin/permissoes" element={<G perm="colaboradores.alterar_permissoes"><Permissoes /></G>} />
              <Route path="admin/permissoes/log" element={<G perm="colaboradores.alterar_permissoes"><PermissoesLog /></G>} />
              <Route path="admin/permissoes-log" element={<Navigate to="/app/admin/permissoes/log" replace />} />
              <Route path="admin/impersonar" element={<G perm="colaboradores.alterar_permissoes"><AdminImpersonar /></G>} />
              <Route path="admin/sessoes" element={<G perm="colaboradores.alterar_permissoes"><AdminSessoes /></G>} />
              <Route path="admin/seguranca" element={<G perm="colaboradores.alterar_permissoes"><AdminSeguranca /></G>} />
              <Route path="admin/alertas-seguranca" element={<G perm="colaboradores.alterar_permissoes"><AdminAlertasSeguranca /></G>} />
              <Route path="admin/servicos" element={<G perm="financeiro.servicos_gerenciar"><AdminServicos /></G>} />
              <Route path="admin/atendimento-imediato" element={<G perm="financeiro.servicos_gerenciar"><AdminAtendimentoImediato /></G>} />
              <Route path="admin/treinamentos" element={<G perm="colaboradores.alterar_permissoes"><AdminTreinamentos /></G>} />
              <Route path="admin/analises" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/analises/tempo-real" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/analises/trafego" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/analises/comportamento" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/analises/conversao" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/analises/financeiro" element={<G perm={["analises.ver","analises.financeiro"]} all><AdminAnalises /></G>} />
              <Route path="admin/analises/marketing" element={<G perm={["analises.ver","analises.marketing"]} all><AdminAnalises /></G>} />
              <Route path="admin/analises/comparativo" element={<G perm="analises.ver"><AdminAnalises /></G>} />
              <Route path="admin/relatorios" element={<G perm="relatorios.ver"><AdminRelatorios /></G>} />
              <Route path="admin/relatorios/financeiro" element={<G perm="relatorios.ver"><AdminRelatorioFinanceiro /></G>} />
              <Route path="admin/relatorios/auditoria" element={<Navigate to="/app/admin/auditoria?tab=painel" replace />} />
              <Route path="admin/auditoria" element={<G perm="auditoria.ver"><AdminAuditoria /></G>} />
              <Route path="admin/fluxo" element={<G perm="agenda.ver_todas"><FluxoOperacional /></G>} />
              <Route path="admin/comunicacao-interna" element={<G perm="admin.dashboard"><ComunicacaoInterna /></G>} />
              <Route path="admin/comunicacao/operacao" element={<G perm="admin.dashboard"><AdminComunicacaoOperacao /></G>} />
              <Route path="admin/comunicacao/producao" element={<G perm="comunicacao.producao.ver"><AdminProducaoCockpit /></G>} />
              <Route path="admin/whatsapp-cloud-test" element={<G perm="admin.dashboard"><AdminWhatsappCloudTest /></G>} />
              <Route path="admin/observabilidade" element={<G perm="observabilidade.ver"><AdminObservabilidade /></G>} />
              <Route path="admin/faq" element={<G perm="admin.dashboard"><AdminFaq /></G>} />
              <Route path="admin/feedbacks" element={<G perm="admin.dashboard"><AdminFeedbacks /></G>} />
              <Route path="admin/saude" element={<G perm="admin.dashboard"><AdminSaude /></G>} />
              <Route path="admin/pacientes/:id" element={<G perm="pacientes.ver"><PacientePerfil /></G>} />
              <Route path="admin/feegow" element={<G perm="integracoes.configurar_feegow"><FeegowIntegracao /></G>} />
              <Route path="admin/feegow/mapeamento" element={<G perm="integracoes.configurar_feegow"><FeegowMapeamento /></G>} />
              <Route path="admin/feegow/schema" element={<G perm="integracoes.configurar_feegow"><FeegowSchema /></G>} />
              <Route path="admin/feegow/profissionais" element={<G perm="integracoes.configurar_feegow"><FeegowProfissionais /></G>} />
              <Route path="admin/cupons" element={<G perm="financeiro.servicos_gerenciar"><SecretariaCupons /></G>} />
              <Route path="admin/cupons/log" element={<G perm="financeiro.servicos_gerenciar"><CuponsUsoLog /></G>} />
              <Route path="admin/pendencias-integracao" element={<G perm="integracoes.ver_logs"><PendenciasIntegracao /></G>} />
              

              {/* Empresa */}
              <Route path="empresa/dashboard" element={<EmpresaGuard><EmpresaDashboard /></EmpresaGuard>} />
              <Route path="empresa/funcionarios" element={<EmpresaGuard><EmpresaFuncionarios /></EmpresaGuard>} />
              <Route path="empresa/agendamentos" element={<EmpresaGuard><EmpresaAgendamentos /></EmpresaGuard>} />
              <Route path="empresa/relatorios" element={<EmpresaGuard><EmpresaRelatorios /></EmpresaGuard>} />
              <Route path="empresa/financeiro" element={<EmpresaGuard><EmpresaFinanceiro /></EmpresaGuard>} />
              <Route path="empresa/documentos" element={<EmpresaGuard><EmpresaDocumentos /></EmpresaGuard>} />
              <Route path="empresa/termos" element={<EmpresaGuard><EmpresaTermos /></EmpresaGuard>} />
              <Route path="empresa/propostas" element={<EmpresaGuard><EmpresaPropostas /></EmpresaGuard>} />
              <Route path="empresa/perfil" element={<EmpresaGuard><EmpresaPerfilPage /></EmpresaGuard>} />

              {/* Comunicação */}
              <Route path="comunicacao/dashboard" element={<ComunicacaoDashboard />} />
              <Route path="comunicacao/inbox" element={<Inbox />} />
              <Route path="comunicacao/conversas" element={<Navigate to="/app/comunicacao/inbox" replace />} />
              <Route path="comunicacao/whatsapp" element={<Navigate to="/app/admin/integracoes/whatsapp" replace />} />
              <Route path="comunicacao/bot" element={<BotConfig />} />
              <Route path="comunicacao/ia" element={<IAAvatar />} />
              <Route path="comunicacao/templates" element={<Templates />} />
              <Route path="comunicacao/automacoes" element={<Automacoes />} />
              <Route path="comunicacao/metricas" element={<Metricas />} />
              <Route path="comunicacao/configuracoes" element={<InboxConfiguracoes />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes></PageBoundary>
        </BrowserRouter>
      </AuthProvider>
      </ImpersonationProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
