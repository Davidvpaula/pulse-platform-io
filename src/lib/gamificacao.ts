/**
 * Camada de serviço para gamificação médica.
 */
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
export type AvaliacaoMedica = {
  id: string;
  paciente_id: string;
  medico_id: string;
  consulta_id: string;
  nota: number;
  comentario: string | null;
  avaliacao_publica: boolean;
  exibir_no_perfil: boolean;
  created_at: string;
};

export type MedicoRanking = {
  medico_id: string;
  avaliacao_media: number;
  total_avaliacoes: number;
  total_atendimentos: number;
  total_agendamentos: number;
  taxa_conversao: number;
  taxa_no_show: number;
  fator_recencia: number;
  fator_premium: number;
  ranking_score: number;
  posicao: number | null;
  last_activity_at: string | null;
  updated_at: string;
};

export type RankingConfig = {
  id: string;
  peso_avaliacao: number;
  peso_atendimentos: number;
  peso_conversao: number;
  peso_no_show: number;
  peso_recencia: number;
  peso_premium: number;
  min_avaliacoes_exibir: number;
  recencia_dias_ativo: number;
  recencia_dias_penalidade: number;
  updated_at: string;
};

/* ── Avaliações ── */

export async function enviarAvaliacao(params: {
  paciente_id: string;
  medico_id: string;
  consulta_id: string;
  nota: number;
  comentario?: string;
  avaliacao_publica: boolean;
}) {
  const { data, error } = await supabase
    .from("avaliacoes_medicas" as any)
    .insert({
      paciente_id: params.paciente_id,
      medico_id: params.medico_id,
      consulta_id: params.consulta_id,
      nota: params.nota,
      comentario: params.comentario || null,
      avaliacao_publica: params.avaliacao_publica,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function consultasAvaliadasIds(consulta_ids: string[]): Promise<Set<string>> {
  if (!consulta_ids.length) return new Set();
  const { data } = await supabase
    .from("avaliacoes_medicas" as any)
    .select("consulta_id")
    .in("consulta_id", consulta_ids);
  return new Set((data ?? []).map((r: any) => r.consulta_id));
}

export async function listarAvaliacoesMedico(medico_id: string): Promise<AvaliacaoMedica[]> {
  const { data, error } = await supabase
    .from("avaliacoes_medicas" as any)
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AvaliacaoMedica[];
}

export async function toggleExibirNoPerfil(avaliacao_id: string, exibir: boolean) {
  const { error } = await supabase
    .from("avaliacoes_medicas" as any)
    .update({ exibir_no_perfil: exibir })
    .eq("id", avaliacao_id);
  if (error) throw error;
}

/* ── Ranking ── */

export async function getRankingMedico(medico_id: string): Promise<MedicoRanking | null> {
  const { data } = await supabase
    .from("medico_ranking" as any)
    .select("*")
    .eq("medico_id", medico_id)
    .maybeSingle();
  return data as MedicoRanking | null;
}

export async function listarRankingTop(limit = 20): Promise<MedicoRanking[]> {
  const { data } = await supabase
    .from("medico_ranking" as any)
    .select("*")
    .order("ranking_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as MedicoRanking[];
}

/* ── Config Admin ── */

export async function getRankingConfig(): Promise<RankingConfig | null> {
  const { data } = await supabase
    .from("ranking_config" as any)
    .select("*")
    .limit(1)
    .maybeSingle();
  return data as RankingConfig | null;
}

export async function salvarRankingConfig(config: Partial<RankingConfig> & { id: string }) {
  const { error } = await supabase
    .from("ranking_config" as any)
    .update({
      peso_avaliacao: config.peso_avaliacao,
      peso_atendimentos: config.peso_atendimentos,
      peso_conversao: config.peso_conversao,
      peso_no_show: config.peso_no_show,
      peso_recencia: config.peso_recencia,
      peso_premium: config.peso_premium,
      min_avaliacoes_exibir: config.min_avaliacoes_exibir,
      recencia_dias_ativo: config.recencia_dias_ativo,
      recencia_dias_penalidade: config.recencia_dias_penalidade,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);
  if (error) throw error;
}

export async function recalcularRankingTodos() {
  const { error } = await supabase.rpc("recalcular_ranking_todos" as any);
  if (error) throw error;
}
