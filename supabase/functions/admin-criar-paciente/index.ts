// Cria um paciente: convida usuário no Auth, atribui role "paciente" e cria registro em pacientes
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

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "Não autenticado" }, 401);
    }

    // Verifica se quem chama é admin ou staff com permissão
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Usuário inválido" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    // Se não é admin, verifica secretaria + permissão
    if (!isAdmin) {
      const { data: isSec } = await userClient.rpc("has_role", {
        _user_id: u.user.id,
        _role: "secretaria",
      });
      if (!isSec) {
        const { data: isSup } = await userClient.rpc("has_role", {
          _user_id: u.user.id,
          _role: "supervisor",
        });
        if (!isSup) return json({ error: "Sem permissão" }, 403);
      }
      const { data: temPerm } = await userClient.rpc("has_permission", {
        _user_id: u.user.id,
        _capability: "pacientes.criar",
      });
      if (!temPerm) return json({ error: "Sem permissão pacientes.criar" }, 403);
    }

    const body = await req.json();
    const { email, nome_completo, cpf, telefone, vinculo, empresa_id } = body ?? {};

    if (!email || !nome_completo) {
      return json({ error: "Campos obrigatórios: email, nome_completo" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Cria/encontra user no auth
    let userId: string | null = null;

    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome: nome_completo, role: "paciente" },
    });

    if (invErr) {
      const msg = invErr.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
        if (!existing) return json({ error: "E-mail já cadastrado mas usuário não encontrado." }, 409);
        userId = existing.id;
      } else {
        return json({ error: invErr.message }, 400);
      }
    } else {
      userId = invited.user?.id ?? null;
    }

    if (!userId) return json({ error: "Falha ao obter user_id" }, 500);

    // 2) Atribui role paciente
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "paciente" },
      { onConflict: "user_id,role" }
    );

    // 3) Upsert profile
    await admin.from("profiles").upsert(
      { id: userId, email, nome: nome_completo, role: "paciente" },
      { onConflict: "id" }
    );

    // 4) Cria/encontra paciente
    const { data: existingPac } = await admin
      .from("pacientes")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let pacienteId = existingPac?.id ?? null;

    if (pacienteId) {
      await admin.from("pacientes").update({
        nome_completo,
        cpf: cpf ?? null,
        telefone: telefone ?? null,
        empresa_id: vinculo === "empresarial" ? (empresa_id ?? null) : null,
        origem_cadastro: "admin",
        responsavel_cadastro_id: u.user.id,
      }).eq("id", pacienteId);
    } else {
      const { data: created, error: cErr } = await admin
        .from("pacientes")
        .insert({
          user_id: userId,
          nome_completo,
          cpf: cpf ?? null,
          telefone: telefone ?? null,
          empresa_id: vinculo === "empresarial" ? (empresa_id ?? null) : null,
          feegow_status: "nao_enviado",
          status_conta: "ativo",
          origem_cadastro: "admin",
          responsavel_cadastro_id: u.user.id,
        })
        .select("id")
        .single();
      if (cErr) return json({ error: cErr.message }, 400);
      pacienteId = created!.id;
    }

    return json({ ok: true, user_id: userId, paciente_id: pacienteId });
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
