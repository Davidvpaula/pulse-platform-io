// Edge function: importar documentos médicos da Feegow por CPF
// Secrets: FEEGOW_API_TOKEN, FEEGOW_BASE_URL
// Modo: produção — importa todos os documentos encontrados
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

/** Simple similarity score between two strings (0-1) */
function similarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  const wordsA = la.split(/\s+/);
  const wordsB = lb.split(/\s+/);
  const setB = new Set(wordsB);
  const matches = wordsA.filter(w => setB.has(w)).length;
  return matches / Math.max(wordsA.length, wordsB.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const FEEGOW_TOKEN = Deno.env.get("FEEGOW_API_TOKEN");
    const FEEGOW_URL = normalizeFeegowUrl(
      Deno.env.get("FEEGOW_BASE_URL") ?? "https://api.feegow.com/v1/api"
    );

    if (!FEEGOW_TOKEN) return json({ error: "FEEGOW_API_TOKEN não configurado" }, 500);

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    const serviceKey = req.headers.get("x-service-key") ?? "";
    let userId: string | null = null;
    const token = auth.replace("Bearer ", "");
    const isServiceCall = serviceKey === SERVICE_KEY || token === SERVICE_KEY;
    let callerRole: "admin" | "secretaria" | "paciente" | "service" = "service";

    if (!isServiceCall) {
      if (!auth.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: auth } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "Usuário inválido" }, 401);
      userId = u.user.id;

      const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (isAdmin) {
        callerRole = "admin";
      } else {
        const { data: isSec } = await userClient.rpc("has_role", { _user_id: userId, _role: "secretaria" });
        if (isSec) {
          callerRole = "secretaria";
        } else {
          // Allow patient to import their own documents
          callerRole = "paciente";
        }
      }
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

    // If caller is a patient, verify they own this record
    if (callerRole === "paciente") {
      if (pac.user_id !== userId) {
        return json({ error: "Sem permissão para importar documentos de outro paciente" }, 403);
      }
    }

    const cpfLimpo = pac.cpf?.replace(/\D/g, "") ?? "";
    if (!cpfLimpo) return json({ error: "Paciente sem CPF cadastrado" }, 400);

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
      let bodyParsed: unknown = raw;
      try { bodyParsed = JSON.parse(raw); } catch { /* keep raw */ }
      return { status: resp.status, ok: resp.ok, body: bodyParsed, raw };
    }

    // ═══ BLOCO 2 — Buscar paciente na Feegow por CPF ═══
    let feegowPid: string | null = pac.feegow_paciente_id ?? null;

    if (!feegowPid) {
      const searchR = await feegowGet("/patient/list", { cpf: cpfLimpo, limit: "10" });

      if (searchR.ok) {
        const content = (searchR.body as Record<string, unknown>)?.content;
        let candidates: Record<string, unknown>[] = [];

        if (Array.isArray(content)) {
          candidates = content;
        } else if (content && typeof content === "object") {
          candidates = Object.values(content as Record<string, unknown>).filter(
            (v) => v && typeof v === "object"
          ) as Record<string, unknown>[];
        }

        if (candidates.length === 1) {
          const p = candidates[0];
          feegowPid = String(p.patient_id ?? p.paciente_id ?? p.id);
        } else if (candidates.length > 1) {
          // Smart reconciliation: pick the best name match
          const localName = pac.nome_completo ?? "";
          let bestScore = -1;
          let bestPid: string | null = null;

          for (const c of candidates) {
            const feegowName = String(c.nome ?? c.name ?? "");
            const score = similarity(localName, feegowName);
            if (score > bestScore) {
              bestScore = score;
              bestPid = String(c.patient_id ?? c.paciente_id ?? c.id);
            }
          }
          feegowPid = bestPid;
        }
      }
    }

    if (!feegowPid) {
      return json({ ok: false, error: "Paciente não encontrado na Feegow pelo CPF.", importados: 0 });
    }

    // Save feegow_paciente_id if not saved
    if (!pac.feegow_paciente_id && feegowPid) {
      await admin.from("pacientes").update({
        feegow_paciente_id: feegowPid,
        feegow_status: "liberado",
        feegow_ultimo_envio_em: new Date().toISOString(),
      }).eq("id", paciente_id);
    }

    // ═══ BLOCO 3 — Fetch documents from all relevant endpoints ═══
    const docEndpoints = [
      { label: "Pedidos de exame", ep: "/patient/exam-requests", tipo: "exame" },
      { label: "Laudos", ep: "/laudos/list", tipo: "laudo" },
      { label: "Prescrições", ep: "/patient/prescriptions", tipo: "receita" },
      { label: "Receitas", ep: "/patient/recipes", tipo: "receita" },
      { label: "Atestados", ep: "/patient/certificates", tipo: "outro" },
      { label: "Evolução", ep: "/patient/evolution", tipo: "outro" },
      { label: "Documentos", ep: "/patient/documents", tipo: "outro" },
      { label: "Arquivos", ep: "/patient/files", tipo: "outro" },
      { label: "Anexos", ep: "/patient/attachments", tipo: "outro" },
    ];

    const endpointsComDados: { label: string; ep: string; body: unknown; tipo: string }[] = [];

    for (const d of docEndpoints) {
      const r = await feegowGet(d.ep, { paciente_id: feegowPid });
      const success = r.ok && (r.body as Record<string, unknown>)?.success === true;
      const content = (r.body as Record<string, unknown>)?.content;
      const temDados = success && (
        (Array.isArray(content) && content.length > 0) ||
        (content && typeof content === "object" && !Array.isArray(content) && Object.keys(content as object).length > 0)
      );

      if (temDados) {
        endpointsComDados.push({ label: d.label, ep: d.ep, body: r.body, tipo: d.tipo });
      }
    }

    // ═══ BLOCO 4 — Import all documents (max 50 per call for safety) ═══
    const MAX_DOCS = 50;
    const documentosImportados: Record<string, unknown>[] = [];
    const skipped: string[] = [];

    for (const ep of endpointsComDados) {
      if (documentosImportados.length >= MAX_DOCS) break;

      const data = ep.body as Record<string, unknown>;
      const content = data?.content;
      let items: Record<string, unknown>[] = [];

      if (Array.isArray(content)) {
        items = content as Record<string, unknown>[];
      } else if (content && typeof content === "object") {
        // Some Feegow endpoints return object indexed by ID
        items = Object.values(content as Record<string, unknown>).filter(
          (v) => v && typeof v === "object"
        ) as Record<string, unknown>[];
      }

      for (const item of items) {
        if (documentosImportados.length >= MAX_DOCS) break;

        const feegowDocId = String(
          item.PedidoExameID ?? item.laudo_id ?? item.prescricao_id ?? item.receita_id ??
          item.id ?? item.documento_id ??
          `${ep.ep.replace(/\//g, "-")}-${documentosImportados.length}`
        );

        // Check for duplicates
        const { data: existing } = await admin
          .from("documentos_paciente")
          .select("id")
          .eq("paciente_id", paciente_id)
          .like("descricao", `%feegow:${feegowDocId}%`)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped.push(feegowDocId);
          continue;
        }

        const tipo = ep.tipo;

        // Build title and description
        let titulo = "";
        let descricaoTexto = "";

        if (item.ObservacaoPedido) {
          // Exam request
          const textoLimpo = stripHtml(String(item.ObservacaoPedido));
          const exames = textoLimpo.split("\n").filter(l => l.trim() && !l.startsWith("Unidades:")).map(l => l.trim());
          titulo = `Pedido de Exames #${feegowDocId}`;
          if (exames.length > 0) {
            titulo += ` — ${exames[0]}`;
            if (exames.length > 1) titulo += ` (+${exames.length - 1})`;
          }
          descricaoTexto = `feegow:${feegowDocId}\nOrigem: ${ep.label}\nExames: ${exames.join(", ")}`;
        } else if (item.medicamentos || item.itens || item.drugs) {
          // Prescription
          const meds = item.medicamentos ?? item.itens ?? item.drugs;
          let medList: string[] = [];
          if (Array.isArray(meds)) {
            medList = meds.map((m: any) =>
              String(m.nome ?? m.name ?? m.descricao ?? m.drug_name ?? JSON.stringify(m)).slice(0, 80)
            );
          }
          titulo = `Prescrição #${feegowDocId}`;
          if (medList.length > 0) {
            titulo += ` — ${medList[0]}`;
            if (medList.length > 1) titulo += ` (+${medList.length - 1})`;
          }
          descricaoTexto = `feegow:${feegowDocId}\nOrigem: ${ep.label}\nMedicamentos: ${medList.join(", ") || "—"}`;
          if (item.orientacoes ?? item.observacao) {
            descricaoTexto += `\nOrientações: ${stripHtml(String(item.orientacoes ?? item.observacao))}`;
          }
        } else {
          titulo = String(item.titulo ?? item.nome ?? item.name ?? item.descricao ?? `${ep.label} #${feegowDocId}`);
          descricaoTexto = `feegow:${feegowDocId}\nOrigem: ${ep.label}`;
          if (item.observacao) descricaoTexto += `\n${stripHtml(String(item.observacao))}`;
        }

        const dataPedido = String(item.DataPedido ?? item.data ?? item.created_at ?? item.criado_em ?? new Date().toISOString());

        const { data: inserted, error: insErr } = await admin
          .from("documentos_paciente")
          .insert({
            paciente_id,
            user_id: pac.user_id,
            tipo,
            titulo: titulo.slice(0, 255),
            descricao: descricaoTexto.slice(0, 1000),
            storage_path: `feegow-ref/${ep.tipo}-${feegowDocId}`,
            mime_type: "text/plain",
            visibilidade_empresa: false,
          })
          .select("id, created_at")
          .single();

        if (!insErr && inserted) {
          documentosImportados.push({
            id_local: inserted.id,
            feegow_doc_id: feegowDocId,
            tipo,
            titulo: titulo.slice(0, 100),
            data_pedido: dataPedido,
            origem: ep.label,
          });
        }
      }
    }

    // ═══ BLOCO 5 — Integration log ═══
    await admin.from("integracoes_logs").insert({
      integracao: "feegow",
      acao: "importar_documentos",
      entidade_tipo: "paciente",
      entidade_id_interno: paciente_id,
      entidade_id_externo: feegowPid,
      payload_envio: { cpf_mascarado: maskCpf(cpfLimpo), endpoints_testados: docEndpoints.length },
      payload_resposta: {
        endpoints_com_dados: endpointsComDados.map(e => e.label),
        importados: documentosImportados.length,
        duplicados_pulados: skipped.length,
      },
      status: "success",
      origem: callerRole,
      user_id: userId,
      duracao_ms: Date.now() - start,
    });

    return json({
      ok: true,
      importados: documentosImportados.length,
      duplicados_pulados: skipped.length,
      endpoints_com_dados: endpointsComDados.map(e => e.label),
      documentos: documentosImportados,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
