// Edge function: importar documentos médicos da Feegow por CPF
// Secrets: FEEGOW_API_TOKEN, FEEGOW_BASE_URL
// Modo: teste_unitario — diagnóstico controlado
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

function maskCpf(cpf: string): string {
  if (cpf.length < 6) return "***";
  return cpf.slice(0, 3) + "***" + cpf.slice(-2);
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      if (!isSec) return json({ error: "Sem permissão" }, 403);
    }

    const body = await req.json();
    const { paciente_id, mode } = body;
    if (!paciente_id) return json({ error: "paciente_id obrigatório" }, 400);
    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: pac, error: pacErr } = await admin
      .from("pacientes")
      .select("*")
      .eq("id", paciente_id)
      .single();
    if (pacErr || !pac) return json({ error: "Paciente não encontrado" }, 404);

    const cpfLimpo = pac.cpf?.replace(/\D/g, "") ?? "";
    if (!cpfLimpo) return json({ error: "Paciente sem CPF" }, 400);

    // Helper fetch Feegow
    async function feegowReq(
      method: string, endpoint: string, queryParams?: Record<string, string>,
    ): Promise<{ status: number; ok: boolean; body: unknown; bodyRaw: string }> {
      let url = `${FEEGOW_URL}${endpoint}`;
      if (queryParams) {
        const qs = new URLSearchParams(queryParams).toString();
        url += (url.includes("?") ? "&" : "?") + qs;
      }
      const resp = await fetch(url, {
        method,
        headers: { "x-access-token": FEEGOW_TOKEN! },
      });
      const bodyRaw = await resp.text();
      let bodyParsed: unknown = bodyRaw;
      try { bodyParsed = JSON.parse(bodyRaw); } catch { /* raw */ }
      return { status: resp.status, ok: resp.ok, body: bodyParsed, bodyRaw };
    }

    const passos: Record<string, unknown>[] = [];
    const relatorio: Record<string, unknown> = {
      token_mascarado: maskToken(FEEGOW_TOKEN),
      url_base: FEEGOW_URL,
      paciente_local: {
        id: pac.id,
        nome_completo: pac.nome_completo,
        cpf_mascarado: maskCpf(cpfLimpo),
      },
      passos,
    };

    // ═══ BLOCO 1 — Identificar paciente local ═══
    passos.push({
      bloco: 1,
      descricao: "Paciente local encontrado",
      paciente_id: pac.id,
      nome: pac.nome_completo,
      cpf_mascarado: maskCpf(cpfLimpo),
      feegow_paciente_id_existente: pac.feegow_paciente_id ?? null,
    });

    // ═══ BLOCO 2 — Buscar paciente na Feegow por CPF ═══
    const searchR = await feegowReq("GET", "/patient/list", { cpf: cpfLimpo, limit: "5" });
    let feegowPacienteId: string | null = pac.feegow_paciente_id ?? null;
    let feegowPaciente: Record<string, unknown> | null = null;

    if (searchR.ok) {
      const content = (searchR.body as Record<string, unknown>)?.content;
      if (Array.isArray(content) && content.length > 0) {
        feegowPaciente = content[0] as Record<string, unknown>;
        feegowPacienteId = String(feegowPaciente.patient_id ?? feegowPaciente.paciente_id ?? feegowPaciente.id);
      }
    }

    passos.push({
      bloco: 2,
      descricao: "Buscar paciente na Feegow por CPF",
      endpoint: "GET /patient/list?cpf=***",
      http_status: searchR.status,
      paciente_encontrado: !!feegowPaciente,
      feegow_paciente_id: feegowPacienteId,
      feegow_paciente_nome: feegowPaciente?.nome ?? null,
    });

    if (!feegowPaciente) {
      relatorio.ok = false;
      relatorio.erro = "Paciente não encontrado na Feegow pelo CPF informado.";
      return json(relatorio);
    }

    // Salvar feegow_paciente_id se ainda não salvo
    if (!pac.feegow_paciente_id && feegowPacienteId) {
      await admin.from("pacientes").update({
        feegow_paciente_id: feegowPacienteId,
        feegow_status: "liberado",
        feegow_ultimo_envio_em: new Date().toISOString(),
      }).eq("id", paciente_id);

      passos.push({
        bloco: 2,
        descricao: "feegow_paciente_id salvo no banco local",
        feegow_paciente_id: feegowPacienteId,
      });
    }

    // ═══ BLOCO 3 — Descobrir endpoints de documentos ═══
    const docEndpoints = [
      { label: "Laudos do paciente", ep: "/laudos/list", params: { paciente_id: feegowPacienteId! } },
      { label: "Pedidos de exames", ep: "/patient/list-exams", params: { paciente_id: feegowPacienteId! } },
      { label: "Arquivos do prontuário", ep: "/patient/files", params: { paciente_id: feegowPacienteId! } },
      { label: "Documentos do paciente", ep: "/patient/documents", params: { paciente_id: feegowPacienteId! } },
      { label: "Anexos do paciente", ep: "/patient/attachments", params: { paciente_id: feegowPacienteId! } },
      { label: "Prescrições", ep: "/patient/prescriptions", params: { paciente_id: feegowPacienteId! } },
      { label: "Atestados", ep: "/patient/certificates", params: { paciente_id: feegowPacienteId! } },
      { label: "Evolução/Prontuário", ep: "/patient/evolution", params: { paciente_id: feegowPacienteId! } },
      { label: "Prontuário", ep: "/patient/medical-record", params: { paciente_id: feegowPacienteId! } },
      { label: "Laudos por arquivo", ep: "/laudos/file", params: { paciente_id: feegowPacienteId! } },
      { label: "Laudo view", ep: "/laudos/view", params: { paciente_id: feegowPacienteId! } },
      { label: "Pedidos exame (exam-requests)", ep: "/patient/exam-requests", params: { paciente_id: feegowPacienteId! } },
      { label: "Receitas (recipes)", ep: "/patient/recipes", params: { paciente_id: feegowPacienteId! } },
    ];

    const endpointsComDados: { label: string; ep: string; status: number; body: unknown }[] = [];

    for (const d of docEndpoints) {
      const r = await feegowReq("GET", d.ep, d.params);
      const temDados = r.ok && r.bodyRaw.length > 50;
      passos.push({
        bloco: 3,
        descricao: d.label,
        endpoint: `GET ${d.ep}`,
        http_status: r.status,
        tem_dados: temDados,
        response_body: r.body,
      });

      if (temDados) {
        endpointsComDados.push({ label: d.label, ep: d.ep, status: r.status, body: r.body });
      }
    }

    relatorio.endpoints_com_dados = endpointsComDados.map(e => ({
      label: e.label,
      endpoint: e.ep,
      status: e.status,
    }));

    // ═══ BLOCO 4 — Importação controlada (máx 3 docs) ═══
    // Será implementado após confirmar quais endpoints retornaram dados
    const documentosImportados: Record<string, unknown>[] = [];

    // Tentar extrair documentos dos endpoints que funcionaram
    for (const ep of endpointsComDados) {
      if (documentosImportados.length >= 3) break;

      const data = ep.body as Record<string, unknown>;
      const content = data?.content;

      // Extrair items (pode ser array ou objeto com sub-arrays)
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(content)) {
        items = content as Record<string, unknown>[];
      } else if (content && typeof content === "object") {
        // Tentar encontrar arrays dentro do content
        for (const val of Object.values(content as Record<string, unknown>)) {
          if (Array.isArray(val)) {
            items = val as Record<string, unknown>[];
            break;
          }
        }
      }

      for (const item of items) {
        if (documentosImportados.length >= 3) break;

        const feegowDocId = String(item.id ?? item.laudo_id ?? item.documento_id ?? item.exame_id ?? item.receita_id ?? `${ep.ep}-${documentosImportados.length}`);

        // Check duplicidade
        const { data: existing } = await admin
          .from("documentos_paciente")
          .select("id")
          .eq("paciente_id", paciente_id)
          .eq("descricao", `feegow:${feegowDocId}`)
          .limit(1);

        if (existing && existing.length > 0) {
          passos.push({
            bloco: 4,
            descricao: `Documento feegow:${feegowDocId} já existe, pulando`,
            duplicado: true,
          });
          continue;
        }

        // Determinar tipo
        let tipo: string = "outro";
        if (ep.ep.includes("laudos")) tipo = "laudo";
        else if (ep.ep.includes("exam")) tipo = "exame";
        else if (ep.ep.includes("presc") || ep.ep.includes("recip")) tipo = "receita";

        // Determinar título
        const titulo = String(
          item.titulo ?? item.nome ?? item.descricao ?? item.tipo ?? item.nome_exame ?? `${ep.label} #${feegowDocId}`
        );

        // Data
        const dataEmissao = String(item.data ?? item.criado_em ?? item.created_at ?? item.data_emissao ?? new Date().toISOString());

        // Metadados (resposta original resumida, sem dados sensíveis)
        const metadados = JSON.stringify(item).slice(0, 1000);

        // Inserir no banco
        const { data: inserted, error: insErr } = await admin
          .from("documentos_paciente")
          .insert({
            paciente_id: paciente_id,
            user_id: pac.user_id,
            tipo,
            titulo: titulo.slice(0, 255),
            descricao: `feegow:${feegowDocId}`,
            storage_path: `feegow-ref/${feegowDocId}`,
            mime_type: "application/feegow-reference",
            visibilidade_empresa: false,
          })
          .select("id")
          .single();

        if (insErr) {
          passos.push({
            bloco: 4,
            descricao: `Erro ao salvar documento feegow:${feegowDocId}`,
            erro: insErr.message,
          });
        } else {
          documentosImportados.push({
            id_local: inserted?.id,
            feegow_doc_id: feegowDocId,
            tipo,
            titulo,
            origem: ep.label,
            endpoint: ep.ep,
          });

          passos.push({
            bloco: 4,
            descricao: `Documento importado: ${titulo}`,
            id_local: inserted?.id,
            feegow_doc_id: feegowDocId,
            tipo,
          });
        }
      }
    }

    // ═══ BLOCO 5-7 — Resumo ═══
    relatorio.ok = true;
    relatorio.documentos_importados = documentosImportados;
    relatorio.total_importados = documentosImportados.length;
    relatorio.bloco6_resumo = {
      paciente_local: pac.id,
      cpf_mascarado: maskCpf(cpfLimpo),
      feegow_paciente_id: feegowPacienteId,
      endpoints_testados: docEndpoints.length,
      endpoints_com_dados: endpointsComDados.length,
      documentos_encontrados: endpointsComDados.reduce((s, e) => {
        const c = (e.body as Record<string, unknown>)?.content;
        return s + (Array.isArray(c) ? c.length : 0);
      }, 0),
      documentos_importados: documentosImportados.length,
      tabela_local: "documentos_paciente",
      rota_paciente: "/app/paciente/documentos",
    };

    return json(relatorio);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
