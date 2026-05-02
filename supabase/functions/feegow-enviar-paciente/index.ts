// Edge function preparada para enviar paciente à API Feegow
// Secrets necessários (adiados): FEEGOW_API_TOKEN, FEEGOW_BASE_URL
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
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    const FEEGOW_URL = Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1";

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Usuário inválido" }, 401);

    // Apenas admin/secretaria/supervisor
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) {
      const { data: isSec } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "secretaria" });
      const { data: isSup } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "supervisor" });
      if (!isSec && !isSup) return json({ error: "Sem permissão" }, 403);
    }

    const { paciente_id } = await req.json();
    if (!paciente_id) return json({ error: "paciente_id obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Busca paciente
    const { data: pac, error: pacErr } = await admin
      .from("pacientes")
      .select("*")
      .eq("id", paciente_id)
      .single();
    if (pacErr || !pac) return json({ error: "Paciente não encontrado" }, 404);

    // Verifica se Feegow está configurado
    if (!FEEGOW_TOKEN) {
      // Marca como pendente — integração não ativada ainda
      await admin.from("pacientes").update({
        feegow_status: "pendente",
        feegow_ultimo_envio_em: new Date().toISOString(),
        feegow_erro: "Integração Feegow não configurada (FEEGOW_API_TOKEN ausente)",
      }).eq("id", paciente_id);

      return json({
        ok: false,
        mock: true,
        message: "Feegow não configurado. Paciente marcado como pendente.",
      });
    }

    // ── Envio real para Feegow ──
    const payload = {
      nome: pac.nome_completo,
      cpf: pac.cpf?.replace(/\D/g, "") ?? "",
      celular: pac.telefone?.replace(/\D/g, "") ?? "",
      email: "", // será preenchido via profiles se necessário
      data_nascimento: pac.data_nascimento ?? "",
      sexo: pac.sexo === "masculino" ? "M" : pac.sexo === "feminino" ? "F" : "",
    };

    const resp = await fetch(`${FEEGOW_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": FEEGOW_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (!resp.ok) {
      await admin.from("pacientes").update({
        feegow_status: "erro",
        feegow_ultimo_envio_em: new Date().toISOString(),
        feegow_erro: JSON.stringify(result).slice(0, 500),
      }).eq("id", paciente_id);

      return json({ ok: false, error: "Erro ao enviar para Feegow", detail: result }, resp.status);
    }

    const feegowId = result?.content?.id ?? result?.id ?? null;

    await admin.from("pacientes").update({
      feegow_status: "liberado",
      feegow_paciente_id: feegowId ? String(feegowId) : null,
      feegow_ultimo_envio_em: new Date().toISOString(),
      feegow_erro: null,
    }).eq("id", paciente_id);

    return json({ ok: true, feegow_paciente_id: feegowId });
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
