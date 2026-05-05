/**
 * Camada de serviço para gamificação médica.
 *
 * NOTA: As tabelas de gamificação (avaliacoes_medicas, medico_ranking, ranking_config,
 * medico_premium, medico_saldo_crescimento, impulsionamento_*, medico_score_detalhado,
 * medico_badges, medico_streaks, medico_metas, medico_metas_progresso,
 * premium_assinaturas, premium_creditos, ranking_audit_log, campanha_metricas_diarias,
 * recomendacoes_ia) não estão no types.ts auto-gerado.
 * Por isso usamos `as any` nas chamadas do Supabase client.
 */
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any -- tabelas fora do types.ts gerado */

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
  avaliacao_bayesiana: number;
  total_avaliacoes: number;
  total_atendimentos: number;
  total_agendamentos: number;
  taxa_conversao: number;
  taxa_no_show: number;
  fator_recencia: number;
  fator_premium: number;
  ranking_score: number;
  posicao: number | null;
  penalidade_anomalia: number;
  bonus_novato: number;
  penalidade_compliance: number;
  protecao_detalhes: Record<string, any>;
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
  // New sub-score weights
  peso_score_operacional: number;
  peso_score_clinico: number;
  peso_score_comercial: number;
  peso_score_reputacional: number;
  badge_check_interval_hours: number;
  creditos_taxa_conversao: number;
  creditos_validade_dias: number;
  streak_bonus_multiplicador: number;
  meta_bonus_pontos: number;
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

/* ── New types ── */

export type MedicoScoreDetalhado = {
  medico_id: string;
  score_operacional: number;
  score_clinico: number;
  score_comercial: number;
  score_reputacional: number;
  score_final: number;
  detalhes_operacional: Record<string, any>;
  detalhes_clinico: Record<string, any>;
  detalhes_comercial: Record<string, any>;
  detalhes_reputacional: Record<string, any>;
  nivel: number;
  nivel_nome: string;
  total_pontos_acumulados: number;
  updated_at: string;
};

export type MedicoBadge = {
  id: string;
  medico_id: string;
  badge_key: string;
  badge_nome: string;
  badge_descricao: string | null;
  badge_icone: string;
  conquistado_em: string;
  expira_em: string | null;
  ativo: boolean;
};

export type MedicoStreak = {
  id: string;
  medico_id: string;
  tipo: string;
  dias_consecutivos: number;
  melhor_streak: number;
  ultima_atividade: string | null;
  updated_at: string;
};

export type MedicoMeta = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  threshold: number;
  periodo: string;
  pontos_recompensa: number;
  badge_recompensa: string | null;
  ativo: boolean;
  created_at: string;
};

export type MedicoMetaProgresso = {
  id: string;
  medico_id: string;
  meta_id: string;
  valor_atual: number;
  concluida: boolean;
  concluida_em: string | null;
  periodo_referencia: string;
  pontos_creditados: boolean;
  updated_at: string;
};

export type PremiumAssinatura = {
  id: string;
  medico_id: string;
  plano: "basico" | "profissional" | "enterprise";
  valor_centavos: number;
  moeda: string;
  status: "ativa" | "cancelada" | "pausada" | "inadimplente" | "expirada";
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  inicio: string;
  fim_ciclo_atual: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  auto_renovar: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
};

export type PremiumCredito = {
  id: string;
  medico_id: string;
  tipo: string;
  pontos_convertidos: number;
  creditos_centavos: number;
  creditos_restantes_centavos: number;
  taxa_conversao: number;
  valido_ate: string;
  utilizado: boolean;
  utilizado_em: string | null;
  campanha_id: string | null;
  created_at: string;
};

export type RankingAuditLog = {
  id: string;
  medico_id: string;
  evento: string;
  score_anterior: number | null;
  score_novo: number | null;
  posicao_anterior: number | null;
  posicao_nova: number | null;
  detalhes: Record<string, any>;
  actor_id: string | null;
  created_at: string;
};

export type CampanhaMetricaDiaria = {
  id: string;
  campanha_id: string;
  data: string;
  cliques: number;
  impressoes: number;
  conversoes: number;
  gasto_centavos: number;
  cpc_medio_centavos: number;
  taxa_conversao: number;
};

export type RecomendacaoIA = {
  id: string;
  medico_id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  dados: Record<string, any>;
  lida: boolean;
  valida_ate: string;
  created_at: string;
};

/* ── Nível helpers ── */

const NIVEIS: { min: number; nivel: number; nome: string }[] = [
  { min: 0, nivel: 1, nome: "Iniciante" },
  { min: 100, nivel: 2, nome: "Ativo" },
  { min: 300, nivel: 3, nome: "Engajado" },
  { min: 600, nivel: 4, nome: "Destaque" },
  { min: 1000, nivel: 5, nome: "Referência" },
  { min: 1500, nivel: 6, nome: "Elite" },
];

