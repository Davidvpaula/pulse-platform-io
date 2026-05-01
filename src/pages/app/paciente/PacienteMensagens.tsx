import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bell, Calendar, CheckCircle2, Repeat, CreditCard, FileText, Video,
  AlertTriangle, Search, Inbox, Filter, Check, Settings,
  Stethoscope, MessageSquare, Sparkles, ChevronRight, Clock,
  Send, Loader2, type LucideIcon, User, MessageCircle, Paperclip, Download, Image, X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversasPaciente,
  listMensagensConversa,
  enviarMensagemPaciente,
  uploadAnexoMensagem,
  formatTempoRelativo,
  type ConversaPaciente,
  type MensagemPaciente,
} from "@/lib/pacienteConversas";
import { toast } from "sonner";

/* ─── Mocks (fallback sem sessão) ─── */
type MockMsg = {
  id: string; categoria: string; titulo: string; resumo: string;
  corpo: string; data: string; lida: boolean; importante?: boolean;
  cta?: { label: string; to: string }; remetente?: string;
};

const catMeta: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  lembrete:     { label: "Lembrete",     icon: Bell,           color: "text-primary",     bg: "bg-primary/10" },
  alteracao:    { label: "Alteração",     icon: AlertTriangle,  color: "text-warning",     bg: "bg-warning/10" },
  retorno:      { label: "Retorno",       icon: Repeat,         color: "text-success",     bg: "bg-success/10" },
  pagamento:    { label: "Pagamento",     icon: CreditCard,     color: "text-destructive", bg: "bg-destructive/10" },
  documento:    { label: "Documento",     icon: FileText,       color: "text-primary",     bg: "bg-primary/10" },
  telemedicina: { label: "Telemedicina",  icon: Video,          color: "text-primary",     bg: "bg-primary/10" },
  sistema:      { label: "Sistema",       icon: Sparkles,       color: "text-muted-foreground", bg: "bg-muted" },
};

const mensagensMock: MockMsg[] = [
  { id: "m1", categoria: "lembrete", titulo: "Sua consulta começa em 1 hora", resumo: "Dr. Rafael Lasmar · Cardiologia · 14:30", corpo: "Lembre-se de testar câmera e microfone.", data: new Date(Date.now() - 5 * 60_000).toISOString(), lida: false, importante: true, cta: { label: "Entrar na sala", to: "/app/paciente/agendamentos" }, remetente: "Automático" },
  { id: "m2", categoria: "retorno", titulo: "Retorno gratuito disponível 🎉", resumo: "Cardiologia · válido por 15 dias", corpo: "Aproveite seu retorno gratuito.", data: new Date(Date.now() - 2 * 3600_000).toISOString(), lida: false, cta: { label: "Agendar retorno", to: "/agendar" }, remetente: "Automático" },
  { id: "m3", categoria: "pagamento", titulo: "Pagamento pendente · R$ 220,00", resumo: "Vence hoje · Cardiologia", corpo: "Pague via Pix, cartão ou boleto.", data: new Date(Date.now() - 24 * 3600_000).toISOString(), lida: false, cta: { label: "Pagar agora", to: "/app/paciente/financeiro" }, remetente: "Financeiro" },
  { id: "m4", categoria: "documento", titulo: "Nova receita disponível", resumo: "Dr. Rafael Lasmar", corpo: "Receita assinada digitalmente disponível.", data: new Date(Date.now() - 2 * 86400_000).toISOString(), lida: true, cta: { label: "Abrir documento", to: "/app/paciente/documentos" }, remetente: "Dr. Rafael Lasmar" },
  { id: "m5", categoria: "sistema", titulo: "Bem-vinda ao MedClin", resumo: "Tudo pronto!", corpo: "Complete seu perfil.", data: new Date(Date.now() - 7 * 86400_000).toISOString(), lida: true, cta: { label: "Completar perfil", to: "/app/paciente/perfil" }, remetente: "MedClin" },
];

