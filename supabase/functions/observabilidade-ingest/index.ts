// Fase 8 — observabilidade-ingest
// Endpoint genérico para outros módulos (frontend/edges) registrarem eventos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_SEV = new Set(["info", "warn", "error", "critical"]);

// Rate-limit leve em memória (por user) — best-effort, evita flood
const RL = new Map<string, { count: number; reset: number }>();
const RL_MAX = 60; // 60 eventos/min/user
const RL_WINDOW = 60_000;

function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const entry = RL.get(userId);
  if (!entry || entry.reset < now) {
    RL.set(userId, { count: 1, reset: now + RL_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RL_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "Não autenticado" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return jsonResp({ error: "Sessão inválida" }, 401);

    if (!rateLimitOk(u.user.id)) {
      return jsonResp({ error: "rate_limited" }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const { modulo, evento, severity = "info", conversation_id, metadata } = body ?? {};

    if (!modulo || typeof modulo !== "string" || modulo.length > 64)
      return jsonResp({ error: "modulo inválido" }, 400);
    if (!evento || typeof evento !== "string" || evento.length > 128)
      return jsonResp({ error: "evento inválido" }, 400);
    if (!VALID_SEV.has(severity)) return jsonResp({ error: "severity inválida" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.from("observabilidade_eventos").insert({
      modulo,
      evento,
      severity,
      conversation_id: conversation_id ?? null,
      user_id: u.user.id,
      metadata: metadata ?? {},
    });
    if (error) return jsonResp({ error: error.message }, 500);

    return jsonResp({ ok: true });
  } catch (e) {
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
