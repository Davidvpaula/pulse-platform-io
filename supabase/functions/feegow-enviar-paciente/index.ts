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

    // ── MODO TESTE UNITÁRIO ──
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

      // Passo 0: Listar origens disponíveis
      try {
        const origResp = await fetch(`${FEEGOW_URL}/patient/list-origins`, {
          method: "GET",
          headers: { "x-access-token": FEEGOW_TOKEN },
        });
        const origData = await origResp.json().catch(() => null);
        passos.push({
          passo: 0,
          descricao: "Listar origens de paciente",
          endpoint: `GET /patient/list-origins`,
          http_status: origResp.status,
          resposta_resumo: origData ? JSON.stringify(origData).slice(0, 400) : "sem body",
        });
      } catch (e) {
        passos.push({ passo: 0, descricao: "Listar origens", erro: (e as Error).message });
      }

      // Tentativas de criação com variações
      const sexoId = pac.sexo === "masculino" ? 1 : pac.sexo === "feminino" ? 2 : 0;

      // Payload baseado nos campos que /patient/list retorna
      const payloadA = { nome: pac.nome_completo, cpf: cpfLimpo, data_nascimento: pac.data_nascimento ?? "", sexo_id: sexoId, celular };
      // Payload com mais campos
      const payloadB = { nome: pac.nome_completo, cpf: cpfLimpo, nascimento: pac.data_nascimento ?? "", sexo_id: sexoId, celular, tabela_id: 0 };

      const tentativas = [
        {
          label: "/patient/store — sexo_id + data_nascimento",
          endpoint: "/patient/store",
          contentType: "application/json",
          bodyStr: JSON.stringify(payloadA),
        },
        {
          label: "/patient/store — sexo_id + nascimento + tabela_id",
          endpoint: "/patient/store",
          contentType: "application/json",
          bodyStr: JSON.stringify(payloadB),
        },
        {
          label: "/patient/store — form-urlencoded + sexo_id",
          endpoint: "/patient/store",
          contentType: "application/x-www-form-urlencoded",
          bodyStr: new URLSearchParams(payloadA as unknown as Record<string, string>).toString(),
        },
      ];

      let feegowId: string | null = null;
      let tentativaOk: string | null = null;

      for (let i = 0; i < tentativas.length; i++) {
        const t = tentativas[i];
        const resp = await fetch(`${FEEGOW_URL}${t.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": t.contentType,
            "x-access-token": FEEGOW_TOKEN,
          },
          body: t.bodyStr,
        });
        const data = await resp.json().catch(() => null);
        const id = extractFeegowId(data);

        passos.push({
          passo: i + 1,
          descricao: `Tentativa: ${t.label}`,
          endpoint: `POST ${t.endpoint}`,
          http_status: resp.status,
          sucesso: resp.ok,
          feegow_paciente_id: id,
          resposta_resumo: data ? JSON.stringify(data).slice(0, 500) : "sem body",
          payload_enviado: t.bodyStr.slice(0, 200),
          content_type: t.contentType,
        });

        if (resp.ok && id) {
          feegowId = id;
          tentativaOk = t.label;
          break;
        }
        // Se deu 200 sem id, talvez criou mas com formato diferente
        if (resp.ok && !id) {
          // Tentar buscar por CPF para pegar o ID
          const searchResp = await fetch(`${FEEGOW_URL}/patient/list?cpf=${cpfLimpo}&limit=1`, {
            method: "GET",
            headers: { "x-access-token": FEEGOW_TOKEN },
          });
          const searchData = await searchResp.json().catch(() => null);
          if (searchResp.ok && Array.isArray(searchData?.content) && searchData.content.length > 0) {
            const found = searchData.content[0];
            feegowId = String(found.paciente_id ?? found.id);
            tentativaOk = t.label + " (ID via busca CPF)";
            passos.push({
              passo: i + 1.5,
              descricao: "Busca CPF fallback para obter ID",
              http_status: searchResp.status,
              feegow_paciente_id: feegowId,
            });
            break;
          }
        }
      }

      // Se nenhuma tentativa funcionou
      if (!feegowId) {
        relatorio.ok = false;
        relatorio.erro = "Nenhuma variação criou o paciente. Analise os passos.";
        return json(relatorio);
      }

      relatorio.tentativa_que_funcionou = tentativaOk;

      // Busca de confirmação
      const searchResp = await fetch(`${FEEGOW_URL}/patient/list?cpf=${cpfLimpo}&limit=5`, {
        method: "GET",
        headers: { "x-access-token": FEEGOW_TOKEN },
      });
      const searchData = await searchResp.json().catch(() => null);

      const encontrado = searchResp.ok && Array.isArray(searchData?.content)
        ? searchData.content.find((p: Record<string, unknown>) =>
            String(p.paciente_id) === feegowId || String(p.id) === feegowId
          )
        : null;

      passos.push({
        passo: tentativas.length + 1,
        descricao: "Confirmar paciente por CPF na Feegow",
        endpoint: `GET /patient/list?cpf=***`,
        http_status: searchResp.status,
        paciente_encontrado: !!encontrado,
        feegow_paciente_id_confirmado: encontrado ? (encontrado as Record<string, unknown>).paciente_id ?? (encontrado as Record<string, unknown>).id : null,
        resposta_resumo: searchData ? JSON.stringify(searchData).slice(0, 500) : "sem body",
      });

      // Persistência local
      const { error: upErr } = await admin.from("pacientes").update({
        feegow_status: "liberado",
        feegow_paciente_id: feegowId,
        feegow_ultimo_envio_em: new Date().toISOString(),
        feegow_erro: null,
      }).eq("id", paciente_id);

      passos.push({
        passo: tentativas.length + 2,
        descricao: "Salvar feegow_paciente_id no banco local",
        sucesso: !upErr,
        feegow_paciente_id_salvo: feegowId,
        erro: upErr?.message ?? null,
      });

      relatorio.ok = !upErr;
      relatorio.feegow_paciente_id = feegowId;

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
