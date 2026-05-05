import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell, Calendar, Loader2, Search,
  Sparkles, CheckCircle2, Inbox, Stethoscope,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import type { LucideIcon } from "lucide-react";

/* ─── Tipos ─── */
type ConvComConsulta = {
  id: string;
  contact_name: string | null;
  status: string;
  consulta_id: string | null;
  medico_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  consulta_inicio?: string | null;
  consulta_status?: string | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  body: string | null;
  message_type: string;
  status: string;
  created_at: string;
};

const senderMeta: Record<string, { icon: LucideIcon; label: string }> = {
  sistema:     { icon: Bell,          label: "Sistema" },
  bot:         { icon: Sparkles,      label: "Bot" },
  ia:          { icon: Sparkles,      label: "IA" },
  medico:      { icon: Stethoscope,   label: "Médico" },
  colaborador: { icon: CheckCircle2,  label: "Atendimento" },
};

export default function MedicoMensagensConsultas() {
  const { session } = useSession();
  const [searchParams] = useSearchParams();
  const convParam = searchParams.get("conv");

  const [convs, setConvs] = useState<ConvComConsulta[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(convParam);
  const [busca, setBusca] = useState("");

  // Carregar conversas vinculadas ao médico
  const loadConvs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, contact_name, status, consulta_id, medico_id, last_message_at, last_message_preview, unread_count")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);

    let enriched: ConvComConsulta[] = (data || []) as ConvComConsulta[];

    const consultaIds = enriched.map(c => c.consulta_id).filter(Boolean) as string[];
    if (consultaIds.length > 0) {
      const { data: consultas } = await supabase
        .from("consultas")
        .select("id, inicio, status")
        .in("id", consultaIds);
      if (consultas) {
        const cMap = new Map(consultas.map(c => [c.id, c]));
        enriched = enriched.map(c => {
          const consulta = c.consulta_id ? cMap.get(c.consulta_id) : null;
          return {
            ...c,
            consulta_inicio: consulta?.inicio ?? null,
            consulta_status: consulta?.status ?? null,
          };
        });
      }
    }

    setConvs(enriched);
    if (!activeId && enriched.length > 0) setActiveId(enriched[0].id);
    setLoading(false);
  }, [activeId]);

  useEffect(() => { if (session) loadConvs(); }, [session]); // eslint-disable-line

  // Carregar mensagens
  useEffect(() => {
    if (!activeId) { setMsgs([]); return; }
    setLoadingMsgs(true);
    supabase
      .from("messages")
      .select("id, conversation_id, sender_type, sender_name, body, message_type, status, created_at")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setMsgs((data || []) as Msg[]);
        setLoadingMsgs(false);
      });
    // Marcar como lidas
    supabase.rpc("mark_messages_read", { p_conversation_id: activeId }).then(() => {
      setConvs(prev => prev.map(c => c.id === activeId ? { ...c, unread_count: 0 } : c));
    });
  }, [activeId]);

  // Realtime
  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`medico-notif-${activeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${activeId}`,
      }, (payload) => {
        const m = payload.new as Msg;
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  const filtradas = convs.filter(c => {
    if (!busca.trim()) return true;
    const hay = `${c.contact_name ?? ""} ${c.last_message_preview ?? ""}`.toLowerCase();
    return hay.includes(busca.trim().toLowerCase());
  });

  const activeConv = convs.find(c => c.id === activeId) ?? null;

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notificações" description="Faça login para ver suas notificações." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Confirmações, lembretes e avisos das suas consultas"
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] min-h-[500px]">
        {/* Lista */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente…" className="pl-9" />
            </div>
          </div>
          <ScrollArea className="max-h-[540px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : filtradas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" />
                {convs.length === 0 ? "Nenhuma notificação das suas consultas." : "Nenhum resultado."}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtradas.map((c) => {
                  const ativa = c.id === activeId;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setActiveId(c.id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-accent/30",
                          ativa && "bg-accent/40",
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Bell className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {c.unread_count > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                            <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium text-foreground/80")}>
                              {c.contact_name ?? "Consulta"}
                            </p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.last_message_preview ?? "Sem notificações"}
                          </p>
                          {c.consulta_inicio && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              <Calendar className="inline h-3 w-3 mr-0.5" />
                              {new Date(c.consulta_inicio).toLocaleDateString("pt-BR")}
                              {c.consulta_status && ` · ${c.consulta_status}`}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </section>

        {/* Painel de notificações (read-only) */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <div className="space-y-2">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecione uma notificação</p>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{activeConv.contact_name ?? "Consulta"}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeConv.consulta_inicio
                      ? `Consulta: ${new Date(activeConv.consulta_inicio).toLocaleDateString("pt-BR")}`
                      : "Notificações automáticas"}
                    {activeConv.consulta_status && ` · ${activeConv.consulta_status}`}
                  </p>
                </div>
              </header>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 p-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                    </div>
                  ) : msgs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                      <Bell className="h-8 w-8 opacity-40" />
                      <p>Nenhuma notificação nesta conversa.</p>
                    </div>
                  ) : (
                    msgs.map((m) => {
                      const meta = senderMeta[m.sender_type] ?? senderMeta.sistema;
                      const Icon = meta.icon;
                      return (
                        <div key={m.id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{meta.label}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(m.created_at).toLocaleString("pt-BR", {
                                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                              {m.body ?? "📎 Anexo"}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Rodapé informativo — sem input de envio */}
              <div className="border-t border-border px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Este canal é somente para notificações automáticas. Para falar com o paciente, use o Inbox.
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
