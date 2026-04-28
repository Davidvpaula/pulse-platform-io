import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
import BotConfig from "@/pages/app/comunicacao/BotConfig";
import Integracoes from "@/pages/app/shared/Integracoes";
import Permissoes from "@/pages/app/admin/Permissoes";
import WhatsAppCentral from "@/pages/app/admin/WhatsAppCentral";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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

          {/* APP — sidebar layout */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/paciente/dashboard" replace />} />

            {/* Paciente */}
            <Route path="paciente/dashboard" element={<PacienteDashboard />} />
            <Route path="paciente/agendamentos" element={<Placeholder title="Meus agendamentos" description="Histórico e próximas consultas." />} />
            <Route path="paciente/documentos" element={<Placeholder title="Carteira documental" description="Receitas, atestados, exames e relatórios. Sincroniza futuramente com Feegow." />} />
            <Route path="paciente/plano" element={<Placeholder title="Meu plano" description="Plano ativo, benefícios e renovação." />} />
            <Route path="paciente/financeiro" element={<Placeholder title="Financeiro" description="Pagamentos, faturas e métodos." />} />
            <Route path="paciente/perfil" element={<Placeholder title="Meu perfil" description="Dados pessoais, contato e segurança." />} />
            <Route path="paciente/mensagens" element={<Placeholder title="Mensagens e suporte" description="Converse com a equipe Lasmar." />} />

            {/* Médico */}
            <Route path="medico/dashboard" element={<MedicoDashboard />} />
            <Route path="medico/agenda" element={<Placeholder title="Agenda" description="Calendário semanal · sincronização futura com Google Agenda." />} />
            <Route path="medico/consultas" element={<Placeholder title="Consultas" description="Histórico, em andamento e próximas." />} />
            <Route path="medico/pacientes" element={<Placeholder title="Pacientes" description="Lista de pacientes atendidos." />} />
            <Route path="medico/documentos" element={<Placeholder title="Documentos emitidos" description="Receitas, atestados e relatórios." />} />
            <Route path="medico/financeiro" element={<Placeholder title="Financeiro" description="Ganhos por atendimento e repasses." />} />
            <Route path="medico/perfil" element={<Placeholder title="Perfil profissional" description="Dados públicos exibidos no site Lasmar." />} />
            <Route path="medico/configuracoes" element={<Placeholder title="Configurações" description="Modalidades, link Meet, preferências." />} />
            <Route path="medico/integracoes" element={<Integracoes />} />

            {/* Secretaria */}
            <Route path="secretaria/dashboard" element={<SecretariaDashboard />} />
            <Route path="secretaria/pacientes" element={<Placeholder title="Pacientes" />} />
            <Route path="secretaria/agenda" element={<Placeholder title="Agenda por médico" />} />
            <Route path="secretaria/agendamentos" element={<Placeholder title="Agendamentos" />} />
            <Route path="secretaria/comunicacao" element={<Placeholder title="Comunicação" description="WhatsApp, e-mail e chamadas." />} />
            <Route path="secretaria/financeiro" element={<Placeholder title="Pagamentos pendentes" />} />
            <Route path="secretaria/tarefas" element={<Placeholder title="Tarefas internas" />} />

            {/* Admin */}
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/usuarios" element={<Placeholder title="Gestão de usuários" />} />
            <Route path="admin/medicos" element={<Placeholder title="Gestão de médicos" />} />
            <Route path="admin/secretaria" element={<Placeholder title="Gestão de secretaria" />} />
            <Route path="admin/empresas" element={<Placeholder title="Gestão de empresas" />} />
            <Route path="admin/agendamentos" element={<Placeholder title="Todos os agendamentos" />} />
            <Route path="admin/financeiro" element={<Placeholder title="Financeiro plataforma" />} />
            <Route path="admin/planos" element={<Placeholder title="Planos e assinaturas" />} />
            <Route path="admin/comunicacao" element={<Placeholder title="Comunicação" />} />
            <Route path="admin/whatsapp" element={<WhatsAppCentral />} />
            <Route path="admin/integracoes" element={<Integracoes />} />
            <Route path="admin/configuracoes" element={<Placeholder title="Configurações da plataforma" />} />
            <Route path="admin/permissoes" element={<Permissoes />} />
            <Route path="admin/relatorios" element={<Placeholder title="Relatórios" />} />

            {/* Empresa */}
            <Route path="empresa/dashboard" element={<EmpresaDashboard />} />
            <Route path="empresa/funcionarios" element={<Placeholder title="Funcionários" />} />
            <Route path="empresa/agendamentos" element={<Placeholder title="Agendamentos da empresa" />} />
            <Route path="empresa/relatorios" element={<Placeholder title="Relatórios liberados" description="A empresa só visualiza relatórios autorizados pelo paciente." />} />
            <Route path="empresa/financeiro" element={<Placeholder title="Financeiro empresarial" />} />
            <Route path="empresa/perfil" element={<Placeholder title="Perfil da empresa" />} />

            {/* Comunicação */}
            <Route path="comunicacao/dashboard" element={<ComunicacaoDashboard />} />
            <Route path="comunicacao/conversas" element={<ComunicacaoDashboard />} />
            <Route path="comunicacao/whatsapp" element={<WhatsAppCentral />} />
            <Route path="comunicacao/bot" element={<BotConfig />} />
            <Route path="comunicacao/templates" element={<Placeholder title="Templates de mensagem" />} />
            <Route path="comunicacao/metricas" element={<Placeholder title="Métricas de atendimento" />} />
          </Route>

          {/* CATCH-ALL */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
