// FASE 7 — IA Avatar (resposta autônoma controlada)
// Reutiliza:
//   - LovableProvider de ../_shared/ai-providers.ts (sem novo provider)
//   - MetaCloudProvider de ../_shared/wa-providers.ts (transporte WhatsApp existente)
//
// Fluxo (NUNCA pula etapas):
//   1) Auth do chamador (admin/staff) OU service-role (cron/webhook interno)
//   2) RPC ai_avatar_should_reply  -> kill switch, modo, pausa, anti-loop, cooldown, humano, limite/dia
//   3) Verifica blocked_topics no texto da última mensagem -> handoff
//   4) Carrega persona ativa + memória + tail de mensagens
//   5) Gera resposta com IA, calcula confiança e risco
//   6) Se confiança < mínima OU risco crítico -> handoff (não responde)
//   7) Envia via MetaCloudProvider, persiste em messages (sender_type='ia_avatar')
//   8) Atualiza counters anti-loop em conversations
//   9) Registra em ai_logs (auto_reply=true) e, se for o caso, em ai_handoff_logs
//
// Não toca em: webhook, templates Fase 4, multi-atendente Fase 5, IA Assistiva Fase 6.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { LovableProvider, type ChatMsg } from "../_shared/ai-providers.ts";
import { MetaCloudProvider } from "../_shared/wa-providers.ts";
import { logEvento } from "../_shared/observabilidade.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Confianca = "critica" | "baixa" | "media" | "alta";
type Risco = "nenhum" | "baixo" | "medio" | "alto" | "critico";
type HandoffMotivo =
  | "baixa_confianca" | "topico_clinico" | "urgencia" | "crise_emocional"
  | "risco_juridico" | "paciente_irritado" | "solicitacao_humano"
  | "timeout_provider" | "erro_provider" | "rate_limit" | "anti_loop"
  | "manual" | "outro";

