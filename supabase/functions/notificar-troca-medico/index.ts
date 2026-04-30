// Edge function: envia notificação WhatsApp ao paciente quando a secretaria
// troca o médico de uma consulta. Usa Meta WhatsApp Cloud API com template
// aprovado "troca_medico" (pt_BR, 5 variáveis).
//
// Body esperado:
// { consulta_id: string }
//
// Carrega os dados da consulta no servidor (com role do usuário) para evitar
// que o cliente injete valores arbitrários no template.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ consulta_id: z.string().uuid() });

const TEMPLATE_NAME =
  Deno.env.get("META_WHATSAPP_TEMPLATE_NAME") || "troca_medico";
const TEMPLATE_LANG = "pt_BR";

function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

/** Normaliza p/ E.164 BR. Aceita "+55..." ou números BR sem +. */
function toE164BR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const d = onlyDigits(trimmed);
    return d.length >= 10 ? d : null; // Meta usa sem o '+'
  }
  let d = onlyDigits(trimmed);
  if (d.length === 10 || d.length === 11) d = "55" + d; // BR
  return d.length >= 12 ? d : null;
}

function fmtDataHora(inicio: string): string {
  try {
    const dt = new Date(inicio);
    const data = dt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const hora = dt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${data} às ${hora}`;
  } catch {
    return inicio;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WA_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
    const WA_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

    if (!WA_TOKEN || !WA_PHONE_ID) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "WhatsApp não configurado (META_WHATSAPP_TOKEN / META_WHATSAPP_PHONE_NUMBER_ID).",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1) Autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } =
      await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // 2) Validação body
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const { consulta_id } = parsed.data;

    // 3) Autorização: só admin ou secretaria podem disparar
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: rolesRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = new Set((rolesRows ?? []).map((r: any) => r.role));
    if (!roles.has("admin") && !roles.has("secretaria")) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Carrega dados da consulta (server-side)
    const { data: consulta, error: cErr } = await admin
      .from("consultas")
      .select(
        "id, inicio, link_sala, modalidade, paciente_id, medico_id, especialidade_id",
      )
      .eq("id", consulta_id)
      .maybeSingle();
    if (cErr || !consulta) {
      return new Response(
        JSON.stringify({ error: "consulta não encontrada" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const [{ data: paciente }, { data: medico }, { data: esp }] =
      await Promise.all([
        admin
          .from("pacientes")
          .select("nome_completo, telefone")
          .eq("id", consulta.paciente_id)
          .maybeSingle(),
        admin
          .from("medicos")
          .select("nome")
          .eq("id", consulta.medico_id)
          .maybeSingle(),
        consulta.especialidade_id
          ? admin
              .from("especialidades")
              .select("nome")
              .eq("id", consulta.especialidade_id)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

    const telE164 = toE164BR(paciente?.telefone);
    if (!telE164) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          reason: "paciente sem telefone válido",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const v1 = (paciente?.nome_completo || "paciente").slice(0, 60);
    const v2 = (medico?.nome || "—").slice(0, 60);
    const v3 = fmtDataHora(consulta.inicio);
    const v4 = (esp?.nome || "Consulta").slice(0, 60);
    const v5 =
      consulta.modalidade === "online"
        ? consulta.link_sala || "será enviado em breve"
        : "Atendimento presencial";

    // 5) Envio Meta WhatsApp Cloud API
    const url = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      to: telE164,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: [v1, v2, v3, v4, v5].map((text) => ({
              type: "text",
              text,
            })),
          },
        ],
      },
    };

    const waRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const waBody = await waRes.json().catch(() => ({}));

    if (!waRes.ok) {
      console.error("[notificar-troca-medico] Meta error", waRes.status, waBody);
      return new Response(
        JSON.stringify({ ok: false, status: waRes.status, error: waBody }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, to: telE164, meta: waBody }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error("[notificar-troca-medico] erro", e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? "erro" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
