// Edge Function: google-calendar-sync
// Espelha consultas no Google Calendar do médico (push-only, idempotente por consulta_id).
// Operação interna é a fonte da verdade. Falhas no Google NUNCA quebram a operação.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

type SyncAction = "upsert" | "delete";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function ensureFreshToken(
  serviceClient: any,
  tokenRow: any,
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  let accessToken = tokenRow.access_token;
  const expiry = new Date(tokenRow.token_expiry);
  if (expiry <= new Date(Date.now() + 60_000)) {
    const refreshed = await refreshAccessToken(
      tokenRow.refresh_token,
      clientId,
      clientSecret,
    );
    if (!refreshed) return null;
    accessToken = refreshed.access_token;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)
      .toISOString();
    await serviceClient
      .from("medico_google_tokens")
      .update({ access_token: accessToken, token_expiry: newExpiry })
      .eq("medico_id", tokenRow.medico_id);
  }
  return accessToken;
}

async function recordResult(
  serviceClient: any,
  consulta_id: string,
  medico_id: string,
  patch: Record<string, unknown>,
) {
  // upsert idempotente
  await serviceClient
    .from("consulta_google_event")
    .upsert(
      {
        consulta_id,
        medico_id,
        ...patch,
      },
      { onConflict: "consulta_id" },
    );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return jsonResponse({ success: false, skipped: true, reason: "google_oauth_not_configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Bypass de auth para chamadas internas (webhook → service role).
    const isInternal = !!token && token === serviceKey;

    if (!isInternal) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const action: SyncAction = body.action ?? "upsert";
    const consulta_id: string | undefined = body.consulta_id;

    if (!consulta_id || !["upsert", "delete"].includes(action)) {
      return jsonResponse({ error: "campos obrigatórios: consulta_id, action" }, 400);
    }

    // Carrega consulta + nomes
    const { data: consulta, error: cErr } = await serviceClient
      .from("consultas")
      .select(
        "id, medico_id, paciente_id, status, modalidade, inicio, fim, link_sala, especialidade_id, servico_id",
      )
      .eq("id", consulta_id)
      .maybeSingle();

    if (cErr || !consulta) {
      return jsonResponse({ success: false, error: "consulta não encontrada" });
    }

    const medico_id = consulta.medico_id as string;

    // Carrega tokens do médico
    const { data: tokenRow } = await serviceClient
      .from("medico_google_tokens")
      .select("*")
      .eq("medico_id", medico_id)
      .maybeSingle();

    if (!tokenRow) {
      await recordResult(serviceClient, consulta_id, medico_id, {
        sync_status: "skipped",
        last_error: "medico sem Google conectado",
      });
      return jsonResponse({ success: true, skipped: true, reason: "medico_sem_google" });
    }

    const accessToken = await ensureFreshToken(
      serviceClient,
      tokenRow,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
    );
    if (!accessToken) {
      await recordResult(serviceClient, consulta_id, medico_id, {
        sync_status: "failed",
        last_error: "falha ao renovar token Google (reconectar)",
      });
      return jsonResponse({ success: false, error: "token_refresh_failed" });
    }

    // Linha existente
    const { data: existing } = await serviceClient
      .from("consulta_google_event")
      .select("*")
      .eq("consulta_id", consulta_id)
      .maybeSingle();

    const calendarId = existing?.calendar_id ?? "primary";
    const attemptsBase = (existing?.attempts ?? 0) + 1;

    // ============ DELETE ============
    const statusCancelled = ["cancelada", "no_show"].includes(consulta.status);
    const wantDelete = action === "delete" || statusCancelled;

    if (wantDelete) {
      if (!existing?.google_event_id) {
        await recordResult(serviceClient, consulta_id, medico_id, {
          sync_status: "deleted",
          last_synced_at: new Date().toISOString(),
          last_error: null,
          attempts: attemptsBase,
        });
        return jsonResponse({ success: true, deleted: true, noop: true });
      }

      const delRes = await fetch(
        `${GOOGLE_CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (delRes.ok || delRes.status === 404 || delRes.status === 410) {
        await recordResult(serviceClient, consulta_id, medico_id, {
          sync_status: "deleted",
          last_synced_at: new Date().toISOString(),
          last_error: null,
          attempts: attemptsBase,
        });
        return jsonResponse({ success: true, deleted: true });
      }

      const txt = await delRes.text();
      await recordResult(serviceClient, consulta_id, medico_id, {
        sync_status: "failed",
        last_error: `delete ${delRes.status}: ${txt.slice(0, 500)}`,
        attempts: attemptsBase,
      });
      return jsonResponse({ success: false, error: "google_delete_failed", status: delRes.status });
    }

    // ============ UPSERT ============
    // Carrega nomes + config do médico (tipo_sala / link_sala_padrao)
    const [{ data: medico }, { data: paciente }] = await Promise.all([
      serviceClient
        .from("medicos")
        .select("nome, tipo_sala, link_sala_padrao")
        .eq("id", medico_id)
        .maybeSingle(),
      serviceClient.from("pacientes").select("nome_completo").eq("id", consulta.paciente_id).maybeSingle(),
    ]);

    let especialidadeNome: string | null = null;
    if (consulta.especialidade_id) {
      const { data: esp } = await serviceClient
        .from("especialidades")
        .select("nome")
        .eq("id", consulta.especialidade_id)
        .maybeSingle();
      especialidadeNome = esp?.nome ?? null;
    }

    // ESTABILIDADE OPERACIONAL: Google Calendar é apenas complemento (lembrete na agenda do médico).
    // Nunca gerar Meet dinâmico aqui. Link da consulta é responsabilidade do trigger
    // `consulta_preencher_link_sala` (copia medicos.link_sala_padrao -> consultas.link_sala no INSERT).
    const isOnline = consulta.modalidade === "online";
    const linkPadrao = (medico as any)?.link_sala_padrao ?? null;
    let linkSala: string | null = consulta.link_sala ?? linkPadrao ?? null;
    const needsMeet = false;

    const pacienteNome = paciente?.nome_completo ?? "Paciente";
    const buildDesc = (currentLink: string | null) =>
      [
        `Consulta ${consulta.modalidade}${especialidadeNome ? ` — ${especialidadeNome}` : ""}`,
        `Paciente: ${pacienteNome}`,
        currentLink ? `Link Meet: ${currentLink}` : null,
        `ID interno: ${consulta_id}`,
      ]
        .filter(Boolean)
        .join("\n");

    const baseEvent: Record<string, unknown> = {
      summary: `Consulta — ${pacienteNome}`,
      description: buildDesc(linkSala),
      start: { dateTime: consulta.inicio, timeZone: "America/Sao_Paulo" },
      end: { dateTime: consulta.fim, timeZone: "America/Sao_Paulo" },
    };

    // Se já existe evento no Google sem Meet e precisamos de Meet, anexar via PATCH com conferenceData.
    const attachMeetExisting = needsMeet && existing?.google_event_id;
    if (needsMeet) {
      baseEvent.conferenceData = {
        createRequest: {
          requestId: consulta_id,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const qs = needsMeet ? "?conferenceDataVersion=1" : "";

    const doPost = async () =>
      await fetch(
        `${GOOGLE_CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events${qs}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(baseEvent),
        },
      );

    let calRes: Response;
    if (existing?.google_event_id) {
      calRes = await fetch(
        `${GOOGLE_CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events/${existing.google_event_id}${qs}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(baseEvent),
        },
      );
      if (calRes.status === 404 || calRes.status === 410) {
        // evento sumiu no Google → recria
        calRes = await doPost();
      }
    } else {
      calRes = await doPost();
    }

    const calData = await calRes.json().catch(() => ({}));

    if (!calRes.ok) {
      await recordResult(serviceClient, consulta_id, medico_id, {
        sync_status: "failed",
        last_error: `${calRes.status}: ${calData?.error?.message ?? "erro desconhecido"}`,
        attempts: attemptsBase,
      });
      console.error("google-calendar-sync upsert error", consulta_id, calRes.status, calData);
      return jsonResponse({ success: false, error: "google_upsert_failed", status: calRes.status });
    }

    // Se o Google devolveu Meet, extrai e grava em consultas.link_sala.
    const meetFromGoogle: string | null =
      calData?.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ??
      calData?.hangoutLink ??
      null;

    if (meetFromGoogle && meetFromGoogle !== linkSala) {
      linkSala = meetFromGoogle;
    }

    if (isOnline && linkSala && linkSala !== consulta.link_sala) {
      await serviceClient.from("consultas").update({ link_sala: linkSala }).eq("id", consulta_id);
    }

    // Se anexamos Meet a um evento existente que não tinha, garante que a descrição contenha o link.
    if (attachMeetExisting && meetFromGoogle) {
      try {
        await fetch(
          `${GOOGLE_CALENDAR_URL}/calendars/${encodeURIComponent(calendarId)}/events/${calData.id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ description: buildDesc(meetFromGoogle) }),
          },
        );
      } catch (_) { /* best-effort */ }
    }

    await recordResult(serviceClient, consulta_id, medico_id, {
      google_event_id: calData.id,
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      last_error: null,
      attempts: attemptsBase,
    });

    return jsonResponse({
      success: true,
      synced: true,
      google_event_id: calData.id,
      html_link: calData.htmlLink ?? null,
    });
  } catch (e) {
    console.error("google-calendar-sync fatal:", e);
    return jsonResponse({ success: false, error: e instanceof Error ? e.message : "internal" });
  }
});
