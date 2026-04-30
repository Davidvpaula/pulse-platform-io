import { supabase } from "@/integrations/supabase/client";

/**
 * Funções somente-leitura para a tela "Prévia de impacto do repasse".
 * NÃO faz nenhum UPDATE/INSERT/DELETE em consultas, app_settings ou overrides.
 *
 * Convenção (igual a financeiroConfig.ts):
 *   - app_settings['financeiro.comissao_padrao_pct'] = % PLATAFORMA
 *   - medico_comissao_override.comissao_pct          = % PLATAFORMA
 *   - Na UI exibimos sempre % MÉDICO = 100 - plataforma
 */

const SETTING_KEY = "financeiro.comissao_padrao_pct";

export type StatusConsultaPrevia =
  | "agendada"
  | "aguardando_pagamento"
  | "confirmada"
  | "em_andamento"
  | "concluida"
  | "cancelada"
  | "no_show";

export type ConsultaPreviaRow = {
  id: string;
  medico_id: string;
  medico_nome: string | null;
  inicio: string;
  status: StatusConsultaPrevia;
  // valor base usado para o cálculo (snapshot quando existe, senão valor_centavos)
  valor_centavos: number;
  // snapshot imutável já gravado
  pct_medico_snapshot: number | null;
  valor_medico_snapshot_centavos: number | null;
};

export type SlotFuturoPreviaRow = {
  slot_id: string;
  medico_id: string;
  medico_nome: string | null;
  inicio: string;
  preco_centavos: number; // base para simulação
};

export type RegrasVigentes = {
  globalPctMedico: number;
  // medico_id -> pct médico (override ativo, particular)
  overridesPorMedico: Record<string, number>;
};

export type RegraSimulada =
  | { tipo: "vigente" }
  | { tipo: "global"; pctMedico: number }
  | { tipo: "override"; medicoId: string; pctMedico: number };

export type FiltroPrevia = {
  desde?: string | null; // ISO
  ate?: string | null;   // ISO
  status?: StatusConsultaPrevia[] | null;
  medicoId?: string | null;
  limit?: number;
};

// ============== LEITURA ==============

export async function getRegrasVigentes(): Promise<RegrasVigentes> {
  const [settingRes, ovRes] = await Promise.all([
    supabase.from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle(),
    supabase
      .from("medico_comissao_override")
      .select("medico_id, comissao_pct, ativo, servico_id")
      .is("servico_id", null)
      .eq("ativo", true),
  ]);
  if (settingRes.error) throw settingRes.error;
  if (ovRes.error) throw ovRes.error;

  const raw = settingRes.data?.value;
  const plataforma =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
      ? Number(raw)
      : raw && typeof raw === "object"
      ? Number((raw as any).valueOf?.()) || 44
      : 44;
  const globalPlataforma = Number.isFinite(plataforma)
    ? Math.max(0, Math.min(100, plataforma))
    : 44;
  const globalPctMedico = round2(100 - globalPlataforma);

  const overridesPorMedico: Record<string, number> = {};
  for (const r of ovRes.data ?? []) {
    const platf = Math.max(0, Math.min(100, Number((r as any).comissao_pct) || 0));
    overridesPorMedico[(r as any).medico_id] = round2(100 - platf);
  }

  return { globalPctMedico, overridesPorMedico };
}

export async function listConsultasParticularesParaPrevia(
  filtros: FiltroPrevia = {},
): Promise<ConsultaPreviaRow[]> {
  const limit = Math.min(Math.max(filtros.limit ?? 100, 1), 500);
  let q = supabase
    .from("consultas")
    .select(
      `id, medico_id, inicio, status, valor_centavos,
       valor_snapshot_centavos, comissao_snapshot_centavos, comissao_percentual_snapshot,
       servico_id,
       medicos:medico_id ( nome_completo )`,
    )
    .is("servico_id", null)
    .order("inicio", { ascending: false })
    .limit(limit);

  if (filtros.desde) q = q.gte("inicio", filtros.desde);
  if (filtros.ate) q = q.lte("inicio", filtros.ate);
  if (filtros.status && filtros.status.length) q = q.in("status", filtros.status as any);
  if (filtros.medicoId) q = q.eq("medico_id", filtros.medicoId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => {
    const valorBase = Number(r.valor_snapshot_centavos ?? r.valor_centavos ?? 0);
    const pctPlatfSnap =
      r.comissao_percentual_snapshot != null ? Number(r.comissao_percentual_snapshot) : null;
    const pctMedSnap = pctPlatfSnap != null ? round2(100 - pctPlatfSnap) : null;
    const valMedSnap =
      r.comissao_snapshot_centavos != null && r.valor_snapshot_centavos != null
        ? Math.max(0, Number(r.valor_snapshot_centavos) - Number(r.comissao_snapshot_centavos))
        : null;
    return {
      id: r.id,
      medico_id: r.medico_id,
      medico_nome: r.medicos?.nome_completo ?? null,
      inicio: r.inicio,
      status: r.status,
      valor_centavos: valorBase,
      pct_medico_snapshot: pctMedSnap,
      valor_medico_snapshot_centavos: valMedSnap,
    };
  });
}

