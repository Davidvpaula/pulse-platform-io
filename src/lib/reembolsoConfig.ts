import { supabase } from "@/integrations/supabase/client";

export type ReembolsoEscopo = "global" | "medico";
export type ReembolsoSituacao = "cancelamento_antecipado" | "cancelamento_tardio" | "medico_no_show" | "sem_inicio_finalizacao";
export type ReembolsoAcao = "total" | "parcial" | "zero";

export interface PoliticaReembolsoRow {
  id: string;
  escopo: ReembolsoEscopo;
  medico_id: string | null;
  situacao: ReembolsoSituacao;
  horas_antecedencia_min: number;
  tipo_reembolso: ReembolsoAcao;
  percentual: number;
  ativo: boolean;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  // joined
  medico_nome?: string | null;
}

export const SITUACAO_LABELS: Record<ReembolsoSituacao, string> = {
  cancelamento_antecipado: "Cancelamento antecipado",
  cancelamento_tardio: "Cancelamento tardio",
  medico_no_show: "Médico não atendeu",
  sem_inicio_finalizacao: "Sem início/finalização no sistema",
};

export const ACAO_LABELS: Record<ReembolsoAcao, string> = {
  total: "Reembolso total (100%)",
  parcial: "Reembolso parcial",
  zero: "Sem reembolso",
};

export async function listarPoliticasGlobais(): Promise<PoliticaReembolsoRow[]> {
  const { data, error } = await supabase
    .from("politica_reembolso")
    .select("*")
    .eq("escopo", "global")
    .order("situacao");
  if (error) throw error;
  return (data ?? []) as PoliticaReembolsoRow[];
}

export async function listarPoliticasMedico(): Promise<PoliticaReembolsoRow[]> {
  const { data, error } = await supabase
    .from("politica_reembolso")
    .select("*, medicos!inner(nome)")
    .eq("escopo", "medico")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    medico_nome: r.medicos?.nome ?? null,
  })) as PoliticaReembolsoRow[];
}

export async function upsertPolitica(p: {
  id?: string;
  escopo: ReembolsoEscopo;
  medico_id?: string | null;
  situacao: ReembolsoSituacao;
  horas_antecedencia_min: number;
  tipo_reembolso: ReembolsoAcao;
  percentual: number;
  ativo: boolean;
  descricao?: string | null;
}): Promise<void> {
  const row = {
    escopo: p.escopo,
    medico_id: p.medico_id ?? null,
    situacao: p.situacao,
    horas_antecedencia_min: p.horas_antecedencia_min,
    tipo_reembolso: p.tipo_reembolso,
    percentual: p.percentual,
    ativo: p.ativo,
    descricao: p.descricao ?? null,
  };
  if (p.id) {
    const { error } = await supabase.from("politica_reembolso").update(row).eq("id", p.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("politica_reembolso").insert(row);
    if (error) throw error;
  }
}

export async function deletePolitica(id: string): Promise<void> {
  const { error } = await supabase.from("politica_reembolso").delete().eq("id", id);
  if (error) throw error;
}

export async function togglePolitica(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from("politica_reembolso").update({ ativo }).eq("id", id);
  if (error) throw error;
}
