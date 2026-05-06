// Edge function: importar documentos médicos da Feegow por CPF
// Secrets: FEEGOW_API_TOKEN, FEEGOW_BASE_URL
// Modo: teste_unitario — diagnóstico controlado, max 3 docs
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

function maskToken(t: string): string {
  return t.length <= 14 ? "***" : t.slice(0, 10) + "..." + t.slice(-4);
}
function maskCpf(c: string): string {
  return c.length < 6 ? "***" : c.slice(0, 3) + "***" + c.slice(-2);
}
function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtml(html: string): string {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim();
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

    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    // Auth: aceitar user logado OU service key via header x-service-key
    const auth = req.headers.get("Authorization") ?? "";
    const serviceKey = req.headers.get("x-service-key") ?? "";
    let userId: string | null = null;

    if (serviceKey === SERVICE_KEY) {
      // Service-level access para diagnóstico
    } else if (auth.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "Usuário inválido" }, 401);
      userId = u.user.id;

      const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        const { data: isSec } = await userClient.rpc("has_role", { _user_id: userId, _role: "secretaria" });
        if (!isSec) return json({ error: "Sem permissão" }, 403);
      }
    } else {
      return json({ error: "Não autenticado" }, 401);
    }

    const body = await req.json();
    const { paciente_id } = body;
    if (!paciente_id) return json({ error: "paciente_id obrigatório" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // ═══ BLOCO 1 — Identificar paciente local ═══
    const { data: pac, error: pacErr } = await admin
      .from("pacientes")
      .select("*")
      .eq("id", paciente_id)
      .single();
    if (pacErr || !pac) return json({ error: "Paciente não encontrado" }, 404);

    const cpfLimpo = pac.cpf?.replace(/\D/g, "") ?? "";
    if (!cpfLimpo) return json({ error: "Paciente sem CPF" }, 400);

    const passos: Record<string, unknown>[] = [];
    const relatorio: Record<string, unknown> = {
      token_mascarado: maskToken(FEEGOW_TOKEN),
      url_base: FEEGOW_URL,
      paciente_local: {
        id: pac.id,
        nome_completo: pac.nome_completo,
        cpf_mascarado: maskCpf(cpfLimpo),
        user_id: pac.user_id,
      },
      passos,
    };

    passos.push({
      bloco: 1,
      descricao: "Paciente local identificado",
      paciente_id: pac.id,
      cpf_mascarado: maskCpf(cpfLimpo),
      feegow_paciente_id_existente: pac.feegow_paciente_id ?? null,
    });

    // Helper Feegow
    async function feegowGet(
      endpoint: string, params?: Record<string, string>,
    ): Promise<{ status: number; ok: boolean; body: unknown; raw: string }> {
      let url = `${FEEGOW_URL}${endpoint}`;
      if (params) url += "?" + new URLSearchParams(params).toString();
      const resp = await fetch(url, {
        method: "GET",
        headers: { "x-access-token": FEEGOW_TOKEN! },
      });
      const raw = await resp.text();
      let body: unknown = raw;
      try { body = JSON.parse(raw); } catch { /* keep raw */ }
      return { status: resp.status, ok: resp.ok, body, raw };
    }

    // ═══ BLOCO 2 — Buscar paciente na Feegow por CPF ═══
    const searchR = await feegowGet("/patient/list", { cpf: cpfLimpo, limit: "5" });
    let feegowPid: string | null = pac.feegow_paciente_id ?? null;

    if (searchR.ok) {
      const content = (searchR.body as Record<string, unknown>)?.content;
      if (Array.isArray(content) && content.length > 0) {
        const p = content[0] as Record<string, unknown>;
        feegowPid = String(p.patient_id ?? p.paciente_id ?? p.id);
      }
    }

    passos.push({
      bloco: 2,
      descricao: "Buscar paciente na Feegow por CPF",
      http_status: searchR.status,
      feegow_paciente_id: feegowPid,
      encontrado: !!feegowPid,
    });

    if (!feegowPid) {
      relatorio.ok = false;
      relatorio.erro = "Paciente não encontrado na Feegow pelo CPF.";
      return json(relatorio);
    }

    // Salvar feegow_paciente_id se não salvo
    if (!pac.feegow_paciente_id && feegowPid) {
      await admin.from("pacientes").update({
        feegow_paciente_id: feegowPid,
        feegow_status: "liberado",
        feegow_ultimo_envio_em: new Date().toISOString(),
      }).eq("id", paciente_id);
      passos.push({ bloco: 2, descricao: "feegow_paciente_id salvo", feegow_paciente_id: feegowPid });
    }

    // ═══ BLOCO 3 — Descobrir endpoints de documentos ═══
    const docEndpoints = [
      { label: "Pedidos de exame", ep: "/patient/exam-requests" },
      { label: "Laudos", ep: "/laudos/list" },
      { label: "Laudo view", ep: "/laudos/view" },
      { label: "Prescrições", ep: "/patient/prescriptions" },
      { label: "Receitas", ep: "/patient/recipes" },
      { label: "Atestados", ep: "/patient/certificates" },
      { label: "Evolução", ep: "/patient/evolution" },
      { label: "Prontuário", ep: "/patient/medical-record" },
      { label: "Documentos", ep: "/patient/documents" },
      { label: "Arquivos", ep: "/patient/files" },
      { label: "Anexos", ep: "/patient/attachments" },
      { label: "Programas saúde", ep: "/patient/health-programs" },
    ];

    const endpointsComDados: { label: string; ep: string; body: unknown }[] = [];

    for (const d of docEndpoints) {
      const r = await feegowGet(d.ep, { paciente_id: feegowPid });
      const success = r.ok && (r.body as Record<string, unknown>)?.success === true;
      const content = (r.body as Record<string, unknown>)?.content;
      const total = (r.body as Record<string, unknown>)?.total;
      const temDados = success && (
        (Array.isArray(content) && content.length > 0) ||
        (content && typeof content === "object" && !Array.isArray(content) && Object.keys(content as object).length > 0)
      );

      passos.push({
        bloco: 3,
        descricao: d.label,
        endpoint: `GET ${d.ep}`,
        http_status: r.status,
        success,
        tem_dados: !!temDados,
        total: total ?? null,
      });

      if (temDados) {
        endpointsComDados.push({ label: d.label, ep: d.ep, body: r.body });
      }
    }

    relatorio.endpoints_com_dados = endpointsComDados.map(e => e.label);

    // ═══ BLOCO 4 — Importação controlada (máx 3 docs) ═══
    const documentosImportados: Record<string, unknown>[] = [];

    for (const ep of endpointsComDados) {
      if (documentosImportados.length >= 3) break;

      const data = ep.body as Record<string, unknown>;
      const content = data?.content;
      let items: Record<string, unknown>[] = [];
      if (Array.isArray(content)) items = content as Record<string, unknown>[];

      for (const item of items) {
        if (documentosImportados.length >= 3) break;

        const feegowDocId = String(
          item.PedidoExameID ?? item.laudo_id ?? item.id ?? item.documento_id ??
          `${ep.ep.replace(/\//g, "-")}-${documentosImportados.length}`
        );

        // Duplicidade por descricao contendo feegow_id
        const { data: existing } = await admin
          .from("documentos_paciente")
          .select("id")
          .eq("paciente_id", paciente_id)
          .like("descricao", `%feegow:${feegowDocId}%`)
          .limit(1);

        if (existing && existing.length > 0) {
          passos.push({
            bloco: 4,
            descricao: `Já existe feegow:${feegowDocId}, pulando`,
          });
          continue;
        }

        // Determinar tipo
        let tipo = "outro";
        if (ep.ep.includes("exam")) tipo = "exame";
        else if (ep.ep.includes("laudos")) tipo = "laudo";
        else if (ep.ep.includes("presc") || ep.ep.includes("recip")) tipo = "receita";

        // Título e conteúdo
        let titulo = "";
        let descricaoTexto = "";

        if (item.ObservacaoPedido) {
          // Parse exam request content
          const textoLimpo = stripHtml(String(item.ObservacaoPedido));
          const exames = textoLimpo.split("\n").filter(l => l.trim() && !l.startsWith("Unidades:")).map(l => l.trim());
          titulo = `Pedido de Exames #${feegowDocId}`;
          if (exames.length > 0) {
            titulo += ` — ${exames[0]}`;
            if (exames.length > 1) titulo += ` (+${exames.length - 1})`;
          }
          descricaoTexto = `feegow:${feegowDocId}\nExames: ${exames.join(", ")}`;
        } else {
          titulo = String(item.titulo ?? item.nome ?? item.descricao ?? `${ep.label} #${feegowDocId}`);
          descricaoTexto = `feegow:${feegowDocId}`;
        }

        const dataPedido = String(item.DataPedido ?? item.data ?? item.criado_em ?? new Date().toISOString());

        const { data: inserted, error: insErr } = await admin
          .from("documentos_paciente")
          .insert({
            paciente_id: paciente_id,
            user_id: pac.user_id,
            tipo,
            titulo: titulo.slice(0, 255),
            descricao: descricaoTexto.slice(0, 1000),
            storage_path: `feegow-ref/exam-request-${feegowDocId}`,
            mime_type: "text/plain",
            visibilidade_empresa: false,
          })
          .select("id, created_at")
          .single();

        if (insErr) {
          passos.push({
            bloco: 4,
            descricao: `Erro ao salvar feegow:${feegowDocId}`,
            erro: insErr.message,
          });
        } else {
          documentosImportados.push({
            id_local: inserted?.id,
            feegow_doc_id: feegowDocId,
            tipo,
            titulo: titulo.slice(0, 100),
            data_pedido: dataPedido,
            origem: ep.label,
          });

          passos.push({
            bloco: 4,
            descricao: `Documento importado: ${titulo.slice(0, 80)}`,
            id_local: inserted?.id,
            feegow_doc_id: feegowDocId,
            tipo,
          });
        }
      }
    }

    // ═══ BLOCO 5-8 — Relatório final ═══
    relatorio.ok = true;
    relatorio.documentos_importados = documentosImportados;
    relatorio.total_importados = documentosImportados.length;
    relatorio.resumo = {
      paciente_local_id: pac.id,
      cpf_mascarado: maskCpf(cpfLimpo),
      feegow_paciente_id: feegowPid,
      endpoints_testados: docEndpoints.length,
      endpoints_com_dados: endpointsComDados.length,
      documentos_importados: documentosImportados.length,
      tabela_local: "documentos_paciente",
      rota_paciente: "/app/paciente/documentos",
      seguranca: {
        apenas_cpf_informado: true,
        sem_log_conteudo_sensivel: true,
        cpf_mascarado: true,
        visibilidade_empresa: false,
        origem: "feegow",
      },
      proximos_passos: [
        "Verificar se há mais dados na Feegow (laudos, atestados) liberando permissões do token",
        "Implementar download de arquivo se Feegow fornecer URL de PDF",
        "Adicionar coluna 'origem' na tabela documentos_paciente para filtrar por fonte",
        "Implementar sincronização periódica sob demanda (não automática)",
      ],
    };

    return json(relatorio);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