export async function listSlotsParticularesFuturosParaPrevia(
  filtros: FiltroPrevia = {},
): Promise<SlotFuturoPreviaRow[]> {
  const limit = Math.min(Math.max(filtros.limit ?? 100, 1), 500);
  const desde = filtros.desde ?? new Date().toISOString();

  let q = supabase
    .from("agenda_slots")
    .select(
      `id, medico_id, inicio, status, servico_id,
       medicos:medico_id ( nome_completo )`,
    )
    .is("servico_id", null)
    .eq("status", "disponivel")
    .gte("inicio", desde)
    .order("inicio", { ascending: true })
    .limit(limit);

  if (filtros.ate) q = q.lte("inicio", filtros.ate);
  if (filtros.medicoId) q = q.eq("medico_id", filtros.medicoId);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const medicoIds = Array.from(new Set(rows.map((r) => r.medico_id))) as string[];
  const { data: precos, error: precoErr } = await supabase
    .from("medico_especialidades")
    .select("medico_id, preco_centavos, ativo")
    .in("medico_id", medicoIds)
    .eq("ativo", true);
  if (precoErr) throw precoErr;

  // Pega o menor preço ativo por médico como referência da simulação
  const precoPorMedico = new Map<string, number>();
  for (const p of precos ?? []) {
    const cur = precoPorMedico.get((p as any).medico_id);
    const v = Number((p as any).preco_centavos) || 0;
    if (cur === undefined || v < cur) precoPorMedico.set((p as any).medico_id, v);
  }

  return rows.map((r) => ({
    slot_id: r.id,
    medico_id: r.medico_id,
    medico_nome: r.medicos?.nome_completo ?? null,
    inicio: r.inicio,
    preco_centavos: precoPorMedico.get(r.medico_id) ?? 0,
  }));
}

// ============== CÁLCULO ==============

export type SimResultado = {
  pctMedico: number;
  valorMedicoCentavos: number;
  origem: "exceção do médico" | "regra global" | "simulação global" | "simulação exceção";
};

export function resolverPctMedicoVigente(
  medicoId: string,
  regras: RegrasVigentes,
): { pct: number; origem: "exceção do médico" | "regra global" } {
  const ov = regras.overridesPorMedico[medicoId];
  if (ov !== undefined) return { pct: ov, origem: "exceção do médico" };
  return { pct: regras.globalPctMedico, origem: "regra global" };
}

export function simularRepasse(
  valorCentavos: number,
  medicoId: string,
  regrasVigentes: RegrasVigentes,
  simulada: RegraSimulada,
): SimResultado {
  if (simulada.tipo === "vigente") {
    const { pct, origem } = resolverPctMedicoVigente(medicoId, regrasVigentes);
    return {
      pctMedico: pct,
      valorMedicoCentavos: aplicarPct(valorCentavos, pct),
      origem,
    };
  }
  if (simulada.tipo === "override") {
    if (simulada.medicoId === medicoId) {
      return {
        pctMedico: simulada.pctMedico,
        valorMedicoCentavos: aplicarPct(valorCentavos, simulada.pctMedico),
        origem: "simulação exceção",
      };
    }
    // Simulação de override só afeta o médico escolhido; demais usam regra vigente
    const { pct, origem } = resolverPctMedicoVigente(medicoId, regrasVigentes);
    return { pctMedico: pct, valorMedicoCentavos: aplicarPct(valorCentavos, pct), origem };
  }
  // simulação global → ignora overrides existentes para fins didáticos
  return {
    pctMedico: simulada.pctMedico,
    valorMedicoCentavos: aplicarPct(valorCentavos, simulada.pctMedico),
    origem: "simulação global",
  };
}

function aplicarPct(valorCentavos: number, pctMedico: number): number {
  const v = Math.max(0, Math.round(valorCentavos));
  const p = Math.max(0, Math.min(100, pctMedico));
  return Math.round((v * p) / 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
