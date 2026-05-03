import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { message, messages: chatMessages, simulate } = await req.json();
    if (!message && (!chatMessages || chatMessages.length === 0)) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load AI settings
    const { data: settings } = await sb
      .from("ai_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.active) {
      return new Response(JSON.stringify({ error: "IA Avatar está desativada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load handoff rules
    const { data: handoffRules } = await sb
      .from("ai_handoff_rules")
      .select("*")
      .eq("ai_settings_id", settings.id)
      .eq("active", true)
      .order("sort_order");

    // Build handoff instructions
    let handoffInstructions = "";
    if (handoffRules && handoffRules.length > 0) {
      const urgentes = handoffRules.filter((r: any) => r.level === "urgente");
      const moderados = handoffRules.filter((r: any) => r.level === "moderado");
      const baixos = handoffRules.filter((r: any) => r.level === "baixo");

      handoffInstructions = "\n\n## Regras de Transferência:\n";
      if (urgentes.length) {
        handoffInstructions += "🔴 URGENTE (transferir imediatamente para humano):\n" +
          urgentes.map((r: any) => `- "${r.keyword}"${r.intent ? ` (${r.intent})` : ""}`).join("\n") + "\n";
      }
      if (moderados.length) {
        handoffInstructions += "🟡 MODERADO (tente resolver, se não conseguir transfira):\n" +
          moderados.map((r: any) => `- "${r.keyword}"${r.intent ? ` (${r.intent})` : ""}`).join("\n") + "\n";
      }
      if (baixos.length) {
        handoffInstructions += "🟢 BAIXO (resolva sem transferir):\n" +
          baixos.map((r: any) => `- "${r.keyword}"${r.intent ? ` (${r.intent})` : ""}`).join("\n") + "\n";
      }
      handoffInstructions += "\nSe o paciente mencionar palavras urgentes, responda: [TRANSFERIR_HUMANO] e encerre.\n";
      handoffInstructions += "Se moderado e você não souber, responda: [TRANSFERIR_HUMANO].\n";
    }

    // Build doctor suggestion instructions
    let doctorInstructions = "";
    if (settings.sugestao_medicos_ativa) {
      // Fetch available specialties + doctors
      const { data: especialidades } = await sb
        .from("especialidades")
        .select("id, nome, icone");

      const { data: medicos } = await sb
        .from("medicos")
        .select("id, nome_completo, especialidade, crm")
        .eq("aprovado", true);

      const { data: rankings } = await sb
        .from("medico_ranking")
        .select("medico_id, ranking_score, total_avaliacoes, media_avaliacoes");

      // Build available doctors context
      if (medicos && medicos.length > 0) {
        doctorInstructions = "\n\n## Sugestão de Médicos:\nVocê pode sugerir médicos quando o paciente perguntar sobre especialidades.\n";
        doctorInstructions += "Médicos disponíveis:\n";
        for (const med of medicos) {
          const rank = rankings?.find((r: any) => r.medico_id === med.id);
          doctorInstructions += `- Dr(a). ${med.nome_completo} | ${med.especialidade || "Geral"} | CRM: ${med.crm}`;
          if (rank) {
            doctorInstructions += ` | Avaliação: ${rank.media_avaliacoes?.toFixed(1) || "N/A"}/5 (${rank.total_avaliacoes || 0} avaliações)`;
          }
          doctorInstructions += "\n";
        }
        doctorInstructions += "\nAo sugerir médicos:\n";
        doctorInstructions += "- Priorize por avaliação, disponibilidade e custo-benefício\n";
        doctorInstructions += "- Use linguagem humanizada e natural\n";
        doctorInstructions += "- Ofereça enviar link de agendamento\n";
        doctorInstructions += "- Nunca exponha dados financeiros detalhados\n";
      }
    }

    // Compose system prompt
    const systemPrompt = [
      settings.base_prompt || "",
      settings.knowledge_base ? `\n\n## Base de Conhecimento:\n${settings.knowledge_base}` : "",
      settings.safety_rules ? `\n\n## Regras de Segurança (OBRIGATÓRIAS):\n${settings.safety_rules}` : "",
      handoffInstructions,
      doctorInstructions,
    ].join("");

    // Build messages array
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(chatMessages || [{ role: "user", content: message }]),
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model || "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: settings.max_tokens || 1024,
        temperature: settings.temperature || 0.4,
        stream: !simulate,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione fundos nas configurações do workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao consultar IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For simulation (non-streaming), return JSON
    if (simulate) {
      const result = await aiResponse.json();
      const content = result.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ response: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming response
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-respond error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
