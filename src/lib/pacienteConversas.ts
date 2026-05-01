import { supabase } from "@/integrations/supabase/client";

export type ConversaPaciente = {
  id: string;
  contact_name: string | null;
  status: string;
  channel: string;
  origin: string;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  medico_id: string | null;
  consulta_id: string | null;
};

export type MensagemPaciente = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  body: string | null;
  message_type: string;
  status: string;
  created_at: string;
};

/** Busca conversations vinculadas ao paciente logado */
export async function listConversasPaciente(): Promise<ConversaPaciente[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, contact_name, status, channel, origin, unread_count, last_message_at, last_message_preview, medico_id, consulta_id")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Erro ao carregar conversas:", error.message);
    return [];
  }
  return (data ?? []) as ConversaPaciente[];
}

/** Busca mensagens de uma conversa */
export async function listMensagensConversa(conversationId: string): Promise<MensagemPaciente[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_type, sender_name, body, message_type, status, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao carregar mensagens:", error.message);
    return [];
  }
  return (data ?? []) as MensagemPaciente[];
}

/** Envia mensagem como paciente */
export async function enviarMensagemPaciente(conversationId: string, body: string, senderName: string) {
  const { data: user } = await supabase.auth.getUser();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "paciente" as any,
    sender_id: user?.user?.id ?? null,
    sender_name: senderName,
    body,
    message_type: "text" as any,
    status: "sent" as any,
  });
  if (error) throw new Error(error.message);
}

/** Formata timestamp relativo */
export function formatTempoRelativo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
