// Edge function: whatsapp-cloud-test
// Teste isolado de envio REAL via WhatsApp Cloud API (Meta) — mensagem type:text livre.
// Usa secrets META_WHATSAPP_TOKEN + META_PHONE_NUMBER_ID. Versão fixa v21.0.
// NÃO toca em sandbox/produção/Inbox/webhook. Loga em whatsapp_cloud_test_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GRAPH_API_VERSION = "v21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE_ID = Deno.env.get("META_PHONE_NUMBER_ID");
    const missing: string[] = [];
    if (!META_TOKEN) missing.push("META_WHATSAPP_TOKEN");
    if (!META_PHONE_ID) missing.push("META_PHONE_NUMBER_ID");
    if (missing.length) {
      return json({ error: "Secrets ausentes", missing, not_configured: true }, 503);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Sessão inválida", details: userErr?.message ?? null }, 401);
    }
    const userId = userData.user.id;

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) {
      console.error("[whatsapp-cloud-test] has_role erro:", roleErr);
      return json({ error: "Falha ao verificar permissão" }, 500);
    }
    if (!isAdmin) return json({ error: "Acesso negado — somente admin" }, 403);

    let body: { to?: string; message?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const to = (body.to ?? "").replace(/\D/g, "");
    const message = (body.message ?? "").trim();
    if (!to || to.length < 10 || to.length > 15) {
      return json({ error: "Campo 'to' obrigatório (E.164 sem '+', 10-15 dígitos)" }, 400);
    }
    if (!message || message.length > 1000) {
      return json({ error: "Campo 'message' obrigatório (1-1000 chars)" }, 400);
    }

    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    };

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_ID}/messages`;
    console.log("[whatsapp-cloud-test] enviando", { url, to });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const metaBody = await res.json().catch(() => ({}));
    const requestId = res.headers.get("x-fb-request-id");
    const waMessageId = metaBody?.messages?.[0]?.id ?? null;

    console.log("[whatsapp-cloud-test] resposta Meta", {
      http_status: res.status,
      request_id: requestId,
      wa_message_id: waMessageId,
      error: metaBody?.error ?? null,
    });

    // Log best-effort
    try {
      await admin.from("whatsapp_cloud_test_log").insert({
        enviado_por: userId,
        to_number: to,
        message,
        http_status: res.status,
        wa_message_id: waMessageId,
        meta_request_id: requestId,
        error_code: metaBody?.error?.code ?? null,
        error_message: metaBody?.error?.message ?? null,
        raw_response: metaBody,
      });
    } catch (e) {
      console.warn("[whatsapp-cloud-test] log falhou:", (e as Error).message);
    }

    return json(
      {
        ok: res.ok,
        http_status: res.status,
        meta_request_id: requestId,
        wa_message_id: waMessageId,
        error_code: metaBody?.error?.code ?? null,
        error_subcode: metaBody?.error?.error_subcode ?? null,
        error_message: metaBody?.error?.message ?? null,
        error_type: metaBody?.error?.type ?? null,
        fbtrace_id: metaBody?.error?.fbtrace_id ?? null,
        meta_response: metaBody,
        env: {
          graph_api_version: GRAPH_API_VERSION,
          phone_number_id: META_PHONE_ID,
        },
      },
      res.ok ? 200 : 502,
    );
  } catch (e) {
    console.error("[whatsapp-cloud-test] erro inesperado:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
