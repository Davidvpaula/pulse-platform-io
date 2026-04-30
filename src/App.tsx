import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/lib/auth";
import { SessionProvider } from "@/lib/session";
import Auth from "@/pages/auth/Auth";
import PublicLayout from "@/layouts/PublicLayout";
import AppLayout from "@/layouts/AppLayout";
import NotFound from "./pages/NotFound";

import Home from "@/pages/public/Home";
import {
  Especialidades, Medicos, MedicoDetalhe, Agendar, Planos,
  Empresas, ParaMedicos, Faq, Login,
} from "@/pages/public/PublicPages";
import CadastroMedico from "@/pages/public/CadastroMedico";
import MedicoAguardandoAprovacao from "@/pages/app/medico/MedicoAguardandoAprovacao";
import MedicosAprovacao from "@/pages/app/admin/MedicosAprovacao";
import MedicoGuard from "@/components/MedicoGuard";

import Placeholder from "@/pages/app/_Placeholder";
import PacienteDashboard from "@/pages/app/paciente/PacienteDashboard";
import PacienteCheckout from "@/pages/app/paciente/PacienteCheckout";
import PacientePagamentoSucesso from "@/pages/app/paciente/PacientePagamentoSucesso";
import PacientePagamentoCancelado from "@/pages/app/paciente/PacientePagamentoCancelado";
import PacienteAgendarConfirmar from "@/pages/app/paciente/PacienteAgendarConfirmar";
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
import MedicoPerfil from "@/pages/app/medico/MedicoPerfil";
import MedicoConsultas from "@/pages/app/medico/MedicoConsultas";

