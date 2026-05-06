import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AnalyticsTracker } from "@/lib/analytics/AnalyticsTracker";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/lib/auth";
import { SessionProvider, useSession } from "@/lib/session";
import { ImpersonationProvider } from "@/lib/impersonation";
import Auth from "@/pages/auth/Auth";
import PublicLayout from "@/layouts/PublicLayout";
import AppLayout from "@/layouts/AppLayout";
import NotFound from "./pages/NotFound";

import Home from "@/pages/public/Home";
import {
  Especialidades, Medicos, MedicoDetalhe, Agendar, Planos,
  Empresas, ParaMedicos, Faq,
} from "@/pages/public/PublicPages";
import CadastroMedico from "@/pages/public/CadastroMedico";
import AtendimentoImediato from "@/pages/public/AtendimentoImediato";
import Servicos from "@/pages/public/Servicos";
import ServicoDetalhe from "@/pages/public/ServicoDetalhe";
import MedicoAguardandoAprovacao from "@/pages/app/medico/MedicoAguardandoAprovacao";
import MedicosAprovacao from "@/pages/app/admin/MedicosAprovacao";
import MedicoGuard from "@/components/MedicoGuard";

import Placeholder from "@/pages/app/_Placeholder";
import PacienteDashboard from "@/pages/app/paciente/PacienteDashboard";
import PacienteCheckout from "@/pages/app/paciente/PacienteCheckout";
import PacientePagamentoSucesso from "@/pages/app/paciente/PacientePagamentoSucesso";
import PacientePagamentoCancelado from "@/pages/app/paciente/PacientePagamentoCancelado";
import PacienteAgendarConfirmar from "@/pages/app/paciente/PacienteAgendarConfirmar";
import AgendamentoConfirmar from "@/pages/app/agendamento/AgendamentoConfirmar";
import PacienteAgendamentos from "@/pages/app/paciente/PacienteAgendamentos";
import PacientePerfilPage from "@/pages/app/paciente/PacientePerfilPage";
import PacienteDocumentos from "@/pages/app/paciente/PacienteDocumentos";
import PacientePlano from "@/pages/app/paciente/PacientePlano";
import PacienteMensagens from "@/pages/app/paciente/PacienteMensagens";
import PacienteFinanceiro from "@/pages/app/paciente/PacienteFinanceiro";
import PacienteRotaNaoEncontrada from "@/pages/app/paciente/PacienteRotaNaoEncontrada";
import {
  PacienteParamGuard,
  UUID_RE,
  CHECKOUT_SESSION_RE,
} from "@/pages/app/paciente/PacienteParamGuard";
import MedicoAgenda from "@/pages/app/medico/MedicoAgenda";
import MedicoHorarios from "@/pages/app/medico/MedicoHorarios";
import MedicoPacientes from "@/pages/app/medico/MedicoPacientes";
import MedicoConfiguracoes from "@/pages/app/medico/MedicoConfiguracoes";
import MedicoGoogleCallback from "@/pages/app/medico/MedicoGoogleCallback";
import MedicoPerfil from "@/pages/app/medico/MedicoPerfil";
import MedicoConsultas from "@/pages/app/medico/MedicoConsultas";
import MedicoFinanceiro from "@/pages/app/medico/MedicoFinanceiro";

import MedicoTreinamento from "@/pages/app/medico/MedicoTreinamento";
import MedicoDashboard from "@/pages/app/medico/MedicoDashboard";
import MedicoDocumentos from "@/pages/app/medico/MedicoDocumentos";
import SecretariaDashboard from "@/pages/app/secretaria/SecretariaDashboard";
import SecretariaPacientes from "@/pages/app/secretaria/SecretariaPacientes";
import SecretariaAgenda from "@/pages/app/secretaria/SecretariaAgenda";
import SecretariaAgendamentos from "@/pages/app/secretaria/SecretariaAgendamentos";
import SecretariaCupons from "@/pages/app/secretaria/SecretariaCupons";
import SecretariaFinanceiro from "@/pages/app/secretaria/SecretariaFinanceiro";
import SecretariaRelatorios from "@/pages/app/secretaria/SecretariaRelatorios";
import CuponsUsoLog from "@/pages/app/shared/CuponsUsoLog";
import AdminDashboard from "@/pages/app/admin/AdminDashboard";
import AdminTermosCondicoes from "@/pages/app/admin/AdminTermosCondicoes";
import AdminConfiguracoes from "@/pages/app/admin/AdminConfiguracoes";
import AdminUsuarios from "@/pages/app/admin/AdminUsuarios";
import EmpresaDashboard from "@/pages/app/empresa/EmpresaDashboard";
import EmpresaFuncionarios from "@/pages/app/empresa/EmpresaFuncionarios";
import EmpresaAgendamentos from "@/pages/app/empresa/EmpresaAgendamentos";
import EmpresaRelatorios from "@/pages/app/empresa/EmpresaRelatorios";
import EmpresaFinanceiro from "@/pages/app/empresa/EmpresaFinanceiro";
import EmpresaPerfilPage from "@/pages/app/empresa/EmpresaPerfilPage";
import EmpresaDocumentos from "@/pages/app/empresa/EmpresaDocumentos";
import EmpresaTermos from "@/pages/app/empresa/EmpresaTermos";
import { EmpresaGuard } from "@/components/empresa/EmpresaGuard";
import ComunicacaoDashboard from "@/pages/app/comunicacao/ComunicacaoDashboard";
import Conversas from "@/pages/app/comunicacao/Conversas";
import MedicoMensagensConsultas from "@/pages/app/medico/MedicoMensagensConsultas";
import Templates from "@/pages/app/comunicacao/Templates";
import Automacoes from "@/pages/app/comunicacao/Automacoes";
import Metricas from "@/pages/app/comunicacao/Metricas";
import BotConfig from "@/pages/app/comunicacao/BotConfig";

