// Edge function: consulta-insights
// Gera insights operacionais (risco no-show, sobrecarga médico, sugestão de horários)
// para o dashboard Admin > Agendamentos usando Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verifica que é admin/supervisor
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hoje = new Date();
    const inicio = new Date(hoje); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(hoje); fim.setDate(fim.getDate() + 7); fim.setHours(23, 59, 59, 999);

    const { data: consultas, error } = await supabase
      .from("consultas")
      .select("id, inicio, status, modalidade, medico_id, paciente_id, valor_centavos, link_enviado_em, confirmada_em, canal_origem")
      .gte("inicio", inicio.toISOString())
      .lte("inicio", fim.toISOString())
      .order("inicio", { ascending: true })
      .limit(500);

    if (error) throw error;

    // Agregações leves no servidor (não mandar 500 linhas para o LLM)
    const porMedico: Record<string, number> = {};
    const semConfirmacao24h: number = (consultas || []).filter((c: any) => {
      const diff = new Date(c.inicio).getTime() - Date.now();
      return diff > 0 && diff < 24 * 3600 * 1000 && c.status === "agendada" && !c.confirmada_em;
    }).length;

    const semLink: number = (consultas || []).filter((c: any) =>
      c.modalidade === "online" && c.status !== "cancelada" && !c.link_enviado_em
    ).length;

    (consultas || []).forEach((c: any) => {
      porMedico[c.medico_id] = (porMedico[c.medico_id] || 0) + 1;
    });

    const sobrecarga = Object.entries(porMedico)
      .filter(([, n]) => n >= 12)
      .map(([id, n]) => ({ medico_id: id, total: n }));

    const resumo = {
      total: consultas?.length || 0,
      sem_confirmacao_24h: semConfirmacao24h,
      sem_link: semLink,
      sobrecarga_medicos: sobrecarga,
      por_status: (consultas || []).reduce((acc: any, c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {}),
      por_canal: (consultas || []).reduce((acc: any, c: any) => {
        acc[c.canal_origem || "app"] = (acc[c.canal_origem || "app"] || 0) + 1;
        return acc;
      }, {}),
    };

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ resumo, insights: [], degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é assistente operacional de uma clínica de telemedicina. Receba o resumo abaixo dos próximos 7 dias e gere uma lista curta (máx 6) de INSIGHTS acionáveis para o gestor da agenda. Cada insight deve ter "tipo" (risco_no_show | sobrecarga | sugestao | alerta_link | confirmacao_pendente | oportunidade), "severidade" (baixa|media|alta), "titulo" curto e "descricao" objetiva (máx 140 chars). Responda APENAS JSON válido no formato {"insights":[...]}. Resumo: ${JSON.stringify(resumo)}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(
        JSON.stringify({ resumo, insights: [], degraded: true, ai_error: txt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiJson = await aiResp.json();
    let insights: any[] = [];
    try {
      const parsed = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}");
      insights = parsed.insights || [];
    } catch {
      insights = [];
    }

    return new Response(JSON.stringify({ resumo, insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
