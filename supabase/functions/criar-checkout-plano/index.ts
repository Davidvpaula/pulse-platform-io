// Edge function: cria Stripe Checkout Session para assinatura de plano personalizado
// Modo subscription com price_data recorrente (mensal)
// Após pagamento, webhook cria plano + assinatura no banco

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
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      planoIds,         // string[] — IDs dos planos médicos selecionados
      valorFinalCentavos, // number — valor com desconto aplicado
      descontoPct,      // number — % de desconto progressivo
      environment: envParam,
    } = body as {
      planoIds: string[];
      valorFinalCentavos: number;
      descontoPct: number;
      environment?: string;
    };

    if (!planoIds?.length || !valorFinalCentavos || valorFinalCentavos < 100) {
      return json({ error: "Dados inválidos" }, 400);
    }

    const stripeEnv: StripeEnv = envParam === "live" ? "live" : "sandbox";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const uid = userData.user.id;

    // Buscar paciente_id primeiro (necessário para verificar assinatura)
    const { data: paciente } = await admin
      .from("pacientes")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (!paciente) return json({ error: "Perfil de paciente não encontrado" }, 404);

    // Verificar se paciente já tem assinatura ativa
    const { data: existentes } = await admin
      .from("assinaturas")
      .select("id")
      .eq("paciente_id", paciente.id)
      .in("status", ["ativa", "trial"])
      .limit(1);

    if (existentes && existentes.length > 0) {
      return json({ error: "Você já possui um plano personalizado ativo" }, 409);
    }

    // Buscar dados dos planos selecionados para descrição
    const { data: planosData } = await admin
      .from("planos")
      .select("id, nome, medico_id, valor_mensal_centavos")
      .in("id", planoIds)
      .eq("nivel", "medico")
      .eq("status", "ativo")
      .eq("aprovado_admin", true);

    if (!planosData?.length) {
      return json({ error: "Nenhum plano válido encontrado" }, 404);
    }

    // Buscar paciente_id
    const { data: paciente } = await admin
      .from("pacientes")
      .select("id")
      .eq("user_id", uid)
      .maybeSingle();

    if (!paciente) return json({ error: "Perfil de paciente não encontrado" }, 404);

    // Buscar medicos PKs para plano_medicos
    const medicoUserIds = [...new Set(planosData.map((p: any) => p.medico_id))];
    const { data: medicosData } = await admin
      .from("medicos")
      .select("id, user_id, nome")
      .in("user_id", medicoUserIds);

    const medicoMap = new Map<string, any>();
    for (const m of (medicosData ?? [])) medicoMap.set(m.user_id, m);

    // Descrição do plano
    const nomesPlanos = planosData.map((p: any) => p.nome).join(", ");
    const descricao = planosData.length === 1
      ? `Plano ${planosData[0].nome}`
      : `Plano personalizado — ${planosData.length} planos`;

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "";

    const returnUrl = `${origin}/app/paciente/plano-checkout-retorno?session_id={CHECKOUT_SESSION_ID}`;

    // Metadata para reconstruir plano no webhook
    const metadata: Record<string, string> = {
      flow: "plano_personalizado",
      user_id: uid,
      paciente_id: paciente.id,
      plano_ids: JSON.stringify(planoIds),
      desconto_pct: String(descontoPct),
      valor_final_centavos: String(valorFinalCentavos),
      nome_plano: descricao,
      medico_pks: JSON.stringify(
        [...new Set(planosData.map((p: any) => {
          const med = medicoMap.get(p.medico_id);
          return med?.id;
        }).filter(Boolean))]
      ),
    };

    const stripe = createStripeClient(stripeEnv);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: valorFinalCentavos,
            recurring: { interval: "month" },
            product_data: {
              name: descricao,
              description: descontoPct > 0
                ? `${nomesPlanos} (${descontoPct}% desconto progressivo)`
                : nomesPlanos,
            },
          },
        },
      ],
      mode: "subscription",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      customer_email: userData.user.email ?? undefined,
      metadata,
      subscription_data: { metadata },
    } as any);

    if (!session?.client_secret) {
      throw new Error("Resposta inválida do Stripe");
    }

    return json({
      clientSecret: session.client_secret,
      session_id: session.id,
    });
  } catch (e: any) {
    console.error("[criar-checkout-plano]", e);
    return json({ error: e?.message ?? "Erro inesperado" }, 500);
  }
});
