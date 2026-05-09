// Cria uma Stripe Checkout Session via connector gateway (Lovable Payments)
// e registra/atualiza o pagamento na tabela `pagamentos`.
//
// Fluxo unificado: recebe dados de reserva (slot_id, tipo, referencia_id, etc.)
// Fluxo legado (fallback): recebe consulta_id
//
// Retorna: { checkout_url, pagamento_id }

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

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Autenticação do paciente
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));

    // Determinar environment do Stripe
    const envParam = body.environment as string | undefined;
    const stripeEnv: StripeEnv = envParam === "live" ? "live" : "sandbox";

    // Service-role client
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // URLs de retorno
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "";

    /* ═══════════════════════════════════════════════════
     *  FLUXO UNIFICADO — reserva (sem consulta_id)
     * ═══════════════════════════════════════════════════ */
    if (body.reserva && body.valorCentavos) {
      const { reserva, valorCentavos, snapshot, descricao } = body as {
        reserva: {
          slot_id: string;
          tipo: string;
          referencia_id: string;
          motivo?: string | null;
          paciente_id: string;
          medico_id: string;
        };
        valorCentavos: number;
        snapshot?: Record<string, any>;
        descricao?: string;
      };

      if (valorCentavos < 100) return json({ error: "Valor mínimo: R$ 1,00" }, 400);

      // Metadata para o pagamento (será usada por criar_consulta_pos_pagamento)
      const metadata: Record<string, unknown> = {
        slot_id: reserva.slot_id,
        tipo: reserva.tipo,
        referencia_id: reserva.referencia_id,
        motivo: reserva.motivo ?? null,
        paciente_id: reserva.paciente_id,
        medico_id: reserva.medico_id,
        descricao: descricao ?? null,
      };
      if (snapshot) metadata.snapshot = snapshot;

      // Cria pagamento pendente
      const { data: novoPag, error: pErr } = await admin
        .from("pagamentos")
        .insert({
          valor_centavos: valorCentavos,
          metodo: "cartao",
          provider: "stripe",
          status: "pendente",
          paciente_id: reserva.paciente_id,
          medico_id: reserva.medico_id,
          metadata,
        } as any)
        .select("id")
        .single();
      if (pErr || !novoPag) throw pErr ?? new Error("Falha ao criar pagamento");
      const pagamentoId = novoPag.id;

      const successUrl = `${origin}/app/paciente/pagamento/sucesso?p=${pagamentoId}&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/app/paciente/pagamento/cancelado?p=${pagamentoId}`;

      const stripe = createStripeClient(stripeEnv);

      const descLabel =
        descricao ||
        (snapshot as any)?.referencia_nome ||
        "Consulta médica online";

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "brl",
              unit_amount: valorCentavos,
              product_data: {
                name: descLabel,
                description: snapshot
                  ? `${(snapshot as any).medico_nome} — ${new Date((snapshot as any).inicio).toLocaleString("pt-BR")}`
                  : "Atendimento online",
              },
            },
          },
        ],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: successUrl,
        customer_email: userData.user.email ?? undefined,
        client_reference_id: pagamentoId,
        metadata: {
          pagamento_id: pagamentoId,
          slot_id: reserva.slot_id,
          flow: "unificado",
        },
      } as any);

      if (!session?.client_secret && !session?.url && !session?.id) {
        throw new Error("Resposta inválida do Stripe");
      }

      // Atualiza pagamento com session info
      await admin
        .from("pagamentos")
        .update({
          provider_session_id: session.id,
          checkout_url: session.url ?? `embedded:${session.id}`,
        } as any)
        .eq("id", pagamentoId);

      return json({
        pagamento_id: pagamentoId,
        clientSecret: session.client_secret,
        checkout_url: session.url,
        session_id: session.id,
        env: stripeEnv,
      });
    }

    /* ═══════════════════════════════════════════════════
     *  FLUXO LEGADO — consulta_id
     * ═══════════════════════════════════════════════════ */
    const consultaId: string | undefined = body?.consulta_id;
    if (!consultaId || typeof consultaId !== "string") {
      return json({ error: "Dados insuficientes: informe reserva ou consulta_id" }, 400);
    }

    const { data: consulta, error: cErr } = await userClient
      .from("consultas")
      .select("id, paciente_id, medico_id, valor_centavos, status, inicio")
      .eq("id", consultaId)
      .maybeSingle();

    if (cErr || !consulta) return json({ error: "Consulta não encontrada" }, 404);
    if (consulta.status !== "aguardando_pagamento")
      return json({ error: "Consulta não está aguardando pagamento" }, 409);
    if (!consulta.valor_centavos || consulta.valor_centavos < 100)
      return json({ error: "Valor inválido" }, 400);

    const { data: medico } = await admin
      .from("medicos")
      .select("nome, especialidade")
      .eq("id", consulta.medico_id)
      .maybeSingle();

    // Reaproveitar pagamento existente
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
          metadata: { env: stripeEnv, flow: "legado" },
        } as any)
        .select("id")
        .single();
      if (pErr || !novoPag) throw pErr ?? new Error("Falha ao criar pagamento");
      pagamentoId = novoPag.id;
    }

    const successUrl = `${origin}/app/paciente/pagamento/sucesso?p=${pagamentoId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/app/paciente/pagamento/cancelado?p=${pagamentoId}`;
    const descricao = `Consulta — ${medico?.nome ?? "Médico"} (${medico?.especialidade ?? "Telemedicina"})`;

    const stripe = createStripeClient(stripeEnv);
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: consulta.valor_centavos,
            product_data: {
              name: descricao,
              description: `Atendimento online — ${new Date(consulta.inicio).toLocaleString("pt-BR")}`,
            },
          },
        },
      ],
      mode: "payment",
      ui_mode: "embedded_page",
      return_url: successUrl,
      customer_email: userData.user.email ?? undefined,
      client_reference_id: pagamentoId!,
      metadata: {
        pagamento_id: pagamentoId!,
        consulta_id: consulta.id,
        flow: "legado",
      },
    } as any);

    if (!session?.client_secret && !session?.url && !session?.id) {
      throw new Error("Resposta inválida do Stripe");
    }

    await admin
      .from("pagamentos")
      .update({
        provider_session_id: session.id,
        checkout_url: session.url ?? `embedded:${session.id}`,
      } as any)
      .eq("id", pagamentoId!);

    return json({
      pagamento_id: pagamentoId,
      clientSecret: session.client_secret,
      checkout_url: session.url,
      session_id: session.id,
      env: stripeEnv,
    });
  } catch (e: any) {
    console.error("[criar-checkout-stripe]", e);
    return json({ error: e?.message ?? "Erro inesperado" }, 500);
  }
});
