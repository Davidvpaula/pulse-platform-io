/**
 * Helpers do log de uso de cupons.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CupomUsoRow = Database["public"]["Tables"]["cupons_uso"]["Row"];

export type CupomUsoDetalhado = CupomUsoRow & {
  cupom_nome: string | null;
  paciente_nome: string | null;
  medico_nome: string | null;
  aplicado_por_nome: string | null;
  consulta_inicio: string | null;
  consulta_status: string | null;
};

export type CupomUsoFiltro = {
  termo?: string;
  cupomId?: string;
  desde?: Date;
  ate?: Date;
};

export async function listCuponsUso(filtros: CupomUsoFiltro = {}): Promise<CupomUsoDetalhado[]> {
  let q = supabase
    .from("cupons_uso")
    .select(`
      *,
      cupons:cupom_id ( nome ),
      pacientes:paciente_id ( nome_completo, user_id ),
      medicos:medico_id ( nome ),
      consultas:consulta_id ( inicio, status )
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  if (filtros.cupomId) q = q.eq("cupom_id", filtros.cupomId);
  if (filtros.desde) q = q.gte("created_at", filtros.desde.toISOString());
  if (filtros.ate) q = q.lte("created_at", filtros.ate.toISOString());

  const { data, error } = await q;
  if (error) {
    console.error("[cuponsUso] listCuponsUso:", error);
    return [];
  }

  // Buscar nomes de quem aplicou (auth users → profiles)
  const aplicadorIds = Array.from(
    new Set((data ?? []).map((r: any) => r.aplicado_por).filter(Boolean) as string[]),
  );
  let nomesAplicador: Record<string, string> = {};
  if (aplicadorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", aplicadorIds);
    nomesAplicador = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]));
  }

  const lista: CupomUsoDetalhado[] = (data ?? []).map((r: any) => ({
    ...r,
    cupom_nome: r.cupons?.nome ?? null,
    paciente_nome: r.pacientes?.nome_completo ?? null,
    medico_nome: r.medicos?.nome ?? null,
    aplicado_por_nome: r.aplicado_por ? nomesAplicador[r.aplicado_por] ?? null : null,
    consulta_inicio: r.consultas?.inicio ?? null,
    consulta_status: r.consultas?.status ?? null,
  }));

  if (filtros.termo) {
    const t = filtros.termo.trim().toLowerCase();
    return lista.filter(
      (r) =>
        r.codigo_snapshot.toLowerCase().includes(t) ||
        (r.cupom_nome ?? "").toLowerCase().includes(t) ||
        (r.paciente_nome ?? "").toLowerCase().includes(t) ||
        (r.medico_nome ?? "").toLowerCase().includes(t) ||
        (r.aplicado_por_nome ?? "").toLowerCase().includes(t),
    );
  }

  return lista;
}
