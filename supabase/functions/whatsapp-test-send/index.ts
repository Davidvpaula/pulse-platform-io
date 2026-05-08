// Edge function: whatsapp-test-send
// Disparo SANDBOX/TESTE da API oficial WhatsApp (Meta Cloud API).
// - Token, phone_number_id e verify_token vêm 100% de secrets (META_*).
// - Versão da Graph API isolada em constante: trocar sandbox→produção = só atualizar secrets.
// - Acesso restrito a usuários com role 'admin'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GRAPH_API_VERSION = "v25.0";

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
    // ── 1. Validar secrets ──
    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE_ID = Deno.env.get("META_PHONE_NUMBER_ID");
    const META_VERIFY = Deno.env.get("META_VERIFY_TOKEN");

    const missing: string[] = [];
    if (!META_TOKEN) missing.push("META_WHATSAPP_TOKEN");
    if (!META_PHONE_ID) missing.push("META_PHONE_NUMBER_ID");
    if (!META_VERIFY) missing.push("META_VERIFY_TOKEN");
    if (missing.length) {
      return json({ error: "Secrets ausentes", missing, not_configured: true }, 503);
    }

    // ── 2. Auth: requer admin ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

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
      console.error("[whatsapp-test-send] has_role erro:", roleErr);
      return json({ error: "Falha ao verificar permissão" }, 500);
    }
    if (!isAdmin) {
      return json({ error: "Acesso negado — somente admin pode disparar teste" }, 403);
    }

    // ── 3. Body ──
    let body: { to?: string; template_name?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "JSON inválido" }, 400);
    }

    const to = (body.to ?? "").replace(/\D/g, "");
    if (!to || to.length < 10 || to.length > 15) {
      return json({ error: "Campo 'to' obrigatório (E.164 sem '+', ex.: 5531999999999)" }, 400);
    }
    const templateName = body.template_name || "hello_world";
    const languageCode = body.language || "en_US";

    // ── 4. Payload Meta ──
    const payload = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PHONE_ID}/messages`;
    console.log("[whatsapp-test-send] enviando", { url, to, template: templateName });

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

    console.log("[whatsapp-test-send] resposta Meta", {
      http_status: res.status,
      request_id: requestId,
      wa_message_id: metaBody?.messages?.[0]?.id ?? null,
      error: metaBody?.error ?? null,
    });

    return json(
      {
        ok: res.ok,
        http_status: res.status,
        meta_request_id: requestId,
        wa_message_id: metaBody?.messages?.[0]?.id ?? null,
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
    console.error("[whatsapp-test-send] erro inesperado:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
