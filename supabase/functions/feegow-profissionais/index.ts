// Edge function: lista profissionais da Feegow (read-only)
// Apenas admin autenticado pode chamar
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sessão inválida" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    // Feegow config
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    let baseUrl = Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api";
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
    baseUrl = baseUrl.replace("://www.api.feegow.com", "://api.feegow.com");
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.endsWith("/api")) baseUrl = baseUrl + "/api";

    // Call Feegow
    const resp = await fetch(`${baseUrl}/professional/list?ativo=1`, {
      method: "GET",
      headers: { "x-access-token": FEEGOW_TOKEN },
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "listar_profissionais",
        status: "error",
        erro: data.message ?? `HTTP ${resp.status}`,
        origem: "admin",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });
      return json({ ok: false, error: data.message ?? `HTTP ${resp.status}` });
    }

    // Format response
    const profissionais = (data.content ?? []).map((p: Record<string, unknown>) => ({
      profissional_id: p.profissional_id,
      nome: p.nome,
      tratamento: p.tratamento,
      ativo: p.ativo,
      conselho: p.conselho,
      documento_conselho: p.documento_conselho,
      uf_conselho: p.uf_conselho,
      rqe: p.rqe,
      foto: p.foto,
      especialidades: p.especialidades ?? [],
    }));

    // Log success
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    await adminClient.from("integracoes_logs").insert({
      integracao: "feegow",
      acao: "listar_profissionais",
      status: "success",
      payload_resposta: { total: profissionais.length },
      origem: "admin",
      user_id: u.user.id,
      duracao_ms: Date.now() - start,
    });

    return json({ ok: true, profissionais, total: profissionais.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
