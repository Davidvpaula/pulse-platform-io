/**
 * Camada de serviço para Termos e Condições.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TermoTipo = Database["public"]["Enums"]["termo_tipo"];
export type TermoRow = Database["public"]["Tables"]["termos_condicoes"]["Row"];
export type AcceptanceRow = Database["public"]["Tables"]["user_terms_acceptance"]["Row"];

/* ─── Labels dos tipos ─── */
export const TERMO_TIPO_LABELS: Record<TermoTipo, string> = {
  consulta_paciente: "Termos de compra de consulta",
  privacidade: "Política de privacidade",
  plano_plataforma: "Termos de planos da plataforma",
  plano_medico: "Termos de planos de médicos",
  contrato_medico: "Contrato inicial (cadastro)",
  gamificacao_premium: "Termos de gamificação / premium",
  criacao_plano_medico: "Termos de criação de planos",
  uso_feegow: "Termos de uso da Feegow",
  proposta_empresa: "Termos de proposta comercial (Empresa)",
  proposta_medico: "Termos de proposta comercial (Médico)",
  cancelamento_reembolso: "Termos de cancelamento e reembolso",
};

export const TERMO_CATEGORIAS = {
  paciente: ["consulta_paciente", "privacidade", "plano_plataforma", "plano_medico", "cancelamento_reembolso"] as TermoTipo[],
  medico: ["contrato_medico", "gamificacao_premium", "criacao_plano_medico", "uso_feegow", "proposta_medico"] as TermoTipo[],
  empresa: ["proposta_empresa"] as TermoTipo[],
};

/* ─── Queries ─── */

export async function listarTermos() {
  const { data, error } = await supabase
    .from("termos_condicoes")
    .select("*")
    .order("tipo")
    .order("versao", { ascending: false });
  if (error) throw error;
  return data as TermoRow[];
}

export async function buscarTermoAtivo(tipo: TermoTipo) {
  const { data, error } = await supabase
    .from("termos_condicoes")
    .select("*")
    .eq("tipo", tipo)
    .eq("status", "ativo")
    .maybeSingle();
  if (error) throw error;
  return data as TermoRow | null;
}

export async function criarTermo(input: { tipo: TermoTipo; titulo: string; conteudo: string; status?: string }) {
  const { data: { user } } = await supabase.auth.getUser();

  // Calculate next version for this type
  const { data: existing, error: vErr } = await supabase
    .from("termos_condicoes")
    .select("versao")
    .eq("tipo", input.tipo)
    .order("versao", { ascending: false })
    .limit(1);
  if (vErr) throw vErr;
  const nextVersao = (existing?.[0]?.versao ?? 0) + 1;

  const { data, error } = await supabase
    .from("termos_condicoes")
    .insert({
      tipo: input.tipo,
      titulo: input.titulo,
      conteudo: input.conteudo,
      versao: nextVersao,
      status: input.status ?? "inativo",
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TermoRow;
}

export async function ativarTermo(id: string) {
  const { error } = await supabase
    .from("termos_condicoes")
    .update({ status: "ativo" })
    .eq("id", id);
  if (error) throw error;
}

export async function desativarTermo(id: string) {
  const { error } = await supabase
    .from("termos_condicoes")
    .update({ status: "inativo" })
    .eq("id", id);
  if (error) throw error;
}

/** Edita título e conteúdo de um termo INATIVO (rascunho). Termos ativos são imutáveis. */
export async function editarTermo(id: string, input: { titulo: string; conteudo: string }) {
  // Verifica se é inativo antes de editar
  const { data: current, error: fetchErr } = await supabase
    .from("termos_condicoes")
    .select("status")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;
  if (current?.status === "ativo") throw new Error("Termos ativos não podem ser editados. Crie uma nova versão.");

  const { error } = await supabase
    .from("termos_condicoes")
    .update({ titulo: input.titulo, conteudo: input.conteudo })
    .eq("id", id)
    .eq("status", "inativo");
  if (error) throw error;
}

/* ─── Aceite ─── */

export async function registrarAceite(termoId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Tenta capturar IP via serviço externo (fallback vazio)
  let ip = "";
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    ip = j.ip ?? "";
  } catch { /* ignore */ }

  const { error } = await supabase
    .from("user_terms_acceptance")
    .insert({
      user_id: user.id,
      termo_id: termoId,
      ip_address: ip,
      user_agent: navigator.userAgent,
    });
  if (error) throw error;
}

export async function verificarAceite(tipo: TermoTipo, userId: string): Promise<boolean> {
  const termo = await buscarTermoAtivo(tipo);
  if (!termo) return true;

  const { data, error } = await supabase
    .from("user_terms_acceptance")
    .select("id")
    .eq("user_id", userId)
    .eq("termo_id", termo.id)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Retorna todos os termos ativos que o usuário ainda NÃO aceitou.
 * Filtra por categoria (paciente/medico) se fornecida.
 */
export async function buscarTermosPendentes(
  categoria?: "paciente" | "medico" | "empresa",
): Promise<TermoRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Busca todos os termos ativos
  const { data: ativos, error: e1 } = await supabase
    .from("termos_condicoes")
    .select("*")
    .eq("status", "ativo");
  if (e1) throw e1;
  if (!ativos?.length) return [];

  // Filtra por categoria se fornecida
  const tipos = categoria ? TERMO_CATEGORIAS[categoria] : undefined;
  const filtrados = tipos
    ? ativos.filter(t => (tipos as string[]).includes(t.tipo))
    : ativos;
  if (!filtrados.length) return [];

  // Busca aceites do usuário para esses termos
  const ids = filtrados.map(t => t.id);
  const { data: aceitos, error: e2 } = await supabase
    .from("user_terms_acceptance")
    .select("termo_id")
    .eq("user_id", user.id)
    .in("termo_id", ids);
  if (e2) throw e2;

  const aceitoSet = new Set((aceitos ?? []).map(a => a.termo_id));
  return filtrados.filter(t => !aceitoSet.has(t.id));
}

export async function listarAceitesDoTermo(termoId: string) {
  const { data: aceites, error } = await supabase
    .from("user_terms_acceptance")
    .select("*")
    .eq("termo_id", termoId)
    .order("aceito_em", { ascending: false });
  if (error) throw error;
  if (!aceites?.length) return [];

  const userIds = Array.from(new Set(aceites.map(a => a.user_id).filter(Boolean)));
  let perfilMap = new Map<string, { nome_completo: string | null; email: string | null }>();

  if (userIds.length) {
    const { data: perfis, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, nome_completo, email")
      .in("user_id", userIds);
    if (pErr) throw pErr;
    perfilMap = new Map(
      (perfis ?? []).map(p => [p.user_id, { nome_completo: p.nome_completo, email: p.email }])
    );
  }

  return aceites.map(a => ({
    ...a,
    profiles: perfilMap.get(a.user_id) ?? null,
  }));
}

/** Lista todos os aceites do usuário logado, com dados do termo */
export async function listarMeusAceites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("user_terms_acceptance")
    .select("*, termos_condicoes:termo_id(id, tipo, titulo, conteudo, versao, status, published_at)")
    .eq("user_id", user.id)
    .order("aceito_em", { ascending: false });
  if (error) throw error;
  return data as (AcceptanceRow & {
    termos_condicoes: Pick<TermoRow, "id" | "tipo" | "titulo" | "conteudo" | "versao" | "status" | "published_at"> | null;
  })[];
}
