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
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  read_at: string | null;
};

/** Busca conversations vinculadas ao paciente logado (paginada + busca server-side) */
export async function listConversasPaciente(opts?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: ConversaPaciente[]; total: number }> {
  const page = opts?.page ?? 0;
  const pageSize = opts?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("conversations")
    .select("id, contact_name, status, channel, origin, unread_count, last_message_at, last_message_preview, medico_id, consulta_id", { count: "exact" })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (opts?.search?.trim()) {
    query = query.ilike("contact_name", `%${opts.search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("Erro ao carregar conversas:", error.message);
    return { data: [], total: 0 };
  }
  return { data: (data ?? []) as ConversaPaciente[], total: count ?? 0 };
}

/** Busca mensagens de uma conversa (paginada, mais recentes primeiro, invertido no front) */
export async function listMensagensConversa(
  conversationId: string,
  opts?: { page?: number; pageSize?: number },
): Promise<{ data: MensagemPaciente[]; total: number }> {
  const page = opts?.page ?? 0;
  const pageSize = opts?.pageSize ?? 50;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_type, sender_name, body, message_type, status, created_at, attachment_url, attachment_name, attachment_type, read_at", { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Erro ao carregar mensagens:", error.message);
    return { data: [], total: 0 };
  }
  return { data: (data ?? []) as MensagemPaciente[], total: count ?? 0 };
}

/** @deprecated Paciente não envia mensagens pelo sistema interno. */
export async function enviarMensagemPaciente(
  _conversationId: string,
  _body: string,
  _senderName: string,
  _attachment?: { url: string; name: string; type: string },
) {
  throw new Error("Paciente não pode enviar mensagens pelo sistema interno. Use o WhatsApp oficial.");
}

/** @deprecated Upload removido — paciente não envia pelo sistema. */
export async function uploadAnexoMensagem(_file: File): Promise<{ url: string; name: string; type: string }> {
  throw new Error("Upload de anexo desabilitado para paciente.");
}

/** Marca todas as mensagens de uma conversa como lidas */
export async function marcarMensagensComoLidas(conversationId: string) {
  const { error } = await supabase.rpc("mark_messages_read", {
    p_conversation_id: conversationId,
  });
  if (error) console.error("Erro ao marcar lidas:", error.message);
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
