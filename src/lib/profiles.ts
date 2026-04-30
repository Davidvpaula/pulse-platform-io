import {
  LayoutDashboard, Calendar, FileText, CreditCard, User, MessageSquare, Wallet,
  Stethoscope, Users, Settings, Plug, Building2, ListTodo, Phone, MessageCircle,
  Bot, FileBarChart, ShieldCheck, ClipboardList, Video, BadgeCheck, UserCog,
  Activity, Eye, AlertTriangle, BookOpen, Clock, Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Perfis principais (login). Diferenças internas (ex.: Secretaria com supervisão,
 * Médico com acesso à comunicação, Admin com módulos sensíveis) são tratadas via
 * capabilities atribuídas pelo Admin — não como dashboards separados.
 */
export type ProfileKey =
  | "paciente"
  | "medico"
  | "secretaria"
  | "admin"
  | "empresa";

export type NavItem = {
  label: string;
  to?: string;
  icon: LucideIcon;
  /** Quando preenchido, item só aparece se a capability estiver ativa */
  requiresCapability?: string;
  children?: { label: string; to: string; requiresCapability?: string }[];
};

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
      { label: "Meus horários", to: "/app/medico/horarios", icon: Clock },
      { label: "Consultas", to: "/app/medico/consultas", icon: Video },
      { label: "Pacientes", to: "/app/medico/pacientes", icon: Users },
      { label: "Documentos", to: "/app/medico/documentos", icon: FileText },
      { label: "Mensagens das consultas", to: "/app/medico/mensagens", icon: MessageCircle, requiresCapability: "medico.comunicacao" },
      { label: "Comunicação interna", to: "/app/medico/comunicacao-interna", icon: MessageSquare },
      { label: "Financeiro", to: "/app/medico/financeiro", icon: Wallet },
      { label: "Treinamento", to: "/app/medico/treinamento", icon: BookOpen },
      
      { label: "Configurações", to: "/app/medico/configuracoes", icon: Settings },
      { label: "Perfil", to: "/app/medico/perfil", icon: User },
    ],
  },
  secretaria: {
    key: "secretaria",
    label: "Secretaria",
    basePath: "/app/secretaria",
    accent: "Operação",
    user: { name: "Juliana Reis", role: "Secretária", avatarInitials: "JR" },
    nav: [
      { label: "Dashboard", to: "/app/secretaria/dashboard", icon: LayoutDashboard },
      { label: "Pacientes", to: "/app/secretaria/pacientes", icon: Users },
      { label: "Agenda", to: "/app/secretaria/agenda", icon: Calendar },
      { label: "Agendamentos", to: "/app/secretaria/agendamentos", icon: ClipboardList },
      {
        label: "Comunicação",
        icon: MessageCircle,
        requiresCapability: "comunicacao.acessar",
        children: [
          { label: "Pacientes (WhatsApp)", to: "/app/comunicacao/conversas" },
          { label: "Equipe (interna)", to: "/app/secretaria/comunicacao-interna" },
          { label: "Templates", to: "/app/comunicacao/templates" },
        ],
      },
      { label: "Financeiro", to: "/app/secretaria/financeiro", icon: Wallet, requiresCapability: "secretaria.financeiro" },
      { label: "Cupons", to: "/app/secretaria/cupons", icon: BadgeCheck },
      { label: "Tarefas", to: "/app/secretaria/tarefas", icon: ListTodo },
      { label: "Pendências Feegow", to: "/app/secretaria/pendencias-integracao", icon: AlertTriangle },
      // ─── módulos liberados ao perfil "Secretaria com supervisão"
      {
        label: "Supervisão",
        icon: Activity,
        requiresCapability: "secretaria.supervisor",
        children: [
          { label: "Visão da equipe", to: "/app/secretaria/equipe" },
          { label: "Relatórios operacionais", to: "/app/secretaria/relatorios" },
        ],
      },
    ],
  },
  admin: {
    key: "admin",
    label: "Admin",
    basePath: "/app/admin",
    accent: "Plataforma",
    user: { name: "Carlos Mendes", role: "Admin", avatarInitials: "CM" },
    nav: [
      { label: "Visão geral", to: "/app/admin/dashboard", icon: LayoutDashboard },
      { label: "Fluxo operacional", to: "/app/admin/fluxo", icon: Activity },
      {
        label: "Cadastros",
        icon: Users,
        children: [
          { label: "Usuários", to: "/app/admin/usuarios" },
          { label: "Médicos", to: "/app/admin/medicos" },
          { label: "Colaboradores", to: "/app/admin/colaboradores" },
          { label: "Empresas", to: "/app/admin/empresas" },
        ],
      },
      { label: "Agendamentos", to: "/app/admin/agendamentos", icon: Calendar },
      { label: "Financeiro", to: "/app/admin/financeiro", icon: Wallet },
      { label: "Cupons", to: "/app/admin/cupons", icon: Tag },
      { label: "Planos", to: "/app/admin/planos", icon: BadgeCheck },
      {
        label: "Comunicação",
        icon: MessageCircle,
        children: [
          { label: "Pacientes (WhatsApp)", to: "/app/comunicacao/conversas" },
          { label: "Equipe (interna)", to: "/app/admin/comunicacao-interna" },
          { label: "WhatsApp", to: "/app/admin/whatsapp" },
          { label: "Bot", to: "/app/comunicacao/bot" },
          { label: "Templates", to: "/app/comunicacao/templates" },
          { label: "Automações", to: "/app/comunicacao/automacoes" },
          { label: "Métricas", to: "/app/comunicacao/metricas" },
        ],
      },
      {
        label: "Integrações",
        icon: Plug,
        children: [
          { label: "Visão geral", to: "/app/admin/integracoes" },
          { label: "Feegow", to: "/app/admin/feegow" },
          { label: "Mapeamento de status", to: "/app/admin/feegow/mapeamento" },
          { label: "Schema lógico", to: "/app/admin/feegow/schema" },
          { label: "Pendências", to: "/app/admin/pendencias-integracao" },
        ],
      },
      { label: "Permissões", to: "/app/admin/permissoes", icon: ShieldCheck },
      { label: "Relatórios", to: "/app/admin/relatorios", icon: FileBarChart },
      { label: "Auditoria", to: "/app/admin/auditoria", icon: Eye },
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
};

export const profileFromPath = (pathname: string): ProfileKey | null => {
  const m = pathname.match(/^\/app\/(paciente|medico|secretaria|admin|empresa)/);
  if (!m) return null;
  return m[1] as ProfileKey;
};
