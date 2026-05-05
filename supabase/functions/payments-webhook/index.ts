// Webhook do Stripe — recebe eventos de pagamento e atualiza a base.
// Endpoint registrado: /functions/v1/payments-webhook?env=sandbox|live
//
// Verifica a assinatura HMAC SHA256 via PAYMENTS_SANDBOX_WEBHOOK_SECRET
// (ou PAYMENTS_LIVE_WEBHOOK_SECRET).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, stripe-signature",
};

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseStripeSig(header: string): { t?: string; v1?: string[] } {
  const out: { t?: string; v1: string[] } = { v1: [] };
  for (const part of header.split(",")) {
    const [k, v] = part.split("=");
    if (k === "t") out.t = v;
    else if (k === "v1") out.v1.push(v);
  }
  return out;
}

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parsed = parseStripeSig(header);
  if (!parsed.t || !parsed.v1?.length) return false;
  // Verifica anti-replay
  const ts = parseInt(parsed.t, 10);
  if (Number.isNaN(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > toleranceSec) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.t}.${payload}`);
  // Comparação constant-time simples
  return parsed.v1.some((sig) => sig.length === expected.length && timingSafeEqual(sig, expected));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") ?? "sandbox") as "sandbox" | "live";
  const secret =
    env === "live"
      ? Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET")
      : Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET");

  if (!secret) {
    console.error("[payments-webhook] webhook secret not configured for", env);
    return new Response("Webhook secret missing", { status: 500, headers: corsHeaders });
  }

  const sigHeader = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  const ok = await verifyStripeSignature(rawBody, sigHeader, secret);
  if (!ok) {
    console.warn("[payments-webhook] invalid signature");
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data?.object;
        const sessionId: string = session?.id;
        const paymentIntentId: string | null = session?.payment_intent ?? null;
        const paymentStatus: string = session?.payment_status ?? "";
        const metadata = session?.metadata ?? {};

        // ── Fluxo plano personalizado ──
        if (metadata.flow === "plano_personalizado" && paymentStatus === "paid") {
          try {
            const userId = metadata.user_id;
            const pacienteId = metadata.paciente_id;
            const planoIds: string[] = JSON.parse(metadata.plano_ids || "[]");
            const descontoPct = Number(metadata.desconto_pct || 0);
            const valorFinalCentavos = Number(metadata.valor_final_centavos || 0);
            const nomePlano = metadata.nome_plano || "Plano personalizado";
            const medicoPks: string[] = JSON.parse(metadata.medico_pks || "[]");

            // Verificar se plano já foi criado (idempotência)
            const { data: existente } = await admin
              .from("planos")
              .select("id")
              .eq("created_by", userId)
              .eq("nivel", "paciente_custom")
              .in("status", ["ativo", "rascunho"])
              .limit(1);

            if (existente && existente.length > 0) {
              console.log("[payments-webhook] plano já existe para user", userId);
              break;
            }

            // Cria plano paciente_custom
            const { data: plano, error: pe } = await admin
              .from("planos")
              .insert({
                nome: nomePlano,
                nivel: "paciente_custom",
                status: "ativo",
                valor_mensal_centavos: valorFinalCentavos,
                created_by: userId,
                categoria: "personalizado",
                publico: "paciente",
                modelo_cobranca: "mensal",
                desconto_geral_pct: descontoPct,
              } as any)
              .select("id")
              .single();

            if (pe || !plano) {
              console.error("[payments-webhook] erro criando plano:", pe);
              break;
            }

            // Vincular médicos
            if (medicoPks.length > 0) {
              const rows = medicoPks.map((mid: string) => ({
                plano_id: plano.id,
                medico_id: mid,
              }));
              await admin.from("plano_medicos").insert(rows);
            }

            // Cria assinatura
            const hoje = new Date().toISOString().slice(0, 10);
            const proximaCobranca = new Date();
            proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);

            await admin.from("assinaturas").insert({
              plano_id: plano.id,
              paciente_id: pacienteId,
              status: "ativa",
              ciclo: "mensal",
              valor_cobrado_centavos: valorFinalCentavos,
              forma_pagamento: "stripe",
              data_inicio: hoje,
              proxima_cobranca: proximaCobranca.toISOString().slice(0, 10),
              created_by: userId,
              origem_receita: "plano_paciente_custom",
              stripe_subscription_id: session?.subscription ?? null,
            } as any);

            console.log("[payments-webhook] plano personalizado criado:", plano.id);
          } catch (planErr) {
            console.error("[payments-webhook] erro no fluxo plano:", planErr);
          }
          break;
        }

        // ── Fluxo consulta (existente) ──
        if (sessionId && paymentStatus === "paid") {
          const { error } = await admin.rpc("processar_pagamento_confirmado", {
            _provider_session_id: sessionId,
            _provider_payment_id: paymentIntentId,
            _metodo: "cartao",
            _payload: {
              event_id: event.id,
              event_type: event.type,
              amount_total: session?.amount_total,
              currency: session?.currency,
            },
          });
          if (error) {
            console.error("[payments-webhook] rpc error", error);
            return new Response("RPC error", { status: 500, headers: corsHeaders });
          }

          // Fluxo unificado: cria consulta pós-pagamento
          try {
            const { data: pag } = await admin
              .from("pagamentos")
              .select("id, consulta_id")
              .eq("provider_session_id", sessionId)
              .maybeSingle();

            if (pag && !pag.consulta_id) {
              const { data: rpcRes, error: rpcErr } = await admin.rpc(
                "criar_consulta_pos_pagamento",
                { _pagamento_id: pag.id },
              );
              if (rpcErr) {
                console.error("[payments-webhook] criar_consulta_pos_pagamento:", rpcErr);
              } else {
                const r = rpcRes as any;
                if (r && !r.ok) console.warn("[payments-webhook] rpc resultado:", r.erro);
              }
            }

            const { data: pagAtual } = await admin
              .from("pagamentos")
              .select("consulta_id")
              .eq("provider_session_id", sessionId)
              .maybeSingle();
            if (pagAtual?.consulta_id) {
              await admin.functions.invoke("enviar-confirmacao-consulta", {
                body: { consulta_id: pagAtual.consulta_id },
              });
            }
          } catch (postErr) {
            console.warn("[payments-webhook] pós-pagamento falhou (ignorado)", postErr);
          }
        }
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const sessionId = event.data?.object?.id;
        if (sessionId) {
          await admin.rpc("marcar_pagamento_falho", {
            _provider_session_id: sessionId,
            _motivo: event.type,
          });
        }
        break;
      }
      // ── Subscription lifecycle events ──
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data?.object;
        const userId = sub?.metadata?.userId;
        if (!userId) { console.warn("[payments-webhook] subscription sem userId"); break; }
        const item = sub?.items?.data?.[0];
        const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
        const productId = item?.price?.product;
        const periodStart = item?.current_period_start ?? sub?.current_period_start;
        const periodEnd = item?.current_period_end ?? sub?.current_period_end;

        await admin.from("subscriptions").upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          product_id: productId || "",
          price_id: priceId || "",
          status: sub.status,
          current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          environment: env,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "stripe_subscription_id" });
        console.log("[payments-webhook] subscription upserted:", sub.id, sub.status);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data?.object;
        await admin.from("subscriptions").update({
          status: "canceled",
          updated_at: new Date().toISOString(),
        } as any).eq("stripe_subscription_id", sub.id).eq("environment", env);
        console.log("[payments-webhook] subscription canceled:", sub.id);
        break;
      }
      default:
        break;
    }
  } catch (e: any) {
    console.error("[payments-webhook] handler error", e);
    return new Response("Handler error", { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
