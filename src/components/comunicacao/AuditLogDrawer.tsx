import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lock, Unlock, ArrowRightLeft, UserPlus, CheckCircle2, Star, FileText, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AuditEntry = {
  id: string;
  action: string;
  actor_user_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string | null;
};

const ACTION_META: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  assumir: { label: "Assumiu conversa", icon: <Lock className="h-3.5 w-3.5" />, color: "text-blue-600" },
  liberar: { label: "Liberou conversa", icon: <Unlock className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
  transferir: { label: "Transferiu", icon: <ArrowRightLeft className="h-3.5 w-3.5" />, color: "text-amber-600" },
  vincular_paciente: { label: "Vinculou paciente", icon: <UserPlus className="h-3.5 w-3.5" />, color: "text-purple-600" },
  confirmar_vinculo: { label: "Confirmou vínculo", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-600" },
  trocar_paciente_ativo: { label: "Trocou paciente ativo", icon: <Star className="h-3.5 w-3.5" />, color: "text-primary" },
  leitura_prontuario: { label: "Leu prontuário", icon: <FileText className="h-3.5 w-3.5" />, color: "text-rose-600" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export function AuditLogDrawer({ open, onOpenChange, conversationId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actorNames, setActorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !conversationId) return;
    setLoading(true);
    supabase
      .from("conversation_audit_log")
      .select("id, action, actor_user_id, payload, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(async ({ data }) => {
        const list = (data || []) as AuditEntry[];
        setEntries(list);
        const ids = Array.from(new Set(list.map((e) => e.actor_user_id).filter(Boolean))) as string[];
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, nome, email")
            .in("id", ids);
          const map: Record<string, string> = {};
          (profs || []).forEach((p: any) => { map[p.id] = p.nome || p.email || p.id.slice(0, 8); });
          setActorNames(map);
        }
        setLoading(false);
      });
  }, [open, conversationId]);

  // Realtime — appends new audit entries
  useEffect(() => {
    if (!open || !conversationId) return;
    const ch = supabase
      .channel(`audit-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_audit_log",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setEntries((prev) => [payload.new as AuditEntry, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, conversationId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit log da conversa</SheetTitle>
          <SheetDescription>
            Eventos de operação (assumir, liberar, transferir, vincular paciente, confirmar vínculo).
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] mt-4 pr-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando…
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-3">
              {entries.map((e) => {
                const meta = ACTION_META[e.action] ?? {
                  label: e.action,
                  icon: <FileText className="h-3.5 w-3.5" />,
                  color: "text-muted-foreground",
                };
                const actor = e.actor_user_id ? actorNames[e.actor_user_id] : "Sistema";
                return (
                  <li key={e.id} className="ml-4">
                    <div className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-background border-2 ${meta.color}`} />
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className={meta.color}>{meta.icon}</span>
                      <span>{meta.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {actor ?? "—"} · {relTime(e.created_at)}
                    </p>
                    {e.payload && Object.keys(e.payload).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                          ver detalhes
                        </summary>
                        <pre className="text-[10px] bg-muted/50 rounded p-1.5 mt-1 overflow-x-auto">
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
