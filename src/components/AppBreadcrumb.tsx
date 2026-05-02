import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Map of route paths to breadcrumb config.
 * Each entry: array of { label, to? } crumbs.
 */
type Crumb = { label: string; to?: string };

/* ─── Helpers para gerar breadcrumbs de forma DRY ─── */
const admin  = (to?: string): Crumb => ({ label: "Admin", to: to ?? "/app/admin/dashboard" });
const medico = (to?: string): Crumb => ({ label: "Médico", to: to ?? "/app/medico/dashboard" });

/** Gera mapeamento rota→breadcrumb para um prefixo, com label-raiz e itens. */
function buildGroup(
  rootCrumb: Crumb,
  basePath: string,
  groupLabel: string,
  groupLink: string | undefined,
  items: Array<{ path: string; label: string; parent?: { label: string; to: string } }>,
): Record<string, Crumb[]> {
  const map: Record<string, Crumb[]> = {};
  for (const item of items) {
    const crumbs: Crumb[] = [rootCrumb];
    if (groupLink) {
      crumbs.push({ label: groupLabel, to: groupLink });
    } else {
      crumbs.push({ label: groupLabel });
    }
    if (item.parent) crumbs.push(item.parent);
    crumbs.push({ label: item.label });
    map[`${basePath}${item.path}`] = crumbs;
  }
  return map;
}

/* ─── Gamificação: configuração única compartilhada ─── */
const GAMIFICACAO_ITEMS: Array<{ path: string; label: string }> = [
  { path: "",            label: "Configuração & Ranking" },
  { path: "/financeiro", label: "Financeiro" },
];

const adminGamificacao = buildGroup(
  admin(), "/app/admin/gamificacao", "Gamificação", "/app/admin/gamificacao",
  GAMIFICACAO_ITEMS,
);

const medicoGamificacao = buildGroup(
  medico(), "/app/medico/gamificacao", "Gamificação & Ranking", undefined,
  [{ path: "", label: "Visão geral" }],
);

