// Fase 8 — observabilidade-export (CSV, requer permissão observabilidade.exportar)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logEvento } from "../_shared/observabilidade.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST")
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasPerm } = await admin.rpc("has_permission", {
      _user_id: u.user.id,
      _key: "observabilidade.exportar",
    });
    if (!hasPerm) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const modulo = url.searchParams.get("modulo");
    const severity = url.searchParams.get("severity");
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5000", 10) || 5000, 10000);

    let q = admin
      .from("observabilidade_eventos")
      .select("created_at,modulo,evento,severity,conversation_id,user_id,metadata")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (from) q = q.gte("created_at", from);
    if (to) q = q.lte("created_at", to);
    if (modulo) q = q.eq("modulo", modulo);
    if (severity) q = q.eq("severity", severity);

    const { data, error } = await q;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = data ?? [];
    const header = "created_at,modulo,evento,severity,conversation_id,user_id,metadata";
    const csv =
      header +
      "\n" +
      rows
        .map((r: any) =>
          [
            r.created_at,
            r.modulo,
            r.evento,
            r.severity,
            r.conversation_id,
            r.user_id,
            r.metadata,
          ]
            .map(csvEscape)
            .join(","),
        )
        .join("\n");

    await logEvento(admin, {
      modulo: "observabilidade",
      evento: "export_csv",
      severity: "info",
      user_id: u.user.id,
      metadata: { count: rows.length, filters: { from, to, modulo, severity } },
    });

    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="observabilidade_${Date.now()}.csv"`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
