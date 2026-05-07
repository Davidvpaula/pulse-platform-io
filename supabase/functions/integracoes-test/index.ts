// Edge function: testa conectividade com APIs externas (Feegow, WhatsApp)
// Apenas leitura — não envia/cria dados
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

interface TestResult {
  teste: number;
  header_usado: string;
  metodo: string;
  endpoint: string;
  http_status: number | null;
  resposta_resumo: string;
}

async function runFeegowTest(
  teste: number,
  baseUrl: string,
  path: string,
  method: string,
  headerKey: string,
  token: string,
): Promise<TestResult> {
  const endpoint = `${baseUrl}${path}`;
  const headers: Record<string, string> = {};
  
  if (headerKey === "x-access-token") {
    headers["x-access-token"] = token;
  } else if (headerKey === "Authorization: Bearer") {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["Authorization"] = token;
  }

  try {
    const resp = await fetch(endpoint, { method, headers });
    const data = await resp.text();
    let resumo: string;
    try {
      const j = JSON.parse(data);
      resumo = JSON.stringify(j).slice(0, 300);
    } catch {
      resumo = data.slice(0, 300);
    }
    return { teste, header_usado: headerKey, metodo: method, endpoint, http_status: resp.status, resposta_resumo: resumo };
  } catch (e) {
    return { teste, header_usado: headerKey, metodo: method, endpoint, http_status: null, resposta_resumo: `Erro: ${(e as Error).message}` };
  }
}

async function persistTestResult(
  supabaseUrl: string,
  serviceKey: string,
  ok: boolean,
  erro: string | null,
  userId: string,
  detailPayload: unknown,
) {
  const adminClient = createClient(supabaseUrl, serviceKey);

  // Update integracoes_config
  await adminClient
    .from("integracoes_config")
    .update({
      ultimo_teste_at: new Date().toISOString(),
      ultimo_teste_ok: ok,
      ultimo_erro: erro,
      updated_at: new Date().toISOString(),
    })
    .eq("tipo", "feegow");

  // Insert log
  await adminClient.from("integracoes_logs").insert({
    integracao: "feegow",
    acao: "teste_conexao",
    entidade_tipo: null,
    entidade_id_interno: null,
    entidade_id_externo: null,
    payload_envio: null,
    payload_resposta: detailPayload as Record<string, unknown>,
    status: ok ? "success" : "error",
    erro: erro,
    origem: "admin",
    user_id: userId,
    duracao_ms: null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const integration = body.integration ?? "feegow";
    const mode = body.mode ?? "padrao";

    if (integration === "feegow") {
      const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
      const FEEGOW_URL = normalizeFeegowUrl(
        Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api"
      );

      if (!FEEGOW_TOKEN) {
        await persistTestResult(SUPABASE_URL, SERVICE_KEY, false, "FEEGOW_API_TOKEN não configurado", u.user.id, null);
        return json({ ok: false, integration: "feegow", error: "FEEGOW_API_TOKEN não configurado" });
      }

      // --- Modo diagnóstico: testa 6 variações ---
      if (mode === "diagnostico") {
        const results: TestResult[] = [];

        results.push(await runFeegowTest(1, FEEGOW_URL, "/specialties/list", "GET", "x-access-token", FEEGOW_TOKEN));
        results.push(await runFeegowTest(2, FEEGOW_URL, "/specialties/list", "POST", "x-access-token", FEEGOW_TOKEN));
        results.push(await runFeegowTest(3, FEEGOW_URL, "/specialties/list", "GET", "Authorization: Bearer", FEEGOW_TOKEN));
        results.push(await runFeegowTest(4, FEEGOW_URL, "/professional/list?ativo=1", "GET", "x-access-token", FEEGOW_TOKEN));
        results.push(await runFeegowTest(5, FEEGOW_URL, "/patient/list?limit=1", "GET", "x-access-token", FEEGOW_TOKEN));
        results.push(await runFeegowTest(6, FEEGOW_URL, "/patient/list-origins", "GET", "x-access-token", FEEGOW_TOKEN));

        const algumOk = results.some(r => r.http_status !== null && r.http_status >= 200 && r.http_status < 300);
        const todos403 = results.every(r => r.http_status === 403);
        const todos401 = results.every(r => r.http_status === 401);

        let recomendacao = "";
        if (algumOk) {
          const ok = results.find(r => r.http_status! >= 200 && r.http_status! < 300)!;
          recomendacao = `Token válido. Usar header "${ok.header_usado}" com método ${ok.metodo}.`;
        } else if (todos403) {
          recomendacao = "Token recusado em todos os testes (403). Provável: token expirado, inativo ou sem permissão na licença Feegow. Verifique no painel Feegow.";
        } else if (todos401) {
          recomendacao = "Token não reconhecido (401). Verifique se o token foi copiado corretamente, sem espaços ou aspas extras.";
        } else {
          recomendacao = "Resultados mistos. Analise os status individuais para identificar o padrão correto.";
        }

        const responsePayload = {
          ok: algumOk,
          integration: "feegow",
          token_mascarado: maskToken(FEEGOW_TOKEN),
          url_base: FEEGOW_URL,
          testes: results,
          recomendacao,
        };

        // Persist result
        await persistTestResult(
          SUPABASE_URL, SERVICE_KEY, algumOk,
          algumOk ? null : recomendacao,
          u.user.id,
          { mode: "diagnostico", testes_count: results.length, algum_ok: algumOk },
        );

        return json(responsePayload);
      }

      // --- Modo padrão (fluxo original) ---
      const resp = await fetch(`${FEEGOW_URL}/specialties/list`, {
        method: "GET",
        headers: { "x-access-token": FEEGOW_TOKEN },
      });
      const data = await resp.json().catch(() => null);

      const responsePayload = {
        ok: resp.ok,
        integration: "feegow",
        http_status: resp.status,
        token_aceito: resp.ok,
        url_testada: `${FEEGOW_URL}/specialties/list`,
        resposta_resumo: resp.ok
          ? { total_especialidades: Array.isArray(data?.content) ? data.content.length : "formato inesperado" }
          : { erro: data?.message ?? data?.error ?? JSON.stringify(data).slice(0, 300) },
      };

      // Persist result
      await persistTestResult(
        SUPABASE_URL, SERVICE_KEY, resp.ok,
        resp.ok ? null : JSON.stringify(responsePayload.resposta_resumo).slice(0, 500),
        u.user.id,
        { mode: "padrao", http_status: resp.status },
      );

      return json(responsePayload);
    }

    return json({ error: `Integração '${integration}' não suportada para teste` }, 400);
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
