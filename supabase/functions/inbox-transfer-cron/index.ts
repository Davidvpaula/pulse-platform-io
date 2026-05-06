import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * inbox-transfer-cron
 *
 * Previously called a non-existent RPC `vincular_medico_conversa_pre_consulta`.
 * That RPC was never created, so this function now returns a no-op success
 * to stop the recurring error logs.
 *
 * When the inbox/conversation linking feature is implemented,
 * the proper logic should be added here.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({ ok: true, status: "noop", message: "inbox-transfer-cron: awaiting implementation", timestamp: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
