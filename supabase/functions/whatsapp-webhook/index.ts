// Edge function: webhook de entrada da Meta WhatsApp Cloud API
// - GET: verificação do token
// - POST inbound: cria conversation/message, atualiza unread, vincula whatsapp_instance
// - POST status: atualiza messages.status (sent/delivered/read/failed)
// - Persiste sempre o payload bruto em whatsapp_webhook_log
// Secrets: META_VERIFY_TOKEN, META_APP_SECRET (HMAC opcional em sandbox)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logEvento } from "../_shared/observabilidade.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function verifyHmac(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const expected = signature.replace("sha256=", "");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = [...new Uint8Array(signed)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

function preview(text: string | null | undefined): string | null {
  if (!text) return null;
  return text.slice(0, 80);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // ── GET: verify token ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("META_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected) {
      console.log("[whatsapp-webhook] verify OK");
      return new Response(challenge ?? "", { status: 200 });
    }
    console.warn("[whatsapp-webhook] verify FAILED");
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();
  let parsedBody: any = null;
  let signatureValid: boolean | null = null;
  let logId: string | null = null;
  const wamidProcessed: string[] = [];
  const errors: string[] = [];
  let processedCount = 0;
  let httpStatus = 200;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    parsedBody = JSON.parse(rawBody);
  } catch (e) {
    httpStatus = 400;
    await supabase.from("whatsapp_webhook_log").insert({
      payload: { raw: rawBody.slice(0, 4000) },
      signature_valid: null,
      http_status: httpStatus,
      error: `invalid_json: ${String(e)}`,
    });
    return new Response("invalid json", { status: httpStatus, headers: corsHeaders });
  }

  // ── HMAC ──
  const appSecret = Deno.env.get("META_APP_SECRET");
  if (appSecret) {
    signatureValid = await verifyHmac(rawBody, req.headers.get("x-hub-signature-256"), appSecret);
    if (!signatureValid) {
      httpStatus = 403;
      await supabase.from("whatsapp_webhook_log").insert({
        payload: parsedBody, signature_valid: false, http_status: httpStatus, error: "invalid_signature",
      });
      return new Response("invalid signature", { status: httpStatus, headers: corsHeaders });
    }
  } else {
    console.warn("[whatsapp-webhook] META_APP_SECRET ausente — pulando HMAC (sandbox)");
  }

  // ── Insere log inicial ──
  const { data: logRow } = await supabase.from("whatsapp_webhook_log").insert({
    payload: parsedBody, signature_valid: signatureValid, http_status: 200,
  }).select("id").single();
  logId = logRow?.id ?? null;

  try {
    const entries = parsedBody.entry ?? [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value ?? {};
        const phoneNumberId: string | undefined = value.metadata?.phone_number_id;
        const contacts = value.contacts ?? [];
        const messages = value.messages ?? [];
        const statuses = value.statuses ?? [];

        // Resolver whatsapp_instance pelo phone_number_id
        let instanceId: string | null = null;
        if (phoneNumberId) {
          const { data: inst } = await supabase
            .from("whatsapp_instances")
            .select("id")
            .eq("phone_number_id", phoneNumberId)
            .maybeSingle();
          instanceId = inst?.id ?? null;
          if (!instanceId) {
            console.warn(`[whatsapp-webhook] phone_number_id ${phoneNumberId} sem whatsapp_instance — gravando sem vínculo`);
          }
        }

        // ───── INBOUND messages ─────
        for (const msg of messages) {
          try {
            const wamid: string = msg.id;
            const contactPhone: string = msg.from;
            const contactName: string =
              contacts.find((c: any) => c.wa_id === contactPhone)?.profile?.name ?? contactPhone;
            const messageType: string = msg.type ?? "text";
            const messageBody: string = msg.text?.body ?? msg.caption ?? `[${messageType}]`;

            // Idempotência
            const { data: existing } = await supabase
              .from("messages").select("id").eq("whatsapp_message_id", wamid).maybeSingle();
            if (existing) { wamidProcessed.push(wamid); continue; }

            // Buscar conversa aberta
            let conversationId: string | null = null;
            const { data: conv } = await supabase
              .from("conversations")
              .select("id")
              .eq("contact_phone", contactPhone)
              .eq("channel", "whatsapp")
              .in("status", ["aberta", "em_atendimento", "pendente"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (conv) {
              conversationId = conv.id;
            } else {
              const { data: newConv, error: convErr } = await supabase
                .from("conversations")
                .insert({
                  contact_phone: contactPhone,
                  contact_name: contactName,
                  channel: "whatsapp",
                  status: "aberta",
                  origin: "comercial",
                  whatsapp_instance_id: instanceId,
                  last_message_at: new Date().toISOString(),
                  last_message_preview: preview(messageBody),
                  unread_count: 0,
                })
                .select("id").single();
              if (convErr) { errors.push(`conv: ${convErr.message}`); continue; }
              conversationId = newConv.id;
            }

            // Inserir mensagem inbound (trigger atualiza conversation_meta_window)
            const { error: msgErr } = await supabase.from("messages").insert({
              conversation_id: conversationId!,
              body: messageBody,
              sender_type: "paciente",
              sender_name: contactName,
              message_type: messageType === "text" ? "text" : "media",
              status: "received",
              whatsapp_message_id: wamid,
              metadata: { from: contactPhone, timestamp: msg.timestamp, raw_type: messageType },
            });
            if (msgErr) { errors.push(`msg: ${msgErr.message}`); continue; }

            // unread_count + last_message_at + preview (atomic via RPC se houver, senão UPDATE)
            await supabase.rpc("inbox_increment_unread", { p_conversation_id: conversationId!, p_preview: preview(messageBody) }).then(
              ({ error }) => {
                if (error) {
                  // fallback: update direto (sem race-safe, mas funciona)
                  return supabase
                    .from("conversations")
                    .update({
                      last_message_at: new Date().toISOString(),
                      last_message_preview: preview(messageBody),
                    })
                    .eq("id", conversationId!);
                }
              }
            );

            wamidProcessed.push(wamid);
            processedCount++;
          } catch (e) {
            errors.push(`msg_loop: ${String(e)}`);
          }
        }

        // ───── STATUS callbacks (sent/delivered/read/failed) ─────
        for (const st of statuses) {
          try {
            const wamid: string = st.id;
            const newStatus: string = st.status; // sent | delivered | read | failed
            const allowed = ["sent", "delivered", "read", "failed"];
            if (!allowed.includes(newStatus)) continue;

            const update: Record<string, unknown> = { status: newStatus };
            if (newStatus === "read") update.read_at = new Date().toISOString();
            if (newStatus === "failed") {
              update.failure_reason =
                st.errors?.[0]?.message ?? st.errors?.[0]?.title ?? "unknown";
            }

            const { data: updated, error: upErr } = await supabase
              .from("messages")
              .update(update)
              .eq("whatsapp_message_id", wamid)
              .select("id");

            if (upErr) { errors.push(`status: ${upErr.message}`); continue; }
            if (!updated || updated.length === 0) {
              errors.push(`status_orphan: ${wamid}`);
              continue;
            }
            wamidProcessed.push(wamid);
            processedCount++;
          } catch (e) {
            errors.push(`status_loop: ${String(e)}`);
          }
        }
      }
    }
  } catch (e) {
    errors.push(`top: ${String(e)}`);
    console.error("[whatsapp-webhook] top error:", e);
  }

  // Atualiza log final
  if (logId) {
    await supabase.from("whatsapp_webhook_log").update({
      processed_count: processedCount,
      wamid_processed: wamidProcessed,
      error: errors.length ? errors.join(" | ").slice(0, 2000) : null,
    }).eq("id", logId);
  }

  console.log(`[whatsapp-webhook] processed=${processedCount} errors=${errors.length}`);
  // Meta exige 200 mesmo com erros internos para não reentregar infinitamente
  return new Response(
    JSON.stringify({ ok: true, processed: processedCount, errors: errors.length, log_id: logId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
