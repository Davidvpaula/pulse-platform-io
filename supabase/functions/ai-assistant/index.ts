// Fase 6 — Edge function ai-assistant
// Copiloto operacional: NUNCA envia mensagens para pacientes.
// Ações: summarize | suggest_reply | classify_intent | detect_urgency | detect_risk | suggest_department

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { makeProvider, estimateCostCents, type ChatMsg } from "../_shared/ai-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action =
  | "summarize"
  | "suggest_reply"
  | "classify_intent"
  | "detect_urgency"
  | "detect_risk"
  | "suggest_department";

const PROMPT_TYPE_BY_ACTION: Record<Action, string> = {
  summarize: "summary",
  suggest_reply: "reply",
  classify_intent: "intent",
  detect_urgency: "urgency",
  detect_risk: "risk",
  suggest_department: "department",
};

const JSON_ACTIONS = new Set<Action>([
  "suggest_reply",
  "classify_intent",
  "detect_urgency",
  "detect_risk",
  "suggest_department",
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // tenta extrair primeiro bloco json
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]) as T; } catch { return null; }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json(401, { error: "missing_auth" });

    // Cliente do usuário (para auth.getUser conforme regra do projeto)
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "unauthorized" });
    const userId = userData.user.id;

    // Cliente service role (bypass RLS para escrita controlada)
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Permissão
    const { data: hasPerm } = await sb.rpc("has_permission", {
      _user_id: userId,
      _permission_key: "ia.assistiva.usar",
    });
    if (!hasPerm) return json(403, { error: "missing_permission", key: "ia.assistiva.usar" });

    // Settings
    const { data: settings } = await sb
      .from("ai_assistant_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!settings) return json(503, { error: "ai_not_configured" });
    if (!settings.enabled) return json(403, { error: "ai_disabled" });

    if (!LOVABLE_API_KEY) return json(500, { error: "missing_lovable_api_key" });

    const body = await req.json().catch(() => ({}));
    const action = body.action as Action;
    const conversation_id = body.conversation_id as string | undefined;
    if (!action || !PROMPT_TYPE_BY_ACTION[action])
      return json(400, { error: "invalid_action" });
    if (!conversation_id) return json(400, { error: "missing_conversation_id" });

    // Orçamento diário
    const sinceMidnight = new Date();
    sinceMidnight.setHours(0, 0, 0, 0);
    const { data: usageToday } = await sb
      .from("ai_audit_logs")
      .select("input_tokens, output_tokens")
      .gte("created_at", sinceMidnight.toISOString());
    const totalTokens = (usageToday ?? []).reduce(
      (acc: number, r: any) => acc + (r.input_tokens ?? 0) + (r.output_tokens ?? 0),
      0,
    );
    if (totalTokens >= settings.daily_token_budget) {
      return json(402, { error: "daily_budget_exceeded", used: totalTokens, limit: settings.daily_token_budget });
    }

    // Cache: summarize reusa último summary se mensagem mais recente não mudou
    const { data: lastMsgRow } = await sb
      .from("messages")
      .select("id, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastMessageId = lastMsgRow?.id ?? null;

    if (action === "summarize" && lastMessageId) {
      const { data: cached } = await sb
        .from("conversation_ai_summaries")
        .select("*")
        .eq("conversation_id", conversation_id)
        .eq("last_message_id", lastMessageId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) {
        return json(200, { cached: true, summary: cached.summary, id: cached.id });
      }
    }

    // Carrega prompt vigente
    const { data: prompt } = await sb
      .from("ai_prompts")
      .select("*")
      .eq("tipo", PROMPT_TYPE_BY_ACTION[action])
      .eq("ativo", true)
      .maybeSingle();
    if (!prompt) return json(500, { error: "no_active_prompt", tipo: PROMPT_TYPE_BY_ACTION[action] });

    // Carrega últimas mensagens (até 30) — texto somente
    const { data: msgs } = await sb
      .from("messages")
      .select("sender_type, sender_name, body, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(30);
    const ordered = (msgs ?? []).slice().reverse();
    const transcript = ordered
      .map((m: any) => {
        const who =
          m.sender_type === "paciente" || m.sender_type === "lead"
            ? "Paciente"
            : m.sender_type === "bot"
              ? "Bot"
              : m.sender_type === "ia"
                ? "IA"
                : `Atendente${m.sender_name ? ` (${m.sender_name})` : ""}`;
        return `${who}: ${(m.body ?? "").trim()}`;
      })
      .filter((l: string) => l.length > 0)
      .join("\n");

    const userMsg = `Conversa atual (mais antiga -> mais nova):\n\n${transcript || "(sem mensagens)"}\n\nResponda a tarefa do system prompt.`;
    const messages: ChatMsg[] = [
      { role: "system", content: prompt.system_prompt },
      { role: "user", content: userMsg },
    ];
    const promptHash = await sha256(prompt.system_prompt + "\n---\n" + userMsg);

    const provider = makeProvider(settings.provider, LOVABLE_API_KEY);
    const model = (body.model as string) || settings.model;

    let result;
    try {
      result = await provider.run(messages, {
        model,
        temperature: Number(settings.temperature ?? 0.4),
        max_tokens: Number(settings.max_tokens ?? 800),
        jsonMode: JSON_ACTIONS.has(action),
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      await sb.from("ai_audit_logs").insert({
        conversation_id,
        action,
        provider: settings.provider,
        model,
        input_tokens: 0,
        output_tokens: 0,
        latency_ms: 0,
        prompt_hash: promptHash,
        actor_id: userId,
        error: err,
      });
      const status = /429/.test(err) ? 429 : /402/.test(err) ? 402 : 500;
      return json(status, { error: "provider_error", detail: err });
    }

    const cost = estimateCostCents(result.input_tokens, result.output_tokens, model);

    // Auditoria sempre
    const { data: auditRow } = await sb
      .from("ai_audit_logs")
      .insert({
        conversation_id,
        action,
        provider: settings.provider,
        model: result.model,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        estimated_cost_cents: cost,
        latency_ms: result.latency_ms,
        prompt_hash: promptHash,
        response_excerpt: (result.text ?? "").slice(0, 1000),
        accepted_by_user: null,
        actor_id: userId,
      })
      .select("id")
      .single();

    // Persiste cache por ação
    let payload: Record<string, unknown> = { audit_id: auditRow?.id, model: result.model };

    if (action === "summarize") {
      const { data: row } = await sb
        .from("conversation_ai_summaries")
        .insert({
          conversation_id,
          summary: result.text.trim(),
          summary_type: (body.summary_type as string) || "short",
          last_message_id: lastMessageId,
          provider: settings.provider,
          model: result.model,
          generated_by: userId,
        })
        .select("id, summary, summary_type, created_at")
        .single();
      payload = { ...payload, summary: row };
    } else if (action === "classify_intent") {
      const parsed = safeJsonParse<any>(result.text) ?? {};
      const { data: row } = await sb
        .from("conversation_ai_intents")
        .insert({
          conversation_id,
          detected_intent: String(parsed.intent ?? "indefinido"),
          suggested_department: parsed.suggested_department ?? null,
          suggested_priority: parsed.suggested_priority ?? null,
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
          provider: settings.provider,
        })
        .select("*")
        .single();
      payload = { ...payload, intent: row };
    } else if (action === "detect_risk") {
      const parsed = safeJsonParse<any>(result.text) ?? {};
      const lvl = ["baixo", "medio", "alto", "critico"].includes(parsed.risk_level)
        ? parsed.risk_level
        : "baixo";
      const { data: row } = await sb
        .from("conversation_ai_risk_analysis")
        .insert({
          conversation_id,
          risk_level: lvl,
          score: typeof parsed.score === "number" ? parsed.score : null,
          signals: Array.isArray(parsed.signals) ? parsed.signals : [],
          requires_supervisor: !!parsed.requires_supervisor,
          notes: parsed.notes ?? null,
          provider: settings.provider,
        })
        .select("*")
        .single();
      payload = { ...payload, risk: row };
    } else if (action === "detect_urgency") {
      const parsed = safeJsonParse<any>(result.text) ?? {};
      payload = { ...payload, urgency: parsed };
    } else if (action === "suggest_department") {
      const parsed = safeJsonParse<any>(result.text) ?? {};
      payload = { ...payload, department: parsed };
    } else if (action === "suggest_reply") {
      const parsed = safeJsonParse<any>(result.text) ?? { suggestions: [{ text: result.text, tone: "neutral" }] };
      payload = { ...payload, reply: parsed };
    }

    return json(200, payload);
  } catch (e) {
    return json(500, { error: "unexpected", detail: e instanceof Error ? e.message : String(e) });
  }
});
