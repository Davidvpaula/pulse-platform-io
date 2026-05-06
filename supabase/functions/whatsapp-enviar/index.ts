// Edge function: enviar mensagens via WhatsApp Cloud API
// Suporta lembretes, confirmações e mensagens manuais
// Secrets: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_TOKEN || !PHONE_ID) {
      console.warn("[whatsapp-enviar] credenciais não configuradas");
      return new Response(
        JSON.stringify({ error: "WhatsApp API não configurada", not_configured: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { to, message, template_name, template_params, tipo, consulta_id, conversation_id } = body;

    if (!to || (!message && !template_name)) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: to + (message ou template_name)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitizar telefone
    const phone = to.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      return new Response(JSON.stringify({ error: "Telefone inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── Verificar opt-in (LGPD) ──
    const { data: optIn } = await admin
      .from("pacientes")
      .select("whatsapp_opt_in")
      .eq("telefone", to)
      .maybeSingle();

    if (optIn && optIn.whatsapp_opt_in === false) {
      console.warn("[whatsapp-enviar] paciente optou por não receber WhatsApp:", phone);
      return new Response(JSON.stringify({ error: "Paciente não autoriza mensagens WhatsApp", lgpd_block: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Deduplicação por consulta_id + tipo ──
    if (consulta_id && tipo) {
      const { data: existente } = await admin
        .from("comunicacao_auditoria")
        .select("id")
        .eq("entity_type", "whatsapp_envio")
        .eq("entity_id", consulta_id)
        .eq("action", tipo)
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString()) // última hora
        .maybeSingle();

      if (existente) {
        console.log("[whatsapp-enviar] mensagem duplicada bloqueada:", tipo, consulta_id);
        return new Response(JSON.stringify({ ok: false, duplicated: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Montar payload WhatsApp ──
    let waPayload: Record<string, unknown>;

    if (template_name) {
      waPayload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: template_name,
          language: { code: "pt_BR" },
          ...(template_params?.length && {
            components: [{
              type: "body",
              parameters: template_params.map((p: string) => ({ type: "text", text: p })),
            }],
          }),
        },
      };
    } else {
      waPayload = {
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message },
      };
    }

    // ── Enviar via Meta API ──
    const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(waPayload),
    });

    const result = await res.json();

    // ── Audit log ──
    await admin.from("comunicacao_auditoria").insert({
      action: tipo || "envio_manual",
      entity_type: "whatsapp_envio",
      entity_id: consulta_id || null,
      user_id: userData.user.id,
      metadata: {
        to: phone,
        status: res.ok ? "sent" : "failed",
        http_status: res.status,
        wa_message_id: result.messages?.[0]?.id ?? null,
        template_name: template_name ?? null,
        conversation_id: conversation_id ?? null,
        timestamp: new Date().toISOString(),
      },
    });

    // ── Salvar mensagem na conversa se conversation_id fornecido ──
    if (conversation_id && res.ok) {
      await admin.from("messages").insert({
        conversation_id,
        content: message || `[template: ${template_name}]`,
        sender_type: "sistema",
        message_type: "text",
        whatsapp_message_id: result.messages?.[0]?.id ?? null,
        metadata: { sent_by: userData.user.id, tipo },
      });
    }

    if (!res.ok) {
      console.error("[whatsapp-enviar] Meta API erro:", res.status, result);
      return new Response(JSON.stringify({ ok: false, error: "Falha no envio", detail: result.error?.message }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[whatsapp-enviar] enviado com sucesso:", result.messages?.[0]?.id);
    return new Response(JSON.stringify({ ok: true, wa_message_id: result.messages?.[0]?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-enviar] erro:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
