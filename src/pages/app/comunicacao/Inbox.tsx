import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Send, Search, Bot, Sparkles, UserCheck, MessageSquarePlus,
  Phone, FileText, CreditCard, Calendar, ArrowRightLeft, Pause, Play, X, AlertCircle, FileEdit
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Conv = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  channel: string;
  origin: string;
  priority: string;
  bot_active: boolean;
  ai_active: boolean;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  assigned_to: string | null;
  patient_id: string | null;
  lead_id: string | null;
  consulta_id: string | null;
  intent: string | null;
  tags: string[];
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

type Template = { id: string; name: string; content: string; category: string };

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_atendimento: "Em atendimento",
  pendente: "Pendente",
  fechada: "Fechada",
  arquivada: "Arquivada",
};

export default function ComunicacaoInbox() {
  const { user } = useSession();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroResp, setFiltroResp] = useState<string>("todas");
  const [draft, setDraft] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carrega lista
  async function loadConvs() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);
    setConvs((data || []) as Conv[]);
  }

  async function loadMsgs(id: string) {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(500);
    setMsgs((data || []) as Msg[]);
    setLoadingMsgs(false);
    // marca lidas
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", id);
  }

  async function loadTemplates() {
    const { data } = await supabase
      .from("message_templates")
      .select("id,name,content,category")
      .eq("active", true)
      .order("name");
    setTemplates((data || []) as Template[]);
  }

  useEffect(() => {
    loadConvs();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (activeId) loadMsgs(activeId);
  }, [activeId]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvs())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload: any) => {
        const m = payload.new as Msg;
        if (m.conversation_id === activeId) {
          setMsgs(prev => [...prev, m]);
        }
        loadConvs();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  // scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return convs.filter(c => {
      if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
      if (filtroResp === "minhas" && c.assigned_to !== user?.id) return false;
      if (filtroResp === "nao_atribuidas" && c.assigned_to) return false;
      if (q) {
        const hay = `${c.contact_name || ""} ${c.contact_phone || ""} ${c.last_message_preview || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [convs, busca, filtroStatus, filtroResp, user]);

  const active = convs.find(c => c.id === activeId) || null;

  async function enviar() {
    if (!draft.trim() || !active || !user) return;
    const body = draft;
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: active.id,
      sender_type: "colaborador",
      sender_id: user.id,
      sender_name: user.name,
      body,
      message_type: "text",
      status: "sent",
    });
    if (error) { toast.error(error.message); setDraft(body); return; }
  }

  async function aplicarTemplate(t: Template) {
    setDraft(t.content);
  }

  async function assumir() {
    if (!active || !user) return;
    const { error } = await supabase.from("conversations").update({
      assigned_to: user.id,
      status: "em_atendimento",
    }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Conversa assumida");
  }

  async function fechar() {
    if (!active || !user) return;
    const { error } = await supabase.from("conversations").update({
      status: "fechada",
      closed_at: new Date().toISOString(),
      closed_by: user.id,
    }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Conversa finalizada");
  }

  async function toggleBot() {
    if (!active) return;
    await supabase.from("conversations").update({ bot_active: !active.bot_active, ai_active: false }).eq("id", active.id);
  }

  async function toggleAI() {
    if (!active) return;
    await supabase.from("conversations").update({ ai_active: !active.ai_active, bot_active: false }).eq("id", active.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox"
        description="Atendimento de pacientes e leads via WhatsApp."
      />

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[600px]">
        {/* COLUNA ESQUERDA */}
        <Card className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col overflow-hidden">
          <div className="border-b p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, telefone..." className="pl-8" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroResp} onValueChange={setFiltroResp}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="minhas">Minhas</SelectItem>
                  <SelectItem value="nao_atribuidas">Não atribuídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa.</div>
            )}
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full text-left border-b px-3 py-3 hover:bg-muted/50 transition-colors",
                  activeId === c.id && "bg-muted"
                )}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{(c.contact_name || c.contact_phone || "?").substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{c.contact_name || c.contact_phone || "Sem nome"}</span>
                      {c.unread_count > 0 && <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{c.unread_count}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "—"}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px] py-0 h-4">{STATUS_LABEL[c.status] || c.status}</Badge>
                      {c.bot_active && <Bot className="h-3 w-3 text-blue-500" />}
                      {c.ai_active && <Sparkles className="h-3 w-3 text-purple-500" />}
                      {c.priority === "urgente" && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* CENTRO */}
        <Card className="col-span-12 md:col-span-8 lg:col-span-6 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="border-b p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{active.contact_name || active.contact_phone}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {active.contact_phone || "sem número"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={toggleBot} title={active.bot_active ? "Pausar bot" : "Ativar bot"}>
                    {active.bot_active ? <Pause className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={toggleAI} title={active.ai_active ? "Pausar IA" : "Ativar IA"}>
                    <Sparkles className={cn("h-4 w-4", active.ai_active && "text-purple-500")} />
                  </Button>
                  {active.assigned_to !== user?.id && (
                    <Button size="sm" variant="outline" onClick={assumir}><UserCheck className="h-4 w-4 mr-1" />Assumir</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={fechar}><X className="h-4 w-4 mr-1" />Finalizar</Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
                {loadingMsgs && <div className="text-center text-xs text-muted-foreground">Carregando...</div>}
                <div className="space-y-3">
                  {msgs.map(m => {
                    const isExt = m.sender_type === "paciente" || m.sender_type === "lead";
                    const isBot = m.sender_type === "bot" || m.sender_type === "ia";
                    return (
                      <div key={m.id} className={cn("flex", isExt ? "justify-start" : "justify-end")}>
                        <div className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                          isExt ? "bg-muted" : isBot ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900" : "bg-primary text-primary-foreground"
                        )}>
                          {isBot && <div className="text-[10px] font-semibold mb-0.5 flex items-center gap-1">{m.sender_type === "ia" ? <Sparkles className="h-3 w-3" /> : <Bot className="h-3 w-3" />}{m.sender_name || m.sender_type}</div>}
                          {!isBot && !isExt && <div className="text-[10px] opacity-70 mb-0.5">{m.sender_name}</div>}
                          <div className="whitespace-pre-wrap">{m.body}</div>
                          <div className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="border-t p-3 space-y-2">
                {templates.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {templates.slice(0, 5).map(t => (
                      <Button key={t.id} size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => aplicarTemplate(t)}>
                        <FileEdit className="h-3 w-3 mr-1" />{t.name}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                  />
                  <Button onClick={enviar} disabled={!draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* COLUNA DIREITA */}
        <Card className="hidden lg:flex col-span-3 flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-xs text-muted-foreground">—</div>
          ) : (
            <ScrollArea className="flex-1 p-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Contato</h4>
                <p className="text-sm font-medium">{active.contact_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{active.contact_phone}</p>
                {active.lead_id && <Badge variant="secondary" className="mt-2 text-[10px]">Lead</Badge>}
                {active.patient_id && <Badge variant="default" className="mt-2 text-[10px]">Paciente</Badge>}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4">Origem & intenção</h4>
                <div className="text-xs space-y-1">
                  <div>Canal: <Badge variant="outline" className="text-[10px]">{active.channel}</Badge></div>
                  <div>Origem: <Badge variant="outline" className="text-[10px]">{active.origin}</Badge></div>
                  {active.intent && <div>Intenção: <Badge variant="outline" className="text-[10px]">{active.intent}</Badge></div>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4">Ações rápidas</h4>
                <div className="space-y-1">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" disabled={!active.patient_id}>
                    <Calendar className="h-3 w-3 mr-2" /> Criar agendamento
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <CreditCard className="h-3 w-3 mr-2" /> Enviar cobrança
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <FileText className="h-3 w-3 mr-2" /> Documentos
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                    <ArrowRightLeft className="h-3 w-3 mr-2" /> Transferir setor
                  </Button>
                </div>
              </div>

              {active.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 mt-4">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {active.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}
