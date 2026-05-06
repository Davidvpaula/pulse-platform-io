// Edge function: enviar paciente à API Feegow
// Secrets: FEEGOW_API_TOKEN, FEEGOW_BASE_URL
// Endpoints: POST /patient/store, GET /patient/list
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizeFeegowUrl(raw: string): string {
  let url = raw;
  if (!url.startsWith("http")) url = `https://${url}`;
  url = url.replace("://www.api.feegow.com", "://api.feegow.com");
  if (url.endsWith("/")) url = url.slice(0, -1);
  if (!url.endsWith("/api")) url = url + "/api";
  return url;
}

function maskToken(token: string): string {
  if (token.length <= 14) return "***";
  return token.slice(0, 10) + "..." + token.slice(-4);
}

function extractFeegowId(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const content = data.content as Record<string, unknown> | undefined;
  const id = content?.paciente_id ?? content?.id ?? data.paciente_id ?? data.id ?? null;
  return id ? String(id) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    const FEEGOW_URL = normalizeFeegowUrl(
      Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api"
    );

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Usuário inválido" }, 401);

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) {
      const { data: isSec } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "secretaria" });
      const { data: isSup } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "supervisor" });
      if (!isSec && !isSup) return json({ error: "Sem permissão" }, 403);
    }

    const body = await req.json();
    const { paciente_id, mode } = body;
    if (!paciente_id) return json({ error: "paciente_id obrigatório" }, 400);

    if (!FEEGOW_TOKEN) {
      return json({ ok: false, error: "FEEGOW_API_TOKEN não configurado" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: pac, error: pacErr } = await admin
      .from("pacientes")
      .select("*")
      .eq("id", paciente_id)
      .single();
    if (pacErr || !pac) return json({ error: "Paciente não encontrado" }, 404);

    const cpfLimpo = pac.cpf?.replace(/\D/g, "") ?? "";
    const genero = pac.sexo === "masculino" ? "M" : pac.sexo === "feminino" ? "F" : "";
    const celular = pac.telefone?.replace(/\D/g, "") ?? "";

    // ── MODO TESTE UNITÁRIO — DIAGNÓSTICO COMPLETO ──
    if (mode === "teste_unitario") {
      const passos: Record<string, unknown>[] = [];
      const relatorio: Record<string, unknown> = {
        token_mascarado: maskToken(FEEGOW_TOKEN),
        url_base: FEEGOW_URL,
        paciente_local: {
          id: pac.id,
          nome_completo: pac.nome_completo,
          cpf_mascarado: cpfLimpo.slice(0, 3) + "***" + cpfLimpo.slice(-2),
        },
        passos,
      };

      // Helper: fetch com captura completa
      async function feegowReq(
        label: string,
        method: string,
        endpoint: string,
        contentType?: string,
        bodyStr?: string,
      ): Promise<{ status: number; ok: boolean; body: unknown; headers: Record<string, string>; bodyRaw: string }> {
        const hdrs: Record<string, string> = { "x-access-token": FEEGOW_TOKEN! };
        if (contentType) hdrs["Content-Type"] = contentType;
        const opts: RequestInit = { method, headers: hdrs };
        if (bodyStr) opts.body = bodyStr;

        const resp = await fetch(`${FEEGOW_URL}${endpoint}`, opts);
        const respHeaders: Record<string, string> = {};
        resp.headers.forEach((v, k) => { respHeaders[k] = v; });
        const bodyRaw = await resp.text();
        let bodyParsed: unknown = bodyRaw;
        try { bodyParsed = JSON.parse(bodyRaw); } catch { /* keep raw */ }

        return { status: resp.status, ok: resp.ok, body: bodyParsed, headers: respHeaders, bodyRaw };
      }

      // ═══ BLOCO 1 — Auditoria da resposta 422 ═══
      {
        const payloadAtual = { nome: pac.nome_completo, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "", sexo_id: pac.sexo === "masculino" ? 1 : pac.sexo === "feminino" ? 2 : 0, celular };
        const bodyStr = JSON.stringify(payloadAtual);

        for (const ep of ["/patient/store", "/patient/new-patient"]) {
          const r = await feegowReq(`BLOCO1: POST ${ep}`, "POST", ep, "application/json", bodyStr);
          passos.push({
            bloco: 1,
            descricao: `Auditoria POST ${ep} com payload atual`,
            endpoint: `POST ${ep}`,
            payload_enviado: payloadAtual,
            http_status: r.status,
            response_headers: r.headers,
            response_body_raw: r.bodyRaw,
            response_body_parsed: r.body,
            content_type_resposta: r.headers["content-type"] ?? null,
          });
        }
      }

      // ═══ BLOCO 2 — Descobrir endpoint oficial REAL ═══
      {
        const endpoints = ["/patient/store", "/patient/new-patient", "/patient/create", "/patient/insert"];
        const minPayload = JSON.stringify({ nome: "TESTE API", cpf: "00000000000" });

        for (const ep of endpoints) {
          const r = await feegowReq(`BLOCO2: POST ${ep}`, "POST", ep, "application/json", minPayload);
          passos.push({
            bloco: 2,
            descricao: `Teste endpoint POST ${ep} (payload mínimo)`,
            endpoint: `POST ${ep}`,
            http_status: r.status,
            response_body: r.body,
            response_body_raw: r.bodyRaw,
          });
        }
      }

      // ═══ BLOCO 3 — Campos obrigatórios da instância ═══
      {
        const discoveryEndpoints = [
          { label: "Origens de paciente", ep: "/patient/list-origins" },
          { label: "Tabelas particulares (patient)", ep: "/patient/list-private-tables" },
          { label: "Tabelas particulares (financial)", ep: "/financial/list-private-tables" },
          { label: "Paciente existente (amostra)", ep: "/patient/list?limit=1" },
        ];

        for (const d of discoveryEndpoints) {
          const r = await feegowReq(`BLOCO3: GET ${d.ep}`, "GET", d.ep);
          passos.push({
            bloco: 3,
            descricao: d.label,
            endpoint: `GET ${d.ep}`,
            http_status: r.status,
            response_body: r.body,
            response_body_raw: r.bodyRaw,
          });
        }
      }

      // ═══ BLOCO 4 — Payload progressivo ═══
      {
        const nome = pac.nome_completo ?? "TESTE DIAGNOSTICO";
        const sexoId = pac.sexo === "masculino" ? 1 : pac.sexo === "feminino" ? 2 : 0;

        // /patient/create exige nome_completo + nome_paciente
        const nomePaciente = nome.split(" ")[0]; // primeiro nome

        const payloads = [
          { label: "create: nome_completo + nome_paciente", ep: "/patient/create", data: { nome_completo: nome, nome_paciente: nomePaciente, cpf: cpfLimpo } },
          { label: "create: + nascimento + sexo_id", ep: "/patient/create", data: { nome_completo: nome, nome_paciente: nomePaciente, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "1990-01-01", sexo_id: sexoId } },
          { label: "create: + celular + genero", ep: "/patient/create", data: { nome_completo: nome, nome_paciente: nomePaciente, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "1990-01-01", sexo_id: sexoId, celular, genero } },
          { label: "create: completo com tabela_id e origem_id", ep: "/patient/create", data: { nome_completo: nome, nome_paciente: nomePaciente, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "1990-01-01", sexo_id: sexoId, celular, genero, tabela_id: 0, origem_id: 1 } },
          { label: "store: nome_completo + nome_paciente", ep: "/patient/store", data: { nome_completo: nome, nome_paciente: nomePaciente, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "1990-01-01", sexo_id: sexoId, celular, genero } },
        ];

        // Testar cada payload
        let feegowId: string | null = null;
        let payloadVencedor: string | null = null;

        for (const p of payloads) {
          if (feegowId) break;
          const bodyStr = JSON.stringify(p.data);
          const r = await feegowReq(`BLOCO4: ${p.label}`, "POST", p.ep, "application/json", bodyStr);
          const id = extractFeegowId(r.body as Record<string, unknown> | null);

          passos.push({
            bloco: 4,
            descricao: `POST ${p.ep} — ${p.label}`,
            content_type: "application/json",
            payload_enviado: p.data,
            http_status: r.status,
            sucesso: r.ok,
            feegow_id: id,
            response_body: r.body,
            response_body_raw: r.bodyRaw,
          });

          if (r.ok && id) {
            feegowId = id;
            payloadVencedor = p.label;
          }
        }

        // Se nenhum JSON funcionou, tentar form-urlencoded com payload completo
        if (!feegowId) {
          const formData = { nome, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "1990-01-01", genero, celular, sexo_id: String(pac.sexo === "masculino" ? 1 : pac.sexo === "feminino" ? 2 : 0), tabela_id: "0", origem_id: "1" };
          const bodyStr = new URLSearchParams(formData).toString();
          const r = await feegowReq("BLOCO4: form-urlencoded completo", "POST", "/patient/store", "application/x-www-form-urlencoded", bodyStr);
          const id = extractFeegowId(r.body as Record<string, unknown> | null);

          passos.push({
            bloco: 4,
            descricao: "POST /patient/store — form-urlencoded completo",
            content_type: "application/x-www-form-urlencoded",
            payload_enviado: formData,
            http_status: r.status,
            sucesso: r.ok,
            feegow_id: id,
            response_body: r.body,
            response_body_raw: r.bodyRaw,
          });

          if (r.ok && id) {
            feegowId = id;
            payloadVencedor = "form-urlencoded completo";
          }
        }

        relatorio.bloco4_resultado = feegowId
          ? { sucesso: true, feegow_paciente_id: feegowId, payload_vencedor: payloadVencedor }
          : { sucesso: false, mensagem: "Nenhum payload criou o paciente" };

        // ═══ BLOCO 5 — Teste unitário: busca + persistência ═══
        if (feegowId) {
          // Buscar por CPF
          const searchR = await feegowReq("BLOCO5: Busca CPF", "GET", `/patient/list?cpf=${cpfLimpo}&limit=5`);
          const searchData = searchR.body as Record<string, unknown> | null;
          const encontrado = searchR.ok && Array.isArray((searchData as Record<string, unknown>)?.content)
            ? ((searchData as Record<string, unknown>).content as Record<string, unknown>[]).find(
                (p) => String(p.paciente_id) === feegowId || String(p.id) === feegowId
              )
            : null;

          passos.push({
            bloco: 5,
            descricao: "Busca paciente por CPF para confirmação",
            endpoint: "GET /patient/list?cpf=***",
            http_status: searchR.status,
            paciente_encontrado: !!encontrado,
            feegow_paciente_id_confirmado: encontrado ? ((encontrado as Record<string, unknown>).paciente_id ?? (encontrado as Record<string, unknown>).id) : null,
            response_body: searchR.body,
          });

          // Persistir no banco local
          const { error: upErr } = await admin.from("pacientes").update({
            feegow_status: "liberado",
            feegow_paciente_id: feegowId,
            feegow_ultimo_envio_em: new Date().toISOString(),
            feegow_erro: null,
          }).eq("id", paciente_id);

          passos.push({
            bloco: 5,
            descricao: "Salvar feegow_paciente_id no banco local",
            sucesso: !upErr,
            feegow_paciente_id_salvo: feegowId,
            erro: upErr?.message ?? null,
          });

          relatorio.ok = !upErr;
          relatorio.feegow_paciente_id = feegowId;
        } else {
          relatorio.ok = false;
          relatorio.erro = "Nenhuma combinação de endpoint + payload criou o paciente. Analise os blocos 1-4.";
        }

        // ═══ BLOCO 6 — Relatório final ═══
        relatorio.bloco6_resumo = {
          endpoint_testados: ["/patient/store", "/patient/new-patient", "/patient/create", "/patient/insert"],
          payload_vencedor: payloadVencedor,
          feegow_paciente_id: feegowId,
          total_passos: passos.length,
        };
      }

      return json(relatorio);
    }

    // ── MODO PADRÃO ──
    const payload = {
      nome: pac.nome_completo ?? "",
      cpf: cpfLimpo,
      data_nascimento: pac.data_nascimento ?? "",
      genero,
      celular,
      origem_id: 1,
    };

    const resp = await fetch(`${FEEGOW_URL}/patient/store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": FEEGOW_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const result = await resp.json().catch(() => null);

    if (!resp.ok) {
      await admin.from("pacientes").update({
        feegow_status: "erro",
        feegow_ultimo_envio_em: new Date().toISOString(),
        feegow_erro: JSON.stringify(result).slice(0, 500),
      }).eq("id", paciente_id);

      return json({ ok: false, error: "Erro ao enviar para Feegow", detail: result }, resp.status);
    }

    const feegowId = extractFeegowId(result);

    await admin.from("pacientes").update({
      feegow_status: "liberado",
      feegow_paciente_id: feegowId,
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