export function getNivelInfo(pontos: number) {
  let resultado = NIVEIS[0];
  for (const n of NIVEIS) {
    if (pontos >= n.min) resultado = n;
  }
  const proximo = NIVEIS.find((n) => n.min > pontos);
  return {
    nivel: resultado.nivel,
    nome: resultado.nome,
    pontosParaProximo: proximo ? proximo.min - pontos : 0,
    proximoNome: proximo?.nome ?? null,
    progresso: proximo ? (pontos - resultado.min) / (proximo.min - resultado.min) : 1,
  };
}

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
      peso_score_operacional: config.peso_score_operacional,
      peso_score_clinico: config.peso_score_clinico,
      peso_score_comercial: config.peso_score_comercial,
      peso_score_reputacional: config.peso_score_reputacional,
      creditos_taxa_conversao: config.creditos_taxa_conversao,
      creditos_validade_dias: config.creditos_validade_dias,
      streak_bonus_multiplicador: config.streak_bonus_multiplicador,
      meta_bonus_pontos: config.meta_bonus_pontos,
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

/* ── Score Detalhado ── */

export async function getScoreDetalhado(medico_id: string): Promise<MedicoScoreDetalhado | null> {
  const { data } = await fromTable("medico_score_detalhado")
    .select("*")
    .eq("medico_id", medico_id)
    .maybeSingle();
  return data as unknown as MedicoScoreDetalhado | null;
}

export async function recalcularScoreMedico(medico_id: string) {
  const { error } = await rpcCall("calcular_score_medico", { p_medico_id: medico_id });
  if (error) throw error;
}

export async function recalcularScoreTodos() {
  const { error } = await rpcCall("recalcular_scores_todos");
  if (error) throw error;
}

/* ── Badges ── */

export async function listarBadgesMedico(medico_id: string): Promise<MedicoBadge[]> {
  const { data, error } = await fromTable("medico_badges")
    .select("*")
    .eq("medico_id", medico_id)
    .eq("ativo", true)
    .order("conquistado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MedicoBadge[];
}

/* ── Streaks ── */

export async function listarStreaksMedico(medico_id: string): Promise<MedicoStreak[]> {
  const { data, error } = await fromTable("medico_streaks")
    .select("*")
    .eq("medico_id", medico_id);
  if (error) throw error;
  return (data ?? []) as unknown as MedicoStreak[];
}

/* ── Metas ── */

export async function listarMetasAtivas(): Promise<MedicoMeta[]> {
  const { data, error } = await fromTable("medico_metas")
    .select("*")
    .eq("ativo", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MedicoMeta[];
}

export async function listarProgressoMetas(medico_id: string): Promise<MedicoMetaProgresso[]> {
  const { data, error } = await fromTable("medico_metas_progresso")
    .select("*")
    .eq("medico_id", medico_id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MedicoMetaProgresso[];
}

/* ── Premium Assinaturas ── */

export async function getAssinaturaPremium(medico_id: string): Promise<PremiumAssinatura | null> {
  const { data } = await fromTable("premium_assinaturas")
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as unknown as PremiumAssinatura | null;
}

export async function listarTodasAssinaturas(): Promise<PremiumAssinatura[]> {
  const { data } = await fromTable("premium_assinaturas")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as PremiumAssinatura[];
}

/* ── Créditos ── */

export async function listarCreditosMedico(medico_id: string): Promise<PremiumCredito[]> {
  const { data, error } = await fromTable("premium_creditos")
    .select("*")
    .eq("medico_id", medico_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PremiumCredito[];
}

export async function getSaldoCreditos(medico_id: string): Promise<number> {
  const { data } = await fromTable("premium_creditos")
    .select("creditos_restantes_centavos")
    .eq("medico_id", medico_id)
    .eq("utilizado", false)
    .gt("valido_ate", new Date().toISOString());
  return (data ?? []).reduce((s: number, r: any) => s + (r.creditos_restantes_centavos ?? 0), 0);
}

/* ── Audit Log ── */

export async function listarAuditLog(medico_id?: string, limit = 50): Promise<RankingAuditLog[]> {
  let query = fromTable("ranking_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (medico_id) {
    query = query.eq("medico_id", medico_id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RankingAuditLog[];
}

/* ── Métricas diárias ── */

export async function listarMetricasDiarias(campanha_id: string): Promise<CampanhaMetricaDiaria[]> {
  const { data, error } = await fromTable("campanha_metricas_diarias")
    .select("*")
    .eq("campanha_id", campanha_id)
    .order("data", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as CampanhaMetricaDiaria[];
}

/* ── Recomendações IA ── */

export async function listarRecomendacoes(medico_id: string): Promise<RecomendacaoIA[]> {
  const { data, error } = await fromTable("recomendacoes_ia")
    .select("*")
    .eq("medico_id", medico_id)
    .gt("valida_ate", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as RecomendacaoIA[];
}

export async function marcarRecomendacaoLida(id: string) {
  const { error } = await fromTable("recomendacoes_ia")
    .update({ lida: true })
    .eq("id", id);
  if (error) throw error;
}
