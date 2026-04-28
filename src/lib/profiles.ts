import {
  LayoutDashboard, Calendar, FileText, CreditCard, User, MessageSquare, Wallet,
  Stethoscope, Users, Settings, Plug, Building2, ListTodo, Phone, MessageCircle,
  Bot, FileBarChart, ShieldCheck, ClipboardList, Video, BadgeCheck, UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ProfileKey =
  | "paciente" | "medico" | "secretaria" | "admin" | "empresa" | "comunicacao";

export type NavItem = { label: string; to: string; icon: LucideIcon };

export type ProfileConfig = {
  key: ProfileKey;
  label: string;
  basePath: string;
  accent: string;
  user: { name: string; role: string; avatarInitials: string };
  nav: NavItem[];
};

export const profiles: Record<ProfileKey, ProfileConfig> = {
  paciente: {
    key: "paciente",
    label: "Paciente",
    basePath: "/app/paciente",
    accent: "Bem-estar",
    user: { name: "Marina Costa", role: "Paciente", avatarInitials: "MC" },
    nav: [
      { label: "Dashboard", to: "/app/paciente/dashboard", icon: LayoutDashboard },
      { label: "Agendamentos", to: "/app/paciente/agendamentos", icon: Calendar },
      { label: "Documentos", to: "/app/paciente/documentos", icon: FileText },
      { label: "Meu Plano", to: "/app/paciente/plano", icon: BadgeCheck },
      { label: "Financeiro", to: "/app/paciente/financeiro", icon: Wallet },
      { label: "Mensagens", to: "/app/paciente/mensagens", icon: MessageSquare },
      { label: "Perfil", to: "/app/paciente/perfil", icon: User },
    ],
  },
  medico: {
    key: "medico",
    label: "Médico",
    basePath: "/app/medico",
    accent: "Profissional",
    user: { name: "Dr. Rafael Lasmar", role: "Cardiologia", avatarInitials: "RL" },
    nav: [
      { label: "Dashboard", to: "/app/medico/dashboard", icon: LayoutDashboard },
      { label: "Agenda", to: "/app/medico/agenda", icon: Calendar },
      { label: "Consultas", to: "/app/medico/consultas", icon: Video },
      { label: "Pacientes", to: "/app/medico/pacientes", icon: Users },
      { label: "Documentos", to: "/app/medico/documentos", icon: FileText },
      { label: "Financeiro", to: "/app/medico/financeiro", icon: Wallet },
      { label: "Integrações", to: "/app/medico/integracoes", icon: Plug },
      { label: "Configurações", to: "/app/medico/configuracoes", icon: Settings },
      { label: "Perfil", to: "/app/medico/perfil", icon: User },
    ],
  },
  secretaria: {
    key: "secretaria",
    label: "Secretaria",
    basePath: "/app/secretaria",
    accent: "Operação",
    user: { name: "Juliana Reis", role: "Secretária Supervisora", avatarInitials: "JR" },
    nav: [
      { label: "Dashboard", to: "/app/secretaria/dashboard", icon: LayoutDashboard },
      { label: "Pacientes", to: "/app/secretaria/pacientes", icon: Users },
      { label: "Agenda", to: "/app/secretaria/agenda", icon: Calendar },
      { label: "Agendamentos", to: "/app/secretaria/agendamentos", icon: ClipboardList },
      { label: "Comunicação", to: "/app/secretaria/comunicacao", icon: MessageCircle },
      { label: "Financeiro", to: "/app/secretaria/financeiro", icon: Wallet },
      { label: "Tarefas", to: "/app/secretaria/tarefas", icon: ListTodo },
    ],
  },
  admin: {
    key: "admin",
    label: "Administração",
    basePath: "/app/admin",
    accent: "Plataforma",
    user: { name: "Carlos Mendes", role: "Superadmin", avatarInitials: "CM" },
    nav: [
      { label: "Visão geral", to: "/app/admin/dashboard", icon: LayoutDashboard },
      { label: "Usuários", to: "/app/admin/usuarios", icon: Users },
      { label: "Médicos", to: "/app/admin/medicos", icon: Stethoscope },
      { label: "Secretaria", to: "/app/admin/secretaria", icon: UserCog },
      { label: "Empresas", to: "/app/admin/empresas", icon: Building2 },
      { label: "Agendamentos", to: "/app/admin/agendamentos", icon: Calendar },
      { label: "Financeiro", to: "/app/admin/financeiro", icon: Wallet },
      { label: "Planos", to: "/app/admin/planos", icon: BadgeCheck },
      { label: "Comunicação", to: "/app/admin/comunicacao", icon: MessageCircle },
      { label: "WhatsApp", to: "/app/admin/whatsapp", icon: Phone },
      { label: "Integrações", to: "/app/admin/integracoes", icon: Plug },
      { label: "Permissões", to: "/app/admin/permissoes", icon: ShieldCheck },
      { label: "Relatórios", to: "/app/admin/relatorios", icon: FileBarChart },
      { label: "Configurações", to: "/app/admin/configuracoes", icon: Settings },
    ],
  },
  empresa: {
    key: "empresa",
    label: "Empresa",
    basePath: "/app/empresa",
    accent: "Corporativo",
    user: { name: "RH · Construtora Horizonte", role: "Gestor RH", avatarInitials: "CH" },
    nav: [
      { label: "Dashboard", to: "/app/empresa/dashboard", icon: LayoutDashboard },
      { label: "Funcionários", to: "/app/empresa/funcionarios", icon: Users },
      { label: "Agendamentos", to: "/app/empresa/agendamentos", icon: Calendar },
      { label: "Relatórios", to: "/app/empresa/relatorios", icon: FileBarChart },
      { label: "Financeiro", to: "/app/empresa/financeiro", icon: Wallet },
      { label: "Perfil", to: "/app/empresa/perfil", icon: Building2 },
    ],
  },
  comunicacao: {
    key: "comunicacao",
    label: "Central de Comunicação",
    basePath: "/app/comunicacao",
    accent: "Atendimento",
    user: { name: "Equipe de Atendimento", role: "Operador", avatarInitials: "AT" },
    nav: [
      { label: "Dashboard", to: "/app/comunicacao/dashboard", icon: LayoutDashboard },
      { label: "Conversas", to: "/app/comunicacao/conversas", icon: MessageSquare },
      { label: "WhatsApp", to: "/app/comunicacao/whatsapp", icon: Phone },
      { label: "Bot", to: "/app/comunicacao/bot", icon: Bot },
      { label: "Templates", to: "/app/comunicacao/templates", icon: FileText },
      { label: "Métricas", to: "/app/comunicacao/metricas", icon: FileBarChart },
    ],
  },
};

export const profileFromPath = (pathname: string): ProfileKey | null => {
  const m = pathname.match(/^\/app\/(paciente|medico|secretaria|admin|empresa|comunicacao)/);
  return (m?.[1] as ProfileKey) ?? null;
};