const CONFIANCA_RANK: Record<Confianca, number> = {
  critica: 0, baixa: 1, media: 2, alta: 3,
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function logAi(admin: any, payload: Record<string, unknown>) {
  const { error } = await admin.from("ai_logs").insert(payload);
  if (error) console.warn("[ai-avatar-reply] ai_logs insert:", error.message);
}

async function logHandoff(
  admin: any,
  conversationId: string | null,
  motivo: HandoffMotivo,
  gatilho: string,
  extras: Record<string, unknown> = {},
) {
  const { error } = await admin.from("ai_handoff_logs").insert({
    conversation_id: conversationId,
    motivo,
    gatilho,
    confianca: extras.confianca ?? null,
    risco: extras.risco ?? null,
    status: "aberto",
    metadata: extras.metadata ?? {},
  });
  if (error) console.warn("[ai-avatar-reply] ai_handoff_logs insert:", error.message);
}

async function markAiAsHandedOff(admin: any, conversationId: string, motivo: string) {
  await admin
    .from("conversations")
    .update({
      ai_avatar_blocked: true,
      ai_avatar_blocked_motivo: motivo,
      ai_avatar_blocked_at: new Date().toISOString(),
      ai_avatar_consecutive_replies: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const metaToken = Deno.env.get("META_WHATSAPP_TOKEN") || "";
  const metaPhoneFallback = Deno.env.get("META_PHONE_NUMBER_ID") || "";

  if (!lovableKey) return jsonResp({ error: "LOVABLE_API_KEY ausente" }, 503);

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // -------- Auth --------
    const authHeader = req.headers.get("Authorization") ?? "";
    const internalKey = req.headers.get("X-Internal-Key") ?? "";
    const isInternal = internalKey && internalKey === serviceKey;

    if (!isInternal) {
      if (!authHeader.startsWith("Bearer ")) return jsonResp({ error: "Não autenticado" }, 401);
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u, error: ue } = await userClient.auth.getUser();
      if (ue || !u?.user) return jsonResp({ error: "Sessão inválida" }, 401);
    }

    const body = await req.json();
    const conversationId: string | undefined = body?.conversation_id;
    const dryRun: boolean = !!body?.dry_run;
    if (!conversationId) return jsonResp({ error: "conversation_id obrigatório" }, 400);

    // -------- 1) RPC should_reply (gate principal) --------
    const { data: gate, error: gateErr } = await admin.rpc("ai_avatar_should_reply", {
      _conversation_id: conversationId,
    });
    if (gateErr) return jsonResp({ error: gateErr.message }, 500);

    if (!gate?.reply) {
      if (gate?.handoff_motivo) {
        await logHandoff(admin, conversationId, gate.handoff_motivo as HandoffMotivo, "should_reply_gate");
        await markAiAsHandedOff(admin, conversationId, String(gate.motivo));
      }
      return jsonResp({ ok: true, replied: false, motivo: gate?.motivo ?? "bloqueado" });
    }

    const minConfianca = (gate.confianca_minima ?? "media") as Confianca;
    const profileId = gate.profile_id as string | null;
    const modo = gate.modo as "semi_autonomo" | "autonomo_controlado";

    // -------- Load conversation + persona + última msg --------
    const { data: conv } = await admin
      .from("conversations")
      .select("id, contact_name, contact_phone, patient_id, whatsapp_instance_id, ai_avatar_consecutive_replies")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return jsonResp({ error: "conversa não encontrada" }, 404);

    const { data: lastInbound } = await admin
      .from("messages")
      .select("id, body, sender_type, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_type", "paciente")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastInbound?.body?.trim()) {
      return jsonResp({ ok: true, replied: false, motivo: "sem_mensagem_paciente" });
    }
    const userText = lastInbound.body as string;

    // -------- 2) Blocked topics (clínico) --------
    const { data: topicos } = await admin
      .from("ai_blocked_topics")
      .select("termo, categoria, severidade")
      .eq("ativo", true);
    const norm = normalize(userText);
    const hit = (topicos ?? []).find((t: any) => norm.includes(normalize(t.termo)));
    if (hit) {
      await logHandoff(admin, conversationId, "topico_clinico", `blocked:${hit.termo}`, {
        risco: hit.severidade,
        metadata: { termo: hit.termo, categoria: hit.categoria },
      });
      await markAiAsHandedOff(admin, conversationId, `Tópico clínico: ${hit.termo}`);
      await logAi(admin, {
        conversation_id: conversationId,
        provider: "lovable",
        model: null,
        action_taken: "handoff_blocked_topic",
        auto_reply: false,
        risco: hit.severidade,
        confianca: "critica",
        modo,
        motivo: `blocked_topic:${hit.termo}`,
        handoff_motivo: "topico_clinico",
      });
      return jsonResp({ ok: true, replied: false, handoff: true, motivo: "topico_clinico" });
    }

    // -------- Persona + settings --------
    const { data: settings } = await admin
      .from("ai_settings")
      .select("model, temperature, max_tokens, base_prompt, knowledge_base, safety_rules")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let persona: any = null;
    if (profileId) {
      const { data } = await admin
        .from("ai_avatar_profiles")
        .select("nome, system_prompt, tom, saudacao_padrao, assinatura, limites")
        .eq("id", profileId)
        .maybeSingle();
      persona = data;
    }

    // -------- Memória contextual (não expirada) --------
    const { data: memorias } = await admin
      .from("ai_avatar_memory")
      .select("memory_type, content, relevance_score")
      .or(
        `conversation_id.eq.${conversationId}` +
          (conv.patient_id ? `,patient_id.eq.${conv.patient_id}` : ""),
      )
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("relevance_score", { ascending: false })
      .limit(8);

    // -------- Tail de mensagens (últimas 10) --------
    const { data: tail } = await admin
      .from("messages")
      .select("body, sender_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);
    const ordered = (tail ?? []).slice().reverse();

    // -------- Monta prompt --------
    const systemParts: string[] = [];
    systemParts.push(
      persona?.system_prompt ??
        settings?.base_prompt ??
        "Você é um assistente virtual da clínica. Acolhedor, breve e claro. Não é médico. Nunca diagnostica, prescreve ou interpreta exames. Em qualquer dúvida clínica, encaminhe para um humano. Sempre deixe claro que é um assistente virtual.",
    );
    systemParts.push(
      "REGRAS CRÍTICAS:\n- Você NÃO é profissional de saúde.\n- Nunca emita diagnóstico, dose, prescrição, atestado, laudo ou interpretação de exame.\n- Se houver qualquer urgência médica ou crise emocional, oriente procurar atendimento e diga que vai chamar um humano.\n- Mantenha respostas curtas (máx 3 parágrafos).\n- Sempre se identifique como assistente virtual.",
    );
    if (settings?.safety_rules) systemParts.push(`SAFETY: ${settings.safety_rules}`);
    if (settings?.knowledge_base) systemParts.push(`BASE DE CONHECIMENTO:\n${settings.knowledge_base}`);
    if (memorias?.length) {
      systemParts.push(
        "MEMÓRIA RELEVANTE:\n" +
          memorias.map((m: any) => `- (${m.memory_type}) ${m.content}`).join("\n"),
      );
    }
    systemParts.push(
      "FORMATO DA SUA RESPOSTA:\nRetorne APENAS um JSON válido com as chaves:\n" +
        '  "reply" (string, mensagem para o paciente OU vazio se precisar handoff),\n' +
        '  "confianca" ("alta"|"media"|"baixa"|"critica"),\n' +
        '  "risco" ("nenhum"|"baixo"|"medio"|"alto"|"critico"),\n' +
        '  "handoff" (boolean — true se humano precisa assumir),\n' +
        '  "handoff_motivo" (string opcional).\n' +
        "Se confiança baixa/crítica OU risco alto/crítico, set handoff=true e reply=\"\".",
    );

    const messages: ChatMsg[] = [
      { role: "system", content: systemParts.join("\n\n") },
      ...ordered.map((m: any) => ({
        role: (m.sender_type === "paciente" ? "user" : "assistant") as "user" | "assistant",
        content: String(m.body ?? "").slice(0, 1000),
      })),
    ];

    const provider = new LovableProvider(lovableKey);
    const model = settings?.model ?? "google/gemini-2.5-flash";

    // -------- 5) Geração --------
    let aiResult;
    try {
      aiResult = await provider.run(messages, {
        model,
        temperature: Number(settings?.temperature ?? 0.4),
        max_tokens: Number(settings?.max_tokens ?? 600),
        jsonMode: true,
      });
    } catch (e) {
      const msg = (e as Error).message;
      const isRate = /\b429\b/.test(msg);
      const motivo: HandoffMotivo = isRate ? "rate_limit" : "erro_provider";
      await logHandoff(admin, conversationId, motivo, "provider_error", {
        metadata: { error: msg.slice(0, 300) },
      });
      await markAiAsHandedOff(admin, conversationId, motivo);
      await logAi(admin, {
        conversation_id: conversationId,
        provider: "lovable",
        model,
        error: msg.slice(0, 500),
        action_taken: "handoff_provider_error",
        auto_reply: false,
        modo,
        handoff_motivo: motivo,
      });
      return jsonResp({ ok: false, replied: false, handoff: true, motivo });
    }

    let parsed: { reply?: string; confianca?: Confianca; risco?: Risco; handoff?: boolean; handoff_motivo?: string } = {};
    try {
      parsed = JSON.parse(aiResult.text);
    } catch {
      parsed = { reply: "", confianca: "baixa", risco: "medio", handoff: true, handoff_motivo: "erro_parse" };
    }

    const confianca: Confianca = (parsed.confianca ?? "baixa") as Confianca;
    const risco: Risco = (parsed.risco ?? "nenhum") as Risco;
    const reply = (parsed.reply ?? "").trim();

    // -------- 6) Gates de saída --------
    const baixaConfianca = CONFIANCA_RANK[confianca] < CONFIANCA_RANK[minConfianca];
    const riscoAlto = risco === "alto" || risco === "critico";
    if (parsed.handoff || baixaConfianca || riscoAlto || !reply) {
      const motivo: HandoffMotivo = parsed.handoff
        ? ((parsed.handoff_motivo as HandoffMotivo) || "outro")
        : baixaConfianca
        ? "baixa_confianca"
        : riscoAlto
        ? (risco === "critico" ? "urgencia" : "topico_clinico")
        : "outro";
      await logHandoff(admin, conversationId, motivo, "ai_self_handoff", {
        confianca, risco,
        metadata: { motivo_ia: parsed.handoff_motivo ?? null },
      });
      await markAiAsHandedOff(admin, conversationId, motivo);
      await logAi(admin, {
        conversation_id: conversationId,
        provider: "lovable",
        model: aiResult.model,
        prompt: userText.slice(0, 2000),
        response: reply || aiResult.text.slice(0, 1000),
        action_taken: "handoff_ai",
        tokens_in: aiResult.input_tokens,
        tokens_out: aiResult.output_tokens,
        latency_ms: aiResult.latency_ms,
        auto_reply: false,
        confianca, risco, modo,
        motivo: parsed.handoff_motivo ?? null,
        handoff_motivo: motivo,
        profile_id: profileId,
      });
      return jsonResp({ ok: true, replied: false, handoff: true, motivo });
    }

    // -------- 7) Envio via transporte existente (MetaCloudProvider) --------
    if (dryRun) {
      await logAi(admin, {
        conversation_id: conversationId,
        provider: "lovable",
        model: aiResult.model,
        prompt: userText.slice(0, 2000),
        response: reply,
        action_taken: "dry_run",
        tokens_in: aiResult.input_tokens,
        tokens_out: aiResult.output_tokens,
        latency_ms: aiResult.latency_ms,
        auto_reply: false,
        confianca, risco, modo,
        profile_id: profileId,
      });
      return jsonResp({ ok: true, replied: false, dry_run: true, reply, confianca, risco });
    }

    if (!metaToken) {
      await logAi(admin, {
        conversation_id: conversationId,
        provider: "lovable",
        model: aiResult.model,
        response: reply,
        action_taken: "abort_no_meta_token",
        auto_reply: false,
        confianca, risco, modo,
        profile_id: profileId,
        error: "META_WHATSAPP_TOKEN ausente",
      });
      return jsonResp({ ok: false, error: "WhatsApp não configurado" }, 503);
    }

    // resolve phone_number_id (mesma lógica do whatsapp-enviar)
    let phoneNumberId: string | null = null;
    if (conv.whatsapp_instance_id) {
      const { data: inst } = await admin
        .from("whatsapp_instances")
        .select("phone_number_id")
        .eq("id", conv.whatsapp_instance_id)
        .maybeSingle();
      phoneNumberId = inst?.phone_number_id ?? null;
    }
    if (!phoneNumberId) {
      const { data: anyInst } = await admin
        .from("whatsapp_instances")
        .select("phone_number_id")
        .eq("ativo", true)
        .not("phone_number_id", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      phoneNumberId = anyInst?.phone_number_id ?? metaPhoneFallback ?? null;
    }
    if (!phoneNumberId || !conv.contact_phone) {
      return jsonResp({ ok: false, error: "phone_number_id ou contato indisponível" }, 503);
    }

    const wa = new MetaCloudProvider(metaToken, phoneNumberId);
    const sendRes = await wa.sendText({
      to: String(conv.contact_phone).replace(/\D/g, ""),
      message: reply,
    });

    // persistência mensagem (sender_type='ia_avatar' se enum aceitar; senão 'sistema')
    const senderType = "sistema";
    await admin.from("messages").insert({
      conversation_id: conversationId,
      body: reply,
      sender_type: senderType,
      sender_name: persona?.nome ?? "IA Avatar",
      message_type: "text",
      status: sendRes.ok ? "sent" : "failed",
      whatsapp_message_id: sendRes.wa_message_id,
      failure_reason: sendRes.ok ? null : sendRes.error_message ?? "send_failed",
      metadata: {
        ia_avatar: true,
        modelo: aiResult.model,
        confianca, risco,
        profile_id: profileId,
      },
    });

    // 8) anti-loop counters
    await admin
      .from("conversations")
      .update({
        ai_avatar_consecutive_replies: (conv.ai_avatar_consecutive_replies ?? 0) + 1,
        ai_avatar_last_reply_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        last_message_preview: reply.slice(0, 80),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    // custo estimado (simplificado): 0 por padrão; provider real preenche depois
    await logAi(admin, {
      conversation_id: conversationId,
      provider: "lovable",
      model: aiResult.model,
      prompt: userText.slice(0, 2000),
      response: reply,
      action_taken: sendRes.ok ? "auto_reply_sent" : "auto_reply_failed",
      tokens_in: aiResult.input_tokens,
      tokens_out: aiResult.output_tokens,
      latency_ms: aiResult.latency_ms,
      auto_reply: sendRes.ok,
      confianca, risco, modo,
      profile_id: profileId,
      error: sendRes.ok ? null : sendRes.error_message ?? `http_${sendRes.http_status}`,
    });

    return jsonResp({
      ok: sendRes.ok,
      replied: sendRes.ok,
      wa_message_id: sendRes.wa_message_id,
      confianca,
      risco,
    });
  } catch (e) {
    console.error("[ai-avatar-reply] erro:", e);
    return jsonResp({ error: (e as Error).message }, 500);
  }
});
