/**
 * React Query hooks centralizados para o Dashboard Paciente.
 * Todas as páginas paciente devem usar estes hooks.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listConsultasDoPaciente,
  listRetornosDisponiveis,
  listDocumentosDoPaciente,
  listAnexosConsultaDoPaciente,
  type ConsultaDetalhada,
  type RetornoComContexto,
  type DocumentoPaciente,
  type AnexoConsulta,
} from "@/lib/clinico";
import { listConversasPaciente, type ConversaPaciente } from "@/lib/pacienteConversas";
import { consultasAvaliadasIds } from "@/lib/gamificacao";
import { QUERY_DYNAMIC, QUERY_PROFILE, QUERY_REALTIME, QUERY_STATIC } from "@/lib/queryConfig";
import { obs } from "@/lib/observability";

/* ─── Query Keys ─── */
export const pacienteKeys = {
  all: ["paciente"] as const,
  consultas: () => ["paciente", "consultas"] as const,
  retornos: () => ["paciente", "retornos"] as const,
  documentos: () => ["paciente", "documentos"] as const,
  anexos: () => ["paciente", "anexos"] as const,
  financeiro: () => ["paciente", "financeiro"] as const,
  plano: (pacienteId: string) => ["paciente", "plano", pacienteId] as const,
  assinatura: (pacienteId: string) => ["paciente", "assinatura", pacienteId] as const,
  conversas: () => ["paciente", "conversas"] as const,
  perfil: (pacienteId: string) => ["paciente", "perfil", pacienteId] as const,
  avaliadas: (ids: string[]) => ["paciente", "avaliadas", ...ids] as const,
  dashboardStats: (pacienteId: string) => ["paciente", "dashboardStats", pacienteId] as const,
} as const;

/* ─── Consultas ─── */
export function usePacienteConsultas(enabled = true) {
  return useQuery<ConsultaDetalhada[]>({
    queryKey: pacienteKeys.consultas(),
    queryFn: async () => {
      const start = performance.now();
      const data = await listConsultasDoPaciente();
      obs.info("query", "paciente.consultas carregadas", {
        module: "paciente",
        durationMs: Math.round(performance.now() - start),
        meta: { count: data.length },
      });
      return data;
    },
    enabled,
    ...QUERY_DYNAMIC,
  });
}

/* ─── Retornos gratuitos ─── */
export function usePacienteRetornos(enabled = true) {
  return useQuery<RetornoComContexto[]>({
    queryKey: pacienteKeys.retornos(),
    queryFn: listRetornosDisponiveis,
    enabled,
    ...QUERY_DYNAMIC,
  });
}

/* ─── Documentos ─── */
export function usePacienteDocumentos(enabled = true) {
  return useQuery<DocumentoPaciente[]>({
    queryKey: pacienteKeys.documentos(),
    queryFn: listDocumentosDoPaciente,
    enabled,
    ...QUERY_DYNAMIC,
  });
}

/* ─── Anexos de consultas ─── */
export function usePacienteAnexos(enabled = true) {
  return useQuery<AnexoConsulta[]>({
    queryKey: pacienteKeys.anexos(),
    queryFn: listAnexosConsultaDoPaciente,
    enabled,
    ...QUERY_DYNAMIC,
  });
}

/* ─── Conversas / Mensagens ─── */
export function usePacienteConversas(enabled = true) {
  return useQuery<ConversaPaciente[]>({
    queryKey: pacienteKeys.conversas(),
    queryFn: listConversasPaciente,
    enabled,
    ...QUERY_REALTIME,
  });
}