import MedicoTreinamento from "@/pages/app/medico/MedicoTreinamento";
import MedicoDashboard from "@/pages/app/medico/MedicoDashboard";
import MedicoDocumentos from "@/pages/app/medico/MedicoDocumentos";
import SecretariaDashboard from "@/pages/app/secretaria/SecretariaDashboard";
import SecretariaPacientes from "@/pages/app/secretaria/SecretariaPacientes";
import SecretariaAgenda from "@/pages/app/secretaria/SecretariaAgenda";
import SecretariaCupons from "@/pages/app/secretaria/SecretariaCupons";
import SecretariaFinanceiro from "@/pages/app/secretaria/SecretariaFinanceiro";
import CuponsUsoLog from "@/pages/app/shared/CuponsUsoLog";
import AdminDashboard from "@/pages/app/admin/AdminDashboard";
import AdminConfiguracoes from "@/pages/app/admin/AdminConfiguracoes";
import AdminUsuarios from "@/pages/app/admin/AdminUsuarios";
import EmpresaDashboard from "@/pages/app/empresa/EmpresaDashboard";
import EmpresaFuncionarios from "@/pages/app/empresa/EmpresaFuncionarios";
import EmpresaAgendamentos from "@/pages/app/empresa/EmpresaAgendamentos";
import EmpresaRelatorios from "@/pages/app/empresa/EmpresaRelatorios";
import EmpresaFinanceiro from "@/pages/app/empresa/EmpresaFinanceiro";
import EmpresaPerfilPage from "@/pages/app/empresa/EmpresaPerfilPage";
import ComunicacaoDashboard from "@/pages/app/comunicacao/ComunicacaoDashboard";
import Conversas from "@/pages/app/comunicacao/Conversas";
import Templates from "@/pages/app/comunicacao/Templates";
import Automacoes from "@/pages/app/comunicacao/Automacoes";
import Metricas from "@/pages/app/comunicacao/Metricas";
import BotConfig from "@/pages/app/comunicacao/BotConfig";
import Integracoes from "@/pages/app/shared/Integracoes";
import Tarefas from "@/pages/app/shared/Tarefas";
import Permissoes from "@/pages/app/admin/Permissoes";
import WhatsAppCentral from "@/pages/app/admin/WhatsAppCentral";
import IntegracaoWhatsApp from "@/pages/app/admin/IntegracaoWhatsApp";
import Inbox from "@/pages/app/comunicacao/Inbox";
import IAAvatar from "@/pages/app/comunicacao/IAAvatar";
import SupervisorEquipe from "@/pages/app/supervisor/SupervisorDashboard";
import ComunicacaoInterna from "@/pages/app/shared/ComunicacaoInterna";
import FluxoOperacional from "@/pages/app/admin/FluxoOperacional";
import AdminAgendamentos from "@/pages/app/admin/AdminAgendamentos";
import AdminFinanceiroCentral from "@/pages/app/admin/AdminFinanceiroCentral";
import AdminPlanos from "@/pages/app/admin/AdminPlanos";
import AdminColaboradores from "@/pages/app/admin/AdminColaboradores";
import AdminEmpresas from "@/pages/app/admin/AdminEmpresas";
import PacientePerfil from "@/pages/app/shared/PacientePerfil";
import FeegowIntegracao from "@/pages/app/admin/FeegowIntegracao";
import FeegowMapeamento from "@/pages/app/admin/FeegowMapeamento";
import FeegowSchema from "@/pages/app/admin/FeegowSchema";
import PendenciasIntegracao from "@/pages/app/shared/PendenciasIntegracao";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/especialidades" element={<Especialidades />} />
              <Route path="/medicos" element={<Medicos />} />
              <Route path="/medicos/:slug" element={<MedicoDetalhe />} />
              <Route path="/agendar" element={<Agendar />} />
              <Route path="/planos" element={<Planos />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/para-medicos" element={<ParaMedicos />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro/medico" element={<CadastroMedico />} />
              <Route path="/auth" element={<Auth />} />
            </Route>

            {/* APP */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/admin/dashboard" replace />} />

              {/* Paciente */}
              <Route path="paciente/dashboard" element={<PacienteDashboard />} />
              <Route path="paciente/agendamentos" element={<PacienteAgendamentos />} />
              <Route path="paciente/documentos" element={<PacienteDocumentos />} />
              <Route path="paciente/plano" element={<PacientePlano />} />
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
              <Route
                path="paciente/agendar/confirmar/:slotId"
                element={
                  <PacienteParamGuard param="slotId" pattern={UUID_RE}>
                    <PacienteAgendarConfirmar />
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
              <Route path="medico/documentos" element={<MedicoGuard><MedicoDocumentos /></MedicoGuard>} />
              <Route path="medico/financeiro" element={<MedicoGuard><Placeholder title="Financeiro" /></MedicoGuard>} />
              <Route path="medico/perfil" element={<MedicoGuard><MedicoPerfil /></MedicoGuard>} />
              <Route path="medico/configuracoes" element={<MedicoGuard><MedicoConfiguracoes /></MedicoGuard>} />
              
              <Route path="medico/treinamento" element={<MedicoGuard><MedicoTreinamento /></MedicoGuard>} />
              <Route path="medico/mensagens" element={<MedicoGuard><Conversas /></MedicoGuard>} />
              <Route path="medico/comunicacao-interna" element={<MedicoGuard><ComunicacaoInterna /></MedicoGuard>} />

              {/* Secretaria (inclui módulos de supervisão liberados via capability) */}
              <Route path="secretaria/dashboard" element={<SecretariaDashboard />} />
              <Route path="secretaria/pacientes" element={<SecretariaPacientes />} />
              <Route path="secretaria/agenda" element={<SecretariaAgenda />} />
              <Route path="secretaria/agendamentos" element={<Placeholder title="Agendamentos" />} />
              <Route path="secretaria/cupons" element={<SecretariaCupons />} />
              <Route path="secretaria/cupons/log" element={<CuponsUsoLog />} />
              <Route path="admin/cupons" element={<SecretariaCupons />} />
              <Route path="admin/cupons/log" element={<CuponsUsoLog />} />
              <Route path="secretaria/comunicacao" element={<Conversas />} />
              <Route path="secretaria/financeiro" element={<SecretariaFinanceiro />} />
              <Route path="secretaria/tarefas" element={<Tarefas />} />
              <Route path="secretaria/equipe" element={<SupervisorEquipe />} />
              <Route path="secretaria/relatorios" element={<Placeholder title="Relatórios operacionais" description="Visíveis para Secretaria com permissão de supervisão." />} />
              <Route path="secretaria/comunicacao-interna" element={<ComunicacaoInterna />} />
              <Route path="secretaria/pacientes/:id" element={<PacientePerfil />} />

              {/* Compat: redireciona rotas antigas de Supervisor para Secretaria */}
              <Route path="supervisor/*" element={<Navigate to="/app/secretaria/dashboard" replace />} />

              {/* Admin */}
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/usuarios" element={<AdminUsuarios />} />
              <Route path="admin/medicos" element={<MedicosAprovacao />} />
              <Route path="admin/colaboradores" element={<AdminColaboradores />} />
              <Route path="admin/secretaria" element={<Navigate to="/app/admin/colaboradores" replace />} />
              <Route path="admin/empresas" element={<AdminEmpresas />} />
              <Route path="admin/agendamentos" element={<AdminAgendamentos />} />
              <Route path="admin/financeiro" element={<AdminFinanceiroCentral />} />
              <Route path="admin/planos" element={<AdminPlanos />} />
              <Route path="admin/comunicacao" element={<Navigate to="/app/comunicacao/inbox" replace />} />
              <Route path="admin/whatsapp" element={<Navigate to="/app/admin/integracoes/whatsapp" replace />} />
              <Route path="admin/integracoes/whatsapp" element={<IntegracaoWhatsApp />} />
              <Route path="admin/integracoes" element={<Integracoes />} />
              <Route path="admin/configuracoes" element={<AdminConfiguracoes />} />
              <Route path="admin/permissoes" element={<Permissoes />} />
              <Route path="admin/relatorios" element={<Placeholder title="Relatórios" />} />
              <Route path="admin/auditoria" element={<Placeholder title="Auditoria do sistema" description="Log de ações sensíveis (somente Superadmin)." />} />
              <Route path="admin/fluxo" element={<FluxoOperacional />} />
              <Route path="admin/comunicacao-interna" element={<ComunicacaoInterna />} />
              <Route path="admin/pacientes/:id" element={<PacientePerfil />} />
              <Route path="admin/feegow" element={<FeegowIntegracao />} />
              <Route path="admin/feegow/mapeamento" element={<FeegowMapeamento />} />
              <Route path="admin/feegow/schema" element={<FeegowSchema />} />
              <Route path="admin/pendencias-integracao" element={<PendenciasIntegracao />} />
              <Route path="secretaria/pendencias-integracao" element={<PendenciasIntegracao />} />

              {/* Empresa */}
              <Route path="empresa/dashboard" element={<EmpresaDashboard />} />
              <Route path="empresa/funcionarios" element={<EmpresaFuncionarios />} />
              <Route path="empresa/agendamentos" element={<EmpresaAgendamentos />} />
              <Route path="empresa/relatorios" element={<EmpresaRelatorios />} />
              <Route path="empresa/financeiro" element={<EmpresaFinanceiro />} />
              <Route path="empresa/perfil" element={<EmpresaPerfilPage />} />

              {/* Comunicação */}
              <Route path="comunicacao/dashboard" element={<ComunicacaoDashboard />} />
              <Route path="comunicacao/conversas" element={<Conversas />} />
              <Route path="comunicacao/whatsapp" element={<WhatsAppCentral />} />
              <Route path="comunicacao/bot" element={<BotConfig />} />
              <Route path="comunicacao/templates" element={<Templates />} />
              <Route path="comunicacao/automacoes" element={<Automacoes />} />
              <Route path="comunicacao/metricas" element={<Metricas />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
