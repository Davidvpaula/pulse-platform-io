// Edge function: audit-log
// Recebe um evento de auditoria + headers HTTP e grava em comunicacao_auditoria
// (tabela genérica disponível no schema). Captura IP e user-agent.
// Esta function fica disponível para ser chamada pelos módulos que precisarem
// registrar ações sensíveis com rastreamento de origem.
//
// Body: { action: string, entity_type: string, entity_id?: string, metadata?: object }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // valida o usuário
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const entity_type = String(body?.entity_type || "").trim();
    const entity_id = body?.entity_id ?? null;
    const extraMeta = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!action || !entity_type) {
      return new Response(
        JSON.stringify({ error: "action e entity_type são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    const metadata = {
      ...extraMeta,
      ip,
      user_agent: userAgent,
      origin: "edge-function",
    };

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: inserted, error: insErr } = await admin
      .from("comunicacao_auditoria")
      .insert({
        actor_id: userData.user.id,
        action,
        entity_type,
        entity_id,
        metadata,
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
