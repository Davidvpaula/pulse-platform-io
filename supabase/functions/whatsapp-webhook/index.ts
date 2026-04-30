// Edge function: webhook de entrada da Meta WhatsApp Cloud API
// Estrutura preparada — ativação real fica para a etapa de "integração total"
// quando configurarmos os secrets WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, etc.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(challenge, { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  // POST = mensagens recebidas
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // TODO (integração total):
    // 1. validar X-Hub-Signature-256 com WHATSAPP_APP_SECRET
    // 2. extrair entry[].changes[].value.messages[]
    // 3. buscar/criar conversation por contact_phone
    // 4. inserir em messages com sender_type='paciente'
    // 5. disparar bot/IA conforme conversation.bot_active/ai_active

    await supabase.from("comunicacao_auditoria").insert({
      action: "webhook_received",
      entity_type: "whatsapp",
      metadata: body,
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
