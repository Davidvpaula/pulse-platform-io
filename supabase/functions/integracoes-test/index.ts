// Edge function: testa conectividade com todas as integrações da Central
// Suporta: feegow, whatsapp, google, pagamentos, ia_provider, assinatura_digital, eventos_sistema
// Persiste resultado em integracoes_config + integracoes_logs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tipo =
  | "feegow"
  | "whatsapp"
  | "google"
  | "pagamentos"
  | "ia_provider"
  | "assinatura_digital"
  | "eventos_sistema";

interface TesteResultado {
  ok: boolean;
  mensagem: string;
  detalhes?: Record<string, unknown>;
  erro?: string;
}

function normalizeFeegowUrl(raw: string): string {
  let url = raw;
  if (!url.startsWith("http")) url = `https://${url}`;
  url = url.replace("://www.api.feegow.com", "://api.feegow.com");
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith("/api")) url = url + "/api";
  return url;
}

function maskToken(token: string): string {
  if (token.length <= 14) return "***";
  return token.slice(0, 6) + "..." + token.slice(-4);
}

// ────────────────────────────────────────────────────────────────
// Handlers por tipo
// ────────────────────────────────────────────────────────────────

async function testarFeegow(config: Record<string, unknown>, modoSimulado: boolean): Promise<TesteResultado> {
  const token = Deno.env.get("FEEGOW_API_TOKEN") ?? Deno.env.get("FEEGOW_TOKEN");
  if (!token) {
    return {
      ok: false,
      mensagem: "Secret FEEGOW_API_TOKEN não configurado. Vá em Secrets do Lovable Cloud.",
      erro: "missing_secret:FEEGOW_API_TOKEN",
    };
  }
  if (modoSimulado) {
    return {
      ok: true,
      mensagem: "Modo simulado — token presente, chamada real não executada.",
      detalhes: { token_mascarado: maskToken(token), simulado: true },
    };
  }
  const baseUrl = normalizeFeegowUrl((config.url_base as string) ?? "https://api.feegow.com/v1");
  const timeout = Number(config.timeout ?? 15000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(`${baseUrl}/specialties/list`, {
      method: "GET",
      headers: { "x-access-token": token },
      signal: controller.signal,
    });
    const data = await resp.json().catch(() => null);
    clearTimeout(t);
    if (!resp.ok) {
      return {
        ok: false,
        mensagem: `Feegow retornou HTTP ${resp.status}. Verifique token e permissões da licença.`,
        erro: JSON.stringify(data).slice(0, 300),
        detalhes: { http_status: resp.status, url: `${baseUrl}/specialties/list` },
      };
    }
    const total = Array.isArray(data?.content) ? data.content.length : null;
    return {
      ok: true,
      mensagem: total !== null ? `Feegow OK — ${total} especialidades carregadas.` : "Feegow OK.",
      detalhes: { http_status: resp.status, total_especialidades: total, token_mascarado: maskToken(token) },
    };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, mensagem: "Falha ao contatar Feegow.", erro: (e as Error).message };
  }
}

async function testarWhatsapp(config: Record<string, unknown>, modoSimulado: boolean): Promise<TesteResultado> {
  const token = Deno.env.get("META_WHATSAPP_TOKEN") ?? Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = (config.phone_number_id as string) ?? Deno.env.get("META_WHATSAPP_PHONE_ID");
  if (!token) {
    return { ok: false, mensagem: "Secret META_WHATSAPP_TOKEN não configurado.", erro: "missing_secret:META_WHATSAPP_TOKEN" };
  }
  if (modoSimulado) {
    return { ok: true, mensagem: "Modo simulado — token presente, sem chamada real à Meta.", detalhes: { simulado: true, token_mascarado: maskToken(token) } };
  }
  if (!phoneId) {
    return { ok: false, mensagem: "Phone Number ID ausente na configuração.", erro: "missing_config:phone_number_id" };
  }
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return {
        ok: false,
        mensagem: `Meta retornou HTTP ${resp.status}: ${data?.error?.message ?? "desconhecido"}`,
        erro: JSON.stringify(data?.error ?? data).slice(0, 300),
      };
    }
    return { ok: true, mensagem: `WhatsApp Business OK — número ${data?.display_phone_number ?? phoneId}.`, detalhes: data };
  } catch (e) {
    return { ok: false, mensagem: "Falha ao contatar Meta Graph API.", erro: (e as Error).message };
  }
}

