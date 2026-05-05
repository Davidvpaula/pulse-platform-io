/**
 * Camada de serviço para IA Auditora / Compliance / Antifraude.
 * Tabelas: medico_score_operacional, medico_score_compliance,
 *          medico_alertas_ia, medico_auditoria_ia, medico_anomalias,
 *          medico_logs_confianca
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

/* ── MedicoResumoIA: view agregada para o dashboard ── */
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
