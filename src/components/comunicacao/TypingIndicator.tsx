import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil } from "lucide-react";

type Props = { conversationId: string; currentUserId?: string | null };

type Typer = { user_id: string; updated_at: string; is_typing: boolean };

export function TypingIndicator({ conversationId, currentUserId }: Props) {
  const [typers, setTypers] = useState<Typer[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    const fetch = async () => {
      const cutoff = new Date(Date.now() - 8000).toISOString();
      const { data } = await supabase
        .from("conversation_typing")
        .select("user_id, updated_at, is_typing")
        .eq("conversation_id", conversationId)
        .eq("is_typing", true)
        .gte("updated_at", cutoff);
      if (!alive) return;
      const filtered = (data || []).filter(t => t.user_id !== currentUserId) as Typer[];
      setTypers(filtered);
      // load names lazily
      const missing = filtered.filter(t => !names[t.user_id]).map(t => t.user_id);
      if (missing.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", missing);
        if (profs) {
          setNames(prev => ({ ...prev, ...Object.fromEntries(profs.map((p: any) => [p.user_id, p.full_name || "Atendente"])) }));
        }
      }
    };
    fetch();
    const ch = supabase
      .channel(`typing-${conversationId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_typing", filter: `conversation_id=eq.${conversationId}` },
        () => fetch())
      .subscribe();
    const t = setInterval(fetch, 4000);
    return () => { alive = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [conversationId, currentUserId]);

  if (!typers.length) return null;
  const label = typers.length === 1
    ? `${names[typers[0].user_id] || "Atendente"} está digitando…`
    : `${typers.length} pessoas digitando…`;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic px-3 pb-1">
      <Pencil className="h-3 w-3 animate-pulse" /> {label}
    </div>
  );
}
