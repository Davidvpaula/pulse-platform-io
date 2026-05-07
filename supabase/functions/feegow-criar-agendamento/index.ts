// Edge function: cria agendamento na Feegow de forma MANUAL (somente admin)
// NÃO é automático. NÃO é cron. NÃO é webhook. Envio unitário controlado.
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

function normalizeFeegowUrl(raw: string): string {
  let url = raw;
  if (!url.startsWith("http")) url = `https://${url}`;
  url = url.replace("://www.api.feegow.com", "://api.feegow.com");
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith("/api")) url = url + "/api";
  return url;
}

function maskSensitive(val: string | null | undefined): string {
  if (!val) return "***";
  if (val.length <= 4) return "***";
  return val.slice(0, 2) + "***" + val.slice(-2);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_TOKEN") ?? "";
    const FEEGOW_API_URL = Deno.env.get("FEEGOW_API_URL") ?? "";

    // === AUTH ===
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Sessão inválida" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    // === INPUT ===
    const body = await req.json().catch(() => ({}));
    const { consulta_id } = body as { consulta_id?: string };
    if (!consulta_id) return json({ error: "consulta_id é obrigatório" }, 400);

    // === CONFIG ===
    if (!FEEGOW_TOKEN || !FEEGOW_API_URL) {
      return json({ error: "Feegow não configurado (token ou URL ausente)" }, 500);
    }
    const baseUrl = normalizeFeegowUrl(FEEGOW_API_URL);

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // === BUSCAR CONSULTA ===
    const { data: consulta, error: cErr } = await adminClient
      .from("consultas")
      .select(`
        id, inicio, fim, valor_centavos, modalidade, status, motivo,
        feegow_agendamento_id, feegow_sync_status,
        medico_id, paciente_id,
        medicos!inner(id, nome, feegow_professional_id, feegow_especialidade_id),
        pacientes!inner(id, nome_completo, feegow_paciente_id, cpf, telefone, email)
      `)
      .eq("id", consulta_id)
      .maybeSingle();

    if (cErr || !consulta) {
      return json({ error: "Consulta não encontrada", detalhe: cErr?.message }, 404);
    }

    // === ANTI-DUPLICIDADE ===
    if (consulta.feegow_agendamento_id) {
      return json({
        error: "Agendamento já enviado para Feegow",
        feegow_agendamento_id: consulta.feegow_agendamento_id,
      }, 409);
    }

    // === VALIDAÇÕES ===
    const medico = consulta.medicos as any;
    const paciente = consulta.pacientes as any;

    if (!medico?.feegow_professional_id) {
      return json({ error: "Médico não vinculado à Feegow. Vincule primeiro na página de profissionais." }, 422);
    }
    if (!medico?.feegow_especialidade_id) {
      return json({ error: "Médico sem especialidade Feegow mapeada. Verifique o vínculo." }, 422);
    }
    if (!paciente?.feegow_paciente_id) {
      return json({ error: "Paciente sem cadastro na Feegow. Envie o paciente primeiro." }, 422);
    }

    // === MONTAR PAYLOAD ===
    const dtInicio = new Date(consulta.inicio);
    const dataFormatada = `${String(dtInicio.getDate()).padStart(2, "0")}-${String(dtInicio.getMonth() + 1).padStart(2, "0")}-${dtInicio.getFullYear()}`;
    const horaFormatada = `${String(dtInicio.getHours()).padStart(2, "0")}:${String(dtInicio.getMinutes()).padStart(2, "0")}:00`;

    const payload: Record<string, unknown> = {
      local_id: 1, // padrão — pode ser configurável via app_settings no futuro
      paciente_id: Number(paciente.feegow_paciente_id),
      profissional_id: Number(medico.feegow_professional_id),
      especialidade_id: Number(medico.feegow_especialidade_id),
      data: dataFormatada,
      hora: horaFormatada,
      valor: consulta.valor_centavos,
      plano: 0, // particular
      notas: `Consulta local #${consulta.id.slice(0, 8)} | ${consulta.modalidade}`,
    };

    // === ENVIAR PARA FEEGOW ===
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let feegowResp: Response;
    let feegowBody: any;
    try {
      feegowResp = await fetch(`${baseUrl}/appoints/new-appoint`, {
        method: "POST",
        headers: {
          "x-access-token": FEEGOW_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const text = await feegowResp.text();
      try { feegowBody = JSON.parse(text); } catch { feegowBody = { raw: text.slice(0, 1000) }; }
    } catch (e) {
      clearTimeout(timeout);
      const erro = (e as Error).name === "AbortError" ? "Timeout 30s" : (e as Error).message;

      await adminClient.from("consultas").update({
        feegow_sync_status: "erro",
        feegow_sync_at: new Date().toISOString(),
        feegow_sync_error: erro,
      }).eq("id", consulta_id);

      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "criar_agendamento",
        entidade_tipo: "consulta",
        entidade_id_interno: consulta_id,
        payload_envio: { ...payload, paciente_id: "***", profissional_id: "***" },
        payload_resposta: { erro },
        status: "error",
        erro,
        origem: "edge_function",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });

      return json({ error: "Falha de conexão com Feegow", detalhe: erro }, 502);
    }
    clearTimeout(timeout);

    // === PROCESSAR RESPOSTA ===
    const feegowId = feegowBody?.content?.id ?? feegowBody?.data?.id ?? feegowBody?.id ?? null;
    const sucesso = feegowResp.ok && feegowId;

    // Payload mascarado para logs
    const payloadLog = {
      ...payload,
      paciente_id: "***",
      profissional_id: "***",
    };

    if (sucesso) {
      await adminClient.from("consultas").update({
        feegow_agendamento_id: String(feegowId),
        feegow_sync_status: "enviado",
        feegow_sync_at: new Date().toISOString(),
        feegow_sync_error: null,
      }).eq("id", consulta_id);

      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "criar_agendamento",
        entidade_tipo: "consulta",
        entidade_id_interno: consulta_id,
        entidade_id_externo: String(feegowId),
        payload_envio: payloadLog,
        payload_resposta: feegowBody,
        status: "success",
        origem: "edge_function",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });

      return json({
        sucesso: true,
        feegow_agendamento_id: String(feegowId),
        payload_enviado: payloadLog,
        resposta_feegow: feegowBody,
        duracao_ms: Date.now() - start,
      });
    } else {
      const erroMsg = feegowBody?.message ?? feegowBody?.error ?? `HTTP ${feegowResp.status}`;

      await adminClient.from("consultas").update({
        feegow_sync_status: "erro",
        feegow_sync_at: new Date().toISOString(),
        feegow_sync_error: String(erroMsg).slice(0, 500),
      }).eq("id", consulta_id);

      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "criar_agendamento",
        entidade_tipo: "consulta",
        entidade_id_interno: consulta_id,
        payload_envio: payloadLog,
        payload_resposta: feegowBody,
        status: "error",
        erro: String(erroMsg).slice(0, 500),
        origem: "edge_function",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });

      return json({
        error: "Feegow rejeitou o agendamento",
        detalhe: erroMsg,
        http_status: feegowResp.status,
        resposta_feegow: feegowBody,
        payload_enviado: payloadLog,
      }, 422);
    }
  } catch (e) {
    return json({ error: "Erro interno", detalhe: (e as Error).message }, 500);
  }
});
