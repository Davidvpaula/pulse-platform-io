// Edge function: enviar mensagens via WhatsApp Cloud API (sandbox / produção)
// - Secrets: META_WHATSAPP_TOKEN, META_PHONE_NUMBER_ID (fallback se não vier whatsapp_instance_id)
// - Resolve phone_number_id via whatsapp_instances (preferido) ou env (fallback)
// - Guard janela 24h: bloqueia texto livre fora da janela; permite template; admin pode forçar
// - Persiste em messages.body com sender_type real (medico/colaborador/sistema)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { canSendReal, logEvento } from "../_shared/observabilidade.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WA_BASE = "https://graph.facebook.com/v19.0";

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method not allowed" }, 405);

  try {
    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE_FALLBACK = Deno.env.get("META_PHONE_NUMBER_ID");
    // Fail-closed: validação de produção é feita ABAIXO via canSendReal().
    // Sem token => sandbox/mock_sent (não retorna mais 503 prematuro).

    // ── Auth: getUser (não getClaims) ──
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "Não autenticado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResp({ error: "Sessão inválida" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      to,
      message,
      template_name,
      template_params,
      tipo,
      consulta_id,
      conversation_id,
      force = false,
    } = body ?? {};

    if (!to || (!message && !template_name)) {
      return jsonResp({ error: "Campos obrigatórios: to + (message ou template_name)" }, 400);
    }

    const phone = String(to).replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) return jsonResp({ error: "Telefone inválido" }, 400);

    // ── Fase 8: Gate fail-closed (sandbox => mock_sent) ──
    const sendGate = await canSendReal(admin);
    if (!sendGate.ok) {
      // Persistir mock_sent quando vinculado a uma conversa
      let senderTypeMock: "medico" | "colaborador" | "sistema" = "sistema";
      const { data: medM } = await admin.from("medicos").select("id").eq("user_id", userId).maybeSingle();
      if (medM) senderTypeMock = "medico";
      else {
        const { data: colM } = await admin.from("colaboradores").select("id").eq("user_id", userId).maybeSingle();
        if (colM) senderTypeMock = "colaborador";
      }
      if (conversation_id) {
        await admin.from("messages").insert({
          conversation_id,
          body: message || `[template: ${template_name}]`,
          sender_type: senderTypeMock,
          sender_id: userId,
          sender_name: userData.user.email ?? null,
          message_type: template_name ? "template" : "text",
          status: "mock_sent",
          metadata: { template_name: template_name ?? null, tipo: tipo ?? null, mock_reason: sendGate.reason },
        });
        await admin
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: (message || `[template: ${template_name}]`).slice(0, 80),
          })
          .eq("id", conversation_id);
      }
      await admin.from("comunicacao_auditoria").insert({
        action: tipo || "envio_manual",
        entity_type: "whatsapp_envio",
        entity_id: consulta_id || null,
        user_id: userId,
        metadata: {
          to: phone,
          status: "mock_sent",
          reason: sendGate.reason,
          modo: sendGate.modo,
          health: sendGate.health,
          template_name: template_name ?? null,
          conversation_id: conversation_id ?? null,
          timestamp: new Date().toISOString(),
        },
      });
      await logEvento(admin, {
        modulo: "whatsapp",
        evento: "mock_sent",
        severity: "info",
        conversation_id: conversation_id ?? null,
        user_id: userId,
        metadata: { reason: sendGate.reason, modo: sendGate.modo, health: sendGate.health, to: phone },
      });
      return jsonResp({
        ok: true,
        mock_sent: true,
        reason: sendGate.reason,
        modo: sendGate.modo,
        health: sendGate.health,
      });
    }

    // ── Resolver phone_number_id ──
    let phoneNumberId: string | null = null;
    let instanceId: string | null = null;
    if (conversation_id) {
      const { data: conv } = await admin
        .from("conversations")
        .select("whatsapp_instance_id")
        .eq("id", conversation_id)
        .maybeSingle();
      if (conv?.whatsapp_instance_id) {
        instanceId = conv.whatsapp_instance_id;
        const { data: inst } = await admin
          .from("whatsapp_instances")
          .select("phone_number_id")
          .eq("id", instanceId)
          .maybeSingle();
        phoneNumberId = inst?.phone_number_id ?? null;
      }
    }
    if (!phoneNumberId) {
      // fallback: primeira instância sandbox ativa
      const { data: anyInst } = await admin
        .from("whatsapp_instances")
        .select("id, phone_number_id")
        .eq("ativo", true)
        .not("phone_number_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (anyInst) {
        phoneNumberId = anyInst.phone_number_id;
        instanceId = anyInst.id;
      }
    }
    if (!phoneNumberId) phoneNumberId = META_PHONE_FALLBACK ?? null;
    if (!phoneNumberId) {
      return jsonResp({ error: "Nenhum phone_number_id disponível (whatsapp_instances vazio e META_PHONE_NUMBER_ID ausente)" }, 503);
    }

    // ── Opt-in LGPD ──
    const { data: optIn } = await admin
      .from("pacientes")
      .select("whatsapp_opt_in")
      .eq("telefone", to)
      .maybeSingle();
    if (optIn && optIn.whatsapp_opt_in === false) {
      return jsonResp({ error: "Paciente não autoriza mensagens WhatsApp", lgpd_block: true }, 403);
    }

    // ── Janela 24h: bloqueia texto livre se expirou ──
    if (conversation_id && !template_name && !force) {
      const { data: win } = await admin
        .from("conversation_meta_window")
        .select("window_expires_at")
        .eq("conversation_id", conversation_id)
        .maybeSingle();
      const expired = !win || !win.window_expires_at || new Date(win.window_expires_at).getTime() < Date.now();
      if (expired) {
        return jsonResp({
          error: "Janela 24h Meta expirada — use um template",
          requires_template: true,
        }, 422);
      }
    }

    // ── Dedup por consulta_id + tipo ──
    if (consulta_id && tipo) {
      const { data: dup } = await admin
        .from("comunicacao_auditoria")
        .select("id")
        .eq("entity_type", "whatsapp_envio")
        .eq("entity_id", consulta_id)
        .eq("action", tipo)
        .gte("created_at", new Date(Date.now() - 3600_000).toISOString())
        .maybeSingle();
      if (dup) return jsonResp({ ok: false, duplicated: true });
    }

    // ── Resolver sender_type a partir do role do usuário ──
    let senderType: "medico" | "colaborador" | "sistema" = "sistema";
    const { data: medico } = await admin.from("medicos").select("id").eq("user_id", userId).maybeSingle();
    if (medico) senderType = "medico";
    else {
      const { data: colab } = await admin.from("colaboradores").select("id").eq("user_id", userId).maybeSingle();
      if (colab) senderType = "colaborador";
    }

    // ── Payload Meta ──
    const waPayload: Record<string, unknown> = template_name
      ? {
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
        }
      : {
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        };

    const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(waPayload),
    });
    const result = await res.json();
    const wamid = result.messages?.[0]?.id ?? null;

    // ── Audit ──
    await admin.from("comunicacao_auditoria").insert({
      action: tipo || "envio_manual",
      entity_type: "whatsapp_envio",
      entity_id: consulta_id || null,
      user_id: userId,
      metadata: {
        to: phone,
        status: res.ok ? "sent" : "failed",
        http_status: res.status,
        wa_message_id: wamid,
        template_name: template_name ?? null,
        conversation_id: conversation_id ?? null,
        instance_id: instanceId,
        forced: force,
        timestamp: new Date().toISOString(),
      },
    });

    // ── Persistir em messages se houver conversa ──
    if (conversation_id) {
      await admin.from("messages").insert({
        conversation_id,
        body: message || `[template: ${template_name}]`,
        sender_type: senderType,
        sender_id: userId,
        sender_name: userData.user.email ?? null,
        message_type: template_name ? "template" : "text",
        status: res.ok ? "sent" : "failed",
        whatsapp_message_id: wamid,
        failure_reason: res.ok ? null : (result.error?.message ?? `http_${res.status}`),
        metadata: { template_name: template_name ?? null, tipo: tipo ?? null, instance_id: instanceId },
      });

      if (res.ok) {
        await admin
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: (message || `[template: ${template_name}]`).slice(0, 80),
          })
          .eq("id", conversation_id);
        // first_response_at apenas se ainda nulo
        await admin.rpc("inbox_set_first_response", { p_conversation_id: conversation_id }).then(({ error }) => {
          if (error) console.warn("[whatsapp-enviar] first_response rpc:", error.message);
        });
      }
    }

    if (!res.ok) {
      console.error("[whatsapp-enviar] Meta API erro:", res.status, result);
      return jsonResp({ ok: false, error: "Falha no envio Meta", detail: result.error?.message, http_status: res.status }, 502);
    }

    return jsonResp({ ok: true, wa_message_id: wamid, sender_type: senderType, instance_id: instanceId });
  } catch (e) {
    console.error("[whatsapp-enviar] erro:", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
