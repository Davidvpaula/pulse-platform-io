// Edge function: creates a Stripe Checkout Session for Premium physician subscriptions
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { priceId, returnUrl, environment } = body as {
      priceId?: string;
      returnUrl?: string;
      environment?: string;
    };

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return json({ error: "priceId inválido" }, 400);
    }

    const stripeEnv: StripeEnv = environment === "live" ? "live" : "sandbox";
    const stripe = createStripeClient(stripeEnv);

    // Resolve human-readable priceId via lookup_keys
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) return json({ error: "Preço não encontrado" }, 404);
    const stripePrice = prices.data[0];

    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
    const finalReturnUrl = returnUrl || `${origin}/app/medico/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: finalReturnUrl,
      customer_email: userData.user.email ?? undefined,
      metadata: { userId: userData.user.id, priceId, flow: "premium_medico" },
      subscription_data: { metadata: { userId: userData.user.id, priceId } },
    } as any);

    return json({ clientSecret: session.client_secret, sessionId: session.id });
  } catch (e: any) {
    console.error("[criar-checkout-premium]", e);
    return json({ error: e?.message ?? "Erro inesperado" }, 500);
  }
});
