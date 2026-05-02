import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          error: "Google OAuth não configurado. Credenciais serão adicionadas na etapa de integração.",
          not_configured: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client for auth
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
    const userId = claims.claims.sub as string;

    // Service client for DB ops
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get medico_id
    const { data: medico } = await serviceClient
      .from("medicos")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!medico) {
      return new Response(JSON.stringify({ error: "Perfil de médico não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, redirect_uri, code } = await req.json();

    // ---- GET AUTH URL ----
    if (action === "get-auth-url") {
      if (!redirect_uri) {
        return new Response(JSON.stringify({ error: "redirect_uri obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state: medico.id,
      });
      return new Response(
        JSON.stringify({ url: `${GOOGLE_AUTH_URL}?${params.toString()}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- EXCHANGE CODE ----
    if (action === "exchange-code") {
      if (!code || !redirect_uri) {
        return new Response(JSON.stringify({ error: "code e redirect_uri obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Google token exchange failed:", tokenData);
        return new Response(
          JSON.stringify({ error: "Falha ao trocar código por token.", details: tokenData.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get Google email
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

      // Upsert token
      const { error: upsertErr } = await serviceClient
        .from("medico_google_tokens")
        .upsert(
          {
            medico_id: medico.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || "",
            token_expiry: expiresAt,
            scopes: SCOPES,
            google_email: userInfo.email || null,
          },
          { onConflict: "medico_id" }
        );

      if (upsertErr) {
        console.error("Upsert token error:", upsertErr);
        return new Response(
          JSON.stringify({ error: "Falha ao salvar token." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update tipo_sala to dinamico
      await serviceClient
        .from("medicos")
        .update({ tipo_sala: "dinamico" })
        .eq("id", medico.id);

      return new Response(
        JSON.stringify({ success: true, google_email: userInfo.email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- DISCONNECT ----
    if (action === "disconnect") {
      // Get token to revoke
      const { data: tokenRow } = await serviceClient
        .from("medico_google_tokens")
        .select("access_token")
        .eq("medico_id", medico.id)
        .single();

      if (tokenRow?.access_token) {
        // Best-effort revoke
        await fetch(`${GOOGLE_REVOKE_URL}?token=${tokenRow.access_token}`, {
          method: "POST",
        }).catch(() => {});
      }

      await serviceClient
        .from("medico_google_tokens")
        .delete()
        .eq("medico_id", medico.id);

      // Revert to fixo
      await serviceClient
        .from("medicos")
        .update({ tipo_sala: "fixo" })
        .eq("id", medico.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- STATUS ----
    if (action === "status") {
      const { data: tokenRow } = await serviceClient
        .from("medico_google_tokens")
        .select("google_email, token_expiry, scopes, created_at")
        .eq("medico_id", medico.id)
        .single();

      const { data: medicoData } = await serviceClient
        .from("medicos")
        .select("tipo_sala, link_sala_padrao")
        .eq("id", medico.id)
        .single();

      return new Response(
        JSON.stringify({
          connected: !!tokenRow,
          google_email: tokenRow?.google_email || null,
          connected_at: tokenRow?.created_at || null,
          tipo_sala: medicoData?.tipo_sala || "fixo",
          link_sala_padrao: medicoData?.link_sala_padrao || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-oauth error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
