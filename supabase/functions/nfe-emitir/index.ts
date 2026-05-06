// Edge function: emissão de nota fiscal eletrônica (NFe)
// Preparada para integrar com provedor nacional (ex: Nuvemfiscal, eNotas, Focus)
// Secrets necessários (adiados): NFE_API_TOKEN, NFE_BASE_URL
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const NFE_TOKEN = Deno.env.get("NFE_API_TOKEN");
    const NFE_URL = Deno.env.get("NFE_BASE_URL") ?? "https://api.nuvemfiscal.com.br";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Sessão inválida" }, 401);

    // Verificar role admin ou medico
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    const { data: isMedico } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "medico" });
    if (!isAdmin && !isMedico) return json({ error: "Sem permissão" }, 403);

    const body = await req.json();
    const { consulta_id } = body;
    if (!consulta_id) return json({ error: "consulta_id obrigatório" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // ── Buscar consulta com snapshot financeiro ──
    const { data: consulta, error: consultaErr } = await admin
      .from("consultas")
      .select("id, paciente_id, medico_id, status, valor_consulta, servico_nome_snapshot, data_consulta, nfe_status, nfe_id")
      .eq("id", consulta_id)
      .single();

    if (consultaErr || !consulta) return json({ error: "Consulta não encontrada" }, 404);

    // ── Validações ──
    if (consulta.status !== "concluida") {
      return json({ error: "Consulta deve estar concluída para emitir NFe" }, 400);
    }

    // Controle de duplicidade
    if (consulta.nfe_status === "emitida" && consulta.nfe_id) {
      console.log("[nfe-emitir] NFe já emitida para consulta:", consulta_id);
      return json({ ok: false, duplicated: true, nfe_id: consulta.nfe_id });
    }

    // ── Buscar dados do paciente ──
    const { data: paciente } = await admin
      .from("pacientes")
      .select("nome_completo, cpf, telefone, endereco")
      .eq("id", consulta.paciente_id)
      .single();

    // ── Buscar dados do médico ──
    const { data: medico } = await admin
      .from("medicos")
      .select("nome, crm, cnpj")
      .eq("id", consulta.medico_id)
      .single();

    // ── Snapshot financeiro para NFe ──
    const nfeSnapshot = {
      consulta_id,
      valor: consulta.valor_consulta,
      servico: consulta.servico_nome_snapshot || "Consulta médica",
      data_servico: consulta.data_consulta,
      paciente_nome: paciente?.nome_completo ?? "Paciente",
      paciente_cpf: paciente?.cpf?.replace(/\D/g, "") ?? "",
      medico_nome: medico?.nome ?? "Médico",
      medico_crm: medico?.crm ?? "",
      medico_cnpj: medico?.cnpj?.replace(/\D/g, "") ?? "",
      descricao: `Consulta médica - ${consulta.servico_nome_snapshot || "Teleconsulta"} - ${consulta.data_consulta}`,
    };

    // ── Verificar se API NFe está configurada ──
    if (!NFE_TOKEN) {
      // Marcar como pendente
      await admin.from("consultas").update({
        nfe_status: "pendente",
        nfe_snapshot: nfeSnapshot,
      } as any).eq("id", consulta_id);

      // Audit log
      await admin.from("comunicacao_auditoria").insert({
        action: "nfe_pendente",
        entity_type: "nfe",
        entity_id: consulta_id,
        user_id: userData.user.id,
        metadata: { motivo: "NFE_API_TOKEN não configurado", snapshot: nfeSnapshot },
      });

      console.warn("[nfe-emitir] NFE_API_TOKEN não configurado — NFe marcada como pendente");
      return json({
        ok: false,
        pending: true,
        message: "Integração NFe não configurada. Nota marcada como pendente.",
        snapshot: nfeSnapshot,
      });
    }

    // ── Emissão real via provedor ──
    const nfePayload = {
      tipo: "NFS-e",
      prestador: {
        cnpj: nfeSnapshot.medico_cnpj,
        nome: nfeSnapshot.medico_nome,
      },
      tomador: {
        cpf: nfeSnapshot.paciente_cpf,
        nome: nfeSnapshot.paciente_nome,
      },
      servico: {
        descricao: nfeSnapshot.descricao,
        valor: nfeSnapshot.valor / 100, // centavos para reais
        data_competencia: nfeSnapshot.data_servico,
      },
    };

    const nfeRes = await fetch(`${NFE_URL}/nfse`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NFE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nfePayload),
    });

    const nfeResult = await nfeRes.json();

    if (!nfeRes.ok) {
      await admin.from("consultas").update({
        nfe_status: "erro",
        nfe_snapshot: { ...nfeSnapshot, erro: nfeResult },
      } as any).eq("id", consulta_id);

      await admin.from("comunicacao_auditoria").insert({
        action: "nfe_erro",
        entity_type: "nfe",
        entity_id: consulta_id,
        user_id: userData.user.id,
        metadata: { http_status: nfeRes.status, erro: nfeResult },
      });

      console.error("[nfe-emitir] erro API:", nfeRes.status, nfeResult);
      return json({ ok: false, error: "Erro na emissão da NFe", detail: nfeResult }, 502);
    }

    const nfeId = nfeResult.id ?? nfeResult.numero ?? null;

    // ── Atualizar consulta ──
    await admin.from("consultas").update({
      nfe_status: "emitida",
      nfe_id: nfeId ? String(nfeId) : null,
      nfe_snapshot: { ...nfeSnapshot, resultado: nfeResult },
    } as any).eq("id", consulta_id);

    // ── Audit log ──
    await admin.from("comunicacao_auditoria").insert({
      action: "nfe_emitida",
      entity_type: "nfe",
      entity_id: consulta_id,
      user_id: userData.user.id,
      metadata: { nfe_id: nfeId, snapshot: nfeSnapshot },
    });

    console.log("[nfe-emitir] NFe emitida:", nfeId);
    return json({ ok: true, nfe_id: nfeId });
  } catch (e) {
    console.error("[nfe-emitir] erro:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
