// Fase 8 — meta-template-sync (dry-run sem secrets)
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
  if (req.method !== "POST") return jsonResp({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

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
    if (!roleAdmin) return jsonResp({ error: "Permissão negada" }, 403);

    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_WABA = Deno.env.get("META_WABA_BUSINESS_ID");
    const dryRun = !META_TOKEN || !META_WABA;

    let templates: any[] = [];
    let error: string | null = null;

    if (!dryRun) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v19.0/${META_WABA}/message_templates?limit=100`,
          { headers: { Authorization: `Bearer ${META_TOKEN}` } },
        );
        const body = await r.json().catch(() => ({}));
        if (r.ok) {
          templates = body.data ?? [];
        } else {
          error = body?.error?.message ?? `HTTP ${r.status}`;
        }
      } catch (e) {
        error = (e as Error).message;
      }
    }

    await admin.from("meta_template_sync_log").insert({
      action: "list",
      status_meta: error ? "error" : dryRun ? "dry_run" : "ok",
      dry_run: dryRun,
      performed_by: u.user.id,
      payload: { count: templates.length, error, templates_preview: templates.slice(0, 5) },
    });

    await logEvento(admin, {
      modulo: "whatsapp",
      evento: "meta_template_sync",
      severity: error ? "error" : "info",
      user_id: u.user.id,
      metadata: { dry_run: dryRun, count: templates.length, error },
    });

    return jsonResp({
      ok: !error,
      dry_run: dryRun,
      count: templates.length,
      templates,
      error,
    });
  } catch (e) {
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
