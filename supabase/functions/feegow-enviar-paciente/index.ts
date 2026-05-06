// Edge function preparada para enviar paciente à API Feegow
// Secrets necessários: FEEGOW_API_TOKEN, FEEGOW_BASE_URL
// Endpoints Feegow: POST /patient/store, GET /patient/list
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

    // Apenas admin/secretaria/supervisor
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

    // Busca paciente local
    const { data: pac, error: pacErr } = await admin
      .from("pacientes")
      .select("*")
      .eq("id", paciente_id)
      .single();
    if (pacErr || !pac) return json({ error: "Paciente não encontrado" }, 404);

    // Monta payload Feegow (nomes de campos conforme docs oficiais)
    const cpfLimpo = pac.cpf?.replace(/\D/g, "") ?? "";
    // Campos conforme docs Feegow: "nome" (obrigatório), "cpf" (obrigatório)
    // data_nascimento YYYY-MM-DD, genero M/F, celular, origem_id
    const payload: Record<string, unknown> = {
      nome: pac.nome_completo ?? "",
      cpf: cpfLimpo,
      data_nascimento: pac.data_nascimento ?? "",
      genero: pac.sexo === "masculino" ? "M" : pac.sexo === "feminino" ? "F" : "",
      celular: pac.telefone?.replace(/\D/g, "") ?? "",
      origem_id: 1, // Origem padrão
    };

    // ── MODO TESTE UNITÁRIO ──
    if (mode === "teste_unitario") {
      const relatorio: Record<string, unknown> = {
        token_mascarado: maskToken(FEEGOW_TOKEN),
        url_base: FEEGOW_URL,
        paciente_local: {
          id: pac.id,
          nome_completo: pac.nome_completo,
          cpf_mascarado: cpfLimpo.slice(0, 3) + "***" + cpfLimpo.slice(-2),
        },
        passos: [],
      };
      const passos = relatorio.passos as Record<string, unknown>[];

      // Passo 0: Listar origens disponíveis
      let origensResp: Response | null = null;
      try {
        origensResp = await fetch(`${FEEGOW_URL}/patient/list-origins`, {
          method: "GET",
          headers: { "x-access-token": FEEGOW_TOKEN },
        });
        const origensData = await origensResp.json().catch(() => null);
        passos.push({
          passo: 0,
          descricao: "Listar origens de paciente na Feegow",
          endpoint: `GET ${FEEGOW_URL}/patient/list-origins`,
          http_status: origensResp.status,
          resposta_resumo: origensData ? JSON.stringify(origensData).slice(0, 500) : "sem body",
        });
      } catch (e) {
        passos.push({ passo: 0, descricao: "Listar origens", erro: (e as Error).message });
      }

      // Tentar 3 variações de endpoint/payload
      const tentativas = [
        {
          label: "/patient/store com nome + cpf + origem_id",
          endpoint: "/patient/store",
          body: payload,
        },
        {
          label: "/patient/store com nome_completo + cpf",
          endpoint: "/patient/store",
          body: { ...payload, nome: undefined, nome_completo: pac.nome_completo },
        },
        {
          label: "/patient/new-patient com nome + cpf",
          endpoint: "/patient/new-patient",
          body: payload,
        },
      ];

      let feegowId: string | number | null = null;
      let tentativaOk: string | null = null;

      for (let i = 0; i < tentativas.length; i++) {
        const t = tentativas[i];
        const createResp = await fetch(`${FEEGOW_URL}${t.endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": FEEGOW_TOKEN,
          },
          body: JSON.stringify(t.body),
        });
        const createData = await createResp.json().catch(() => null);
        const createText = createData ? JSON.stringify(createData).slice(0, 500) : "sem body";

        const id = createData?.content?.paciente_id
          ?? createData?.content?.id
          ?? createData?.paciente_id
          ?? createData?.id
          ?? null;

        passos.push({
          passo: i + 1,
          descricao: `Tentativa: ${t.label}`,
          endpoint: `POST ${FEEGOW_URL}${t.endpoint}`,
          http_status: createResp.status,
          sucesso: createResp.ok,
          feegow_paciente_id: id,
          resposta_resumo: createText,
          payload_mascarado: { ...t.body, cpf: cpfLimpo.slice(0, 3) + "***" + cpfLimpo.slice(-2) },
        });

        if (createResp.ok && id) {
          feegowId = id;
          tentativaOk = t.label;
          break; // Parar no primeiro sucesso
        }
      }
      const createData = await createResp.json().catch(() => null);
      const createText = createData ? JSON.stringify(createData).slice(0, 500) : "sem body";

      const feegowId = createData?.content?.paciente_id
        ?? createData?.content?.id
        ?? createData?.paciente_id
        ?? createData?.id
        ?? null;

      passos.push({
        passo: 1,
        descricao: "Criar paciente na Feegow",
        endpoint: `POST ${FEEGOW_URL}/patient/store`,
        http_status: createResp.status,
        sucesso: createResp.ok,
        feegow_paciente_id: feegowId,
        resposta_resumo: createText,
      });

      // Se o passo 1 falhou, retorna o relatório sem continuar
      if (!createResp.ok) {
        relatorio.ok = false;
        relatorio.erro = "Falha na criação do paciente na Feegow. Resposta exata no passo 1.";
        return json(relatorio);
      }

      // Passo 2: Buscar paciente por CPF para confirmar
      const searchResp = await fetch(
        `${FEEGOW_URL}/patient/list?cpf=${cpfLimpo}&limit=5`,
        {
          method: "GET",
          headers: { "x-access-token": FEEGOW_TOKEN },
        }
      );
      const searchData = await searchResp.json().catch(() => null);
      const searchText = searchData ? JSON.stringify(searchData).slice(0, 500) : "sem body";

      const encontrado = searchResp.ok && Array.isArray(searchData?.content)
        ? searchData.content.find((p: Record<string, unknown>) =>
            String(p.paciente_id) === String(feegowId) || String(p.id) === String(feegowId)
          )
        : null;

      passos.push({
        passo: 2,
        descricao: "Buscar paciente por CPF na Feegow",
        endpoint: `GET ${FEEGOW_URL}/patient/list?cpf=***`,
        http_status: searchResp.status,
        sucesso: searchResp.ok,
        paciente_encontrado: !!encontrado,
        feegow_paciente_id_confirmado: encontrado?.paciente_id ?? encontrado?.id ?? null,
        resposta_resumo: searchText,
      });

      // Passo 3: Salvar feegow_paciente_id no banco local
      let dbSalvo = false;
      let dbErro: string | null = null;
      if (feegowId) {
        const { error: upErr } = await admin.from("pacientes").update({
          feegow_status: "liberado",
          feegow_paciente_id: String(feegowId),
          feegow_ultimo_envio_em: new Date().toISOString(),
          feegow_erro: null,
        }).eq("id", paciente_id);

        dbSalvo = !upErr;
        dbErro = upErr?.message ?? null;
      }

      passos.push({
        passo: 3,
        descricao: "Salvar feegow_paciente_id no banco local",
        sucesso: dbSalvo,
        feegow_paciente_id_salvo: feegowId ? String(feegowId) : null,
        erro: dbErro,
      });

      relatorio.ok = createResp.ok && dbSalvo;
      relatorio.feegow_paciente_id = feegowId;

      return json(relatorio);
    }

    // ── MODO PADRÃO (envio unitário normal) ──
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

    const feegowId = result?.content?.paciente_id
      ?? result?.content?.id
      ?? result?.paciente_id
      ?? result?.id
      ?? null;

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