/* ─── Dashboard Stats (plano, pendências, empresa) ─── */
export function usePacienteDashboardStats(pacienteId: string | null, enabled = true) {
  return useQuery({
    queryKey: pacienteKeys.dashboardStats(pacienteId ?? ""),
    queryFn: async () => {
      if (!pacienteId) throw new Error("pacienteId required");

      const [assinaturaRes, pendenciasRes, empresaRes] = await Promise.all([
        supabase
          .from("assinaturas")
          .select("plano_id, status, planos(nome)")
          .eq("paciente_id", pacienteId)
          .in("status", ["ativa", "trial"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("pagamentos")
          .select("id", { count: "exact", head: true })
          .eq("paciente_id", pacienteId)
          .in("status", ["pendente", "processando"]),
        supabase
          .from("empresas_funcionarios")
          .select("empresa_id, status, empresas(nome_fantasia)")
          .eq("paciente_id", pacienteId)
          .eq("status", "ativo")
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        planoNome: assinaturaRes.data
          ? ((assinaturaRes.data as any).planos?.nome ?? "Plano ativo")
          : null,
        pendenciasFinanceiras: pendenciasRes.count ?? 0,
        empresaLink: empresaRes.data
          ? {
              empresa: (empresaRes.data as any).empresas?.nome_fantasia ?? "Empresa",
              status: empresaRes.data.status,
            }
          : null,
      };
    },
    enabled: enabled && !!pacienteId,
    ...QUERY_PROFILE,
  });
}

/* ─── Financeiro (pagamentos) ─── */
export function usePacienteFinanceiro(enabled = true) {
  return useQuery({
    queryKey: pacienteKeys.financeiro(),
    queryFn: async () => {
      const start = performance.now();

      const { data: pags, error } = await supabase
        .from("pagamentos")
        .select(`
          id, consulta_id, valor_centavos, status, metodo, provider,
          checkout_url, paid_at, cancelled_at, created_at, metadata,
          consultas!inner(inicio, modalidade, medico_id, especialidade_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const medicoIds = Array.from(new Set((pags ?? []).map((p: any) => p.consultas?.medico_id).filter(Boolean)));
      const espIds = Array.from(new Set((pags ?? []).map((p: any) => p.consultas?.especialidade_id).filter(Boolean)));

      const [medRes, espRes] = await Promise.all([
        medicoIds.length ? supabase.from("medicos").select("id, nome").in("id", medicoIds) : Promise.resolve({ data: [] as any[] }),
        espIds.length ? supabase.from("especialidades").select("id, nome").in("id", espIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const medMap = new Map((medRes.data ?? []).map((m: any) => [m.id, m.nome]));
      const espMap = new Map((espRes.data ?? []).map((e: any) => [e.id, e.nome]));

      const linhas = (pags ?? []).map((p: any) => ({
        id: p.id,
        consulta_id: p.consulta_id,
        valor_centavos: p.valor_centavos,
        status: p.status,
        metodo: p.metodo,
        provider: p.provider,
        checkout_url: p.checkout_url,
        paid_at: p.paid_at,
        cancelled_at: p.cancelled_at,
        created_at: p.created_at,
        metadata: p.metadata ?? {},
        consulta: {
          inicio: p.consultas?.inicio,
          modalidade: p.consultas?.modalidade,
          medico_nome: medMap.get(p.consultas?.medico_id) ?? "Médico",
          especialidade_nome: espMap.get(p.consultas?.especialidade_id) ?? "—",
        },
      }));

      obs.info("query", "paciente.financeiro carregado", {
        module: "paciente",
        durationMs: Math.round(performance.now() - start),
        meta: { count: linhas.length },
      });

      return linhas;
    },
    enabled,
    ...QUERY_DYNAMIC,
  });
}

/* ─── Planos (assinaturas + planos disponíveis) ─── */
export function usePacientePlanos(pacienteId: string | null, enabled = true) {
  return useQuery({
    queryKey: pacienteKeys.plano(pacienteId ?? ""),
    queryFn: async () => {
      if (!pacienteId) throw new Error("pacienteId required");

      const [assinaturasRes, planosRes, pagamentosRes] = await Promise.all([
        supabase
          .from("assinaturas")
          .select("*, planos(*)")
          .eq("paciente_id", pacienteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("planos")
          .select("*, plano_beneficios(nome)")
          .eq("publicado_site", true)
          .eq("status", "ativo")
          .order("ordem_exibicao"),
        supabase
          .from("pagamentos")
          .select("*")
          .eq("paciente_id", pacienteId)
          .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const assinaturas = assinaturasRes.data ?? [];
      const planoIds = [...new Set(assinaturas.map(a => a.plano_id))];

      let beneficiosMap: Record<string, any[]> = {};
      if (planoIds.length > 0) {
        const { data: bens } = await supabase
          .from("plano_beneficios")
          .select("*")
          .in("plano_id", planoIds)
          .order("ordem");
        for (const b of (bens ?? [])) {
          if (!beneficiosMap[b.plano_id]) beneficiosMap[b.plano_id] = [];
          beneficiosMap[b.plano_id].push(b);
        }
      }

      return {
        assinaturas,
        beneficiosMap,
        planosDisponiveis: planosRes.data ?? [],
        pagamentos: pagamentosRes.data ?? [],
      };
    },
    enabled: enabled && !!pacienteId,
    ...QUERY_PROFILE,
  });
}

/* ─── Consultas avaliadas (gamificação) ─── */
export function usePacienteAvaliadas(consultaIds: string[], enabled = true) {
  return useQuery<Set<string>>({
    queryKey: pacienteKeys.avaliadas(consultaIds),
    queryFn: () => consultasAvaliadasIds(consultaIds),
    enabled: enabled && consultaIds.length > 0,
    ...QUERY_STATIC,
  });
}
