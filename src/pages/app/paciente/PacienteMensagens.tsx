import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Calendar, CheckCircle2, Check, Settings, Search, Inbox,
  Stethoscope, MessageSquare, Sparkles, Bell,
  Send, Loader2, type LucideIcon, User, MessageCircle, Paperclip, Download, FileText, X,
  ChevronDown,
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
  marcarMensagensComoLidas,
  formatTempoRelativo,
  type ConversaPaciente,
  type MensagemPaciente,
} from "@/lib/pacienteConversas";
import { toast } from "sonner";

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

const CONV_PAGE_SIZE = 20;
const MSG_PAGE_SIZE = 50;

export default function PacienteMensagens() {
  const { session } = useSession();
  const [searchParams] = useSearchParams();
  const convParam = searchParams.get("conv");

  const [conversas, setConversas] = useState<ConversaPaciente[]>([]);
  const [convsTotal, setConvsTotal] = useState(0);
  const [convsPage, setConvsPage] = useState(0);
  const [mensagens, setMensagens] = useState<MensagemPaciente[]>([]);
  const [msgsTotal, setMsgsTotal] = useState(0);
  const [msgsPage, setMsgsPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(convParam);
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [novaMsg, setNovaMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);

  // Load conversations (server-side search + pagination)
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    listConversasPaciente({ search: buscaDebounced, page: convsPage, pageSize: CONV_PAGE_SIZE }).then((res) => {
      setConversas(res.data);
      setConvsTotal(res.total);
      if (!selectedConvId && res.data.length > 0) setSelectedConvId(res.data[0].id);
      setLoading(false);
    });
  }, [session, buscaDebounced, convsPage]); // eslint-disable-line

  // Load messages when conversation changes
  useEffect(() => {
    if (!selectedConvId || !session) { setMensagens([]); return; }
    setLoadingMsgs(true);
    setMsgsPage(0);
    listMensagensConversa(selectedConvId, { page: 0, pageSize: MSG_PAGE_SIZE }).then((res) => {
      setMensagens(res.data);
      setMsgsTotal(res.total);
      setLoadingMsgs(false);
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    marcarMensagensComoLidas(selectedConvId).then(() => {
      setConversas((prev) =>
        prev.map((c) => c.id === selectedConvId ? { ...c, unread_count: 0 } : c)
      );
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
        setMensagens((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        const meta = senderMeta[msg.sender_type];
        if (meta?.align !== "right") {
          toast.info(`${msg.sender_name ?? meta?.label ?? "Nova mensagem"}: ${(msg.body ?? "📎 Anexo").slice(0, 60)}`, {
            duration: 4000,
          });
          marcarMensagensComoLidas(selectedConvId);
        }
        setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId, session]);

  // Global realtime subscription
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel("global-msgs-paciente")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.conversation_id === selectedConvId) return;
        const meta = senderMeta[msg.sender_type];
        if (meta?.align === "right") return;
        setConversas((prev) =>
          prev.map((c) =>
            c.id === msg.conversation_id
              ? { ...c, unread_count: c.unread_count + 1, last_message_preview: msg.body ?? "📎 Anexo", last_message_at: msg.created_at }
              : c,
          ),
        );
        toast.info(`Nova mensagem de ${msg.sender_name ?? "Atendimento"}`, { duration: 3000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, selectedConvId]);

  // Realtime: listen to UPDATE on messages (read receipts)
  useEffect(() => {
    if (!selectedConvId || !session) return;
    const channel = supabase
      .channel(`msgs-update-${selectedConvId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConvId}`,
      }, (payload) => {
        const updated = payload.new as MensagemPaciente;
        setMensagens((prev) =>
          prev.map((m) => m.id === updated.id ? { ...m, read_at: updated.read_at } : m),
        );
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

  const loadMoreMsgs = async () => {
    if (!selectedConvId) return;
    const nextPage = msgsPage + 1;
    setLoadingMsgs(true);
    const res = await listMensagensConversa(selectedConvId, { page: nextPage, pageSize: MSG_PAGE_SIZE });
    setMensagens((prev) => [...prev, ...res.data]);
    setMsgsPage(nextPage);
    setLoadingMsgs(false);
  };

  const convSelecionada = conversas.find((c) => c.id === selectedConvId);
  const totalNaoLidas = conversas.reduce((s, c) => s + c.unread_count, 0);
  const hasMoreConvs = conversas.length < convsTotal;
  const hasMoreMsgs = mensagens.length < msgsTotal;

  // ─── Sem sessão → pedir login ───
  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mensagens" description="Faça login para ver suas conversas." />
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-muted">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Você precisa estar logado para acessar suas mensagens.</p>
        </div>
      </div>
    );
  }

  // ─── Sem conversas → empty state limpo ───
  if (!loading && conversas.length === 0 && !buscaDebounced) {
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
                value={busca} onChange={(e) => { setBusca(e.target.value); setConvsPage(0); }}
                placeholder="Buscar conversas…" className="pl-9"
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
                <Inbox className="h-8 w-8 opacity-50" /> Nenhuma conversa encontrada
              </div>
            ) : (
              <>
                <ul className="divide-y divide-border">
                  {conversas.map((c) => {
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
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
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
                {hasMoreConvs && (
                  <div className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => setConvsPage((p) => p + 1)}>
                      <ChevronDown className="mr-1 h-3.5 w-3.5" /> Carregar mais
                    </Button>
                  </div>
                )}
              </>
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
                  {hasMoreMsgs && (
                    <div className="text-center pb-2">
                      <Button variant="ghost" size="sm" onClick={loadMoreMsgs} disabled={loadingMsgs}>
                        {loadingMsgs ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="mr-1 h-3.5 w-3.5 rotate-180" />}
                        Carregar anteriores
                      </Button>
                    </div>
                  )}
                  {loadingMsgs && mensagens.length === 0 ? (
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
                            {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
                            {m.attachment_url && (
                              <AttachmentPreview
                                url={m.attachment_url}
                                name={m.attachment_name}
                                type={m.attachment_type}
                                isMe={isMe}
                              />
                            )}
                            <div className={cn(
                              "mt-1 flex items-center gap-1.5",
                              isMe ? "justify-end" : "justify-start",
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                isMe ? "text-primary-foreground/60" : "text-muted-foreground",
                              )}>
                                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {isMe && (
                                <ReadReceipt readAt={m.read_at} isMe={isMe} />
                              )}
                            </div>
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
                <div className="border-t border-border p-3 space-y-2">
                  {pendingFile && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate flex-1">{pendingFile.name}</span>
                      <span className="text-xs text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileSelect}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      title="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
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
                      disabled={(!novaMsg.trim() && !pendingFile) || sending}
                      onClick={enviar}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                  {uploading && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Enviando anexo…
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Read Receipt ─── */
function ReadReceipt({ readAt, isMe }: { readAt: string | null; isMe: boolean }) {
  if (!isMe) return null;
  return (
    <span title={readAt ? `Lido em ${new Date(readAt).toLocaleString("pt-BR")}` : "Enviado"}>
      {readAt ? (
        <CheckCircle2 className="h-3 w-3 text-primary-foreground/80" />
      ) : (
        <Check className="h-3 w-3 text-primary-foreground/40" />
      )}
    </span>
  );
}

/* ─── Attachment Preview ─── */
function AttachmentPreview({ url, name, type, isMe }: { url: string; name: string | null; type: string | null; isMe: boolean }) {
  const isImage = type?.startsWith("image/");
  const fileName = name ?? "arquivo";

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        <img
          src={url}
          alt={fileName}
          className="max-w-[240px] max-h-[180px] rounded-lg object-cover border border-border/30"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition hover:opacity-80",
        isMe
          ? "border-primary-foreground/20 text-primary-foreground"
          : "border-border bg-background text-foreground",
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{fileName}</span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </a>
  );
}
