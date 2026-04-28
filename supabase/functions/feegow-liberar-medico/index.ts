// Edge function: libera acesso do médico na Feegow.
// Por enquanto roda em MODO SIMULADO se FEEGOW_API_KEY não estiver configurada.
// Quando a chave for adicionada, o bloco real de chamada à API Feegow é ativado.
//
// Apenas administradores podem invocar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    // Cliente que herda o JWT do usuário (para checar role)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Sessão inválida" }, 401);

    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = await req.json().catch(() => ({}));
    const medicoId = String(body.medico_id ?? "");
    if (!medicoId) return json({ error: "medico_id é obrigatório" }, 400);

    // Cliente service-role para ler dados do médico e gravar resultado
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: medico, error: mErr } = await adminClient
      .from("medicos")
      .select(
        "id, nome, email, cpf, data_nascimento, crm, crm_estado, rqe, especialidade, status",
      )
      .eq("id", medicoId)
      .maybeSingle();
    if (mErr || !medico) return json({ error: "Médico não encontrado" }, 404);
    if (medico.status !== "aprovado") {
      return json({ error: "Médico ainda não aprovado" }, 400);
    }
    if (!medico.cpf || !medico.data_nascimento) {
      return json(
        {
          error:
            "Dados incompletos: CPF e Data de nascimento são obrigatórios para liberar acesso na Feegow.",
        },
        400,
      );
    }

    const FEEGOW_API_KEY = Deno.env.get("FEEGOW_API_KEY");
    const FEEGOW_BASE = Deno.env.get("FEEGOW_BASE_URL") ??
      "https://api.feegow.com/v1/api";

    // Marca como pendente antes de chamar
    await callRpc(userClient, "feegow_marcar_liberacao", {
      _medico_id: medicoId,
      _status: "pendente",
      _professional_id: null,
      _erro: null,
      _payload: null,
    });

    // ====== Modo simulado (sem chave) ======
    if (!FEEGOW_API_KEY) {
      const fakeId = `SIM-${crypto.randomUUID().slice(0, 8)}`;
      await callRpc(userClient, "feegow_marcar_liberacao", {
        _medico_id: medicoId,
        _status: "liberado",
        _professional_id: fakeId,
        _erro: null,
        _payload: { simulado: true, criado_em: new Date().toISOString() },
      });
      return json({
        ok: true,
        modo: "simulado",
        professional_id: fakeId,
        aviso:
          "FEEGOW_API_KEY não configurada — liberação simulada. Configure a chave para ativar a integração real.",
      });
    }

    // ====== Modo real ======
    try {
      const resp = await fetch(`${FEEGOW_BASE}/professionals/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": FEEGOW_API_KEY,
        },
        body: JSON.stringify({
          name: medico.nome,
          email: medico.email,
          cpf: medico.cpf,
          birth_date: medico.data_nascimento,
          council: "CRM",
          council_number: medico.crm,
          council_state: medico.crm_estado,
          rqe: medico.rqe ?? undefined,
          specialty: medico.especialidade,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        const msg = data?.message || `HTTP ${resp.status}`;
        await callRpc(userClient, "feegow_marcar_liberacao", {
          _medico_id: medicoId,
          _status: "erro",
          _professional_id: null,
          _erro: msg,
          _payload: data,
        });
        return json({ ok: false, error: msg, payload: data }, 502);
      }
      const professionalId = String(
        data?.content?.professional_id ?? data?.id ?? "",
      );
      await callRpc(userClient, "feegow_marcar_liberacao", {
        _medico_id: medicoId,
        _status: "liberado",
        _professional_id: professionalId,
        _erro: null,
        _payload: data,
      });
      return json({ ok: true, modo: "feegow", professional_id: professionalId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await callRpc(userClient, "feegow_marcar_liberacao", {
        _medico_id: medicoId,
        _status: "erro",
        _professional_id: null,
        _erro: msg,
        _payload: null,
      });
      return json({ ok: false, error: msg }, 500);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callRpc(client: any, name: string, args: Record<string, unknown>) {
  const { error } = await client.rpc(name, args);
  if (error) console.error("RPC error", name, error);
}
