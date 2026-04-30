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

export async function setRepasseGlobal(medicoPct: number): Promise<void> {
  const m = clampPct(medicoPct);
  const plataforma = round2(100 - m);
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SETTING_KEY, value: plataforma as any }, { onConflict: "key" });
  if (error) throw error;
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
}): Promise<void> {
  const plataforma = round2(100 - clampPct(args.medicoPct));
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
}

export async function deleteOverride(id: string): Promise<void> {
  const { error } = await supabase.from("medico_comissao_override").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleOverrideAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .from("medico_comissao_override")
    .update({ ativo })
    .eq("id", id);
  if (error) throw error;
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