import AdminIntegracoes from "@/pages/app/admin/AdminIntegracoes";
import Tarefas from "@/pages/app/shared/Tarefas";
import Permissoes from "@/pages/app/admin/Permissoes";
import PermissoesLog from "@/pages/app/admin/PermissoesLog";
import AdminImpersonar from "@/pages/app/admin/AdminImpersonar";
import AdminSessoes from "@/pages/app/admin/AdminSessoes";
import AdminSeguranca from "@/pages/app/admin/AdminSeguranca";
import AdminAlertasSeguranca from "@/pages/app/admin/AdminAlertasSeguranca";
import AdminServicos from "@/pages/app/admin/AdminServicos";
import AdminTreinamentos from "@/pages/app/admin/AdminTreinamentos";
import MedicoServicos from "@/pages/app/medico/MedicoServicos";
import TrocarSenha from "@/pages/auth/TrocarSenha";
import { SecurityWatcher } from "@/components/security/SecurityWatcher";
import AdminAnalises from "@/pages/app/admin/AdminAnalises";
import WhatsAppCentral from "@/pages/app/admin/WhatsAppCentral";
import IntegracaoWhatsApp from "@/pages/app/admin/IntegracaoWhatsApp";
import Inbox from "@/pages/app/comunicacao/Inbox";
import IAAvatar from "@/pages/app/comunicacao/IAAvatar";
import InboxConfiguracoes from "@/pages/app/comunicacao/InboxConfiguracoes";
import SupervisorEquipe from "@/pages/app/supervisor/SupervisorDashboard";
import ComunicacaoInterna from "@/pages/app/shared/ComunicacaoInterna";
import FluxoOperacional from "@/pages/app/admin/FluxoOperacional";
import AdminAgendamentos from "@/pages/app/admin/AdminAgendamentos";
import AdminFinanceiroCentral from "@/pages/app/admin/AdminFinanceiroCentral";
import AdminFinanceiroConfig from "@/pages/app/admin/AdminFinanceiroConfig";
import AdminIAMedicos from "@/pages/app/admin/AdminIAMedicos";
import AdminPreviaRepasse from "@/pages/app/admin/AdminPreviaRepasse";
import AdminAtendimentoImediato from "@/pages/app/admin/AdminAtendimentoImediato";
import AdminPlanos from "@/pages/app/admin/AdminPlanos";
import AdminRelatorios from "@/pages/app/admin/AdminRelatorios";
import AdminRelatorioFinanceiro from "@/pages/app/admin/AdminRelatorioFinanceiro";
// AdminRelatorioAuditoria unificado com AdminAuditoria — rota redireciona via Navigate
import AdminAuditoria from "@/pages/app/admin/AdminAuditoria";
import AdminFaq from "@/pages/app/admin/AdminFaq";
import AdminColaboradores from "@/pages/app/admin/AdminColaboradores";
import AdminEmpresas from "@/pages/app/admin/AdminEmpresas";
import AdminPlanosEmpresariais from "@/pages/app/admin/AdminPlanosEmpresariais";
import AdminGestaoB2B from "@/pages/app/admin/AdminGestaoB2B";
import AdminRelatoriosB2B from "@/pages/app/admin/AdminRelatoriosB2B";
import AdminFaturamentoB2B from "@/pages/app/admin/AdminFaturamentoB2B";
import AdminContratoDetalhes from "@/pages/app/admin/AdminContratoDetalhes";
import AdminPropostasB2B from "@/pages/app/admin/AdminPropostasB2B";
import MedicoCorporativo from "@/pages/app/medico/MedicoCorporativo";
import MedicoPropostas from "@/pages/app/medico/MedicoPropostas";
import EmpresaPropostas from "@/pages/app/empresa/EmpresaPropostas";
import PacientePerfil from "@/pages/app/shared/PacientePerfil";
import FeegowIntegracao from "@/pages/app/admin/FeegowIntegracao";
import FeegowMapeamento from "@/pages/app/admin/FeegowMapeamento";
import FeegowSchema from "@/pages/app/admin/FeegowSchema";
import PendenciasIntegracao from "@/pages/app/shared/PendenciasIntegracao";
import MedicoPlanos from "@/pages/app/medico/MedicoPlanos";
import MedicoGamificacao from "@/pages/app/medico/MedicoGamificacao";
import MedicoPremiumPage from "@/pages/app/medico/MedicoPremiumPage";
import MedicoCampanhasPage from "@/pages/app/medico/MedicoCampanhasPage";
import MedicoROIPage from "@/pages/app/medico/MedicoROIPage";
import AdminGamificacao from "@/pages/app/admin/AdminGamificacao";
import AdminGamificacaoFinanceiro from "@/pages/app/admin/AdminGamificacaoFinanceiro";
import AdminPlanosMedicos from "@/pages/app/admin/AdminPlanosMedicos";
import AdminCancelamentosPlanos from "@/pages/app/admin/AdminCancelamentosPlanos";
import AdminSaquesMedicos from "@/pages/app/admin/AdminSaquesMedicos";
import AdminReembolsoConfig from "@/pages/app/admin/AdminReembolsoConfig";
import PacienteMontarPlano from "@/pages/app/paciente/PacienteMontarPlano";
import PlanoCheckoutRetorno from "@/pages/app/paciente/PlanoCheckoutRetorno";
import PacienteAssinarPlano from "@/pages/app/paciente/PacienteAssinarPlano";
import AdminPerfil from "@/pages/app/admin/AdminPerfil";
import AdminSaude from "@/pages/app/admin/AdminSaude";
import ColaboradorPerfil from "@/pages/app/colaborador/ColaboradorPerfil";
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
          <Routes>
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
              <Route path="/faq" element={<Faq />} />
              {/* /login removed — use /auth */}
              <Route path="/cadastro/medico" element={<CadastroMedico />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            <Route path="/trocar-senha" element={<TrocarSenha />} />

            {/* APP */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<SmartRedirect />} />

              {/* Paciente */}
              <Route path="paciente/dashboard" element={<PacienteDashboard />} />
              <Route path="paciente/agendamentos" element={<PacienteAgendamentos />} />
              <Route path="paciente/documentos" element={<PacienteDocumentos />} />
              <Route path="paciente/plano" element={<PacientePlano />} />
              <Route path="paciente/montar-plano" element={<PacienteMontarPlano />} />
              <Route path="paciente/plano-checkout-retorno" element={<PlanoCheckoutRetorno />} />
              <Route path="paciente/assinar-plano/:planoId" element={<PacienteAssinarPlano />} />
              <Route path="paciente/financeiro" element={<PacienteFinanceiro />} />
              <Route path="paciente/perfil" element={<PacientePerfilPage />} />
              <Route path="paciente/mensagens" element={<PacienteMensagens />} />
              <Route
                path="paciente/checkout/:sessionId"
                element={
                  <PacienteParamGuard param="sessionId" pattern={CHECKOUT_SESSION_RE}>
                    <PacienteCheckout />
                  </PacienteParamGuard>
                }
              />
              <Route path="paciente/pagamento/sucesso" element={<PacientePagamentoSucesso />} />
              <Route path="paciente/pagamento/cancelado" element={<PacientePagamentoCancelado />} />
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
              <Route path="medico/mensagens" element={<MedicoGuard><MedicoMensagensConsultas /></MedicoGuard>} />
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
              <Route path="admin/faq" element={<G perm="admin.dashboard"><AdminFaq /></G>} />
              <Route path="admin/saude" element={<G perm="admin.dashboard"><AdminSaude /></G>} />
              <Route path="admin/pacientes/:id" element={<G perm="pacientes.ver"><PacientePerfil /></G>} />
              <Route path="admin/feegow" element={<G perm="integracoes.configurar_feegow"><FeegowIntegracao /></G>} />
              <Route path="admin/feegow/mapeamento" element={<G perm="integracoes.configurar_feegow"><FeegowMapeamento /></G>} />
              <Route path="admin/feegow/schema" element={<G perm="integracoes.configurar_feegow"><FeegowSchema /></G>} />
              <Route path="admin/cupons" element={<G perm="financeiro.servicos_gerenciar"><SecretariaCupons /></G>} />
              <Route path="admin/cupons/log" element={<G perm="financeiro.servicos_gerenciar"><CuponsUsoLog /></G>} />
              <Route path="admin/pendencias-integracao" element={<G perm="integracoes.ver_logs"><PendenciasIntegracao /></G>} />
              

              {/* Empresa */}
              <Route path="empresa/dashboard" element={<EmpresaDashboard />} />
              <Route path="empresa/funcionarios" element={<EmpresaFuncionarios />} />
              <Route path="empresa/agendamentos" element={<EmpresaAgendamentos />} />
              <Route path="empresa/relatorios" element={<EmpresaRelatorios />} />
              <Route path="empresa/financeiro" element={<EmpresaFinanceiro />} />
              <Route path="empresa/documentos" element={<EmpresaDocumentos />} />
              <Route path="empresa/termos" element={<EmpresaTermos />} />
              <Route path="empresa/propostas" element={<EmpresaPropostas />} />
              <Route path="empresa/perfil" element={<EmpresaPerfilPage />} />

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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ImpersonationProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
