import { supabase } from "@/integrations/supabase/client";

/**
 * Convenção do banco:
 *   app_settings['financeiro.comissao_padrao_pct'] = % DA PLATAFORMA
 *   medico_comissao_override.comissao_pct           = % DA PLATAFORMA
 *
 * No produto falamos em "% repasse médico", então a UI converte:
 *   repasse_medico = 100 - plataforma
 */

export const SETTING_KEY = "financeiro.comissao_padrao_pct";

export type RepasseGlobal = {
  plataformaPct: number;
  medicoPct: number;
};

export async function getRepasseGlobal(): Promise<RepasseGlobal> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTING_KEY)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.value;
  const plataforma =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
      ? Number(raw)
      : raw && typeof raw === "object"
      ? Number((raw as any).valueOf?.()) || 44
      : 44;
  const safe = Number.isFinite(plataforma) ? Math.max(0, Math.min(100, plataforma)) : 44;
  return { plataformaPct: safe, medicoPct: round2(100 - safe) };
}

export async function setRepasseGlobal(medicoPct: number, motivo?: string | null): Promise<void> {
  const m = clampPct(medicoPct);
  const plataforma = round2(100 - m);
  await comMotivo(motivo, async () => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: SETTING_KEY, value: plataforma as any }, { onConflict: "key" });
    if (error) throw error;
  });
}

/**
 * Helper: define um motivo opcional na sessão antes de executar a operação.
 * As triggers de auditoria leem esse motivo via current_setting('app.audit_motivo').
 */
async function comMotivo<T>(motivo: string | null | undefined, fn: () => Promise<T>): Promise<T> {
  const txt = (motivo ?? "").trim();
  try {
    await supabase.rpc("set_audit_motivo", { p_motivo: txt });
  } catch {
    // se a RPC ainda não existir, segue sem motivo
  }
  try {
    return await fn();
  } finally {
    try {
      await supabase.rpc("set_audit_motivo", { p_motivo: "" });
    } catch {
      /* noop */
    }
  }
}

export type ComissaoOverrideRow = {
  id: string;
  medico_id: string;
  servico_id: string | null;
  comissao_pct: number; // % plataforma
  motivo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // joinado
  medico_nome?: string | null;
  medico_crm?: string | null;
  servico_nome?: string | null;
};

export async function listOverridesParticulares(): Promise<ComissaoOverrideRow[]> {
  // particulares = servico_id IS NULL
  const { data, error } = await supabase
    .from("medico_comissao_override")
    .select(
      `id, medico_id, servico_id, comissao_pct, motivo, ativo, created_at, updated_at,
       medicos:medico_id ( nome_completo, crm )`,
    )
    .is("servico_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    medico_id: r.medico_id,
    servico_id: r.servico_id,
    comissao_pct: Number(r.comissao_pct),
    motivo: r.motivo,
    ativo: r.ativo,
    created_at: r.created_at,
    updated_at: r.updated_at,
    medico_nome: r.medicos?.nome_completo ?? null,
    medico_crm: r.medicos?.crm ?? null,
  }));
}

