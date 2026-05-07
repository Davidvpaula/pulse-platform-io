/**
 * React Query hooks para o Dashboard Admin.
 * Centraliza chamadas RPC e queries diretas com cache, retry e invalidation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_DYNAMIC, QUERY_PROFILE } from "@/lib/queryConfig";
import type {
  AdminVisaoGeral,
  FinanceiroCentralDashboard,
  AnalyticsOverview,
  AnalyticsConversao,
  AnalyticsFinanceiro,
  AnalyticsTempoReal,
  AnalyticsTrafego,
  AuditoriaDashboard,
  PermissoesDashboard,
  RelatoriosExecutivo,
  RelatoriosClinica,
  PlanoSaudeFinanceira,
  AdminEmpresaOverviewItem,
} from "./types";

const STALE_1M = 60_000;
const STALE_5M = 5 * 60_000;

// ─── Query key factory ───
export const adminKeys = {
  all: ["admin"] as const,
  visaoGeral: (periodo: string) => ["admin", "visao-geral", periodo] as const,
  financeiroCentral: (inicio: string, fim: string) => ["admin", "financeiro-central", inicio, fim] as const,
  colaboradores: () => ["admin", "colaboradores"] as const,
  agendamentos: (filtroData: string) => ["admin", "agendamentos", filtroData] as const,
  agendamentosOverview: () => ["admin", "agendamentos-overview"] as const,
  empresasOverview: () => ["admin", "empresas-overview"] as const,
  servicosResumo: () => ["admin", "servicos-resumo"] as const,
  integracoesResumo: () => ["admin", "integracoes-resumo"] as const,
  auditoriaDashboard: (inicio?: string, fim?: string) => ["admin", "auditoria-dashboard", inicio, fim] as const,
  permissoesDashboard: () => ["admin", "permissoes-dashboard"] as const,
  analyticsOverview: (dias: number) => ["admin", "analytics-overview", dias] as const,
  analyticsTrafego: (dias: number) => ["admin", "analytics-trafego", dias] as const,
  analyticsConversao: (dias: number) => ["admin", "analytics-conversao", dias] as const,
  analyticsFinanceiro: (dias: number) => ["admin", "analytics-financeiro", dias] as const,
  analyticsTempoReal: () => ["admin", "analytics-tempo-real"] as const,
  relatoriosExecutivo: (inicio?: string, fim?: string) => ["admin", "relatorios-executivo", inicio, fim] as const,
  relatoriosClinica: (params: Record<string, unknown>) => ["admin", "relatorios-clinica", params] as const,
  planoSaude: (planoId: string | null) => ["admin", "plano-saude", planoId] as const,
};

// ─── admin_visao_geral ───
export function useAdminVisaoGeral(periodo: string) {
  return useQuery<AdminVisaoGeral>({
    queryKey: adminKeys.visaoGeral(periodo),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_visao_geral" as never, { _periodo: periodo } as never);
      if (error) throw error;
      return data as unknown as AdminVisaoGeral;
    },
    staleTime: STALE_1M,
    retry: 2,
  });
}

// ─── Colaboradores (query direta) ───
export interface ColabRow {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  funcao_interna: string;
  cargo_descricao: string | null;
  setor: string | null;
  status_conta: string;
  ultimo_acesso_em: string | null;
  created_at: string;
}

export function useColaboradores() {
  return useQuery<ColabRow[]>({
    queryKey: adminKeys.colaboradores(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ColabRow[];
    },
    ...QUERY_DYNAMIC,
  });
}

// ─── Mutations colaboradores ───
export function useColaboradorAlterarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      _id: string; _novo: string; _motivo: string;
      _observacao: string | null; _suspenso_ate: string | null; _indeterminado: boolean;
    }) => {
      const { error } = await supabase.rpc("colaborador_alterar_status", params as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.colaboradores() }),
  });
}

export function useColaboradorAtualizar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { _id: string; _patch: Record<string, unknown> }) => {
      const { error } = await supabase.rpc("colaborador_atualizar", params as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.colaboradores() }),
  });
}

// ─── Agendamentos (query direta) ───
export interface ConsultaAdminRow {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  modalidade: string;
  valor_centavos: number;
  link_sala: string | null;
  link_enviado_em: string | null;
  confirmada_em: string | null;
  canal_origem: string;
  empresa_id: string | null;
  paciente_id: string;
  medico_id: string;
  paciente_nome?: string;
  medico_nome?: string;
  empresa_nome?: string;
  feegow_agendamento_id?: string | null;
  feegow_sync_status?: string | null;
}

function getDateRange(filtroData: string) {
  const agora = new Date();
  let from = new Date(agora); from.setHours(0, 0, 0, 0);
  let to = new Date(agora); to.setDate(to.getDate() + 30); to.setHours(23, 59, 59, 999);
  if (filtroData === "hoje") { to = new Date(agora); to.setHours(23, 59, 59, 999); }
  if (filtroData === "7d") { to = new Date(agora); to.setDate(to.getDate() + 7); to.setHours(23, 59, 59, 999); }
  if (filtroData === "todos") { from = new Date("2020-01-01"); }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useAdminAgendamentos(filtroData: string) {
  return useQuery<ConsultaAdminRow[]>({
    queryKey: adminKeys.agendamentos(filtroData),
    queryFn: async () => {
      const { from, to } = getDateRange(filtroData);
      const { data, error } = await supabase
        .from("consultas")
        .select(`
          id, inicio, fim, status, modalidade, valor_centavos,
          link_sala, link_enviado_em, confirmada_em, canal_origem,
          empresa_id, paciente_id, medico_id,
          feegow_agendamento_id, feegow_sync_status,
          pacientes:pacientes!consultas_paciente_id_fkey ( nome_completo ),
          medicos:medicos!consultas_medico_id_fkey ( nome ),
          empresas:empresas ( razao_social, nome_fantasia )
        `)
        .gte("inicio", from)
        .lte("inicio", to)
        .order("inicio", { ascending: true })
        .limit(500);

      if (error) {
        // Fallback sem joins
        const { data: data2, error: e2 } = await supabase
          .from("consultas")
          .select("id, inicio, fim, status, modalidade, valor_centavos, link_sala, link_enviado_em, confirmada_em, canal_origem, empresa_id, paciente_id, medico_id, feegow_agendamento_id, feegow_sync_status")
          .gte("inicio", from)
          .lte("inicio", to)
          .order("inicio", { ascending: true })
          .limit(500);
        if (e2) throw e2;
        const ids = Array.from(new Set([
          ...(data2 || []).map((r: Record<string, unknown>) => r.paciente_id as string),
          ...(data2 || []).map((r: Record<string, unknown>) => r.medico_id as string),
        ]));
        const [{ data: pacs }, { data: meds }] = await Promise.all([
          supabase.from("pacientes").select("id, nome_completo").in("id", ids),
          supabase.from("medicos").select("id, nome").in("id", ids),
        ]);
        const mapPac = Object.fromEntries((pacs || []).map((p: Record<string, unknown>) => [p.id, p.nome_completo]));
        const mapMed = Object.fromEntries((meds || []).map((m: Record<string, unknown>) => [m.id, m.nome]));
        return (data2 || []).map((r: Record<string, unknown>) => ({
          ...r,
          paciente_nome: mapPac[r.paciente_id as string] || "—",
          medico_nome: mapMed[r.medico_id as string] || "—",
        })) as ConsultaAdminRow[];
      }

      return (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        paciente_nome: (r.pacientes as Record<string, unknown> | null)?.nome_completo || "—",
        medico_nome: (r.medicos as Record<string, unknown> | null)?.nome || "—",
        empresa_nome: (r.empresas as Record<string, unknown> | null)?.nome_fantasia || (r.empresas as Record<string, unknown> | null)?.razao_social,
      })) as ConsultaAdminRow[];
    },
    ...QUERY_DYNAMIC,
  });
}

export function useAgendamentosOverview() {
  return useQuery({
    queryKey: adminKeys.agendamentosOverview(),
    queryFn: async () => {
      const hojeStr = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc("admin_agendamentos_overview", {
        _data: hojeStr, _periodo: "dia",
      });
      if (error) throw error;
      return data;
    },
    staleTime: STALE_1M,
    retry: 1,
  });
}

// ─── Serviços resumo (queries diretas) ───
export interface ServicosResumo {
  total_ativos: number;
  total_inativos: number;
  medicos_vinculados: number;
  overrides_pendentes: number;
  ticket_medio_centavos: number;
}

export function useServicosResumo() {
  return useQuery<ServicosResumo>({
    queryKey: adminKeys.servicosResumo(),
    queryFn: async () => {
      const [{ data: srv }, { count: vinc }, { count: pend }] = await Promise.all([
        supabase.from("servicos_financeiros").select("ativo,valor_paciente_centavos"),
        supabase.from("medico_servicos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("medico_servicos").select("*", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      const ativos = (srv ?? []).filter((s: { ativo: boolean }) => s.ativo);
      const inativos = (srv ?? []).filter((s: { ativo: boolean }) => !s.ativo);
      const valores = ativos.map((s: { valor_paciente_centavos: number | null }) => s.valor_paciente_centavos ?? 0).filter(v => v > 0);
      const ticket = valores.length ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
      return {
        total_ativos: ativos.length,
        total_inativos: inativos.length,
        medicos_vinculados: vinc ?? 0,
        overrides_pendentes: pend ?? 0,
        ticket_medio_centavos: ticket,
      };
    },
    staleTime: STALE_5M,
  });
}

// ─── Integrações config ───
export interface IntegracaoResumo {
  nome: string;
  desc: string;
  status: string;
  cor: string;
}

export function useIntegracoesResumo() {
  return useQuery<IntegracaoResumo[]>({
    queryKey: adminKeys.integracoesResumo(),
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("integracoes_config")
        .select("nome,descricao,status,modo_simulado")
        .eq("ativo", true)
        .order("nome");
      const STATUS_MAP: Record<string, { label: string; cor: string }> = {
        conectado: { label: "Conectado", cor: "info" },
        simulado: { label: "Modo simulado", cor: "warning" },
        erro: { label: "Erro", cor: "destructive" },
        nao_configurado: { label: "Não configurado", cor: "muted" },
        aguardando_configuracao: { label: "Aguardando configuração", cor: "warning" },
        manutencao: { label: "Manutenção", cor: "muted" },
      };
      return (rows ?? []).map((r: { nome: string; descricao: string | null; status: string; modo_simulado: boolean }) => {
        const s = r.modo_simulado
          ? { label: "Modo simulado", cor: "warning" }
          : STATUS_MAP[r.status] ?? { label: r.status, cor: "muted" };
        return { nome: r.nome, desc: r.descricao ?? "", status: s.label, cor: s.cor };
      });
    },
    staleTime: STALE_5M,
  });
}

// ─── financeiro_central_dashboard ───
export function useFinanceiroCentral(inicio: string, fim: string) {
  return useQuery<FinanceiroCentralDashboard>({
    queryKey: adminKeys.financeiroCentral(inicio, fim),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("financeiro_central_dashboard" as never, { _inicio: inicio, _fim: fim } as never);
      if (error) throw error;
      return data as unknown as FinanceiroCentralDashboard;
    },
    staleTime: STALE_1M,
    retry: 2,
  });
}

// ─── analytics ───
export function useAnalyticsOverview(dias: number) {
  return useQuery<AnalyticsOverview>({
    queryKey: adminKeys.analyticsOverview(dias),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_overview" as never, { _dias: dias } as never);
      if (error) throw error;
      return data as unknown as AnalyticsOverview;
    },
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useAnalyticsTrafego(dias: number) {
  return useQuery<AnalyticsTrafego[] | null>({
    queryKey: adminKeys.analyticsTrafego(dias),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_trafego" as never, { _dias: dias } as never);
      if (error) throw error;
      return data as unknown as AnalyticsTrafego[] | null;
    },
    staleTime: STALE_5M,
  });
}

export function useAnalyticsConversao(dias: number) {
  return useQuery<AnalyticsConversao>({
    queryKey: adminKeys.analyticsConversao(dias),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_conversao" as never, { _dias: dias } as never);
      if (error) throw error;
      return data as unknown as AnalyticsConversao;
    },
    staleTime: STALE_5M,
  });
}

export function useAnalyticsFinanceiro(dias: number) {
  return useQuery<AnalyticsFinanceiro>({
    queryKey: adminKeys.analyticsFinanceiro(dias),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_financeiro" as never, { _dias: dias } as never);
      if (error) throw error;
      return data as unknown as AnalyticsFinanceiro;
    },
    staleTime: STALE_5M,
  });
}

export function useAnalyticsTempoReal() {
  return useQuery<AnalyticsTempoReal>({
    queryKey: adminKeys.analyticsTempoReal(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_tempo_real" as never);
      if (error) throw error;
      return data as unknown as AnalyticsTempoReal;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

// ─── auditoria_dashboard ───
export function useAuditoriaDashboard(inicio?: string, fim?: string) {
  return useQuery<AuditoriaDashboard>({
    queryKey: adminKeys.auditoriaDashboard(inicio, fim),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("auditoria_dashboard" as never, {
        _inicio: inicio || null,
        _fim: fim || null,
      } as never);
      if (error) throw error;
      return data as unknown as AuditoriaDashboard;
    },
    staleTime: STALE_5M,
    retry: 2,
  });
}

// ─── permissoes_dashboard ───
export function usePermissoesDashboard() {
  return useQuery<PermissoesDashboard>({
    queryKey: adminKeys.permissoesDashboard(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("permissoes_dashboard" as never);
      if (error) throw error;
      return data as unknown as PermissoesDashboard;
    },
    staleTime: STALE_5M,
  });
}

// ─── relatorios ───
export function useRelatoriosExecutivo(inicio?: string, fim?: string) {
  return useQuery<RelatoriosExecutivo>({
    queryKey: adminKeys.relatoriosExecutivo(inicio, fim),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("relatorios_executivo" as never, {
        p_inicio: inicio || null,
        p_fim: fim || null,
      } as never);
      if (error) throw error;
      return data as unknown as RelatoriosExecutivo;
    },
    staleTime: STALE_5M,
  });
}

export function useRelatoriosClinica(params: {
  inicio?: string; fim?: string; medico_id?: string; especialidade?: string;
}) {
  return useQuery<RelatoriosClinica>({
    queryKey: adminKeys.relatoriosClinica(params),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("relatorios_clinica" as never, {
        p_inicio: params.inicio || null,
        p_fim: params.fim || null,
        p_medico_id: params.medico_id || null,
        p_especialidade_id: null,
      } as never);
      if (error) throw error;
      return data as unknown as RelatoriosClinica;
    },
    staleTime: STALE_5M,
  });
}

// ─── plano_saude_financeira ───
export function usePlanoSaudeFinanceira(planoId: string | null) {
  return useQuery<PlanoSaudeFinanceira>({
    queryKey: adminKeys.planoSaude(planoId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("plano_saude_financeira" as never, { _plano_id: planoId } as never);
      if (error) throw error;
      return data as unknown as PlanoSaudeFinanceira;
    },
    enabled: !!planoId,
    staleTime: STALE_5M,
  });
}

// ─── admin_empresas_overview ───
export function useAdminEmpresasOverview() {
  return useQuery<AdminEmpresaOverviewItem[]>({
    queryKey: adminKeys.empresasOverview(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_empresas_overview" as never);
      if (error) throw error;
      return (data as unknown as AdminEmpresaOverviewItem[]) ?? [];
    },
    staleTime: STALE_5M,
    retry: 2,
  });
}
