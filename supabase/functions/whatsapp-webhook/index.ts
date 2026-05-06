// Edge function: webhook de entrada da Meta WhatsApp Cloud API
// Processa mensagens recebidas, valida assinatura HMAC, e persiste em conversations/messages
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyHmacSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const expectedSig = signature.replace("sha256=", "");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const hex = [...new Uint8Array(signed)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === expectedSig;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // GET = verificação do webhook pela Meta
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (mode === "subscribe" && expected && token === expected) {
      console.log("[whatsapp-webhook] verification OK");
      return new Response(challenge, { status: 200 });
    }
    console.warn("[whatsapp-webhook] verification FAILED");
    return new Response("forbidden", { status: 403 });
  }

  // POST = mensagens recebidas
  const rawBody = await req.text();

  try {
    // ── Validar assinatura HMAC ──
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
    if (appSecret) {
      const sig = req.headers.get("x-hub-signature-256");
      const valid = await verifyHmacSignature(rawBody, sig, appSecret);
      if (!valid) {
        console.error("[whatsapp-webhook] assinatura HMAC inválida");
        return new Response("invalid signature", { status: 403 });
      }
    } else {
      console.warn("[whatsapp-webhook] WHATSAPP_APP_SECRET não configurado — pulando verificação HMAC");
    }

    const body = JSON.parse(rawBody);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Audit log ──
    await supabase.from("comunicacao_auditoria").insert({
      action: "webhook_received",
      entity_type: "whatsapp",
      metadata: { entry_count: body.entry?.length ?? 0, timestamp: new Date().toISOString() },
    });

    // ── Processar entries ──
    const entries = body.entry ?? [];
    let processedCount = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value ?? {};
        const messages = value.messages ?? [];
        const contacts = value.contacts ?? [];

        for (const msg of messages) {
          try {
            const contactPhone = msg.from;
            const contactName = contacts.find((c: any) => c.wa_id === contactPhone)?.profile?.name ?? contactPhone;
            const messageBody = msg.text?.body ?? msg.caption ?? "[mídia]";
            const messageType = msg.type ?? "text";
            const whatsappMessageId = msg.id;

            // Deduplicação por whatsapp message ID
            const { data: existing } = await supabase
              .from("messages")
              .select("id")
              .eq("whatsapp_message_id", whatsappMessageId)
              .maybeSingle();

            if (existing) {
              console.log("[whatsapp-webhook] mensagem duplicada ignorada:", whatsappMessageId);
              continue;
            }

            // Buscar conversa existente pelo telefone
            let { data: conversation } = await supabase
              .from("conversations")
              .select("id, medico_id")
              .eq("contact_phone", contactPhone)
              .eq("status", "open")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Se não encontrou conversa aberta, criar uma nova
            if (!conversation) {
              const { data: newConv, error: convErr } = await supabase
                .from("conversations")
                .insert({
                  contact_phone: contactPhone,
                  contact_name: contactName,
                  status: "open",
                  channel: "whatsapp",
                  last_message_at: new Date().toISOString(),
                })
                .select("id, medico_id")
                .single();

              if (convErr) {
                console.error("[whatsapp-webhook] erro criando conversa:", convErr);
                errors.push(`conversa: ${convErr.message}`);
                continue;
              }
              conversation = newConv;
            }

            // Inserir mensagem
            const { error: msgErr } = await supabase.from("messages").insert({
              conversation_id: conversation!.id,
              content: messageBody,
              sender_type: "paciente",
              message_type: messageType,
              whatsapp_message_id: whatsappMessageId,
              metadata: { from: contactPhone, timestamp: msg.timestamp },
            });

            if (msgErr) {
              console.error("[whatsapp-webhook] erro inserindo mensagem:", msgErr);
              errors.push(`msg: ${msgErr.message}`);
              continue;
            }

            // Atualizar last_message_at da conversa
            await supabase
              .from("conversations")
              .update({ last_message_at: new Date().toISOString() })
              .eq("id", conversation!.id);

            processedCount++;
          } catch (msgError) {
            console.error("[whatsapp-webhook] erro processando mensagem:", msgError);
            errors.push(String(msgError));
          }
        }
      }
    }

    console.log(`[whatsapp-webhook] processadas: ${processedCount}, erros: ${errors.length}`);

    return new Response(JSON.stringify({ ok: true, processed: processedCount, errors: errors.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-webhook] erro geral:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
