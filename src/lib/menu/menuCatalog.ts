import {
  LayoutDashboard, Calendar, Users, Wallet, MessageCircle, MessageSquare,
  ClipboardList, ListTodo, BadgeCheck, Activity, FileBarChart, Eye,
  AlertTriangle, Plug, Tag, Stethoscope, Settings, ShieldCheck, TrendingUp, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Catálogo do menu do Colaborador.
 *
 * Cada item declara uma `key` que é cruzada contra `has_permission` no banco.
 * Item aparece se a chave retornar true para o usuário logado. O Admin libera
 * permissões via grant individual, função interna (Secretaria, Supervisor,
 * Financeiro, Comercial, Suporte) ou pela permissão padrão do role.
 *
 * Para itens com submenu (children), o pai aparece se PELO MENOS UM filho
 * estiver liberado.
 *
 * Importante: as chaves devem existir em public.permissions_catalog (validadas
 * em dev por validateMenuKeys.ts).
 */

export type MenuLeaf = {
  label: string;
  to: string;
  /** Permission key consultada via has_permission. Se omitida, item é sempre visível. */
  key?: string;
};

export type MenuNode = {
  label: string;
  icon: LucideIcon;
  /** Item simples — leva direto a uma rota. */
  to?: string;
  /** Permission key para itens simples; opcional. */
  key?: string;
  /** Submenu — pai aparece se algum filho passar. */
  children?: MenuLeaf[];
};

/**
 * Menu base do Colaborador.
 * Todas as rotas usam o prefixo /app/colaborador/* (alias das mesmas páginas
 * já existentes em /app/secretaria/*).
 */
export const colaboradorMenu: MenuNode[] = [
  {
    label: "Dashboard",
    to: "/app/colaborador/dashboard",
    icon: LayoutDashboard,
    // sempre visível para qualquer colaborador autenticado
  },
  {
    label: "Pacientes",
    to: "/app/colaborador/pacientes",
    icon: Users,
    key: "pacientes.ver",
  },
  {
    label: "Agenda",
    to: "/app/colaborador/agenda",
    icon: Calendar,
    key: "agenda.ver_todas",
  },
  {
    label: "Agendamentos",
    to: "/app/colaborador/agendamentos",
    icon: ClipboardList,
    key: "agenda.ver_todas",
  },
  {
    label: "Comunicação",
    icon: MessageCircle,
    children: [
      { label: "Inbox", to: "/app/comunicacao/inbox", key: "comunicacao.ver_inbox" },
      { label: "Equipe (interna)", to: "/app/colaborador/comunicacao-interna" },
      { label: "Templates", to: "/app/comunicacao/templates", key: "comunicacao.usar_templates" },
      { label: "Métricas", to: "/app/comunicacao/metricas", key: "comunicacao.ver_metricas" },
    ],
  },
  {
    label: "Financeiro",
    to: "/app/colaborador/financeiro",
    icon: Wallet,
    key: "financeiro.ver",
  },
  {
    label: "Cupons",
    to: "/app/colaborador/cupons",
    icon: Tag,
    key: "financeiro.servicos_gerenciar",
  },
  {
    label: "Tarefas",
    to: "/app/colaborador/tarefas",
    icon: ListTodo,
    // disponível para qualquer colaborador
  },
  {
    label: "Pendências Feegow",
    to: "/app/colaborador/pendencias-integracao",
    icon: AlertTriangle,
    key: "supervisor.pendencias_feegow",
  },
  {
    label: "Supervisão",
    icon: Activity,
    children: [
      { label: "Equipe & Produtividade", to: "/app/colaborador/equipe", key: "supervisor.fila_geral" },
      { label: "Relatórios operacionais", to: "/app/colaborador/relatorios", key: "relatorios.ver_operacional" },
    ],
  },
  {
    label: "Gamificação",
    icon: Trophy,
    key: "gamificacao.configurar",
    children: [
      { label: "Configuração & Ranking", to: "/app/colaborador/gamificacao" },
      { label: "Financeiro", to: "/app/colaborador/gamificacao/financeiro" },
    ],
  },
  {
    label: "Auditoria",
    to: "/app/colaborador/auditoria",
    icon: Eye,
    key: "auditoria.ver",
  },
];

/** Coleta todas as permission keys referenciadas no catálogo (sem duplicatas). */
export function collectMenuKeys(menu: MenuNode[]): string[] {
  const set = new Set<string>();
  for (const node of menu) {
    if (node.key) set.add(node.key);
    for (const c of node.children ?? []) {
      if (c.key) set.add(c.key);
    }
  }
  return [...set];
}
