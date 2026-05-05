import { useEffect, useState } from "react";
import {
  Bell, Calendar, CheckCircle2, Search, Stethoscope,
  MessageCircle, Sparkles, Loader2, Inbox, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversasPaciente,
  listMensagensConversa,
  marcarMensagensComoLidas,
  formatTempoRelativo,
  type ConversaPaciente,
  type MensagemPaciente,
} from "@/lib/pacienteConversas";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import type { LucideIcon } from "lucide-react";

/* ─── Ícone por tipo de remetente ─── */
const senderMeta: Record<string, { icon: LucideIcon; label: string }> = {
  sistema:     { icon: Bell,        label: "Sistema" },
  bot:         { icon: Sparkles,    label: "Bot" },
  ia:          { icon: Sparkles,    label: "IA" },
  medico:      { icon: Stethoscope, label: "Médico" },
  colaborador: { icon: CheckCircle2, label: "Atendimento" },
};

const CONV_PAGE_SIZE = 20;

export default function PacienteMensagens() {
  const { session } = useSession();

  const [conversas, setConversas] = useState<ConversaPaciente[]>([]);
  const [mensagens, setMensagens] = useState<MensagemPaciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);

  // Carregar conversas
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    listConversasPaciente({ search: buscaDebounced, page: 0, pageSize: CONV_PAGE_SIZE }).then((res) => {
      setConversas(res.data);
      if (!selectedConvId && res.data.length > 0) setSelectedConvId(res.data[0].id);
      setLoading(false);
    });
  }, [session, buscaDebounced]); // eslint-disable-line

  // Carregar mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConvId || !session) { setMensagens([]); return; }
    setLoadingMsgs(true);
    listMensagensConversa(selectedConvId, { page: 0, pageSize: 50 }).then((res) => {
      setMensagens(res.data);
      setLoadingMsgs(false);
    });
    marcarMensagensComoLidas(selectedConvId);
  }, [selectedConvId, session]);

  // Realtime — novas notificações
  useEffect(() => {
    if (!selectedConvId || !session) return;
    const channel = supabase
      .channel(`notif-${selectedConvId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload) => {
        const msg = payload.new as MensagemPaciente;
        setMensagens((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        marcarMensagensComoLidas(selectedConvId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, session]);

  // ─── Sem sessão ───
  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notificações" description="Faça login para ver suas notificações." />
        <EmptyCenter icon={Bell} text="Faça login para acessar suas notificações." />
      </div>
    );
  }

  // ─── Sem conversas ───
  if (!loading && conversas.length === 0 && !buscaDebounced) {
    return (
      <div className="space-y-6">
        <PageHeader title="Notificações" description="Acompanhe avisos e lembretes das suas consultas" />
        <EmptyCenter
          icon={Bell}
          text="Nenhuma notificação ainda"
          sub="Quando você tiver consultas, receberá confirmações, lembretes e avisos aqui."
        />
        <div className="flex flex-col items-center gap-3">
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" /> Agendar consulta</Link>
          </Button>
          <WhatsAppCTA />
        </div>
      </div>
    );
  }

  const convSelecionada = conversas.find((c) => c.id === selectedConvId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Confirmações, lembretes e avisos das suas consultas"
        actions={<WhatsAppCTA />}
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] min-h-[500px]">
        {/* Lista de conversas/consultas */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar…" className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="max-h-[540px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : conversas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" /> Nenhuma notificação encontrada
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversas.map((c) => {
                  const ativa = c.id === selectedConvId;
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => setSelectedConvId(c.id)}
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
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTempoRelativo(c.last_message_at)}
                        </span>
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
          {!convSelecionada ? (
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
                  <p className="truncate font-semibold">{convSelecionada.contact_name ?? "Consulta"}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {convSelecionada.origin} · Notificações automáticas
                  </p>
                </div>
              </header>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 p-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-sm text-muted-foreground">
                      <Bell className="h-8 w-8 opacity-40" />
                      <p>Nenhuma notificação nesta conversa.</p>
                    </div>
                  ) : (
                    mensagens.map((m) => {
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
                <p className="text-xs text-muted-foreground mb-2">
                  Este canal é somente para notificações automáticas.
                </p>
                <WhatsAppCTA size="sm" />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function EmptyCenter({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{text}</p>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function WhatsAppCTA({ size = "default" }: { size?: "sm" | "default" }) {
  return (
    <Button variant="outline" size={size} asChild>
      <a href={whatsappUrl()} target="_blank" rel="noreferrer noopener">
        <MessageCircle className="mr-2 h-4 w-4 text-success" />
        Falar pelo WhatsApp
        <ExternalLink className="ml-1 h-3 w-3 opacity-50" />
      </a>
    </Button>
  );
}