const BREADCRUMB_MAP: Record<string, Crumb[]> = {
  // ── Admin: Cadastros ──
  "/app/admin/usuarios":       [admin(), { label: "Cadastros" }, { label: "Usuários" }],
  "/app/admin/medicos":        [admin(), { label: "Cadastros" }, { label: "Médicos" }],
  "/app/admin/colaboradores":  [admin(), { label: "Cadastros" }, { label: "Colaboradores" }],
  "/app/admin/empresas":       [admin(), { label: "Cadastros" }, { label: "Empresas" }],
  "/app/admin/gestao-b2b":     [admin(), { label: "Cadastros" }, { label: "Gestão B2B" }],
  "/app/admin/relatorios-b2b": [admin(), { label: "Cadastros" }, { label: "Relatórios B2B" }],

  // ── Admin: Financeiro ──
  "/app/admin/financeiro":               [admin(), { label: "Financeiro" }, { label: "Visão geral" }],
  "/app/admin/financeiro/repasse":       [admin(), { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Repasse e comissões" }],
  "/app/admin/financeiro/previa-repasse":[admin(), { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Prévia de repasse" }],
  "/app/admin/financeiro/saques-medicos":[admin(), { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Saques médicos" }],

  // ── Admin: Planos ──
  "/app/admin/planos":              [admin(), { label: "Planos" }, { label: "Planos da plataforma" }],
  "/app/admin/planos-medicos":      [admin(), { label: "Planos", to: "/app/admin/planos" }, { label: "Planos de médicos" }],
  "/app/admin/planos-cancelamentos":[admin(), { label: "Planos", to: "/app/admin/planos" }, { label: "Cancelamentos" }],

  // ── Admin: Comunicação ──
  "/app/comunicacao/inbox":      [admin(), { label: "Comunicação" }, { label: "Inbox" }],
  "/app/comunicacao/bot":        [admin(), { label: "Comunicação" }, { label: "Bot" }],
  "/app/comunicacao/ia":         [admin(), { label: "Comunicação" }, { label: "IA Avatar" }],
  "/app/comunicacao/templates":  [admin(), { label: "Comunicação" }, { label: "Templates" }],
  "/app/comunicacao/automacoes": [admin(), { label: "Comunicação" }, { label: "Automações" }],
  "/app/comunicacao/metricas":   [admin(), { label: "Comunicação" }, { label: "Métricas" }],
  "/app/admin/comunicacao-interna": [admin(), { label: "Comunicação" }, { label: "Equipe (interna)" }],

  // ── Admin: Integrações ──
  "/app/admin/integracoes":           [admin(), { label: "Integrações" }, { label: "Visão geral" }],
  "/app/admin/integracoes/whatsapp":  [admin(), { label: "Integrações", to: "/app/admin/integracoes" }, { label: "WhatsApp Business API" }],
  "/app/admin/feegow":                [admin(), { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow" }],
  "/app/admin/feegow/mapeamento":     [admin(), { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow", to: "/app/admin/feegow" }, { label: "Mapeamento de status" }],
  "/app/admin/feegow/schema":         [admin(), { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow", to: "/app/admin/feegow" }, { label: "Schema lógico" }],
  "/app/admin/pendencias-integracao": [admin(), { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Pendências" }],

  // ── Admin: Segurança & Acessos ──
  "/app/admin/permissoes":     [admin(), { label: "Segurança & Acessos" }, { label: "Permissões" }],
  "/app/admin/permissoes/log": [admin(), { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Log de permissões" }],
  "/app/admin/sessoes":        [admin(), { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Sessões ativas" }],
  "/app/admin/seguranca":      [admin(), { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Alertas de segurança" }],
  "/app/admin/impersonar":     [admin(), { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Impersonar usuário" }],

  // ── Admin: Análises ──
  "/app/admin/analises":              [admin(), { label: "Análises" }, { label: "Visão geral" }],
  "/app/admin/analises/tempo-real":   [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Tempo real" }],
  "/app/admin/analises/trafego":      [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Tráfego" }],
  "/app/admin/analises/comportamento":[admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Comportamento" }],
  "/app/admin/analises/conversao":    [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Conversão" }],
  "/app/admin/analises/financeiro":   [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Financeiro" }],
  "/app/admin/analises/marketing":    [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Marketing" }],
  "/app/admin/analises/comparativo":  [admin(), { label: "Análises", to: "/app/admin/analises" }, { label: "Comparativo" }],

  // ── Admin: Relatórios ──
  "/app/admin/relatorios":            [admin(), { label: "Relatórios" }, { label: "Visão geral" }],
  "/app/admin/relatorios/financeiro": [admin(), { label: "Relatórios", to: "/app/admin/relatorios" }, { label: "Financeiro" }],
  "/app/admin/relatorios/auditoria":  [admin(), { label: "Relatórios", to: "/app/admin/relatorios" }, { label: "Auditoria" }],

  // ── Admin: Gamificação (gerado via buildGroup) ──
  ...adminGamificacao,

  // ── Admin: itens soltos ──
  "/app/admin/servicos":             [admin(), { label: "Serviços" }],
  "/app/admin/atendimento-imediato": [admin(), { label: "Atendimento imediato" }],
  "/app/admin/cupons":               [admin(), { label: "Cupons" }],
  "/app/admin/cupons/log":           [admin(), { label: "Cupons", to: "/app/admin/cupons" }, { label: "Log de uso" }],
  "/app/admin/termos-condicoes":     [admin(), { label: "Termos & Condições" }],
  "/app/admin/treinamentos":         [admin(), { label: "Treinamento" }],
  "/app/admin/auditoria":            [admin(), { label: "Auditoria" }],
  "/app/admin/fluxo":                [admin(), { label: "Fluxo operacional" }],
  "/app/admin/configuracoes":        [admin(), { label: "Configurações" }],
  "/app/admin/agendamentos":         [admin(), { label: "Agendamentos" }],
  "/app/admin/planos-empresariais":  [admin(), { label: "Planos", to: "/app/admin/planos" }, { label: "Planos empresariais" }],

  // ── Médico (gamificação gerada via buildGroup) ──
  "/app/medico/dashboard":       [{ label: "Médico" }, { label: "Dashboard" }],
  "/app/medico/agenda":          [medico(), { label: "Agenda" }],
  "/app/medico/corporativo":     [medico(), { label: "Corporativo" }],
  "/app/medico/horarios":        [medico(), { label: "Meus horários" }],
  "/app/medico/consultas":       [medico(), { label: "Consultas" }],
  "/app/medico/servicos":        [medico(), { label: "Serviços da plataforma" }],
  "/app/medico/pacientes":       [medico(), { label: "Pacientes" }],
  "/app/medico/documentos":      [medico(), { label: "Documentos" }],
  "/app/medico/mensagens":       [medico(), { label: "Mensagens das consultas" }],
  "/app/medico/comunicacao-interna": [medico(), { label: "Comunicação interna" }],
  "/app/medico/financeiro":      [medico(), { label: "Financeiro" }],
  "/app/medico/treinamento":     [medico(), { label: "Treinamento" }],
  "/app/medico/planos":          [medico(), { label: "Meus Planos" }],
  ...medicoGamificacao,
  "/app/medico/configuracoes":   [medico(), { label: "Configurações" }],
  "/app/medico/perfil":          [medico(), { label: "Perfil" }],

  // ── Secretaria ──
  "/app/secretaria/dashboard":     [{ label: "Secretaria" }, { label: "Dashboard" }],
  "/app/secretaria/pacientes":     [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Pacientes" }],
  "/app/secretaria/agenda":        [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Agenda" }],
  "/app/secretaria/agendamentos":  [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Agendamentos" }],
  "/app/secretaria/financeiro":    [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Financeiro" }],
  "/app/secretaria/cupons":        [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Cupons" }],
  "/app/secretaria/cupons/log":    [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Cupons", to: "/app/secretaria/cupons" }, { label: "Log de uso" }],
  "/app/secretaria/comunicacao-interna": [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Comunicação" }, { label: "Equipe (interna)" }],
  "/app/secretaria/equipe":        [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Supervisão" }, { label: "Visão da equipe" }],
  "/app/secretaria/relatorios":    [{ label: "Secretaria", to: "/app/secretaria/dashboard" }, { label: "Supervisão" }, { label: "Relatórios operacionais" }],

  // ── Paciente ──
  "/app/paciente/dashboard":     [{ label: "Paciente" }, { label: "Dashboard" }],
  "/app/paciente/agendamentos":  [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Agendamentos" }],
  "/app/paciente/documentos":    [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Documentos" }],
  "/app/paciente/plano":         [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Meu Plano" }],
  "/app/paciente/montar-plano":  [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Montar Plano" }],
  "/app/paciente/financeiro":    [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Financeiro" }],
  "/app/paciente/mensagens":     [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Mensagens" }],
  "/app/paciente/perfil":        [{ label: "Paciente", to: "/app/paciente/dashboard" }, { label: "Perfil" }],

  // ── Empresa ──
  "/app/empresa/dashboard":    [{ label: "Empresa" }, { label: "Dashboard" }],
  "/app/empresa/funcionarios": [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Funcionários" }],
  "/app/empresa/agendamentos": [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Agendamentos" }],
  "/app/empresa/documentos":   [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Documentos" }],
  "/app/empresa/relatorios":   [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Relatórios" }],
  "/app/empresa/financeiro":   [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Financeiro" }],
  "/app/empresa/termos":       [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Termos" }],
  "/app/empresa/perfil":       [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Perfil" }],
};

export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const crumbs = BREADCRUMB_MAP[pathname];

  if (!crumbs || crumbs.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          const isSelfLink = crumb.to === pathname;
          const showAsLink = !isLast && crumb.to && !isSelfLink;
          return (
            <BreadcrumbItem key={i}>
              {i > 0 && <BreadcrumbSeparator className="mr-1.5" />}
              {showAsLink ? (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to!}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
