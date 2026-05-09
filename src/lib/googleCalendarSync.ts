import { supabase } from "@/integrations/supabase/client";

/**
 * Sincroniza uma consulta com o Google Calendar do médico.
 * Operação interna é a fonte da verdade — falhas aqui NÃO devem quebrar o fluxo.
 * Use sempre fire-and-forget (sem await bloqueante na UI principal).
 */
export async function syncConsultaToGoogle(
  consultaId: string,
  action: "upsert" | "delete" = "upsert",
): Promise<void> {
  try {
    await supabase.functions.invoke("google-calendar-sync", {
      body: { consulta_id: consultaId, action },
    });
  } catch (e) {
    // silencioso por design
    console.warn("[google-sync] falha silenciosa", consultaId, action, e);
  }
}
