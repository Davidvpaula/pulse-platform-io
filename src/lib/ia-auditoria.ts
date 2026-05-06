/**
 * Camada de serviço para IA Auditora / Compliance / Antifraude / Ações Admin.
 * Tabelas: medico_score_operacional, medico_score_compliance,
 *          medico_alertas_ia, medico_auditoria_ia, medico_anomalias,
 *          medico_logs_confianca, admin_acoes_medico, medico_restricoes
 */
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromTable(table: string) {
  return supabase.from(table as any);
}

/* ── Types ── */

export type ScoreOperacional = {
  medico_id: string;
  score_pontualidade: number;
  score_cancelamento: number;
  score_no_show: number;
  score_resposta: number;
  score_uso_sistema: number;
  score_documentacao: number;
  score_total: number;
  detalhes: Record<string, any>;
  updated_at: string;
};

export type ScoreCompliance = {
  medico_id: string;
  score_confianca: number;
  score_padrao_comportamento: number;
  score_avaliacoes_integridade: number;
  score_campanhas_integridade: number;
  score_total: number;
  nivel_risco: "baixo" | "medio" | "alto" | "critico";
  detalhes: Record<string, any>;
  updated_at: string;
};

export type AlertaIA = {
  id: string;
  medico_id: string;
  tipo: string;
  severidade: "info" | "atencao" | "alerta" | "critico";
  titulo: string;
  descricao: string;
  justificativa: string | null;
  dados_utilizados: Record<string, any>;
  recomendacao_ia: string | null;
  status: "novo" | "visto" | "em_acompanhamento" | "resolvido" | "ignorado";
  resolvido_por: string | null;
  resolvido_em: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditoriaIA = {
  id: string;
  medico_id: string;
  tipo_analise: string;
  resultado: string;
  dados_entrada: Record<string, any>;
  dados_saida: Record<string, any>;
  modelo_ia: string;
  versao_prompt: string;
  created_at: string;
};

export type Anomalia = {
  id: string;
  medico_id: string;
  tipo_anomalia: string;
  descricao: string;
  severidade: "info" | "atencao" | "alerta" | "critico";
  dados_evidencia: Record<string, any>;
  score_confianca: number;
  status: "detectada" | "investigando" | "confirmada" | "descartada";
  investigado_por: string | null;
  investigado_em: string | null;
  created_at: string;
};

export type LogConfianca = {
  id: string;
  medico_id: string;
  evento: string;
  score_antes: number | null;
  score_depois: number | null;
  motivo: string | null;
  detalhes: Record<string, any>;
  actor_id: string | null;
  created_at: string;
};

export type AdminAcao = {
  id: string;
  medico_id: string;
  admin_id: string;
  tipo_acao: string;
  motivo: string;
  dados_antes: Record<string, any>;
  dados_depois: Record<string, any>;
  alerta_vinculado_id: string | null;
  anomalia_vinculada_id: string | null;
  created_at: string;
};

export type MedicoRestricao = {
  medico_id: string;
  ranking_congelado: boolean;
  impulsionamento_pausado: boolean;
  beneficios_bloqueados: boolean;
  em_acompanhamento: boolean;
  selo_removido: boolean;
  motivo: string | null;
  aplicado_por: string | null;
  aplicado_em: string | null;
  expira_em: string | null;
  updated_at: string;
};

export const TIPO_ACAO_LABELS: Record<string, string> = {
  promover: "Promover médico",
  reduzir_destaque: "Reduzir destaque",
  pausar_impulsionamento: "Pausar impulsionamento",
  bloquear_beneficios: "Bloquear benefícios",
  sinalizar_acompanhamento: "Sinalizar acompanhamento",
  solicitar_correcao: "Solicitar correção",
  registrar_observacao: "Registrar observação",
  congelar_ranking: "Congelar ranking",
  liberar_selo: "Liberar selo",
  remover_selo: "Remover selo",
  remover_restricao: "Remover restrição",
};

export type MedicoResumoIA = {
  medico_id: string;
  nome: string;
  ativo: boolean;
  score_op: ScoreOperacional | null;
  score_comp: ScoreCompliance | null;
  alertas_ativos: number;
  anomalias_abertas: number;
};

/* ── Queries ── */

export async function listarScoresOperacionais(): Promise<ScoreOperacional[]> {
  const { data, error } = await fromTable("medico_score_operacional")
    .select("*")
    .order("score_total", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ScoreOperacional[];
}

export async function getScoreOperacional(medicoId: string): Promise<ScoreOperacional | null> {
  const { data } = await fromTable("medico_score_operacional")
    .select("*")
    .eq("medico_id", medicoId)
    .maybeSingle();
  return data as unknown as ScoreOperacional | null;
}

export async function listarScoresCompliance(): Promise<ScoreCompliance[]> {
  const { data, error } = await fromTable("medico_score_compliance")
    .select("*")
    .order("score_total", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ScoreCompliance[];
}

export async function getScoreCompliance(medicoId: string): Promise<ScoreCompliance | null> {
  const { data } = await fromTable("medico_score_compliance")
    .select("*")
    .eq("medico_id", medicoId)
    .maybeSingle();
  return data as unknown as ScoreCompliance | null;
}

export async function listarAlertasIA(filtros?: {
  status?: string;
  severidade?: string;
  medicoId?: string;
}): Promise<AlertaIA[]> {
  let query = fromTable("medico_alertas_ia")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtros?.status) query = query.eq("status", filtros.status);
  if (filtros?.severidade) query = query.eq("severidade", filtros.severidade);
  if (filtros?.medicoId) query = query.eq("medico_id", filtros.medicoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AlertaIA[];
}

export async function atualizarStatusAlerta(
  alertaId: string,
  status: AlertaIA["status"],
  resolvidoPor?: string,
) {
  const update: any = { status, updated_at: new Date().toISOString() };
  if (status === "resolvido" || status === "ignorado") {
    update.resolvido_por = resolvidoPor ?? null;
    update.resolvido_em = new Date().toISOString();
  }
  const { error } = await fromTable("medico_alertas_ia")
    .update(update)
    .eq("id", alertaId);
  if (error) throw error;
}

export async function listarAnomalias(filtros?: {
  status?: string;
  medicoId?: string;
}): Promise<Anomalia[]> {
  let query = fromTable("medico_anomalias")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtros?.status) query = query.eq("status", filtros.status);
  if (filtros?.medicoId) query = query.eq("medico_id", filtros.medicoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Anomalia[];
}

export async function atualizarStatusAnomalia(
  anomaliaId: string,
  status: Anomalia["status"],
  investigadoPor?: string,
) {
  const update: any = { status, updated_at: new Date().toISOString() };
  if (investigadoPor) {
    update.investigado_por = investigadoPor;
    update.investigado_em = new Date().toISOString();
  }
  const { error } = await fromTable("medico_anomalias")
    .update(update)
    .eq("id", anomaliaId);
  if (error) throw error;
}

export async function listarAuditoriaIA(medicoId?: string, limit = 50): Promise<AuditoriaIA[]> {
  let query = fromTable("medico_auditoria_ia")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (medicoId) query = query.eq("medico_id", medicoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AuditoriaIA[];
}

export async function listarLogsConfianca(medicoId: string, limit = 50): Promise<LogConfianca[]> {
  const { data, error } = await fromTable("medico_logs_confianca")
    .select("*")
    .eq("medico_id", medicoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as LogConfianca[];
}

/* ── Admin Actions ── */

export async function executarAcaoAdmin(params: {
  medicoId: string;
  tipoAcao: string;
  motivo: string;
  alertaId?: string;
  anomaliaId?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  // Get current state before action
  const { data: restricaoAtual } = await fromTable("medico_restricoes")
    .select("*")
    .eq("medico_id", params.medicoId)
    .maybeSingle();

  // Map action types to restriction fields
  const restricaoMap: Record<string, string> = {
    congelar_ranking: "ranking_congelado",
    pausar_impulsionamento: "impulsionamento_pausado",
    bloquear_beneficios: "beneficios_bloqueados",
    sinalizar_acompanhamento: "em_acompanhamento",
    remover_selo: "selo_removido",
  };

  const restricaoField = restricaoMap[params.tipoAcao];
  if (restricaoField) {
    await supabase.rpc("aplicar_restricao_medico" as any, {
      p_medico_id: params.medicoId,
      p_tipo: restricaoField,
      p_ativo: true,
      p_motivo: params.motivo,
    });
  }

  // For "remover_restricao", we unset all
  if (params.tipoAcao === "remover_restricao") {
    await fromTable("medico_restricoes")
      .update({
        ranking_congelado: false,
        impulsionamento_pausado: false,
        beneficios_bloqueados: false,
        em_acompanhamento: false,
        selo_removido: false,
        motivo: params.motivo,
        aplicado_por: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("medico_id", params.medicoId);
  }

  // For "liberar_selo", unset selo_removido
  if (params.tipoAcao === "liberar_selo") {
    await supabase.rpc("aplicar_restricao_medico" as any, {
      p_medico_id: params.medicoId,
      p_tipo: "selo_removido",
      p_ativo: false,
      p_motivo: params.motivo,
    });
  }

  // Get new state
  const { data: restricaoNova } = await fromTable("medico_restricoes")
    .select("*")
    .eq("medico_id", params.medicoId)
    .maybeSingle();

  // Insert immutable action log
  const { error } = await fromTable("admin_acoes_medico").insert({
    medico_id: params.medicoId,
    admin_id: user.id,
    tipo_acao: params.tipoAcao,
    motivo: params.motivo,
    dados_antes: restricaoAtual ?? {},
    dados_depois: restricaoNova ?? {},
    alerta_vinculado_id: params.alertaId ?? null,
    anomalia_vinculada_id: params.anomaliaId ?? null,
  });
  if (error) throw error;

  // Log de confiança
  await fromTable("medico_logs_confianca").insert({
    medico_id: params.medicoId,
    evento: `acao_admin_${params.tipoAcao}`,
    motivo: params.motivo,
    detalhes: { tipo_acao: params.tipoAcao, admin_id: user.id },
    actor_id: user.id,
  });
}

export async function listarAcoesAdmin(medicoId?: string): Promise<AdminAcao[]> {
  let query = fromTable("admin_acoes_medico")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (medicoId) query = query.eq("medico_id", medicoId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AdminAcao[];
}

export async function listarRestricoesAtivas(): Promise<MedicoRestricao[]> {
  const { data, error } = await fromTable("medico_restricoes")
    .select("*")
    .or("ranking_congelado.eq.true,impulsionamento_pausado.eq.true,beneficios_bloqueados.eq.true,em_acompanhamento.eq.true,selo_removido.eq.true");
  if (error) throw error;
  return (data ?? []) as unknown as MedicoRestricao[];
}

export async function removerRestricao(medicoId: string, motivo: string) {
  await executarAcaoAdmin({ medicoId, tipoAcao: "remover_restricao", motivo });
}

/* ── Invocar IA Auditora ── */

export async function executarAnaliseIA(medicoId: string) {
  const { data, error } = await supabase.functions.invoke("ia-auditoria-medica", {
    body: { medico_id: medicoId, action: "analise_completa" },
  });
  if (error) throw error;
  return data;
}

export async function executarAnaliseBatch() {
  const { data, error } = await supabase.functions.invoke("ia-auditoria-medica", {
    body: { action: "analise_batch" },
  });
  if (error) throw error;
  return data;
}

export async function executarDeteccaoAnomalias() {
  const { data, error } = await supabase.functions.invoke("ia-auditoria-medica", {
    body: { action: "detectar_anomalias" },
  });
  if (error) throw error;
  return data;
}
