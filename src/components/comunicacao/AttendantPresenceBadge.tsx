import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  userId: string | null | undefined;
  showLabel?: boolean;
};

const TONE: Record<string, { dot: string; label: string }> = {
  online: { dot: "bg-emerald-500", label: "Online" },
  ocupado: { dot: "bg-amber-500", label: "Ocupado" },
  ausente: { dot: "bg-zinc-400", label: "Ausente" },
  offline: { dot: "bg-muted-foreground/40", label: "Offline" },
};

export function AttendantPresenceBadge({ userId, showLabel }: Props) {
  const [status, setStatus] = useState<string>("offline");

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const fetchPresence = async () => {
      const { data } = await supabase
        .from("attendant_presence")
        .select("status, last_seen_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!alive) return;
      if (!data) { setStatus("offline"); return; }
      const stale = Date.now() - new Date(data.last_seen_at).getTime() > 90_000;
      setStatus(stale ? "offline" : (data.status || "offline"));
    };
    fetchPresence();
    const ch = supabase
      .channel(`presence-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendant_presence", filter: `user_id=eq.${userId}` },
        () => fetchPresence())
      .subscribe();
    const t = setInterval(fetchPresence, 60_000);
    return () => { alive = false; clearInterval(t); supabase.removeChannel(ch); };
  }, [userId]);

  const tone = TONE[status] || TONE.offline;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <span className={cn("h-2 w-2 rounded-full", tone.dot)} />
      {showLabel && tone.label}
    </span>
  );
}
