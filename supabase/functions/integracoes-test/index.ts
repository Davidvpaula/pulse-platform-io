// Edge function: testa conectividade com APIs externas (Feegow, WhatsApp)
// Apenas leitura — não envia/cria dados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sessão inválida" }, 401);

    // Apenas admin
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json().catch(() => ({}));
    const integration = body.integration ?? "feegow";

    if (integration === "feegow") {
      const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
      let FEEGOW_URL = Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api";
      // Ensure URL has protocol
      if (FEEGOW_URL && !FEEGOW_URL.startsWith("http")) {
        FEEGOW_URL = `https://${FEEGOW_URL}`;
      }

      if (!FEEGOW_TOKEN) {
        return json({ ok: false, integration: "feegow", error: "FEEGOW_API_TOKEN não configurado" });
      }

      // Teste seguro: listar especialidades (endpoint read-only)
      const resp = await fetch(`${FEEGOW_URL}/specialties/list`, {
        method: "GET",
        headers: {
          "x-access-token": FEEGOW_TOKEN,
        },
      });

      const data = await resp.json().catch(() => null);

      return json({
        ok: resp.ok,
        integration: "feegow",
        http_status: resp.status,
        token_aceito: resp.ok,
        url_testada: `${FEEGOW_URL}/specialties/list`,
        resposta_resumo: resp.ok
          ? { total_especialidades: Array.isArray(data?.content) ? data.content.length : "formato inesperado" }
          : { erro: data?.message ?? data?.error ?? JSON.stringify(data).slice(0, 300) },
      });
    }

    return json({ error: `Integração '${integration}' não suportada para teste` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
