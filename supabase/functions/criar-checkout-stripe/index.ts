// Cria uma Stripe Checkout Session via connector gateway (Lovable Payments)
// e registra/atualiza o pagamento na tabela `pagamentos`.
//
// Recebe: { consulta_id: string }
// Retorna: { checkout_url, pagamento_id }

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

function pickStripeKey(): { key: string; env: "sandbox" | "live" } {
  const live = Deno.env.get("STRIPE_LIVE_API_KEY");
  if (live) return { key: live, env: "live" };
  const sandbox = Deno.env.get("STRIPE_SANDBOX_API_KEY");
  if (sandbox) return { key: sandbox, env: "sandbox" };
  throw new Error("Stripe API key not configured");
}

function form(params: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.append(k, String(v));
  }
  return u.toString();
}

async function stripePost(path: string, body: string, lovableKey: string, stripeKey: string) {
  const r = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": stripeKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await r.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch {}
  if (!r.ok) {
    throw new Error(`Stripe ${path} ${r.status}: ${text}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const { key: STRIPE_KEY, env: PROVIDER_ENV } = pickStripeKey();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente com JWT do paciente para validar permissão (RLS)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const consultaId: string | undefined = body?.consulta_id;
    if (!consultaId || typeof consultaId !== "string") {
      return new Response(JSON.stringify({ error: "consulta_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega consulta + paciente + médico (validando que o paciente é dono via RLS)
    const { data: consulta, error: cErr } = await userClient
      .from("consultas")
      .select("id, paciente_id, medico_id, valor_centavos, status, inicio")
      .eq("id", consultaId)
      .maybeSingle();

    if (cErr || !consulta) {
      return new Response(JSON.stringify({ error: "Consulta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (consulta.status !== "aguardando_pagamento") {
      return new Response(JSON.stringify({ error: "Consulta não está aguardando pagamento" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!consulta.valor_centavos || consulta.valor_centavos < 100) {
      return new Response(JSON.stringify({ error: "Valor da consulta inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente service-role para criar/atualizar pagamento e ler dados auxiliares
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Detalhes auxiliares (médico, especialidade) para descrição
    const { data: medico } = await admin
      .from("medicos")
      .select("nome, especialidade")
      .eq("id", consulta.medico_id)
      .maybeSingle();

    // Cria pagamento em estado pendente (ou reaproveita se já existir ativo)
    const { data: existing } = await admin
      .from("pagamentos")
      .select("id, status, provider_session_id, checkout_url")
      .eq("consulta_id", consulta.id)
      .not("status", "in", "(cancelado,falhou,reembolsado)")
      .maybeSingle();

    let pagamentoId = existing?.id;
    if (!pagamentoId) {
      const { data: novoPag, error: pErr } = await admin
        .from("pagamentos")
        .insert({
          consulta_id: consulta.id,
          valor_centavos: consulta.valor_centavos,
          metodo: "cartao",
          provider: "stripe",
          status: "pendente",
          metadata: { env: PROVIDER_ENV },
        })
        .select("id")
        .single();
      if (pErr || !novoPag) throw pErr ?? new Error("Falha ao criar pagamento");
      pagamentoId = novoPag.id;
    }

    // URLs de retorno
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "";
    const successUrl = `${origin}/app/paciente/pagamento/sucesso?p=${pagamentoId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/app/paciente/pagamento/cancelado?p=${pagamentoId}`;

    const descricao = `Consulta — ${medico?.nome ?? "Médico"} (${medico?.especialidade ?? "Telemedicina"})`;

    // Cria Checkout Session no Stripe via gateway
    const sessionBody = form({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "brl",
      "line_items[0][price_data][unit_amount]": consulta.valor_centavos,
      "line_items[0][price_data][product_data][name]": descricao,
      "line_items[0][price_data][product_data][description]":
        `Atendimento online — ${new Date(consulta.inicio).toLocaleString("pt-BR")}`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: pagamentoId!,
      "metadata[pagamento_id]": pagamentoId!,
      "metadata[consulta_id]": consulta.id,
      customer_email: userData.user.email ?? "",
    });

    const session = await stripePost("/v1/checkout/sessions", sessionBody, LOVABLE_API_KEY, STRIPE_KEY);

    if (!session?.url || !session?.id) {
      throw new Error("Resposta inválida do Stripe (sem URL/ID)");
    }

    // Atualiza pagamento com session_id e URL
    await admin.rpc("marcar_pagamento_processando", {
      _pagamento_id: pagamentoId!,
      _provider_session_id: session.id,
      _checkout_url: session.url,
    });

    return new Response(
      JSON.stringify({
        pagamento_id: pagamentoId,
        checkout_url: session.url,
        session_id: session.id,
        env: PROVIDER_ENV,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[criar-checkout-stripe]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
