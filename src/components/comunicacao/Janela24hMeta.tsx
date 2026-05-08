import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Window = {
  last_inbound_at: string;
  window_expires_at: string;
};

type Props = { conversationId: string };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirada";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}min`;
  return `${m}min`;
}

export function Janela24hMeta({ conversationId }: Props) {
  const [win, setWin] = useState<Window | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from("conversation_meta_window")
      .select("last_inbound_at, window_expires_at")
      .eq("conversation_id", conversationId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setWin(data as Window | null);
        setLoading(false);
      });

    const ch = supabase
      .channel(`meta-window-${conversationId}`)
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
          if (payload.new) setWin(payload.new as Window);
        }
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

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Clock className="h-3 w-3 animate-pulse" /> Janela 24h…
      </div>
    );
  }

  const expiresAt = win ? new Date(win.window_expires_at).getTime() : 0;
  const remaining = expiresAt - now;
  const expired = !win || remaining <= 0;

  let tone:
    | { color: string; icon: JSX.Element; label: string; bg: string }
    | null = null;

  if (expired) {
    tone = {
      color: "text-muted-foreground",
      bg: "bg-muted/50 border-border",
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Janela 24h expirada — exige template",
    };
  } else if (remaining < 2 * 3_600_000) {
    tone = {
      color: "text-destructive",
      bg: "bg-destructive/10 border-destructive/30",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: `⚠ Expira em ${formatRemaining(remaining)}`,
    };
  } else if (remaining < 12 * 3_600_000) {
    tone = {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: `${formatRemaining(remaining)} restantes`,
    };
  } else {
    tone = {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: `Janela aberta — ${formatRemaining(remaining)}`,
    };
  }

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Janela Meta 24h
      </h4>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-medium",
          tone.bg,
          tone.color
        )}
      >
        {tone.icon}
        <span>{tone.label}</span>
      </div>
      {win && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Última msg do paciente:{" "}
          {new Date(win.last_inbound_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
