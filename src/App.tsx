import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/lib/auth";
import PublicLayout from "@/layouts/PublicLayout";
import AppLayout from "@/layouts/AppLayout";
import NotFound from "./pages/NotFound";

import Home from "@/pages/public/Home";
import {
  Especialidades, Medicos, MedicoDetalhe, Agendar, Planos,
  Empresas, ParaMedicos, Faq, Login,
} from "@/pages/public/PublicPages";

import Placeholder from "@/pages/app/_Placeholder";
import PacienteDashboard from "@/pages/app/paciente/PacienteDashboard";
import MedicoDashboard from "@/pages/app/medico/MedicoDashboard";
import SecretariaDashboard from "@/pages/app/secretaria/SecretariaDashboard";
import AdminDashboard from "@/pages/app/admin/AdminDashboard";
import EmpresaDashboard from "@/pages/app/empresa/EmpresaDashboard";
import ComunicacaoDashboard from "@/pages/app/comunicacao/ComunicacaoDashboard";
import Conversas from "@/pages/app/comunicacao/Conversas";
import BotConfig from "@/pages/app/comunicacao/BotConfig";
import Integracoes from "@/pages/app/shared/Integracoes";
import Tarefas from "@/pages/app/shared/Tarefas";
import Permissoes from "@/pages/app/admin/Permissoes";
import WhatsAppCentral from "@/pages/app/admin/WhatsAppCentral";
import SupervisorDashboard from "@/pages/app/supervisor/SupervisorDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            </Route>

            {/* APP */}
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="/app/admin/dashboard" replace />} />

              {/* Paciente */}
              <Route path="paciente/dashboard" element={<PacienteDashboard />} />
              <Route path="paciente/agendamentos" element={<Placeholder title="Meus agendamentos" />} />
              <Route path="paciente/documentos" element={<Placeholder title="Carteira documental" description="Receitas, atestados, exames. Sincroniza futuramente com Feegow." />} />
              <Route path="paciente/plano" element={<Placeholder title="Meu plano" />} />
              <Route path="paciente/financeiro" element={<Placeholder title="Financeiro" />} />
              <Route path="paciente/perfil" element={<Placeholder title="Meu perfil" />} />
              <Route path="paciente/mensagens" element={<Placeholder title="Mensagens e suporte" />} />

              {/* Médico */}
              <Route path="medico/dashboard" element={<MedicoDashboard />} />
              <Route path="medico/agenda" element={<Placeholder title="Agenda" />} />
              <Route path="medico/consultas" element={<Placeholder title="Consultas" />} />
              <Route path="medico/pacientes" element={<Placeholder title="Pacientes" />} />
              <Route path="medico/documentos" element={<Placeholder title="Documentos emitidos" />} />
              <Route path="medico/financeiro" element={<Placeholder title="Financeiro" />} />
              <Route path="medico/perfil" element={<Placeholder title="Perfil profissional" />} />
              <Route path="medico/configuracoes" element={<Placeholder title="Configurações" />} />
              <Route path="medico/integracoes" element={<Integracoes />} />

              {/* Secretaria */}
              <Route path="secretaria/dashboard" element={<SecretariaDashboard />} />
              <Route path="secretaria/pacientes" element={<Placeholder title="Pacientes" />} />
              <Route path="secretaria/agenda" element={<Placeholder title="Agenda por médico" />} />
              <Route path="secretaria/agendamentos" element={<Placeholder title="Agendamentos" />} />
              <Route path="secretaria/comunicacao" element={<Conversas />} />
              <Route path="secretaria/financeiro" element={<Placeholder title="Pagamentos pendentes" />} />
              <Route path="secretaria/tarefas" element={<Tarefas />} />

              {/* Supervisor */}
              <Route path="supervisor/dashboard" element={<SupervisorDashboard />} />
              <Route path="supervisor/equipe" element={<SupervisorDashboard />} />
              <Route path="supervisor/monitoramento" element={<Placeholder title="Monitoramento ao vivo" description="Painel de fila, SLA e atendimentos em curso." />} />
              <Route path="supervisor/relatorios" element={<Placeholder title="Relatórios operacionais" />} />

              {/* Admin */}
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/usuarios" element={<Placeholder title="Gestão de usuários" />} />
              <Route path="admin/medicos" element={<Placeholder title="Gestão de médicos" />} />
              <Route path="admin/secretaria" element={<Placeholder title="Gestão de secretaria" />} />
              <Route path="admin/empresas" element={<Placeholder title="Gestão de empresas" />} />
              <Route path="admin/agendamentos" element={<Placeholder title="Todos os agendamentos" />} />
              <Route path="admin/financeiro" element={<Placeholder title="Financeiro plataforma" />} />
              <Route path="admin/planos" element={<Placeholder title="Planos e assinaturas" />} />
              <Route path="admin/comunicacao" element={<Conversas />} />
              <Route path="admin/whatsapp" element={<WhatsAppCentral />} />
              <Route path="admin/integracoes" element={<Integracoes />} />
              <Route path="admin/configuracoes" element={<Placeholder title="Configurações da plataforma" />} />
              <Route path="admin/permissoes" element={<Permissoes />} />
              <Route path="admin/relatorios" element={<Placeholder title="Relatórios" />} />
              <Route path="admin/auditoria" element={<Placeholder title="Auditoria do sistema" description="Log de ações sensíveis (somente Superadmin)." />} />

              {/* Empresa */}
              <Route path="empresa/dashboard" element={<EmpresaDashboard />} />
              <Route path="empresa/funcionarios" element={<Placeholder title="Funcionários" />} />
              <Route path="empresa/agendamentos" element={<Placeholder title="Agendamentos da empresa" />} />
              <Route path="empresa/relatorios" element={<Placeholder title="Relatórios liberados" description="A empresa só visualiza relatórios autorizados pelo paciente." />} />
              <Route path="empresa/financeiro" element={<Placeholder title="Financeiro empresarial" />} />
              <Route path="empresa/perfil" element={<Placeholder title="Perfil da empresa" />} />

              {/* Comunicação */}
              <Route path="comunicacao/dashboard" element={<ComunicacaoDashboard />} />
              <Route path="comunicacao/conversas" element={<Conversas />} />
              <Route path="comunicacao/whatsapp" element={<WhatsAppCentral />} />
              <Route path="comunicacao/bot" element={<BotConfig />} />
              <Route path="comunicacao/templates" element={<Placeholder title="Templates de mensagem" />} />
              <Route path="comunicacao/metricas" element={<Placeholder title="Métricas de atendimento" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
