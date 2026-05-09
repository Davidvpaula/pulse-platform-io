// Frente D — IA Auditora Operacional (batch horário, observadora pura)
// Gera resumo + gargalos + sugestões a partir de métricas operacionais.
// NUNCA toma ações. NUNCA toca financeiro. Apenas grava em noc_resumos_ia.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { LovableProvider } from "../_shared/ai-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

const COOLDOWN_MINUTES = 50;
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const SCHEMA_HINT = `Responda EXCLUSIVAMENTE em JSON válido com este shape:
{
  "resumo": string (max 600 chars, português),
  "gargalos": [{"titulo": string, "descricao": string}] (0 a 3),
  "sugestoes": [{"titulo": string, "descricao": string}] (0 a 3),
  "risco_geral": "baixo" | "medio" | "alto"
}
Sem markdown, sem texto fora do JSON.`;

const SYSTEM_PROMPT = `Você é um auditor operacional OBSERVADOR de uma plataforma clínica.
REGRAS DURAS:
- NÃO recomende ações automáticas, bloqueios, punições ou alterações financeiras.
- NÃO cite valores monetários.
- NÃO faça diagnóstico comportamental sobre médicos individuais; foque em PADRÕES.
- Seja conciso, técnico e direto.
- Se o volume for muito baixo, diga "operação tranquila" e marque risco baixo.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const isCronCall = (req.headers.get("x-cron-key") ?? "") !== "";
    let userId: string | null = null;

    if (!isCronCall) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResp({ error: "Unauthorized" }, 401);
      }
      const supaUser = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error } = await supaUser.auth.getClaims(authHeader.slice(7));
      if (error || !claims?.claims) return jsonResp({ error: "Unauthorized" }, 401);
      userId = claims.claims.sub as string;

      const { data: roleOk } = await supaUser.rpc("has_role" as never, {
        _user_id: userId,
        _role: "admin",
      } as never);
      const { data: supOk } = await supaUser.rpc("has_role" as never, {
        _user_id: userId,
        _role: "supervisor",
      } as never);
      if (!roleOk && !supOk) return jsonResp({ error: "Forbidden" }, 403);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Cooldown: se há resumo recente, retorna ele (não chama LLM)
    const { data: recent } = await supa
      .from("noc_resumos_ia")
      .select("*")
      .gte("created_at", new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent && recent.length > 0) {
      return jsonResp({ source: "cache", resumo: recent[0] });
    }

    // Coleta de input compacto
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: metricasRows }, { data: alertas24h }, { data: eventosRecentes }, { data: noShowTop }] =
      await Promise.all([
        supa.rpc("fn_metricas_operacionais_dia" as never, { p_data: today } as never),
        supa
          .from("operacao_alertas")
          .select("tipo, severidade, status")
          .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
          .limit(500),
        supa
          .from("observabilidade_eventos")
          .select("tipo, payload, created_at")
          .eq("modulo", "operacao")
          .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString())
          .order("created_at", { ascending: false })
          .limit(20),
        supa.rpc("fn_metricas_operacionais_dia" as never, { p_data: today } as never),
      ]);

    void noShowTop;

    const metricasDia = Array.isArray(metricasRows) ? metricasRows[0] : metricasRows;

    const alertasAgg: Record<string, number> = {};
    for (const a of alertas24h ?? []) {
      const k = `${a.tipo}/${a.severidade}/${a.status}`;
      alertasAgg[k] = (alertasAgg[k] ?? 0) + 1;
    }

    const inputCompacto = {
      data: today,
      metricas_dia: metricasDia ?? null,
      alertas_24h_agregados: alertasAgg,
      eventos_recentes:
        (eventosRecentes ?? []).map((e: any) => ({
          tipo: e.tipo,
          quando: e.created_at,
          payload: e.payload,
        })) ?? [],
    };

    const userPrompt =
      `Analise os dados operacionais a seguir e produza o JSON estruturado.\n\n` +
      `DADOS:\n${JSON.stringify(inputCompacto).slice(0, 8000)}\n\n${SCHEMA_HINT}`;

    const provider = new LovableProvider(LOVABLE_KEY);
    const t0 = Date.now();
    const ai = await provider.run(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { model: DEFAULT_MODEL, temperature: 0.3, max_tokens: 700, jsonMode: true },
    );

    let parsed: any = {};
    try {
      parsed = JSON.parse(ai.text);
    } catch {
      parsed = {
        resumo: ai.text.slice(0, 600),
        gargalos: [],
        sugestoes: [],
        risco_geral: "baixo",
      };
    }

    const resumo = String(parsed.resumo ?? "Sem resumo.").slice(0, 1000);
    const gargalos = Array.isArray(parsed.gargalos) ? parsed.gargalos.slice(0, 3) : [];
    const sugestoes = Array.isArray(parsed.sugestoes) ? parsed.sugestoes.slice(0, 3) : [];
    const risco = ["baixo", "medio", "alto"].includes(parsed.risco_geral) ? parsed.risco_geral : "baixo";

    const janelaInicio = new Date(Date.now() - 60 * 60_000).toISOString();
    const janelaFim = new Date().toISOString();

    const { data: inserted, error: insErr } = await supa
      .from("noc_resumos_ia")
      .insert({
        janela_inicio: janelaInicio,
        janela_fim: janelaFim,
        resumo,
        gargalos,
        sugestoes,
        risco_geral: risco,
        modelo: ai.model,
        tokens_entrada: ai.input_tokens,
        tokens_saida: ai.output_tokens,
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Log no event bus (silencioso)
    try {
      await supa.from("observabilidade_eventos").insert({
        modulo: "operacao",
        tipo: "noc.ia_resumo_gerado",
        payload: {
          resumo_id: inserted?.id,
          modelo: ai.model,
          tokens_in: ai.input_tokens,
          tokens_out: ai.output_tokens,
          latency_ms: Date.now() - t0,
          risco_geral: risco,
        },
      });
    } catch (_) {/* silencioso */}

    return jsonResp({ source: "fresh", resumo: inserted });
  } catch (err) {
    return jsonResp({ error: (err as Error).message ?? "internal" }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
