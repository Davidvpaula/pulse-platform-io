// FASE 7 — IA Avatar — gerenciamento de memória contextual
// Operações:
//   GET  ?conversation_id=...      -> lista memórias da conversa (e do paciente, se houver)
//   POST { action: "create", ... } -> upsert memória
//   POST { action: "delete", id }  -> remove memória
//   POST { action: "gc" }          -> garbage collection de memórias expiradas (admin/internal)
// Reutiliza ai_avatar_memory; respeita RLS via cliente do usuário.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MEMORY_TYPES = new Set([
  "preferencia", "contexto", "historico_operacional", "observacao", "pendencia",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const internalKey = req.headers.get("X-Internal-Key") ?? "";
  const isInternal = internalKey && internalKey === serviceKey;

  const userClient = !isInternal && authHeader.startsWith("Bearer ")
    ? createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    : null;

  if (!isInternal) {
    if (!userClient) return jsonResp({ error: "Não autenticado" }, 401);
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return jsonResp({ error: "Sessão inválida" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const db = userClient ?? admin;

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const convId = url.searchParams.get("conversation_id");
      const patientId = url.searchParams.get("patient_id");
      if (!convId && !patientId) return jsonResp({ error: "conversation_id ou patient_id obrigatório" }, 400);

      let q = db
        .from("ai_avatar_memory")
        .select("id, patient_id, conversation_id, memory_type, content, relevance_score, expires_at, created_at, updated_at")
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("relevance_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (convId && patientId) q = q.or(`conversation_id.eq.${convId},patient_id.eq.${patientId}`);
      else if (convId) q = q.eq("conversation_id", convId);
      else if (patientId) q = q.eq("patient_id", patientId);

      const { data, error } = await q;
      if (error) return jsonResp({ error: error.message }, 500);
      return jsonResp({ ok: true, memories: data ?? [] });
    }

    if (req.method !== "POST") return jsonResp({ error: "method not allowed" }, 405);

    const body = await req.json();
    const action = body?.action as string;

    if (action === "create") {
      const memory_type = body?.memory_type ?? "contexto";
      if (!MEMORY_TYPES.has(memory_type)) return jsonResp({ error: "memory_type inválido" }, 400);
      const content = String(body?.content ?? "").trim();
      if (!content) return jsonResp({ error: "content obrigatório" }, 400);
      const relevance = Math.min(1, Math.max(0, Number(body?.relevance_score ?? 0.5)));
      const ttlDays = Number(body?.ttl_days ?? 30);
      const expires_at = ttlDays > 0
        ? new Date(Date.now() + ttlDays * 86400_000).toISOString()
        : null;
      const { data, error } = await db
        .from("ai_avatar_memory")
        .insert({
          patient_id: body?.patient_id ?? null,
          conversation_id: body?.conversation_id ?? null,
          memory_type,
          content: content.slice(0, 4000),
          relevance_score: relevance,
          expires_at,
        })
        .select()
        .single();
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ ok: true, memory: data });
    }

    if (action === "delete") {
      const id = body?.id;
      if (!id) return jsonResp({ error: "id obrigatório" }, 400);
      const { error } = await db.from("ai_avatar_memory").delete().eq("id", id);
      if (error) return jsonResp({ error: error.message }, 400);
      return jsonResp({ ok: true });
    }

    if (action === "gc") {
      // GC: remove memórias expiradas. Apenas admin OU internal.
      if (!isInternal) {
        const { data: u } = await userClient!.auth.getUser();
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", u!.user!.id);
        if (!roles?.some((r) => r.role === "admin")) {
          return jsonResp({ error: "forbidden" }, 403);
        }
      }
      const { data, error } = await admin
        .from("ai_avatar_memory")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("id");
      if (error) return jsonResp({ error: error.message }, 500);
      return jsonResp({ ok: true, removed: data?.length ?? 0 });
    }

    return jsonResp({ error: "action inválida" }, 400);
  } catch (e) {
    console.error("[ai-avatar-memory] erro:", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
