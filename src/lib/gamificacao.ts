/**
 * Camada de serviço para gamificação médica.
 *
 * NOTA: As tabelas de gamificação (avaliacoes_medicas, medico_ranking, ranking_config,
 * medico_premium, medico_saldo_crescimento, impulsionamento_*) não estão no types.ts
 * auto-gerado. Por isso usamos `as any` nas chamadas do Supabase client.
 * Os tipos locais abaixo garantem tipagem segura no restante do código.
 */
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any -- tabelas fora do types.ts gerado */

/**
 * Helper tipado: faz `.from(table as any)` uma única vez e retorna o builder.
 * Centraliza o `as any` para não espalhar em toda função.
 */
function fromTable(table: string) {
  return supabase.from(table as any);
}

function rpcCall(fn: string, params?: Record<string, unknown>) {
  return supabase.rpc(fn as any, params as any);
}

/* ── Types ── */

export type ConsultaPendenteAvaliacao = {
  consulta_id: string;
  medico_id: string;
  medico_nome: string | null;
  especialidade_nome: string | null;
  concluida_em: string;
  paciente_id: string;
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
  cpc_padrao_centavos: number;
  saldo_por_consulta: number;
  premium_min_atendimentos: number;
  premium_min_avaliacao: number;
  premium_max_no_show: number;
  premium_min_meses_ativo: number;
  premium_bonus_ranking: number;
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

export type ImpulsionamentoConversao = {
  id: string;
  clique_id: string | null;
  campanha_id: string;
  consulta_id: string | null;
  medico_id: string;
  paciente_id: string | null;
  created_at: string;
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
  const { data, error } = await fromTable("avaliacoes_medicas")
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
  const { data } = await fromTable("avaliacoes_medicas")
    .select("consulta_id")
    .in("consulta_id", consulta_ids);
  return new Set((data ?? []).map((r: any) => r.consulta_id));
}

export async function listarAvaliacoesMedico(medico_id: string): Promise<AvaliacaoMedica[]> {
  const { data, error } = await fromTable("avaliacoes_medicas")
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AvaliacaoMedica[];
}

export async function toggleExibirNoPerfil(avaliacao_id: string, exibir: boolean) {
  const { error } = await fromTable("avaliacoes_medicas")
    .update({ exibir_no_perfil: exibir })
    .eq("id", avaliacao_id);
  if (error) throw error;
}

/* ── Ranking ── */

export async function getRankingMedico(medico_id: string): Promise<MedicoRanking | null> {
  const { data } = await fromTable("medico_ranking")
    .select("*")
    .eq("medico_id", medico_id)
    .maybeSingle();
  return data as unknown as MedicoRanking | null;
}

export async function listarRankingTop(limit = 20): Promise<MedicoRanking[]> {
  const { data } = await fromTable("medico_ranking")
    .select("*")
    .order("ranking_score", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as MedicoRanking[];
}

/* ── Config Admin ── */

export async function getRankingConfig(): Promise<RankingConfig | null> {
  const { data } = await fromTable("ranking_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  return data as unknown as RankingConfig | null;
}

export async function salvarRankingConfig(config: Partial<RankingConfig> & { id: string }) {
  const { error } = await fromTable("ranking_config")
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
      cpc_padrao_centavos: config.cpc_padrao_centavos,
      saldo_por_consulta: config.saldo_por_consulta,
      premium_min_atendimentos: config.premium_min_atendimentos,
      premium_min_avaliacao: config.premium_min_avaliacao,
      premium_max_no_show: config.premium_max_no_show,
      premium_min_meses_ativo: config.premium_min_meses_ativo,
      premium_bonus_ranking: config.premium_bonus_ranking,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.id);
  if (error) throw error;
}

export async function recalcularRankingTodos() {
  const { error } = await rpcCall("recalcular_ranking_todos");
  if (error) throw error;
}

/* ── Consultas pendentes de avaliação (auto-prompt) ── */

export async function consultasPendentesAvaliacao(): Promise<ConsultaPendenteAvaliacao[]> {
  const { data, error } = await rpcCall("consultas_pendentes_avaliacao");
  if (error) throw error;
  return (data ?? []) as unknown as ConsultaPendenteAvaliacao[];
}

/* ── Saldo de Crescimento ── */

export async function listarSaldoCrescimento(medico_id: string): Promise<SaldoCrescimentoItem[]> {
  const { data, error } = await fromTable("medico_saldo_crescimento")
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as SaldoCrescimentoItem[];
}

export async function getSaldoAtual(medico_id: string): Promise<number> {
  const { data } = await fromTable("medico_saldo_crescimento")
    .select("saldo_apos")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.saldo_apos ?? 0;
}

/* ── Premium ── */

export async function getMedicoPremium(medico_id: string): Promise<MedicoPremium | null> {
  const { data } = await fromTable("medico_premium")
    .select("*")
    .eq("medico_id", medico_id)
    .maybeSingle();
  return data as unknown as MedicoPremium | null;
}

export async function listarTodosPremium(): Promise<(MedicoPremium & { nome?: string })[]> {
  const { data } = await fromTable("medico_premium")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as (MedicoPremium & { nome?: string })[];
}

export async function togglePremiumAdmin(medico_id: string, ativo: boolean, tipo: "pago" | "conquistado" = "conquistado") {
  const { error } = await fromTable("medico_premium")
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

export async function verificarPremiumConquistado(medico_id: string): Promise<boolean> {
  const { data, error } = await rpcCall("verificar_premium_conquistado", {
    p_medico_id: medico_id,
  });
  if (error) throw error;
  return data as boolean;
}

/** Médico solicita ativação Premium (tipo "conquistado") — executa via RPC SECURITY DEFINER. */
export async function ativarPremiumConquistado(_medico_id: string) {
  const { data, error } = await rpcCall("ativar_premium_conquistado");
  if (error) throw error;
  if (data === false) throw new Error("Você ainda não atingiu os requisitos mínimos para o Premium.");
}

/* ── Impulsionamento / Campanhas ── */

export async function listarCampanhasMedico(medico_id: string): Promise<ImpulsionamentoCampanha[]> {
  const { data, error } = await fromTable("impulsionamento_campanhas")
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
  // Get default CPC from config if not specified
  let cpc = params.cpc_centavos;
  if (!cpc) {
    const config = await getRankingConfig();
    cpc = config?.cpc_padrao_centavos ?? 50;
  }

  const { data, error } = await fromTable("impulsionamento_campanhas")
    .insert({
      medico_id: params.medico_id,
      titulo: params.titulo,
      orcamento_centavos: params.orcamento_centavos,
      cpc_centavos: cpc,
      especialidade_ids: params.especialidade_ids ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarStatusCampanha(campanha_id: string, status: ImpulsionamentoCampanha["status"]) {
  const { error } = await fromTable("impulsionamento_campanhas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campanha_id);
  if (error) throw error;
}

export async function listarTodasCampanhas(limit = 50): Promise<ImpulsionamentoCampanha[]> {
  const { data } = await fromTable("impulsionamento_campanhas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ImpulsionamentoCampanha[];
}

export async function registrarClique(campanha_id: string, paciente_id?: string, origem = "busca") {
  const { error } = await rpcCall("registrar_clique_impulsionamento", {
    p_campanha_id: campanha_id,
    p_paciente_id: paciente_id ?? null,
    p_origem: origem,
  });
  if (error) throw error;
}

/* ── Conversões ── */

export async function listarConversoes(campanha_id?: string): Promise<ImpulsionamentoConversao[]> {
  let query = fromTable("impulsionamento_conversoes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (campanha_id) {
    query = query.eq("campanha_id", campanha_id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ImpulsionamentoConversao[];
}

export async function getConversoesPorCampanha(): Promise<Record<string, number>> {
  const { data } = await fromTable("impulsionamento_conversoes")
    .select("campanha_id");
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as any[]) {
    map[row.campanha_id] = (map[row.campanha_id] || 0) + 1;
  }
  return map;
}
