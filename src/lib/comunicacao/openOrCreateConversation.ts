import { supabase } from "@/integrations/supabase/client";

function normalizePhone(v: string | null | undefined): string {
  return (v || "").replace(/\D/g, "");
}

interface Args {
  pacienteId?: string | null;
  telefone?: string | null;
  nome?: string | null;
}

/**
 * Find existing WhatsApp conversation for a paciente (by patient_id or phone)
 * or create a new one. Returns conversation id.
 */
export async function openOrCreatePacienteConversation({ pacienteId, telefone, nome }: Args): Promise<string> {
  const digits = normalizePhone(telefone);

  // 1) Try by patient_id
  if (pacienteId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, last_message_at")
      .eq("patient_id", pacienteId)
      .neq("channel", "interno")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (data && data.length > 0) return data[0].id;
  }

  // 2) Try by phone
  if (digits.length >= 8) {
    const { data } = await supabase
      .from("conversations")
      .select("id, last_message_at")
      .neq("channel", "interno")
      .ilike("contact_phone", `%${digits}%`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (data && data.length > 0) return data[0].id;
  }

  // 3) Create new
  if (!digits) throw new Error("Paciente sem telefone — não é possível criar conversa.");

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      channel: "whatsapp",
      origin: "operacional",
      status: "aberta",
      contact_phone: digits,
      contact_name: nome ?? null,
      patient_id: pacienteId ?? null,
      priority: "normal",
      bot_active: false,
      ai_active: false,
    } as any)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data!.id;
}
