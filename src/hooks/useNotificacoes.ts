import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";

export type Notificacao = {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  lida: boolean;
  referencia_tipo: string | null;
  referencia_id: string | null;
  perfil: string;
  created_at: string;
};

export function useNotificacoes(limit = 20) {
  const { session } = useSession();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotificacoes = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    const items = (data ?? []) as Notificacao[];
    setNotificacoes(items);
    setUnreadCount(items.filter((n) => !n.lida).length);
    setLoading(false);
  }, [session?.user?.id, limit]);

  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  // Realtime
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel(`notificacoes-realtime-${session.user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => fetchNotificacoes()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const marcarLida = useCallback(async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    if (!session?.user?.id) return;
    await supabase
      .from("notificacoes")
      .update({ lida: true })
      .eq("user_id", session.user.id)
      .eq("lida", false);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    setUnreadCount(0);
  }, [session?.user?.id]);

  return { notificacoes, loading, unreadCount, marcarLida, marcarTodasLidas, refetch: fetchNotificacoes };
}
