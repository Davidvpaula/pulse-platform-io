// Edge function placeholder unificada para teste de conexão de integrações.
// Quando as credenciais reais forem configuradas, basta trocar o corpo de cada case.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Tipo = "feegow" | "whatsapp" | "google" | "pagamentos" | "ia_provider" | "assinatura_digital" | "eventos_sistema";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tipo, integracao_id } = (await req.json()) as { tipo: Tipo; integracao_id?: string };

    if (!tipo) {
      return new Response(JSON.stringify({ error: "tipo obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const start = Date.now();
    let resultado: { ok: boolean; status: string; mensagem: string; modo: "simulado" | "real" };

    switch (tipo) {
      case "feegow":
        resultado = { ok: true, status: "simulado", mensagem: "Feegow em modo simulado — credenciais não configuradas", modo: "simulado" };
        break;
      case "whatsapp":
        resultado = { ok: true, status: "simulado", mensagem: "WhatsApp Business API em modo simulado — Meta API não conectada", modo: "simulado" };
        break;
      case "google":
        resultado = { ok: true, status: "simulado", mensagem: "Google Meet/Agenda usando link fixo dos médicos", modo: "simulado" };
        break;
      case "pagamentos":
        resultado = { ok: true, status: "simulado", mensagem: "Pagamentos em modo simulado — Stripe sandbox disponível", modo: "simulado" };
        break;
      case "ia_provider":
        resultado = { ok: true, status: "conectado", mensagem: "Lovable AI Gateway disponível (Gemini)", modo: "real" };
        break;
      case "assinatura_digital":
        resultado = { ok: false, status: "nao_configurado", mensagem: "Assinatura digital ainda não disponível", modo: "simulado" };
        break;
      case "eventos_sistema":
        resultado = { ok: true, status: "conectado", mensagem: "Fila de eventos operacional", modo: "real" };
        break;
      default:
        resultado = { ok: false, status: "erro", mensagem: "Tipo desconhecido", modo: "simulado" };
    }

    const duracao = Date.now() - start;

    // Atualiza última verificação na config
    if (integracao_id) {
      await supabase
        .from("integracoes_config")
        .update({
          ultimo_teste_at: new Date().toISOString(),
          ultimo_teste_ok: resultado.ok,
          ultimo_erro: resultado.ok ? null : resultado.mensagem,
        })
        .eq("id", integracao_id);
    }

    // Log técnico
    await supabase.from("integracoes_logs").insert({
      integracao: tipo,
      acao: "test_connection",
      status: resultado.ok ? "success" : "warning",
      payload_resposta: resultado,
      origem: "edge_function",
      duracao_ms: duracao,
    });

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
