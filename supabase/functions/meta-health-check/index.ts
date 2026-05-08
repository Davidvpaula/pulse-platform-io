// Fase 8 — meta-health-check
// Verifica conectividade Meta WABA. Sem secrets => pending_credentials (esperado).
// Atualiza meta_waba_health + observabilidade_eventos. Fail-closed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logEvento } from "../_shared/observabilidade.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET")
    return jsonResp({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Auth: admin ou supervisor
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "Não autenticado" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return jsonResp({ error: "Sessão inválida" }, 401);

    const { data: roleAdmin } = await admin.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    const { data: roleSup } = await admin.rpc("has_role", {
      _user_id: u.user.id,
      _role: "supervisor",
    });
    if (!roleAdmin && !roleSup) return jsonResp({ error: "Permissão negada" }, 403);

    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE = Deno.env.get("META_PHONE_NUMBER_ID");
    const META_WABA = Deno.env.get("META_WABA_BUSINESS_ID");

    let status: string = "pending_credentials";
    let raw: any = null;
    let quality: string | null = null;
    let display_phone: string | null = null;
    let error_code: string | null = null;
    let error_message: string | null = null;

    if (!META_TOKEN || !META_PHONE) {
      status = "pending_credentials";
      error_message = "Secrets META ausentes (esperado em sandbox)";
    } else {
      // Tenta GET no phone_number
      try {
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${META_PHONE}?fields=display_phone_number,quality_rating,verified_name,throughput`,
          { headers: { Authorization: `Bearer ${META_TOKEN}` } },
        );
        const body = await r.json().catch(() => ({}));
        raw = body;
        if (r.ok) {
          status = "ok";
          quality = body.quality_rating ?? null;
          display_phone = body.display_phone_number ?? null;
        } else {
          status = "error";
          error_code = String(body?.error?.code ?? r.status);
          error_message = body?.error?.message ?? `HTTP ${r.status}`;
        }
      } catch (e) {
        status = "error";
        error_message = (e as Error).message;
      }
    }

    await admin.from("meta_waba_health").insert({
      status,
      phone_number_id: META_PHONE ?? null,
      business_account_id: META_WABA ?? null,
      display_phone_number: display_phone,
      quality_rating: quality,
      error_code,
      error_message,
      raw,
    });

    await logEvento(admin, {
      modulo: "whatsapp",
      evento: "meta_health_check",
      severity: status === "ok" ? "info" : status === "pending_credentials" ? "info" : "error",
      user_id: u.user.id,
      metadata: { status, error_code, error_message },
    });

    return jsonResp({ ok: true, status, quality_rating: quality, display_phone, error_message });
  } catch (e) {
    console.error("[meta-health-check] erro:", e);
    await logEvento(admin, {
      modulo: "whatsapp",
      evento: "meta_health_check_exception",
      severity: "error",
      metadata: { error: (e as Error).message },
    });
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
