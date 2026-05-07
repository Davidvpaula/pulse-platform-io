// Edge function: consulta agenda Feegow somente leitura
// Apenas admin autenticado. NÃO cria/edita agendamentos.
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

interface EndpointTest {
  teste: number;
  endpoint: string;
  metodo: string;
  params: string;
  http_status: number | null;
  resposta_resumo: string;
  tem_agenda: boolean;
}

async function testEndpoint(
  teste: number,
  baseUrl: string,
  path: string,
  method: string,
  token: string,
  queryParams?: Record<string, string>,
  bodyParams?: Record<string, unknown>,
): Promise<EndpointTest> {
  let endpoint = `${baseUrl}${path}`;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    endpoint += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "x-access-token": token,
  };
  const fetchOpts: RequestInit = { method, headers };

  if (bodyParams && (method === "POST" || method === "PUT")) {
    headers["Content-Type"] = "application/json";
    fetchOpts.body = JSON.stringify(bodyParams);
  }

  try {
    const resp = await fetch(endpoint, fetchOpts);
    const text = await resp.text();
    let resumo: string;
    let temAgenda = false;

    try {
      const j = JSON.parse(text);
      resumo = JSON.stringify(j).slice(0, 500);
      // Detect if response contains schedule/appointment data
      if (j.success !== false && resp.ok) {
        const content = j.content ?? j.data ?? j.schedules ?? j.appointments ?? j.slots;
        if (content && (Array.isArray(content) ? content.length > 0 : typeof content === "object")) {
          temAgenda = true;
        }
      }
    } catch {
      resumo = text.slice(0, 500);
    }

    return {
      teste,
      endpoint: `${method} ${baseUrl}${path}`,
      metodo: method,
      params: JSON.stringify(queryParams ?? bodyParams ?? {}),
      http_status: resp.status,
      resposta_resumo: resumo,
      tem_agenda: temAgenda,
    };
  } catch (e) {
    return {
      teste,
      endpoint: `${method} ${baseUrl}${path}`,
      metodo: method,
      params: JSON.stringify(queryParams ?? bodyParams ?? {}),
      http_status: null,
      resposta_resumo: `Erro: ${(e as Error).message}`,
      tem_agenda: false,
    };
  }
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

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: u.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    // Body
    const body = await req.json().catch(() => ({}));
    const { medico_id, data_inicio, data_fim, mode = "agenda" } = body as {
      medico_id?: string;
      data_inicio?: string;
      data_fim?: string;
      mode?: "agenda" | "diagnostico";
    };

    if (!medico_id) return json({ error: "medico_id obrigatório" }, 400);

    // Fetch médico
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: medico, error: medicoErr } = await adminClient
      .from("medicos")
      .select("id, nome, feegow_professional_id")
      .eq("id", medico_id)
      .maybeSingle();

    if (medicoErr || !medico) return json({ error: "Médico não encontrado" }, 404);
    if (!medico.feegow_professional_id) {
      return json({ error: "Médico sem vínculo Feegow. Vincule primeiro na tela de Profissionais." }, 400);
    }

    // Feegow config
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    const baseUrl = normalizeFeegowUrl(
      Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api"
    );

    const profId = String(medico.feegow_professional_id);
    const inicio = data_inicio ?? new Date().toISOString().slice(0, 10);
    const fim = data_fim ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // ── Modo diagnóstico: testa múltiplos endpoints ──
    if (mode === "diagnostico") {
      const results: EndpointTest[] = [];

      results.push(await testEndpoint(1, baseUrl, "/appoints/list", "GET", FEEGOW_TOKEN,
        { profissional_id: profId, data_inicio: inicio, data_fim: fim }));

      results.push(await testEndpoint(2, baseUrl, "/appoints/list", "POST", FEEGOW_TOKEN,
        undefined, { profissional_id: Number(profId), data_inicio: inicio, data_fim: fim }));

      results.push(await testEndpoint(3, baseUrl, "/appoints/schedule", "GET", FEEGOW_TOKEN,
        { profissional_id: profId, data: inicio }));

      results.push(await testEndpoint(4, baseUrl, "/professional/schedule", "GET", FEEGOW_TOKEN,
        { profissional_id: profId, data_inicio: inicio, data_fim: fim }));

      results.push(await testEndpoint(5, baseUrl, "/schedule/list", "GET", FEEGOW_TOKEN,
        { profissional_id: profId, data: inicio }));

      results.push(await testEndpoint(6, baseUrl, "/appoints/available-slots", "GET", FEEGOW_TOKEN,
        { profissional_id: profId, data: inicio }));

      const algumOk = results.some(r => r.http_status !== null && r.http_status >= 200 && r.http_status < 300);
      const algumComAgenda = results.some(r => r.tem_agenda);

      let recomendacao = "";
      if (algumComAgenda) {
        const ok = results.find(r => r.tem_agenda)!;
        recomendacao = `Endpoint funcional com agenda: ${ok.endpoint}. Usar este para consultas futuras.`;
      } else if (algumOk) {
        recomendacao = "Alguns endpoints responderam OK mas sem dados de agenda no período. Tente outro período ou verifique se o profissional tem agenda na Feegow.";
      } else {
        recomendacao = "Nenhum endpoint retornou dados. Verifique permissões do token Feegow e se o profissional existe na Feegow.";
      }

      // Log
      await adminClient.from("integracoes_logs").insert({
        integracao: "feegow",
        acao: "diagnostico_agenda_feegow",
        entidade_tipo: "medico",
        entidade_id_interno: medico_id,
        entidade_id_externo: profId,
        payload_resposta: { mode: "diagnostico", testes: results.length, algum_ok: algumOk, algum_com_agenda: algumComAgenda },
        status: algumOk ? "sucesso" : "erro",
        erro: algumOk ? null : recomendacao,
        origem: "admin_ui",
        user_id: u.user.id,
        duracao_ms: Date.now() - start,
      });

      return json({
        ok: algumOk,
        medico: { id: medico.id, nome: medico.nome, feegow_professional_id: profId },
        periodo: { inicio, fim },
        testes: results,
        recomendacao,
      });
    }

    // ── Modo agenda: tenta endpoints em ordem de prioridade ──
    const endpointsToTry = [
      { path: "/appoints/list", method: "GET" as const, params: { profissional_id: profId, data_inicio: inicio, data_fim: fim } },
      { path: "/appoints/schedule", method: "GET" as const, params: { profissional_id: profId, data: inicio } },
      { path: "/professional/schedule", method: "GET" as const, params: { profissional_id: profId, data_inicio: inicio, data_fim: fim } },
      { path: "/schedule/list", method: "GET" as const, params: { profissional_id: profId, data: inicio } },
      { path: "/appoints/available-slots", method: "GET" as const, params: { profissional_id: profId, data: inicio } },
    ];

    let agendaData: unknown = null;
    let endpointUsado = "";
    let httpStatus = 0;

    for (const ep of endpointsToTry) {
      const qs = new URLSearchParams(ep.params).toString();
      const url = `${baseUrl}${ep.path}?${qs}`;
      try {
        const resp = await fetch(url, {
          method: ep.method,
          headers: { "x-access-token": FEEGOW_TOKEN },
        });
        httpStatus = resp.status;
        const text = await resp.text();

        if (resp.ok) {
          try {
            const j = JSON.parse(text);
            if (j.success !== false) {
              const content = j.content ?? j.data ?? j.schedules ?? j.appointments ?? j.slots ?? j;
              agendaData = content;
              endpointUsado = `${ep.method} ${ep.path}`;
              break;
            }
          } catch {
            // not JSON, continue
          }
        }
      } catch {
        // network error, try next
      }
    }

    // Normalize agenda items
    let eventos: Array<Record<string, unknown>> = [];
    if (agendaData) {
      if (Array.isArray(agendaData)) {
        eventos = agendaData.map((item: Record<string, unknown>) => ({
          data: item.data ?? item.date ?? item.appointment_date ?? null,
          horario: item.horario ?? item.hora ?? item.time ?? item.hour ?? item.start_time ?? null,
          horario_fim: item.horario_fim ?? item.end_time ?? null,
          status: item.status ?? item.status_name ?? item.appointment_status ?? null,
          status_id: item.status_id ?? item.appointment_status_id ?? null,
          paciente_nome: item.paciente_nome ?? item.patient_name ?? item.nome_paciente ?? null,
          especialidade: item.especialidade ?? item.specialty_name ?? item.especialidade_nome ?? null,
          procedimento: item.procedimento ?? item.procedure_name ?? null,
          feegow_appointment_id: item.agendamento_id ?? item.appointment_id ?? item.id ?? null,
          raw: item,
        }));
      } else if (typeof agendaData === "object" && agendaData !== null) {
        // Could be date-keyed object
        for (const [dateKey, val] of Object.entries(agendaData as Record<string, unknown>)) {
          if (Array.isArray(val)) {
            for (const item of val) {
              eventos.push({
                data: item.data ?? item.date ?? dateKey,
                horario: item.horario ?? item.hora ?? item.time ?? item.hour ?? item.start_time ?? null,
                horario_fim: item.horario_fim ?? item.end_time ?? null,
                status: item.status ?? item.status_name ?? null,
                paciente_nome: item.paciente_nome ?? item.patient_name ?? null,
                especialidade: item.especialidade ?? item.specialty_name ?? null,
                feegow_appointment_id: item.agendamento_id ?? item.appointment_id ?? item.id ?? null,
                raw: item,
              });
            }
          }
        }
      }
    }

    // Log
    await adminClient.from("integracoes_logs").insert({
      integracao: "feegow",
      acao: "consultar_agenda_feegow",
      entidade_tipo: "medico",
      entidade_id_interno: medico_id,
      entidade_id_externo: profId,
      payload_resposta: {
        endpoint_usado: endpointUsado || "nenhum",
        total_eventos: eventos.length,
        periodo: { inicio, fim },
      },
      status: endpointUsado ? "sucesso" : "erro",
      erro: endpointUsado ? null : `Nenhum endpoint retornou dados. Último HTTP: ${httpStatus}`,
      origem: "admin_ui",
      user_id: u.user.id,
      duracao_ms: Date.now() - start,
    });

    if (!endpointUsado) {
      return json({
        ok: false,
        error: "Nenhum endpoint Feegow retornou dados de agenda. Execute o modo diagnóstico para mais detalhes.",
        medico: { id: medico.id, nome: medico.nome },
        periodo: { inicio, fim },
      });
    }

    return json({
      ok: true,
      medico: { id: medico.id, nome: medico.nome, feegow_professional_id: profId },
      periodo: { inicio, fim },
      endpoint_usado: endpointUsado,
      total_eventos: eventos.length,
      eventos,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