async function testarGoogle(config: Record<string, unknown>): Promise<TesteResultado> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      mensagem: "Secrets GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET não configurados.",
      erro: "missing_secret:GOOGLE_OAUTH_CLIENT_ID",
    };
  }
  const modo = (config.modo as string) ?? "manual";
  return {
    ok: true,
    mensagem: `OAuth Google presente. Modo atual: ${modo}. Conexão por médico via /medico/configuracoes.`,
    detalhes: { client_id_mascarado: maskToken(clientId), modo },
  };
}

async function testarPagamentos(config: Record<string, unknown>, modoSimulado: boolean): Promise<TesteResultado> {
  const provider = (config.provider as string) ?? "stripe";
  if (provider === "manual") {
    return { ok: true, mensagem: "Modo manual — sem provider externo a testar.", detalhes: { provider } };
  }
  if (provider === "stripe") {
    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) {
      return { ok: false, mensagem: "STRIPE_SECRET_KEY não configurado.", erro: "missing_secret:STRIPE_SECRET_KEY" };
    }
    if (modoSimulado) {
      return { ok: true, mensagem: "Modo simulado — Stripe key presente.", detalhes: { simulado: true } };
    }
    try {
      const resp = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return { ok: false, mensagem: `Stripe retornou HTTP ${resp.status}.`, erro: data?.error?.message };
      }
      return { ok: true, mensagem: "Stripe OK — saldo consultado.", detalhes: { livemode: data?.livemode } };
    } catch (e) {
      return { ok: false, mensagem: "Falha ao contatar Stripe.", erro: (e as Error).message };
    }
  }
  return { ok: true, mensagem: `Provider '${provider}' configurado (teste específico não implementado).`, detalhes: { provider } };
}

async function testarIaProvider(config: Record<string, unknown>): Promise<TesteResultado> {
  const provider = (config.provider as string) ?? "lovable";
  if (provider === "lovable") {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return { ok: false, mensagem: "LOVABLE_API_KEY ausente.", erro: "missing_secret:LOVABLE_API_KEY" };
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: (config.modelo as string) ?? "google/gemini-2.5-flash",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        return { ok: false, mensagem: `AI Gateway HTTP ${resp.status}.`, erro: JSON.stringify(data).slice(0, 200) };
      }
      return { ok: true, mensagem: "Lovable AI Gateway OK.", detalhes: { modelo: data?.model } };
    } catch (e) {
      return { ok: false, mensagem: "Falha ao contatar AI Gateway.", erro: (e as Error).message };
    }
  }
  if (provider === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return { ok: false, mensagem: "OPENAI_API_KEY não configurada.", erro: "missing_secret:OPENAI_API_KEY" };
    return { ok: true, mensagem: "OpenAI key presente (teste real não executado)." };
  }
  return { ok: true, mensagem: `Provider IA '${provider}' configurado.` };
}

async function testarAssinaturaDigital(): Promise<TesteResultado> {
  const key = Deno.env.get("ASSINATURA_DIGITAL_API_KEY");
  if (!key) {
    return {
      ok: false,
      mensagem: "Secret ASSINATURA_DIGITAL_API_KEY não configurado. Integração aguardando ativação.",
      erro: "missing_secret:ASSINATURA_DIGITAL_API_KEY",
    };
  }
  return { ok: true, mensagem: "Assinatura digital: secret presente (provider ainda a definir)." };
}

