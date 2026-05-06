/**
 * React Query hooks para o Dashboard Admin.
 * Centraliza chamadas RPC com cache, retry e invalidation.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

// ─── admin_visao_geral ───
export function useAdminVisaoGeral(periodo: string) {
  return useQuery<AdminVisaoGeral>({
    queryKey: ["admin", "visao-geral", periodo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_visao_geral" as never, { _periodo: periodo } as never);
      if (error) throw error;
      return data as unknown as AdminVisaoGeral;
    },
    staleTime: STALE_1M,
    retry: 2,
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
    queryKey: ["admin", "servicos-resumo"],
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
    queryKey: ["admin", "integracoes-resumo"],
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
    queryKey: ["admin", "financeiro-central", inicio, fim],
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
    queryKey: ["admin", "analytics-overview", dias],
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
    queryKey: ["admin", "analytics-trafego", dias],
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
    queryKey: ["admin", "analytics-conversao", dias],
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
    queryKey: ["admin", "analytics-financeiro", dias],
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
    queryKey: ["admin", "analytics-tempo-real"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("analytics_tempo_real" as never);
      if (error) throw error;
      return data as unknown as AnalyticsTempoReal;
    },
    staleTime: 15_000, // 15s for real-time
    refetchInterval: 30_000,
  });
}

// ─── auditoria_dashboard ───
export function useAuditoriaDashboard(inicio?: string, fim?: string) {
  return useQuery<AuditoriaDashboard>({
    queryKey: ["admin", "auditoria-dashboard", inicio, fim],
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
    queryKey: ["admin", "permissoes-dashboard"],
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
    queryKey: ["admin", "relatorios-executivo", inicio, fim],
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
    queryKey: ["admin", "relatorios-clinica", params],
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
    queryKey: ["admin", "plano-saude", planoId],
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
    queryKey: ["admin", "empresas-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_empresas_overview" as never);
      if (error) throw error;
      return (data as unknown as AdminEmpresaOverviewItem[]) ?? [];
    },
    staleTime: STALE_5M,
    retry: 2,
  });
}
