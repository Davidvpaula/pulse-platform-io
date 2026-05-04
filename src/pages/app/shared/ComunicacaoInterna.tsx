import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Send, Filter, Users2, Plus, Clock, Stethoscope, Building2, ShieldCheck, ShieldAlert,
  ExternalLink, MessageSquareText, Loader2, AlertCircle, CheckCircle2, ArrowUp,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatTempoRelativo } from "@/lib/pacienteConversas";

/* ── Types ── */
type Origem = "Secretaria ↔ Médico" | "Secretaria ↔ Admin" | "Empresa ↔ Secretaria" | "Médico ↔ Admin";
type Status = "aberta" | "respondida" | "resolvida";
type Prioridade = "baixa" | "normal" | "alta";

type Thread = {
  id: string;
  assunto: string;
  origem: Origem;
  status: Status;
  prioridade: Prioridade;
  participantes: string[];
  paciente_id: string | null;
  agendamento_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

/* ── Helpers ── */
const origemIcon: Record<Origem, React.ElementType> = {
  "Secretaria ↔ Médico": Stethoscope,
  "Secretaria ↔ Admin": ShieldCheck,
  "Empresa ↔ Secretaria": Building2,
  "Médico ↔ Admin": ShieldAlert,
};

const statusTone: Record<Status, string> = {
  aberta: "bg-warning/10 text-warning",
  respondida: "bg-info/10 text-info",
  resolvida: "bg-success/10 text-success",
};

const prioridadeTone: Record<Prioridade, string> = {
  alta: "bg-destructive/10 text-destructive",
  normal: "bg-muted text-muted-foreground",
  baixa: "bg-muted/60 text-muted-foreground",
};


const ORIGENS: Origem[] = [
  "Secretaria ↔ Médico",
  "Secretaria ↔ Admin",
  "Empresa ↔ Secretaria",
  "Médico ↔ Admin",
];

/* ══════════════════════════════════════════════════════════ */
export default function ComunicacaoInterna() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const location = useLocation();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [filtro, setFiltro] = useState<Origem | "todas">("todas");
  const [selId, setSelId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  // Nova thread dialog
  const [novaOpen, setNovaOpen] = useState(false);
  const [novaForm, setNovaForm] = useState({ assunto: "", origem: "" as string, prioridade: "normal" as Prioridade });
  const [novaCriando, setNovaCriando] = useState(false);

  const msgsEndRef = useRef<HTMLDivElement>(null);

  /* ── Carregar threads ── */
  const carregarThreads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("internal_threads")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("Erro ao carregar threads", { description: error.message });
      setLoading(false);
      return;
    }
    setThreads((data ?? []) as Thread[]);

    // Resolve profile names
    const allUserIds = new Set<string>();
    (data ?? []).forEach((t: any) => {
      (t.participantes ?? []).forEach((uid: string) => allUserIds.add(uid));
      if (t.created_by) allUserIds.add(t.created_by);
    });
    if (allUserIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", Array.from(allUserIds));
      const map: Record<string, string> = {};
      (profs ?? []).forEach(p => { map[p.id] = p.nome; });
      setProfiles(prev => ({ ...prev, ...map }));
    }
    setLoading(false);
  }, []);

  /* ── Carregar mensagens da thread ── */
  const carregarMensagens = useCallback(async (threadId: string) => {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from("internal_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) {
      toast.error("Erro ao carregar mensagens");
    }
    setMessages((data ?? []) as Message[]);

    // Resolve authors
    const authorIds = new Set((data ?? []).map((m: any) => m.author_id));
    const missing = Array.from(authorIds).filter(id => !profiles[id]);
    if (missing.length) {
      const { data: profs } = await supabase.from("profiles").select("id, nome").in("id", missing);
      const map: Record<string, string> = {};
      (profs ?? []).forEach(p => { map[p.id] = p.nome; });
      setProfiles(prev => ({ ...prev, ...map }));
    }
    setLoadingMsgs(false);
    setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [profiles]);

  useEffect(() => { if (session) carregarThreads(); }, [session, carregarThreads]);
  useEffect(() => { if (selId) carregarMensagens(selId); }, [selId]);

  /* ── Realtime ── */
  useEffect(() => {
    const channel = supabase
      .channel("internal-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.thread_id === selId) {
          setMessages(prev => [...prev, msg]);
          // Resolve author if needed
          if (!profiles[msg.author_id]) {
            supabase.from("profiles").select("id, nome").eq("id", msg.author_id).maybeSingle()
              .then(({ data }) => {
                if (data) setProfiles(prev => ({ ...prev, [data.id]: data.nome }));
              });
          }
          setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
        // Refresh threads to update order
        carregarThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selId, profiles, carregarThreads]);

  /* ── Enviar mensagem ── */
  async function enviarMensagem() {
    if (!selId || !msgText.trim() || !userId) return;
    setSending(true);
    const { error } = await supabase.from("internal_messages").insert({
      thread_id: selId,
      author_id: userId,
      content: msgText.trim(),
    } as any);
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar", { description: error.message });
    } else {
      setMsgText("");
    }
  }

  /* ── Criar thread ── */
  async function criarThread() {
    if (!novaForm.assunto.trim() || !novaForm.origem || !userId) {
      toast.error("Preencha assunto e canal");
      return;
    }
    setNovaCriando(true);
    const { data, error } = await supabase.from("internal_threads").insert({
      assunto: novaForm.assunto.trim(),
      origem: novaForm.origem,
      prioridade: novaForm.prioridade,
      participantes: [userId],
      created_by: userId,
    } as any).select().maybeSingle();
    setNovaCriando(false);
    if (error) {
      toast.error("Erro ao criar conversa", { description: error.message });
    } else {
      toast.success("Conversa criada!");
      setNovaOpen(false);
      setNovaForm({ assunto: "", origem: "", prioridade: "normal" });
      await carregarThreads();
      if (data) setSelId(data.id);
    }
  }

  /* ── Alterar status/prioridade ── */
  async function alterarStatus(threadId: string, novoStatus: Status) {
    const { error } = await supabase
      .from("internal_threads")
      .update({ status: novoStatus } as any)
      .eq("id", threadId);
    if (error) {
      toast.error("Erro ao alterar status");
    } else {
      toast.success(`Status alterado para "${novoStatus}"`);
      carregarThreads();
    }
  }

  async function alterarPrioridade(threadId: string, novaPrioridade: Prioridade) {
    const { error } = await supabase
      .from("internal_threads")
      .update({ prioridade: novaPrioridade } as any)
      .eq("id", threadId);
    if (error) {
      toast.error("Erro ao alterar prioridade");
    } else {
      toast.success(`Prioridade alterada para "${novaPrioridade}"`);
      carregarThreads();
    }
  }

  /* ── Filtro ── */
  const lista = useMemo(() => {
    return filtro === "todas" ? threads : threads.filter(t => t.origem === filtro);
  }, [threads, filtro]);

  const sel = threads.find(t => t.id === selId) ?? null;

  // Derive back path
  const voltarBase = location.pathname.includes("/admin/")
    ? "/app/admin"
    : location.pathname.includes("/medico/")
    ? "/app/medico"
    : location.pathname.includes("/colaborador/")
    ? "/app/colaborador"
    : "/app/secretaria";

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Comunicação interna" description="Faça login para acessar." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicação interna da equipe"
        description="Mensagens entre Secretaria, Médicos, Admin e Empresas — separado das conversas com pacientes (WhatsApp)."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setNovaOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Nova conversa
          </Button>
        }
      />

      {/* Filtro de canais */}
      <div className="card-elevated flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canais:</span>
        {(["todas", ...ORIGENS] as const).map(c => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filtro === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {c === "todas" ? "Todos" : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando conversas…
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[340px_1fr_280px] card-elevated overflow-hidden min-h-[500px]">
          {/* ── Lista de threads ── */}
          <div className="border-r border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lista.length} conversa{lista.length === 1 ? "" : "s"}
              </p>
            </div>
            {lista.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <AlertCircle className="mx-auto mb-2 h-6 w-6 opacity-40" />
                Nenhuma conversa{filtro !== "todas" ? ` no canal "${filtro}"` : ""}.
              </div>
            ) : (
              <ul className="max-h-[560px] overflow-y-auto divide-y divide-border">
                {lista.map(t => {
                  const Icon = origemIcon[t.origem];
                  const active = sel?.id === t.id;
                  const partNomes = t.participantes.map(uid => profiles[uid] ?? "…").join(", ");
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelId(t.id)}
                        className={cn(
                          "w-full text-left p-4 transition-colors hover:bg-muted/50",
                          active && "bg-primary-soft/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="flex-1 truncate text-sm font-semibold">{t.assunto}</p>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{partNomes}</p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", statusTone[t.status])}>
                            {t.status}
                          </span>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", prioridadeTone[t.prioridade])}>
                            {t.prioridade}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground">{formatTempoRelativo(t.updated_at)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Conversa ── */}
          <div className="flex flex-col">
            {!sel ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground p-8">
                <MessageSquareText className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm">Selecione uma conversa ou crie uma nova</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{sel.assunto}</p>
                    <p className="text-xs text-muted-foreground">
                      <Users2 className="mr-1 inline h-3 w-3" />
                      {sel.participantes.map(uid => profiles[uid] ?? "…").join(" · ")}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone[sel.status])}>
                    {sel.status}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 bg-muted/20 max-h-[440px]">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center p-8 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground p-8">
                      Nenhuma mensagem ainda. Envie a primeira!
                    </div>
                  ) : (
                    messages.map(m => {
                      const isMe = m.author_id === userId;
                      return (
                        <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                            isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm",
                          )}>
                            {m.content}
                          </div>
                          <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                            {profiles[m.author_id] ?? "…"} · {formatTempoRelativo(m.created_at)}
                          </p>
                        </div>
                      );
                    })
                  )}
                  <div ref={msgsEndRef} />
                </div>

                {sel.status !== "resolvida" && (
                  <div className="border-t border-border p-3">
                    <form
                      onSubmit={(e) => { e.preventDefault(); enviarMensagem(); }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={msgText}
                        onChange={e => setMsgText(e.target.value)}
                        placeholder="Escreva uma mensagem para a equipe…"
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        disabled={sending}
                      />
                      <Button type="submit" disabled={sending || !msgText.trim()} className="bg-gradient-primary hover:opacity-90">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </form>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      💬 Mensagem interna · não enviada ao paciente
                    </p>
                  </div>
                )}

                {sel.status === "resolvida" && (
                  <div className="border-t border-border p-3 text-center">
                    <p className="text-xs text-success flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Conversa resolvida
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Contexto / ações ── */}
          <div className="border-l border-border bg-muted/10 p-5 space-y-4">
            {sel ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                  <Select
                    value={sel.status}
                    onValueChange={(v) => alterarStatus(sel.id, v as Status)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="respondida">Respondida</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Prioridade</p>
                  <Select
                    value={sel.prioridade}
                    onValueChange={(v) => alterarPrioridade(sel.id, v as Prioridade)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Participantes</p>
                  <div className="space-y-1">
                    {sel.participantes.map(uid => (
                      <p key={uid} className="text-xs">{profiles[uid] ?? uid.slice(0, 8)}</p>
                    ))}
                  </div>
                </div>

                {sel.paciente_id && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vinculado a</p>
                    <Link to={`${voltarBase}/pacientes/${sel.paciente_id}`} className="card-elevated flex items-center justify-between p-3 mt-2 hover:shadow-elegant">
                      <div>
                        <p className="text-xs text-muted-foreground">Paciente</p>
                        <p className="text-sm font-medium">{sel.paciente_id.slice(0, 8)}…</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Info</p>
                  <p className="text-xs text-muted-foreground">Canal: {sel.origem}</p>
                  <p className="text-xs text-muted-foreground">Criada: {formatTempoRelativo(sel.created_at)}</p>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Selecione uma conversa para ver detalhes.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Dialog: Nova conversa ── */}
      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova conversa interna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assunto</Label>
              <Input
                value={novaForm.assunto}
                onChange={e => setNovaForm(f => ({ ...f, assunto: e.target.value }))}
                placeholder="Ex: Confirmar exame do paciente X"
              />
            </div>
            <div>
              <Label>Canal</Label>
              <Select value={novaForm.origem} onValueChange={v => setNovaForm(f => ({ ...f, origem: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o canal" /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={novaForm.prioridade} onValueChange={v => setNovaForm(f => ({ ...f, prioridade: v as Prioridade }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOpen(false)}>Cancelar</Button>
            <Button onClick={criarThread} disabled={novaCriando} className="bg-gradient-primary">
              {novaCriando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
