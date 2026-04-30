// Cria um colaborador interno: convida usuário no Auth, atribui role e cria registro
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES_INTERNAS = new Set(["secretaria", "supervisor"]);

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

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Usuário inválido" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Apenas admin" }, 403);

    const body = await req.json();
    const {
      email,
      nome_completo,
      cpf,
      telefone,
      data_nascimento,
      funcao_interna,
      cargo_descricao,
      role,
      setor,
      gestor_id,
      observacoes_internas,
      obrigar_troca_senha,
      redirect_to,
    } = body ?? {};

    if (!email || !nome_completo || !funcao_interna || !role) {
      return json({ error: "Campos obrigatórios: email, nome_completo, funcao_interna, role" }, 400);
    }
    if (!ROLES_INTERNAS.has(role)) {
      return json({ error: `Role inválida: ${role}. Use 'secretaria' ou 'supervisor'.` }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Garante user no auth (convite por magic link)
    let userId: string | null = null;

    // tenta criar por convite
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome: nome_completo, role },
      redirectTo: redirect_to ?? undefined,
    });

    if (invErr) {
      // se já existe, busca o usuário
      const msg = invErr.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
        if (!existing) return json({ error: "E-mail já cadastrado, mas usuário não encontrado." }, 409);
        userId = existing.id;
      } else {
        return json({ error: invErr.message }, 400);
      }
    } else {
      userId = invited.user?.id ?? null;
    }

    if (!userId) return json({ error: "Falha ao obter user_id" }, 500);

    // 2) Atribui role interna
    await admin.rpc("colaborador_set_role", { _user_id: userId, _role: role, _motivo: "Convite admin" });

    // 3) Upsert colaborador
    const { data: existingColab } = await admin
      .from("colaboradores")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let colabId = existingColab?.id ?? null;

    if (colabId) {
      await admin
        .from("colaboradores")
        .update({
          nome_completo,
          cpf: cpf ?? null,
          telefone: telefone ?? null,
          data_nascimento: data_nascimento ?? null,
          funcao_interna,
          cargo_descricao: cargo_descricao ?? null,
          setor: setor ?? null,
          gestor_id: gestor_id ?? null,
          observacoes_internas: observacoes_internas ?? null,
          obrigar_troca_senha: obrigar_troca_senha ?? true,
          status_conta: "pendente_convite",
          convite_enviado_em: new Date().toISOString(),
        })
        .eq("id", colabId);
    } else {
      const { data: created, error: cErr } = await admin
        .from("colaboradores")
        .insert({
          user_id: userId,
          email,
          nome_completo,
          cpf: cpf ?? null,
          telefone: telefone ?? null,
          data_nascimento: data_nascimento ?? null,
          funcao_interna,
          cargo_descricao: cargo_descricao ?? null,
          setor: setor ?? null,
          gestor_id: gestor_id ?? null,
          observacoes_internas: observacoes_internas ?? null,
          obrigar_troca_senha: obrigar_troca_senha ?? true,
          status_conta: "pendente_convite",
          convite_enviado_em: new Date().toISOString(),
          created_by: u.user.id,
        })
        .select("id")
        .single();
      if (cErr) return json({ error: cErr.message }, 400);
      colabId = created!.id;
    }

    // 4) Auditoria
    await admin.rpc("registrar_auditoria_colaborador", {
      _colab_id: colabId,
      _acao: "convidado",
      _campo: null,
      _valor_anterior: null,
      _valor_novo: email,
      _motivo: "Convite enviado",
      _observacao: null,
      _payload: { role, funcao_interna },
    });

    return json({ ok: true, user_id: userId, colaborador_id: colabId });
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
