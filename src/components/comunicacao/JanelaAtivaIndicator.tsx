import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { conversationId: string };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirada";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}min`;
  return `${m}min`;
}

/**
 * Indicador compacto exibido junto ao composer enquanto a janela 24h da Meta
 * está ABERTA. Quando expira, o componente não renderiza nada (o
 * JanelaExpiradaBanner cobre esse caso).
 */
export function JanelaAtivaIndicator({ conversationId }: Props) {
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    supabase
      .from("conversation_meta_window")
      .select("window_expires_at")
      .eq("conversation_id", conversationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setExpiresAt(data?.window_expires_at ? new Date(data.window_expires_at).getTime() : null);
      });

    const ch = supabase
      .channel(`meta-window-indic-${conversationId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_meta_window",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          if (!alive) return;
          const v = payload.new?.window_expires_at;
          setExpiresAt(v ? new Date(v).getTime() : null);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!expiresAt) return null;
  const remaining = expiresAt - now;
  if (remaining <= 0) return null; // expirada → quem renderiza é o banner

  const urgent = remaining < 2 * 3_600_000;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
        urgent
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      {urgent ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>
        <strong>Janela ativa</strong> — restam {formatRemaining(remaining)}
      </span>
    </div>
  );
}