async function testarEventosSistema(
  supabaseUrl: string,
  serviceKey: string,
): Promise<TesteResultado> {
  const admin = createClient(supabaseUrl, serviceKey);
  const { count, error } = await admin
    .from("event_queue")
    .select("*", { count: "exact", head: true });
  if (error) return { ok: false, mensagem: "Falha ao consultar event_queue.", erro: error.message };
  const { count: pend } = await admin
    .from("event_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return {
    ok: true,
    mensagem: `Fila interna OK — ${count ?? 0} eventos totais, ${pend ?? 0} pendentes.`,
    detalhes: { total: count, pendentes: pend },
  };
}

// ────────────────────────────────────────────────────────────────
// Persistência
// ────────────────────────────────────────────────────────────────

async function persistir(
  supabaseUrl: string,
  serviceKey: string,
  integracaoId: string | null,
  tipo: Tipo,
  resultado: TesteResultado,
  userId: string,
) {
  const admin = createClient(supabaseUrl, serviceKey);
  const now = new Date().toISOString();

  if (integracaoId) {
    await admin
      .from("integracoes_config")
      .update({
        ultimo_teste_at: now,
        ultimo_teste_ok: resultado.ok,
        ultimo_erro: resultado.ok ? null : (resultado.erro ?? resultado.mensagem),
        updated_at: now,
      })
      .eq("id", integracaoId);
  } else {
    await admin
      .from("integracoes_config")
      .update({
        ultimo_teste_at: now,
        ultimo_teste_ok: resultado.ok,
        ultimo_erro: resultado.ok ? null : (resultado.erro ?? resultado.mensagem),
        updated_at: now,
      })
      .eq("tipo", tipo);
  }

  await admin.from("integracoes_logs").insert({
    integracao: tipo,
    acao: "teste_conexao",
    status: resultado.ok ? "success" : "error",
    erro: resultado.ok ? null : (resultado.erro ?? resultado.mensagem),
    origem: "admin",
    user_id: userId,
    payload_resposta: resultado as unknown as Record<string, unknown>,
  });
}

// ────────────────────────────────────────────────────────────────
// Handler
// ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, mensagem: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, mensagem: "Sessão inválida" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ ok: false, mensagem: "Apenas administradores" }, 403);

    const body = await req.json().catch(() => ({}));
    // Aceita `tipo` (novo) e `integration` (legado)
    const tipo = (body.tipo ?? body.integration) as Tipo;
    const integracaoId = (body.integracao_id ?? null) as string | null;

    if (!tipo) return json({ ok: false, mensagem: "Parâmetro 'tipo' obrigatório." }, 400);

    // Buscar config atual da integração
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: integ } = integracaoId
      ? await admin.from("integracoes_config").select("*").eq("id", integracaoId).maybeSingle()
      : await admin.from("integracoes_config").select("*").eq("tipo", tipo).maybeSingle();

    const config = (integ?.config ?? {}) as Record<string, unknown>;
    const modoSimulado = Boolean(integ?.modo_simulado);

    let resultado: TesteResultado;
    switch (tipo) {
      case "feegow": resultado = await testarFeegow(config, modoSimulado); break;
      case "whatsapp": resultado = await testarWhatsapp(config, modoSimulado); break;
      case "google": resultado = await testarGoogle(config); break;
      case "pagamentos": resultado = await testarPagamentos(config, modoSimulado); break;
      case "ia_provider": resultado = await testarIaProvider(config); break;
      case "assinatura_digital": resultado = await testarAssinaturaDigital(); break;
      case "eventos_sistema": resultado = await testarEventosSistema(SUPABASE_URL, SERVICE_KEY); break;
      default:
        return json({ ok: false, mensagem: `Tipo '${tipo}' não suportado.` }, 400);
    }

    await persistir(SUPABASE_URL, SERVICE_KEY, integracaoId ?? integ?.id ?? null, tipo, resultado, u.user.id);

    return json({ ...resultado, tipo });
  } catch (e) {
    return json({ ok: false, mensagem: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
