import { supabase } from "@/integrations/supabase/client";

export type TreinamentoModulo = {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
};

export type TreinamentoAula = {
  id: string;
  modulo_id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  duracao_min: number | null;
  ordem: number;
  ativo: boolean;
};

export type ModuloComAulas = TreinamentoModulo & { aulas: TreinamentoAula[] };

/**
 * Extrai o ID do vídeo de uma URL do YouTube (suporta youtu.be, watch?v=, embed/, shorts/).
 */
export function extrairYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extrairYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

export function youtubeThumbnail(url: string): string | null {
  const id = extrairYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** Lista módulos com suas aulas (ordenados). Apenas ativos por padrão. */
export async function listModulosComAulas(opts?: { incluirInativos?: boolean }): Promise<ModuloComAulas[]> {
  const incluirInativos = opts?.incluirInativos ?? false;

  let qm = supabase.from("treinamentos_modulos").select("*").order("ordem").order("created_at");
  if (!incluirInativos) qm = qm.eq("ativo", true);
  const { data: modulos, error: e1 } = await qm;
  if (e1) { console.error("[treinamentos] modulos:", e1); return []; }

  let qa = supabase.from("treinamentos_aulas").select("*").order("ordem").order("created_at");
  if (!incluirInativos) qa = qa.eq("ativo", true);
  const { data: aulas, error: e2 } = await qa;
  if (e2) { console.error("[treinamentos] aulas:", e2); return []; }

  return (modulos ?? []).map(m => ({
    ...m,
    aulas: (aulas ?? []).filter(a => a.modulo_id === m.id),
  }));
}

/** Conjunto de aula_ids concluídas pelo usuário logado. */
export async function listMinhasConclusoes(): Promise<Set<string>> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return new Set();
  const { data, error } = await supabase
    .from("treinamentos_conclusoes")
    .select("aula_id")
    .eq("user_id", user.user.id);
  if (error) { console.error("[treinamentos] conclusoes:", error); return new Set(); }
  return new Set((data ?? []).map(r => r.aula_id));
}

export async function marcarAulaConcluida(aulaId: string): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { error } = await supabase
    .from("treinamentos_conclusoes")
    .insert({ user_id: user.user.id, aula_id: aulaId });
  if (error && !error.message.includes("duplicate")) {
    console.error("[treinamentos] marcar:", error);
    return false;
  }
  return true;
}

export async function desmarcarAulaConcluida(aulaId: string): Promise<boolean> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { error } = await supabase
    .from("treinamentos_conclusoes")
    .delete()
    .eq("user_id", user.user.id)
    .eq("aula_id", aulaId);
  if (error) { console.error("[treinamentos] desmarcar:", error); return false; }
  return true;
}

/* ─── ADMIN ─── */

export async function adminCreateModulo(input: { titulo: string; descricao?: string; ordem?: number }) {
  return supabase.from("treinamentos_modulos").insert({
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    ordem: input.ordem ?? 0,
  }).select().single();
}

export async function adminUpdateModulo(id: string, patch: Partial<TreinamentoModulo>) {
  return supabase.from("treinamentos_modulos").update(patch).eq("id", id);
}

export async function adminDeleteModulo(id: string) {
  return supabase.from("treinamentos_modulos").delete().eq("id", id);
}

export async function adminCreateAula(input: {
  modulo_id: string;
  titulo: string;
  descricao?: string;
  video_url: string;
  duracao_min?: number;
  ordem?: number;
}) {
  return supabase.from("treinamentos_aulas").insert({
    modulo_id: input.modulo_id,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    video_url: input.video_url,
    duracao_min: input.duracao_min ?? null,
    ordem: input.ordem ?? 0,
  }).select().single();
}

export async function adminUpdateAula(id: string, patch: Partial<TreinamentoAula>) {
  return supabase.from("treinamentos_aulas").update(patch).eq("id", id);
}

export async function adminDeleteAula(id: string) {
  return supabase.from("treinamentos_aulas").delete().eq("id", id);
}