function formatDataCompleta(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─── Sender type icon/label ─── */
const senderMeta: Record<string, { icon: LucideIcon; label: string; align: "left" | "right" }> = {
  paciente:    { icon: User,          label: "Você",        align: "right" },
  medico:      { icon: Stethoscope,   label: "Médico",      align: "left" },
  colaborador: { icon: User,          label: "Atendimento", align: "left" },
  bot:         { icon: Sparkles,      label: "Bot",         align: "left" },
  ia:          { icon: Sparkles,      label: "IA",          align: "left" },
  sistema:     { icon: Bell,          label: "Sistema",     align: "left" },
  lead:        { icon: User,          label: "Lead",        align: "left" },
};

export default function PacienteMensagens() {
  const { session } = useSession();
  const [searchParams] = useSearchParams();
  const convParam = searchParams.get("conv");

  const [conversas, setConversas] = useState<ConversaPaciente[]>([]);
  const [mensagens, setMensagens] = useState<MensagemPaciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(convParam);
  const [busca, setBusca] = useState("");
  const [novaMsg, setNovaMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    listConversasPaciente().then((cs) => {
      setConversas(cs);
      if (!selectedConvId && cs.length > 0) setSelectedConvId(cs[0].id);
      setLoading(false);
    });
  }, [session]); // eslint-disable-line

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConvId || !session) { setMensagens([]); return; }
    setLoadingMsgs(true);
    listMensagensConversa(selectedConvId).then((ms) => {
      setMensagens(ms);
      setLoadingMsgs(false);
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [selectedConvId, session]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!selectedConvId || !session) return;
    const channel = supabase
      .channel(`msgs-${selectedConvId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload) => {
        const msg = payload.new as MensagemPaciente;
        setMensagens((prev) => [...prev, msg]);
        setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, session]);

  const enviar = useCallback(async () => {
    if ((!novaMsg.trim() && !pendingFile) || !selectedConvId || sending) return;
    setSending(true);
    try {
      let attachment: { url: string; name: string; type: string } | undefined;
      if (pendingFile) {
        setUploading(true);
        attachment = await uploadAnexoMensagem(pendingFile);
        setUploading(false);
        setPendingFile(null);
      }
      await enviarMensagemPaciente(selectedConvId, novaMsg.trim(), "Paciente", attachment);
      setNovaMsg("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar mensagem");
      setUploading(false);
    } finally {
      setSending(false);
    }
  }, [novaMsg, selectedConvId, sending, pendingFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 10 MB)");
      return;
    }
    setPendingFile(file);
    e.target.value = "";
  };

  const convsFiltradas = useMemo(() => {
    if (!busca.trim()) return conversas;
    const q = busca.toLowerCase();
    return conversas.filter((c) =>
      (c.contact_name ?? "").toLowerCase().includes(q) ||
      (c.last_message_preview ?? "").toLowerCase().includes(q)
    );
  }, [conversas, busca]);

  const convSelecionada = conversas.find((c) => c.id === selectedConvId);
  const totalNaoLidas = conversas.reduce((s, c) => s + c.unread_count, 0);

  // ─── Se não há sessão, mostra mock (notificações) ───
  if (!session) {
    return <MockMensagens />;
  }

  // ─── Se não há conversas reais, mostra empty state com mock ───
  if (!loading && conversas.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mensagens" description="Suas conversas com a equipe de atendimento" />
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Nenhuma conversa ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando você tiver consultas ou interações com a clínica, suas conversas aparecerão aqui.
            </p>
          </div>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" /> Agendar consulta</Link>
          </Button>
        </div>

        {/* Fallback: notificações do sistema (mock) */}
        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" /> Notificações recentes
          </h3>
          <div className="divide-y divide-border">
            {mensagensMock.map((m) => {
              const cat = catMeta[m.categoria] ?? catMeta.sistema;
              const Icon = cat.icon;
              return (
                <div key={m.id} className="flex items-start gap-3 py-3">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cat.bg)}>
                    <Icon className={cn("h-4 w-4", cat.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.resumo}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTempoRelativo(m.data)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── Layout real: lista de conversas + chat ───
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Suas conversas com médicos, secretaria e suporte"
        actions={
          <div className="flex items-center gap-2">
            {totalNaoLidas > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                <Bell className="h-3 w-3" /> {totalNaoLidas} não lida{totalNaoLidas > 1 ? "s" : ""}
              </span>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/app/paciente/perfil"><Settings className="mr-2 h-4 w-4" /> Preferências</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr] min-h-[500px]">
        {/* Lista de conversas */}
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca} onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversas…" className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[540px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : convsFiltradas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-50" /> Nenhuma conversa
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {convsFiltradas.map((c) => {
                  const ativa = c.id === selectedConvId;
                  const Icon = c.medico_id ? Stethoscope : c.origin === "comercial" ? User : MessageCircle;
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
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {c.unread_count > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                            <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium text-foreground/80")}>
                              {c.contact_name ?? "Conversa"}
                            </p>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.last_message_preview ?? "Sem mensagens"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTempoRelativo(c.last_message_at)}
                          </span>
                        </div>
                        {c.unread_count > 0 && (
                          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                            {c.unread_count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </section>

        {/* Chat */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          {!convSelecionada ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <div className="space-y-2">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {convSelecionada.medico_id ? <Stethoscope className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{convSelecionada.contact_name ?? "Conversa"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{convSelecionada.origin} · {convSelecionada.channel}</p>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  convSelecionada.status === "aberta" ? "bg-success/10 text-success" :
                  convSelecionada.status === "em_atendimento" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground",
                )}>
                  {convSelecionada.status === "aberta" ? "Aberta" :
                   convSelecionada.status === "em_atendimento" ? "Em atendimento" :
                   convSelecionada.status === "fechada" ? "Encerrada" : convSelecionada.status}
                </span>
              </header>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 p-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando mensagens…
                    </div>
                  ) : mensagens.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
                  ) : (
                    mensagens.map((m) => {
                      const meta = senderMeta[m.sender_type] ?? senderMeta.sistema;
                      const isMe = meta.align === "right";
                      return (
                        <div key={m.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2.5",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md",
                          )}>
                            {!isMe && (
                              <p className="mb-1 text-[10px] font-semibold opacity-70">
                                {m.sender_name ?? meta.label}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                            <p className={cn(
                              "mt-1 text-[10px]",
                              isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground",
                            )}>
                              {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={msgsEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {convSelecionada.status !== "fechada" && convSelecionada.status !== "arquivada" && (
                <div className="border-t border-border p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={novaMsg}
                      onChange={(e) => setNovaMsg(e.target.value)}
                      placeholder="Digite sua mensagem…"
                      className="min-h-[40px] max-h-[120px] resize-none flex-1"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 shrink-0 bg-gradient-primary hover:opacity-90"
                      disabled={!novaMsg.trim() || sending}
                      onClick={enviar}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Mock fallback (sem sessão) ─── */
function MockMensagens() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens"
        description="Faça login para ver suas conversas"
      />
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-primary" /> Notificações (demonstração)
        </h3>
        <div className="divide-y divide-border">
          {mensagensMock.map((m) => {
            const cat = catMeta[m.categoria] ?? catMeta.sistema;
            const Icon = cat.icon;
            return (
              <div key={m.id} className="flex items-start gap-3 py-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cat.bg)}>
                  <Icon className={cn("h-4 w-4", cat.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.resumo}</p>
                </div>
                {m.cta && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={m.cta.to}>{m.cta.label}</Link>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
