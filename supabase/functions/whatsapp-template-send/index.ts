// Edge function: envio explícito de template Meta (Fase 4)
// Wrapper fino para o adapter wa-providers; valida template ativo, variáveis e
// SEMPRE registra log em whatsapp_template_logs (sucesso ou falha).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildProvider } from "../_shared/wa-providers.ts";
import { canSendReal, logEvento } from "../_shared/observabilidade.ts";

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

  try {
    const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const META_PHONE_FALLBACK = Deno.env.get("META_PHONE_NUMBER_ID");
    // Em sandbox o gate fail-closed responde com mock_sent — não bloqueamos por falta de token aqui.

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
      template_id,
      to,
      conversation_id,
      variables = [],
    } = body ?? {};

    if (!template_id || !to) {
      return jsonResp({ error: "Campos obrigatórios: template_id, to" }, 400);
    }

    const phone = String(to).replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) return jsonResp({ error: "Telefone inválido" }, 400);

    // Carrega template
    const { data: tpl, error: tplErr } = await admin
      .from("message_templates")
      .select("id, name, content, variables, language, active, whatsapp_template_name, whatsapp_status")
      .eq("id", template_id)
      .maybeSingle();
    if (tplErr || !tpl) return jsonResp({ error: "Template não encontrado" }, 404);
    if (!tpl.active) return jsonResp({ error: "Template inativo" }, 422);

    const templateMetaName = (tpl as any).whatsapp_template_name || tpl.name;

    // Validação simples: número de variáveis
    const expected = (tpl.variables || []).length;
    const provided = Array.isArray(variables) ? variables.length : 0;
    if (expected > 0 && provided < expected) {
      return jsonResp({ error: `Faltam variáveis (esperado ${expected}, recebido ${provided})` }, 422);
    }

    // Resolve phone_number_id
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

    // sender_type
    let senderType: "medico" | "colaborador" | "sistema" = "sistema";
    const { data: medico } = await admin.from("medicos").select("id").eq("user_id", userId).maybeSingle();
    if (medico) senderType = "medico";
    else {
      const { data: colab } = await admin.from("colaboradores").select("id").eq("user_id", userId).maybeSingle();
      if (colab) senderType = "colaborador";
    }

    // ===== Gate fail-closed Fase 8 =====
    const gate = await canSendReal(admin);

    let result: { ok: boolean; wa_message_id: string | null; http_status: number; error_message: string | null; raw: any };

    if (!gate.ok) {
      // Modo sandbox/staging ou health!=ok ou secrets ausentes -> simula envio
      result = {
        ok: true,
        wa_message_id: null,
        http_status: 0,
        error_message: null,
        raw: { mock_sent: true, reason: gate.reason, modo: gate.modo, health: gate.health },
      };

      await logEvento(admin, {
        modulo: "whatsapp",
        evento: "template_mock_sent",
        severity: "info",
        conversation_id: conversation_id ?? null,
        user_id: userId,
        metadata: { reason: gate.reason, template_name: templateMetaName, to: phone },
      });
    } else {
      // Envio real via adapter — exige phone_number_id e token
      if (!phoneNumberId) return jsonResp({ error: "Nenhum phone_number_id disponível" }, 503);
      if (!META_TOKEN) return jsonResp({ error: "WhatsApp não configurado", not_configured: true }, 503);
      const provider = buildProvider({ token: META_TOKEN, phoneNumberId });
      result = await provider.sendTemplate({
        to: phone,
        template_name: templateMetaName,
        language: tpl.language || "pt_BR",
        variables,
      });
    }

    // Log SEMPRE (sucesso ou falha)
    await admin.from("whatsapp_template_logs").insert({
      conversation_id: conversation_id ?? null,
      template_id: tpl.id,
      template_name: templateMetaName,
      telefone: phone,
      payload: { variables, language: tpl.language, instance_id: instanceId },
      provider_response: result.raw,
      wa_message_id: result.wa_message_id,
      status: result.ok ? "sent" : "failed",
      erro: result.ok ? null : (result.error_message ?? `http_${result.http_status}`),
      enviado_por: userId,
    });

    // Audit
    await admin.from("comunicacao_auditoria").insert({
      action: "envio_template",
      entity_type: "whatsapp_template",
      entity_id: tpl.id,
      user_id: userId,
      metadata: {
        template_name: templateMetaName,
        to: phone,
        status: result.ok ? "sent" : "failed",
        http_status: result.http_status,
        wa_message_id: result.wa_message_id,
        conversation_id: conversation_id ?? null,
        instance_id: instanceId,
      },
    });

    // Persistir em messages se houver conversa
    if (conversation_id) {
      // Renderiza preview substituindo variáveis na ordem
      let preview = tpl.content || `[template: ${templateMetaName}]`;
      (tpl.variables || []).forEach((v: string, i: number) => {
        preview = preview.replaceAll(v, variables[i] ?? "");
      });

      await admin.from("messages").insert({
        conversation_id,
        body: preview,
        sender_type: senderType,
        sender_id: userId,
        sender_name: userData.user.email ?? null,
        message_type: "template",
        status: result.ok ? "sent" : "failed",
        whatsapp_message_id: result.wa_message_id,
        failure_reason: result.ok ? null : (result.error_message ?? null),
        metadata: { template_name: templateMetaName, template_id: tpl.id, instance_id: instanceId },
      });

      if (result.ok) {
        await admin
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: preview.slice(0, 80),
          })
          .eq("id", conversation_id);
        await admin.rpc("inbox_set_first_response", { p_conversation_id: conversation_id }).then(({ error }) => {
          if (error) console.warn("[whatsapp-template-send] first_response rpc:", error.message);
        });
      }
    }

    if (!result.ok) {
      return jsonResp({
        ok: false,
        error: "Falha no envio do template",
        detail: result.error_message,
        http_status: result.http_status,
      }, 502);
    }

    return jsonResp({ ok: true, wa_message_id: result.wa_message_id, sender_type: senderType });
  } catch (e) {
    console.error("[whatsapp-template-send] erro:", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