export async function upsertOverrideParticular(args: {
  id?: string;
  medico_id: string;
  medicoPct: number;
  motivo?: string | null;
  ativo?: boolean;
  motivoAuditoria?: string | null;
}): Promise<void> {
  const plataforma = round2(100 - clampPct(args.medicoPct));
  await comMotivo(args.motivoAuditoria ?? args.motivo, async () => {
    if (args.id) {
      const { error } = await supabase
        .from("medico_comissao_override")
        .update({
          comissao_pct: plataforma,
          motivo: args.motivo ?? null,
          ativo: args.ativo ?? true,
        })
        .eq("id", args.id);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from("medico_comissao_override").insert({
      medico_id: args.medico_id,
      servico_id: null,
      comissao_pct: plataforma,
      motivo: args.motivo ?? null,
      ativo: args.ativo ?? true,
    });
    if (error) throw error;
  });
}

export async function deleteOverride(id: string, motivo?: string | null): Promise<void> {
  await comMotivo(motivo, async () => {
    const { error } = await supabase.from("medico_comissao_override").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function toggleOverrideAtivo(id: string, ativo: boolean, motivo?: string | null): Promise<void> {
  await comMotivo(motivo, async () => {
    const { error } = await supabase
      .from("medico_comissao_override")
      .update({ ativo })
      .eq("id", id);
    if (error) throw error;
  });
}

// =================== Auditoria de repasse ===================

export type RepasseAuditoriaRow = {
  id: string;
  created_at: string;
  entidade: "repasse_global" | "comissao_override";
  acao: string; // criado | atualizado | editado | ativado | desativado | removido
  actor_id: string | null;
  actor_nome: string | null;
  valor_anterior_pct: number | null; // % médico
  valor_novo_pct: number | null;     // % médico
  motivo: string | null;
  medico_id: string | null;
  medico_nome: string | null;
  servico_id: string | null;
};

export type AuditoriaFiltro = {
  tipo?: "todos" | "global" | "override";
  medico_id?: string | null;
  desde?: string | null; // ISO
  limit?: number;
};

export async function listAuditoriaRepasse(
  filtros: AuditoriaFiltro = {},
): Promise<RepasseAuditoriaRow[]> {
  const tipo = filtros.tipo ?? "todos";
  const limit = Math.min(Math.max(filtros.limit ?? 100, 1), 500);

  let q = supabase
    .from("financeiro_auditoria")
    .select("id, created_at, entidade, acao, actor_id, valor_anterior, valor_novo, motivo, payload")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tipo === "global") q = q.eq("entidade", "repasse_global");
  else if (tipo === "override") q = q.eq("entidade", "comissao_override");
  else q = q.in("entidade", ["repasse_global", "comissao_override"]);

  if (filtros.desde) q = q.gte("created_at", filtros.desde);

  const { data, error } = await q;
  if (error) throw error;

  let rows = (data ?? []).map((r: any) => {
    const payload = (r.payload ?? {}) as any;
    return {
      id: r.id as string,
      created_at: r.created_at as string,
      entidade: r.entidade as "repasse_global" | "comissao_override",
      acao: r.acao as string,
      actor_id: (r.actor_id ?? null) as string | null,
      actor_nome: null as string | null,
      valor_anterior_pct: parsePct(r.valor_anterior),
      valor_novo_pct: parsePct(r.valor_novo),
      motivo: (r.motivo ?? null) as string | null,
      medico_id: (payload?.medico_id ?? null) as string | null,
      medico_nome: null as string | null,
      servico_id: (payload?.servico_id ?? null) as string | null,
    };
  });

  if (filtros.medico_id) {
    rows = rows.filter((r) => r.medico_id === filtros.medico_id);
  }

  // Resolve nomes em lote (profiles para actor, medicos para médico envolvido)
  const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean))) as string[];
  const medicoIds = Array.from(new Set(rows.map((r) => r.medico_id).filter(Boolean))) as string[];

  const [profilesRes, medicosRes] = await Promise.all([
    actorIds.length
      ? supabase.from("profiles").select("id, nome").in("id", actorIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    medicoIds.length
      ? supabase.from("medicos").select("id, nome_completo").in("id", medicoIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  const profilesMap = new Map<string, string>();
  (profilesRes.data ?? []).forEach((p: any) => profilesMap.set(p.id, p.nome ?? ""));
  const medicosMap = new Map<string, string>();
  (medicosRes.data ?? []).forEach((m: any) => medicosMap.set(m.id, m.nome_completo ?? ""));

  return rows.map((r) => ({
    ...r,
    actor_nome: r.actor_id ? profilesMap.get(r.actor_id) ?? null : null,
    medico_nome: r.medico_id ? medicosMap.get(r.medico_id) ?? null : null,
  }));
}

function parsePct(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type MedicoOption = { id: string; nome: string; crm: string | null };

export async function searchMedicosAtivos(q: string): Promise<MedicoOption[]> {
  let query = supabase
    .from("medicos")
    .select("id, nome_completo, crm, status")
    .eq("status", "aprovado")
    .order("nome_completo", { ascending: true })
    .limit(20);
  if (q.trim()) {
    query = query.ilike("nome_completo", `%${q.trim()}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((m: any) => ({ id: m.id, nome: m.nome_completo, crm: m.crm ?? null }));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return round2(Math.max(0, Math.min(100, n)));
}
