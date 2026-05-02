import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Google OAuth não configurado.", not_configured: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceKey);

    const {
      medico_id,
      consulta_id,
      titulo,
      inicio,
      fim,
      descricao,
    } = await req.json();

    if (!medico_id || !consulta_id || !inicio || !fim) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: medico_id, consulta_id, inicio, fim" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tokens
    const { data: tokenRow } = await serviceClient
      .from("medico_google_tokens")
      .select("*")
      .eq("medico_id", medico_id)
      .single();

    if (!tokenRow) {
      return new Response(
        JSON.stringify({ error: "Médico não tem Google Calendar conectado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = tokenRow.access_token;

    // Refresh if expired
    const expiry = new Date(tokenRow.token_expiry);
    if (expiry <= new Date(Date.now() + 60_000)) {
      const refreshed = await refreshAccessToken(
        tokenRow.refresh_token,
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );
      if (!refreshed) {
        return new Response(
          JSON.stringify({ error: "Falha ao renovar token Google. Reconecte sua conta." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await serviceClient
        .from("medico_google_tokens")
        .update({ access_token: accessToken, token_expiry: newExpiry })
        .eq("medico_id", medico_id);
    }

    // Create Calendar event with Meet
    const event = {
      summary: titulo || "Consulta Médica",
      description: descricao || `Consulta via plataforma. ID: ${consulta_id}`,
      start: { dateTime: inicio, timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim, timeZone: "America/Sao_Paulo" },
      conferenceData: {
        createRequest: {
          requestId: consulta_id,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const calRes = await fetch(
      `${GOOGLE_CALENDAR_URL}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const calData = await calRes.json();

    if (!calRes.ok) {
      console.error("Google Calendar error:", calData);
      return new Response(
        JSON.stringify({ error: "Falha ao criar evento no Google Calendar.", details: calData.error?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const meetLink = calData.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === "video"
    )?.uri;

    // Update consulta with meet link
    if (meetLink) {
      await serviceClient
        .from("consultas")
        .update({ link_sala: meetLink })
        .eq("id", consulta_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        meet_link: meetLink || null,
        calendar_event_id: calData.id,
        calendar_html_link: calData.htmlLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("google-create-meet error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
