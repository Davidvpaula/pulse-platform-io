// Edge function: vincula/desvincula médico local ↔ profissional Feegow
// Apenas admin. Não cria profissional na Feegow. Apenas salva o vínculo local.
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

    const body = await req.json().catch(() => ({}));
    const { medico_id, action } = body as { medico_id?: string; action?: string };

    if (!medico_id) return json({ error: "medico_id é obrigatório" }, 400);

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // ---- DESVINCULAR ----
    if (action === "desvincular") {
      const { error } = await adminClient
        .from("medicos")
        .update({
          feegow_professional_id: null,
          feegow_vinculado_por: null,
          feegow_vinculado_em: null,
          feegow_especialidade_id: null,
          feegow_metadata: null,
          feegow_status: "nao_enviado",
        })
        .eq("id", medico_id);

      if (error) return json({ error: error.message }, 500);

      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "desvincular_profissional",
        entidade_tipo: "medico",
        entidade_id_interno: medico_id,
        status: "sucesso",
        origem: "admin_ui",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });

      return json({ ok: true, action: "desvinculado" });
    }

    // ---- VINCULAR ----
    const { feegow_profissional_id, feegow_metadata } = body as {
      feegow_profissional_id?: number;
      feegow_metadata?: Record<string, unknown>;
    };

    if (!feegow_profissional_id) return json({ error: "feegow_profissional_id é obrigatório" }, 400);

    // Validate professional exists in Feegow
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    let baseUrl = Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api";
    if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
    baseUrl = baseUrl.replace("://www.api.feegow.com", "://api.feegow.com");
    if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    if (!baseUrl.endsWith("/api")) baseUrl = baseUrl + "/api";

    const fResp = await fetch(
      `${baseUrl}/professional/list?profissional_id=${feegow_profissional_id}`,
      { method: "GET", headers: { "x-access-token": FEEGOW_TOKEN } },
    );
    const fData = await fResp.json();

    if (!fResp.ok || !fData.success) {
      return json({ error: "Profissional não encontrado na Feegow", detail: fData.message }, 404);
    }

    const prof = Array.isArray(fData.content) ? fData.content[0] : null;
    if (!prof) return json({ error: "Profissional não encontrado na Feegow" }, 404);

    // Build metadata snapshot
    const metadata = {
      profissional_id: prof.profissional_id,
      nome: prof.nome,
      tratamento: prof.tratamento,
      conselho: prof.conselho,
      documento_conselho: prof.documento_conselho,
      uf_conselho: prof.uf_conselho,
      rqe: prof.rqe,
      ativo: prof.ativo,
      foto: prof.foto,
      especialidades: prof.especialidades ?? [],
      snapshot_at: new Date().toISOString(),
    };

    // Get especialidade_id from first specialty if available
    const especId = Array.isArray(prof.especialidades) && prof.especialidades.length > 0
      ? prof.especialidades[0]?.especialidade_id ?? null
      : null;

    // Update medico
    const { error } = await adminClient
      .from("medicos")
      .update({
        feegow_professional_id: String(feegow_profissional_id),
        feegow_vinculado_por: u.user.id,
        feegow_vinculado_em: new Date().toISOString(),
        feegow_especialidade_id: especId,
        feegow_metadata: metadata,
        feegow_status: "liberado",
      })
      .eq("id", medico_id);

    if (error) return json({ error: error.message }, 500);

    // Log
    await adminClient.from("integracoes_logs").insert({
      integracao: "feegow",
      acao: "vincular_profissional",
      entidade_tipo: "medico",
      entidade_id_interno: medico_id,
      entidade_id_externo: String(feegow_profissional_id),
      payload_envio: { medico_id, feegow_profissional_id },
      payload_resposta: metadata,
      status: "sucesso",
      origem: "admin_ui",
      user_id: u.user.id,
      duracao_ms: Date.now() - start,
    });

    return json({ ok: true, action: "vinculado", metadata });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
