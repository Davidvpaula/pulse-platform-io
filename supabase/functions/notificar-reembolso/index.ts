// Notifica paciente e médico sobre eventos de reembolso.
// Chamado via supabase.functions.invoke() após insert/update em reembolsos.
// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STATUS_LABELS: Record<string, string> = {
  solicitado: "solicitado",
  em_analise: "em análise",
  aprovado: "aprovado",
  recusado: "recusado",
  concluido: "concluído",
};

function formatBRL(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

async function getOrCreateConversation(
  admin: any,
  opts: { patient_id?: string; medico_id?: string; contact_name: string },
) {
  const filter: any = { channel: "sistema", status: "aberta" };
  if (opts.patient_id) filter.patient_id = opts.patient_id;
  if (opts.medico_id) filter.medico_id = opts.medico_id;

  let query = admin.from("conversations").select("id, unread_count");
  for (const [k, v] of Object.entries(filter)) query = query.eq(k, v);
  const { data: existing } = await query.limit(1).maybeSingle();

  if (existing) return existing;

  const { data: created } = await admin
    .from("conversations")
    .insert({
      ...filter,
      origin: "sistema",
      contact_name: opts.contact_name,
      priority: "normal",
    })
    .select("id, unread_count")
    .single();
  return created;
}

async function sendSystemMessage(admin: any, convId: string, body: string, currentUnread: number) {
  await admin.from("messages").insert({
    conversation_id: convId,
    sender_type: "sistema",
    sender_name: "Sistema",
    body,
    message_type: 1,
  });
  await admin
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: body.substring(0, 100),
      unread_count: (currentUnread || 0) + 1,
    })
    .eq("id", convId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const reembolsoId: string | undefined = body?.reembolso_id;
    const evento: string | undefined = body?.evento;

    if (!reembolsoId || !evento) {
      return new Response(
        JSON.stringify({ error: "reembolso_id e evento obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar reembolso
    const { data: reembolso } = await admin
      .from("reembolsos")
      .select("id, valor_centavos, motivo, status, consulta_id")
      .eq("id", reembolsoId)
      .maybeSingle();
    if (!reembolso) {
      return new Response(
        JSON.stringify({ error: "Reembolso não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Buscar consulta
    const { data: consulta } = await admin
      .from("consultas")
      .select("id, paciente_id, medico_id, inicio")
      .eq("id", reembolso.consulta_id)
      .maybeSingle();
    if (!consulta) {
      return new Response(
        JSON.stringify({ ok: false, reason: "consulta not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: paciente }, { data: medico }] = await Promise.all([
      admin.from("pacientes").select("id, nome_completo, user_id").eq("id", consulta.paciente_id).maybeSingle(),
      admin.from("medicos").select("id, nome, user_id").eq("id", consulta.medico_id).maybeSingle(),
    ]);

    const valor = formatBRL(reembolso.valor_centavos);
    const statusLabel = STATUS_LABELS[evento] ?? evento;
    const dataConsulta = new Date(consulta.inicio).toLocaleDateString("pt-BR");

    // Mensagens
    const msgPaciente =
      evento === "solicitado"
        ? `Seu reembolso de ${valor} referente à consulta de ${dataConsulta} foi solicitado e está sendo processado. Motivo: ${reembolso.motivo}. Acompanhe o status pelo seu painel.`
        : `Seu reembolso de ${valor} referente à consulta de ${dataConsulta} foi ${statusLabel}.${evento === "concluido" ? " O valor será creditado em breve." : ""}`;

    const msgMedico =
      evento === "solicitado"
        ? `Um reembolso de ${valor} foi solicitado pelo paciente ${paciente?.nome_completo ?? "—"} referente à consulta de ${dataConsulta}. Motivo: ${reembolso.motivo}.`
        : `O reembolso de ${valor} do paciente ${paciente?.nome_completo ?? "—"} (consulta de ${dataConsulta}) foi ${statusLabel}.`;

    // Notificar paciente
    if (paciente) {
      const conv = await getOrCreateConversation(admin, {
        patient_id: paciente.id,
        contact_name: paciente.nome_completo ?? "Paciente",
      });
      if (conv) await sendSystemMessage(admin, conv.id, msgPaciente, conv.unread_count ?? 0);
    }

    // Notificar médico
    if (medico) {
      const conv = await getOrCreateConversation(admin, {
        medico_id: medico.id,
        contact_name: medico.nome ?? "Médico",
      });
      if (conv) await sendSystemMessage(admin, conv.id, msgMedico, conv.unread_count ?? 0);
    }

    console.log(`[notificar-reembolso] evento=${evento} reembolso=${reembolsoId} ok`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[notificar-reembolso] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
