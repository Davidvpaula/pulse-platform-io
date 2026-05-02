/**
 * Camada de serviço para gamificação médica.
 */
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */

export type ConsultaPendenteAvaliacao = {
  consulta_id: string;
  medico_id: string;
  medico_nome: string | null;
  especialidade_nome: string | null;
  concluida_em: string;
};

export type SaldoCrescimentoItem = {
  id: string;
  medico_id: string;
  tipo: "credito" | "debito";
  valor: number;
  saldo_apos: number;
  motivo: string;
  referencia_id: string | null;
  created_at: string;
};
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

export type MedicoPremium = {
  id: string;
  medico_id: string;
  ativo: boolean;
  tipo: "pago" | "conquistado";
  inicio: string | null;
  fim: string | null;
  auto_renovar: boolean;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ImpulsionamentoCampanha = {
  id: string;
  medico_id: string;
  titulo: string;
  orcamento_centavos: number;
  gasto_centavos: number;
  cpc_centavos: number;
  cliques: number;
  impressoes: number;
  status: "ativa" | "pausada" | "encerrada" | "cancelada";
  inicio: string;
  fim: string | null;
  especialidade_ids: string[];
  created_at: string;
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
  return (data ?? []) as unknown as AvaliacaoMedica[];
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
  return data as unknown as MedicoRanking | null;
}

export async function listarRankingTop(limit = 20): Promise<MedicoRanking[]> {
  const { data } = await supabase
    .from("medico_ranking" as any)
    .select("*")
    .order("ranking_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as MedicoRanking[];
}

/* ── Config Admin ── */

export async function getRankingConfig(): Promise<RankingConfig | null> {
  const { data } = await supabase
    .from("ranking_config" as any)
    .select("*")
    .limit(1)
    .maybeSingle();
  return data as unknown as RankingConfig | null;
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

/* ── Consultas pendentes de avaliação (auto-prompt) ── */

export async function consultasPendentesAvaliacao(): Promise<ConsultaPendenteAvaliacao[]> {
  const { data, error } = await supabase.rpc("consultas_pendentes_avaliacao" as any);
  if (error) throw error;
  return (data ?? []) as unknown as ConsultaPendenteAvaliacao[];
}

/* ── Saldo de Crescimento ── */

export async function listarSaldoCrescimento(medico_id: string): Promise<SaldoCrescimentoItem[]> {
  const { data, error } = await supabase
    .from("medico_saldo_crescimento" as any)
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as SaldoCrescimentoItem[];
}

export async function getSaldoAtual(medico_id: string): Promise<number> {
  const { data } = await supabase
    .from("medico_saldo_crescimento" as any)
    .select("saldo_apos")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.saldo_apos ?? 0;
}

/* ── Premium ── */

export async function getMedicoPremium(medico_id: string): Promise<MedicoPremium | null> {
  const { data } = await supabase
    .from("medico_premium" as any)
    .select("*")
    .eq("medico_id", medico_id)
    .maybeSingle();
  return data as unknown as MedicoPremium | null;
}

export async function listarTodosPremium(): Promise<(MedicoPremium & { nome?: string })[]> {
  const { data } = await supabase
    .from("medico_premium" as any)
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as (MedicoPremium & { nome?: string })[];
}

export async function togglePremiumAdmin(medico_id: string, ativo: boolean, tipo: "pago" | "conquistado" = "conquistado") {
  const { error } = await supabase
    .from("medico_premium" as any)
    .upsert({
      medico_id,
      ativo,
      tipo,
      inicio: ativo ? new Date().toISOString() : null,
      fim: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "medico_id" });
  if (error) throw error;
}

/* ── Impulsionamento / Campanhas ── */

export async function listarCampanhasMedico(medico_id: string): Promise<ImpulsionamentoCampanha[]> {
  const { data, error } = await supabase
    .from("impulsionamento_campanhas" as any)
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ImpulsionamentoCampanha[];
}

export async function criarCampanha(params: {
  medico_id: string;
  titulo: string;
  orcamento_centavos: number;
  cpc_centavos?: number;
  especialidade_ids?: string[];
}) {
  const { data, error } = await supabase
    .from("impulsionamento_campanhas" as any)
    .insert({
      medico_id: params.medico_id,
      titulo: params.titulo,
      orcamento_centavos: params.orcamento_centavos,
      cpc_centavos: params.cpc_centavos ?? 50,
      especialidade_ids: params.especialidade_ids ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarStatusCampanha(campanha_id: string, status: ImpulsionamentoCampanha["status"]) {
  const { error } = await supabase
    .from("impulsionamento_campanhas" as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campanha_id);
  if (error) throw error;
}

export async function listarTodasCampanhas(limit = 50): Promise<ImpulsionamentoCampanha[]> {
  const { data } = await supabase
    .from("impulsionamento_campanhas" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ImpulsionamentoCampanha[];
}

export async function registrarClique(campanha_id: string, paciente_id?: string, origem = "busca") {
  const { error } = await supabase.rpc("registrar_clique_impulsionamento" as any, {
    p_campanha_id: campanha_id,
    p_paciente_id: paciente_id ?? null,
    p_origem: origem,
  });
  if (error) throw error;
}
