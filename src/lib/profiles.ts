import {
  LayoutDashboard, Calendar, FileText, CreditCard, User, MessageSquare, Wallet,
  Stethoscope, Users, Settings, Plug, Building2, ListTodo, Phone, MessageCircle,
  Bot, FileBarChart, ShieldCheck, ClipboardList, Video, BadgeCheck, UserCog,
  Activity, Eye, AlertTriangle, BookOpen, Clock, Tag, TrendingUp, Layers,
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
  | "colaborador"
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
      { label: "Montar Plano", to: "/app/paciente/montar-plano", icon: Layers },
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
      { label: "Serviços da plataforma", to: "/app/medico/servicos", icon: Stethoscope },
      { label: "Pacientes", to: "/app/medico/pacientes", icon: Users },
      { label: "Documentos", to: "/app/medico/documentos", icon: FileText },
      { label: "Mensagens das consultas", to: "/app/medico/mensagens", icon: MessageCircle, requiresCapability: "medico.comunicacao" },
      { label: "Comunicação interna", to: "/app/medico/comunicacao-interna", icon: MessageSquare },
      { label: "Financeiro", to: "/app/medico/financeiro", icon: Wallet },
      { label: "Treinamento", to: "/app/medico/treinamento", icon: BookOpen },
      { label: "Meus Planos", to: "/app/medico/planos", icon: BadgeCheck },
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
          { label: "Inbox", to: "/app/comunicacao/inbox" },
          { label: "Equipe (interna)", to: "/app/secretaria/comunicacao-interna" },
          { label: "Templates", to: "/app/comunicacao/templates" },
          { label: "Métricas", to: "/app/comunicacao/metricas" },
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
      {
        label: "Financeiro",
        icon: Wallet,
        requiresCapability: "financeiro.ver",
        children: [
          { label: "Visão geral", to: "/app/admin/financeiro", requiresCapability: "financeiro.ver" },
          { label: "Repasse e comissões", to: "/app/admin/financeiro/repasse", requiresCapability: "financeiro.editar_comissao" },
          { label: "Prévia de repasse", to: "/app/admin/financeiro/previa-repasse", requiresCapability: "financeiro.editar_comissao" },
        ],
      },
      { label: "Serviços", to: "/app/admin/servicos", icon: Stethoscope, requiresCapability: "financeiro.servicos_gerenciar" },
      { label: "Atendimento imediato", to: "/app/admin/atendimento-imediato", icon: Activity, requiresCapability: "financeiro.servicos_gerenciar" },
      { label: "Cupons", to: "/app/admin/cupons", icon: Tag, requiresCapability: "financeiro.servicos_gerenciar" },
      {
        label: "Planos",
        icon: BadgeCheck,
        requiresCapability: "financeiro.servicos_gerenciar",
        children: [
          { label: "Planos da plataforma", to: "/app/admin/planos" },
          { label: "Planos de médicos", to: "/app/admin/planos-medicos" },
          { label: "Cancelamentos", to: "/app/admin/planos-cancelamentos" },
        ],
      },
      {
        label: "Comunicação",
        icon: MessageCircle,
        children: [
          { label: "Inbox", to: "/app/comunicacao/inbox" },
          { label: "Bot", to: "/app/comunicacao/bot" },
          { label: "IA Avatar", to: "/app/comunicacao/ia" },
          { label: "Templates", to: "/app/comunicacao/templates" },
          { label: "Automações", to: "/app/comunicacao/automacoes" },
          { label: "Métricas", to: "/app/comunicacao/metricas" },
          { label: "Equipe (interna)", to: "/app/admin/comunicacao-interna" },
        ],
      },
      {
        label: "Integrações",
        icon: Plug,
        children: [
          { label: "Visão geral", to: "/app/admin/integracoes" },
          { label: "WhatsApp Business API", to: "/app/admin/integracoes/whatsapp" },
          { label: "Feegow", to: "/app/admin/feegow" },
          { label: "Mapeamento de status", to: "/app/admin/feegow/mapeamento" },
          { label: "Schema lógico", to: "/app/admin/feegow/schema" },
          { label: "Pendências", to: "/app/admin/pendencias-integracao" },
        ],
      },
      {
        label: "Segurança & Acessos",
        icon: ShieldCheck,
        requiresCapability: "colaboradores.alterar_permissoes",
        children: [
          { label: "Permissões", to: "/app/admin/permissoes" },
          { label: "Log de permissões", to: "/app/admin/permissoes/log" },
          { label: "Sessões ativas", to: "/app/admin/sessoes" },
          { label: "Alertas de segurança", to: "/app/admin/seguranca" },
          { label: "Impersonar usuário", to: "/app/admin/impersonar" },
        ],
      },
      {
        label: "Análises",
        icon: TrendingUp,
        children: [
          { label: "Visão geral", to: "/app/admin/analises" },
          { label: "Tempo real", to: "/app/admin/analises/tempo-real" },
          { label: "Tráfego", to: "/app/admin/analises/trafego" },
          { label: "Comportamento", to: "/app/admin/analises/comportamento" },
          { label: "Conversão", to: "/app/admin/analises/conversao" },
          { label: "Financeiro", to: "/app/admin/analises/financeiro" },
          { label: "Marketing", to: "/app/admin/analises/marketing" },
          { label: "Comparativo", to: "/app/admin/analises/comparativo" },
        ],
      },
      {
        label: "Relatórios",
        icon: FileBarChart,
        requiresCapability: "relatorios.ver",
        children: [
          { label: "Visão geral", to: "/app/admin/relatorios" },
          { label: "Financeiro", to: "/app/admin/relatorios/financeiro" },
          { label: "Auditoria", to: "/app/admin/relatorios/auditoria", requiresCapability: "auditoria.ver" },
        ],
      },
      { label: "Auditoria", to: "/app/admin/auditoria", icon: Eye, requiresCapability: "auditoria.ver" },
      { label: "Treinamento", to: "/app/admin/treinamentos", icon: BookOpen },
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
  /**
   * Colaborador — perfil DINÂMICO. Não tem nav fixo aqui; o sidebar usa
   * src/lib/menu/menuCatalog.ts e filtra cada item por has_permission.
   */
  colaborador: {
    key: "colaborador",
    label: "Colaborador",
    basePath: "/app/colaborador",
    accent: "Operação",
    user: { name: "Colaborador", role: "Colaborador", avatarInitials: "CL" },
    nav: [], // intencionalmente vazio — o menu é montado pelo menuCatalog + has_permission
  },
};

export const profileFromPath = (pathname: string): ProfileKey | null => {
  const m = pathname.match(/^\/app\/(paciente|medico|secretaria|colaborador|admin|empresa)/);
  if (!m) return null;
  return m[1] as ProfileKey;
};
