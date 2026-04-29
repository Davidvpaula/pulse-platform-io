// Envia e-mail de confirmação de consulta (Fase E).
// Atualmente registra log; quando o domínio de e-mail for configurado e o template
// transacional for criado, basta substituir o bloco de envio.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const consultaId: string | undefined = body?.consulta_id;
    if (!consultaId) {
      return new Response(JSON.stringify({ error: "consulta_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca dados da consulta + paciente + médico
    const { data: consulta } = await admin
      .from("consultas")
      .select("id, inicio, fim, modalidade, paciente_id, medico_id")
      .eq("id", consultaId)
      .maybeSingle();
    if (!consulta) {
      return new Response(JSON.stringify({ error: "Consulta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: paciente }, { data: medico }] = await Promise.all([
      admin
        .from("pacientes")
        .select("nome_completo, user_id")
        .eq("id", consulta.paciente_id)
        .maybeSingle(),
      admin
        .from("medicos")
        .select("nome, especialidade, email")
        .eq("id", consulta.medico_id)
        .maybeSingle(),
    ]);

    let pacienteEmail: string | null = null;
    if (paciente?.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", paciente.user_id)
        .maybeSingle();
      pacienteEmail = prof?.email ?? null;
    }

    const dados = {
      consulta_id: consulta.id,
      paciente: paciente?.nome_completo ?? null,
      paciente_email: pacienteEmail,
      medico: medico?.nome ?? null,
      medico_email: medico?.email ?? null,
      especialidade: medico?.especialidade ?? null,
      inicio: consulta.inicio,
      fim: consulta.fim,
      modalidade: consulta.modalidade,
    };

    // TODO: Quando o domínio de e-mail estiver configurado (Lovable Emails),
    //       enfileirar via send-transactional-email. Por enquanto, apenas log.
    console.log("[enviar-confirmacao-consulta] (preview)", JSON.stringify(dados));

    return new Response(
      JSON.stringify({ ok: true, simulated: true, ...dados }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[enviar-confirmacao-consulta]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
