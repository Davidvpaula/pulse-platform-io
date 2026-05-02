import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Map of route paths to breadcrumb config.
 * Each entry: [parentLabel, parentLink, ...intermediates, currentLabel]
 * Intermediates are [label, link] tuples.
 */
type Crumb = { label: string; to?: string };

const BREADCRUMB_MAP: Record<string, Crumb[]> = {
  // ── Admin: Cadastros ──
  "/app/admin/usuarios":       [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cadastros" }, { label: "Usuários" }],
  "/app/admin/medicos":        [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cadastros" }, { label: "Médicos" }],
  "/app/admin/colaboradores":  [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cadastros" }, { label: "Colaboradores" }],
  "/app/admin/empresas":       [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cadastros" }, { label: "Empresas" }],

  // ── Admin: Financeiro ──
  "/app/admin/financeiro":               [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Financeiro" }, { label: "Visão geral" }],
  "/app/admin/financeiro/repasse":       [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Repasse e comissões" }],
  "/app/admin/financeiro/previa-repasse":[{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Prévia de repasse" }],
  "/app/admin/financeiro/saques-medicos":[{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Financeiro", to: "/app/admin/financeiro" }, { label: "Saques médicos" }],

  // ── Admin: Planos ──
  "/app/admin/planos":              [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Planos" }, { label: "Planos da plataforma" }],
  "/app/admin/planos-medicos":      [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Planos", to: "/app/admin/planos" }, { label: "Planos de médicos" }],
  "/app/admin/planos-cancelamentos":[{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Planos", to: "/app/admin/planos" }, { label: "Cancelamentos" }],

  // ── Admin: Comunicação ──
  "/app/comunicacao/inbox":      [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Inbox" }],
  "/app/comunicacao/bot":        [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Bot" }],
  "/app/comunicacao/ia":         [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "IA Avatar" }],
  "/app/comunicacao/templates":  [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Templates" }],
  "/app/comunicacao/automacoes": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Automações" }],
  "/app/comunicacao/metricas":   [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Métricas" }],
  "/app/admin/comunicacao-interna": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Comunicação" }, { label: "Equipe (interna)" }],

  // ── Admin: Integrações ──
  "/app/admin/integracoes":           [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações" }, { label: "Visão geral" }],
  "/app/admin/integracoes/whatsapp":  [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações", to: "/app/admin/integracoes" }, { label: "WhatsApp Business API" }],
  "/app/admin/feegow":                [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow" }],
  "/app/admin/feegow/mapeamento":     [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow", to: "/app/admin/feegow" }, { label: "Mapeamento de status" }],
  "/app/admin/feegow/schema":         [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Feegow", to: "/app/admin/feegow" }, { label: "Schema lógico" }],
  "/app/admin/pendencias-integracao": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Integrações", to: "/app/admin/integracoes" }, { label: "Pendências" }],

  // ── Admin: Segurança & Acessos ──
  "/app/admin/permissoes":     [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Segurança & Acessos" }, { label: "Permissões" }],
  "/app/admin/permissoes/log": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Log de permissões" }],
  "/app/admin/sessoes":        [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Sessões ativas" }],
  "/app/admin/seguranca":      [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Alertas de segurança" }],
  "/app/admin/impersonar":     [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Segurança & Acessos", to: "/app/admin/permissoes" }, { label: "Impersonar usuário" }],

  // ── Admin: Análises ──
  "/app/admin/analises":              [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises" }, { label: "Visão geral" }],
  "/app/admin/analises/tempo-real":   [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Tempo real" }],
  "/app/admin/analises/trafego":      [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Tráfego" }],
  "/app/admin/analises/comportamento":[{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Comportamento" }],
  "/app/admin/analises/conversao":    [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Conversão" }],
  "/app/admin/analises/financeiro":   [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Financeiro" }],
  "/app/admin/analises/marketing":    [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Marketing" }],
  "/app/admin/analises/comparativo":  [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Análises", to: "/app/admin/analises" }, { label: "Comparativo" }],

  // ── Admin: Relatórios ──
  "/app/admin/relatorios":            [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Relatórios" }, { label: "Visão geral" }],
  "/app/admin/relatorios/financeiro": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Relatórios", to: "/app/admin/relatorios" }, { label: "Financeiro" }],
  "/app/admin/relatorios/auditoria":  [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Relatórios", to: "/app/admin/relatorios" }, { label: "Auditoria" }],

  // ── Admin: Gamificação (já existia inline, agora centralizado) ──
  "/app/admin/gamificacao":            [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Gamificação", to: "/app/admin/gamificacao" }, { label: "Configuração & Ranking" }],
  "/app/admin/gamificacao/financeiro": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Gamificação", to: "/app/admin/gamificacao" }, { label: "Financeiro" }],

  // ── Admin: itens soltos com breadcrumb simples ──
  "/app/admin/servicos":             [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Serviços" }],
  "/app/admin/atendimento-imediato": [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Atendimento imediato" }],
  "/app/admin/cupons":               [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cupons" }],
  "/app/admin/cupons/log":           [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Cupons", to: "/app/admin/cupons" }, { label: "Log de uso" }],
  "/app/admin/termos-condicoes":     [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Termos & Condições" }],
  "/app/admin/treinamentos":         [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Treinamento" }],
  "/app/admin/auditoria":            [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Auditoria" }],
  "/app/admin/fluxo":                [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Fluxo operacional" }],
  "/app/admin/configuracoes":        [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Configurações" }],
  "/app/admin/agendamentos":         [{ label: "Admin", to: "/app/admin/dashboard" }, { label: "Agendamentos" }],

  // ── Médico ──
  "/app/medico/dashboard":       [{ label: "Médico" }, { label: "Dashboard" }],
  "/app/medico/agenda":          [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Agenda" }],
  "/app/medico/horarios":        [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Meus horários" }],
  "/app/medico/consultas":       [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Consultas" }],
  "/app/medico/servicos":        [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Serviços da plataforma" }],
  "/app/medico/pacientes":       [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Pacientes" }],
  "/app/medico/documentos":      [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Documentos" }],
  "/app/medico/mensagens":       [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Mensagens das consultas" }],
  "/app/medico/comunicacao-interna": [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Comunicação interna" }],
  "/app/medico/financeiro":      [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Financeiro" }],
  "/app/medico/treinamento":     [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Treinamento" }],
  "/app/medico/planos":          [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Meus Planos" }],
  "/app/medico/gamificacao":     [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Gamificação & Ranking" }],
  "/app/medico/configuracoes":   [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Configurações" }],
  "/app/medico/perfil":          [{ label: "Médico", to: "/app/medico/dashboard" }, { label: "Perfil" }],

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
  "/app/empresa/relatorios":   [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Relatórios" }],
  "/app/empresa/financeiro":   [{ label: "Empresa", to: "/app/empresa/dashboard" }, { label: "Financeiro" }],
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
          return (
            <BreadcrumbItem key={i}>
              {i > 0 && <BreadcrumbSeparator className="mr-1.5" />}
              {isLast || !crumb.to ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.to}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
