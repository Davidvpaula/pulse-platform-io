import { useMemo, useState } from "react";
import {
  Send, Paperclip, FileText, ArrowRightLeft, UserPlus, CalendarPlus,
  History, ExternalLink, Phone, Search, Tag, MessageSquare, Bot, Star,
  CheckCheck, AlertCircle, Pin, X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { conversasWpp } from "@/lib/mock";
import { cn } from "@/lib/utils";

const tagTone: Record<string, string> = {
  Paciente: "bg-primary-soft text-primary",
  Confirmado: "bg-success/10 text-success",
  Empresa: "bg-warning/10 text-warning",
  Financeiro: "bg-info/10 text-info",
  "Médico": "bg-accent/10 text-accent",
  Lead: "bg-muted text-muted-foreground",
};

const canalTone: Record<string, string> = {
  Comercial: "bg-primary text-primary-foreground",
  Operacional: "bg-accent text-accent-foreground",
};

const histMock = [
  { from: "them", text: "Olá! Tudo bem? Pode confirmar minha consulta de amanhã?", time: "09:12" },
  { from: "us", text: "Olá Marina! Sim, sua consulta com Dr. Rafael está confirmada para 14:30.", time: "09:14" },
  { from: "them", text: "Perfeito, obrigada! E o link da videochamada?", time: "09:15" },
  { from: "us", text: "Vou te enviar 30 minutos antes. Lembre de testar câmera e microfone 🙂", time: "09:16" },
  { from: "them", text: "Combinado!", time: "09:17" },
];

const agendamentosVinculados = [
  { data: "Amanhã 14:30", medico: "Dr. Rafael Lasmar", esp: "Cardiologia", status: "Confirmado" },
  { data: "20/Abr 09:00", medico: "Dra. Camila Rocha", esp: "Clínica Geral", status: "Concluído" },
];

const templates = [
  { nome: "Confirmação de consulta", body: "Olá {nome}, sua consulta com {medico} está confirmada para {data} às {horario}." },
  { nome: "Link Google Meet", body: "Aqui está seu link: {link_consulta}" },
  { nome: "Lembrete 1h antes", body: "Sua consulta começa em 1 hora! 🩺" },
  { nome: "Pós-consulta", body: "Como foi seu atendimento? Conte sua experiência 💚" },
];

type Status = "aberta" | "atendimento" | "pendente" | "fechada";
type CanalFilter = "todos" | "Comercial" | "Operacional";
type StatusFilter = "todas" | Status;

const statusMeta: Record<Status, { label: string; tone: string }> = {
  aberta: { label: "Aberta", tone: "bg-success/10 text-success" },
  atendimento: { label: "Em atendimento", tone: "bg-info/10 text-info" },
  pendente: { label: "Pendente", tone: "bg-warning/10 text-warning" },
  fechada: { label: "Fechada", tone: "bg-muted text-muted-foreground" },
};

export default function Conversas() {
  const [selectedId, setSelectedId] = useState(conversasWpp[0].id);
  const [draft, setDraft] = useState("");
  const [canalFilter, setCanalFilter] = useState<CanalFilter>("todos");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [search, setSearch] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [priority, setPriority] = useState<Record<number, boolean>>({});
  const [closed, setClosed] = useState<Record<number, boolean>>({});
  const [notes, setNotes] = useState("Paciente prefere atendimento por vídeo. Plano corporativo Construtora Horizonte.");

  // Normaliza status mock → status do filtro
  const conversas = conversasWpp.map(c => ({
    ...c,
    statusKey: (closed[c.id]
      ? "fechada"
      : c.status === "resolvida" ? "fechada"
      : c.status === "pendente" ? "pendente"
      : c.responsavel === "Bot" ? "atendimento" : "aberta") as Status,
    isPriority: !!priority[c.id],
  }));

  const filtered = useMemo(() => conversas.filter(c => {
    if (canalFilter !== "todos" && c.canal !== canalFilter) return false;
    if (statusFilter !== "todas" && c.statusKey !== statusFilter) return false;
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [conversas, canalFilter, statusFilter, search]);

  const selected = conversas.find(c => c.id === selectedId) ?? conversas[0];

  const useTemplate = (body: string) => {
    setDraft(d => d ? d + "\n" + body : body);
    setShowTemplates(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox de conversas"
        description="Atendimento unificado · base preparada para WhatsApp Business API."
      />

      <div className="card-elevated grid h-[calc(100vh-220px)] min-h-[600px] grid-cols-1 overflow-hidden md:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr_340px]">
        {/* COLUNA ESQUERDA */}
        <aside className="flex flex-col border-r border-border">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar conversa…"
                className="h-9 pl-8"
              />
            </div>

            {/* Filtro canal */}
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              {(["todos","Comercial","Operacional"] as CanalFilter[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCanalFilter(c)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1 font-medium capitalize transition-colors",
                    canalFilter === c ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >{c}</button>
              ))}
            </div>

            {/* Filtro status */}
            <div className="flex flex-wrap gap-1">
              {(["todas","aberta","atendimento","pendente","fechada"] as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {s === "todas" ? "Todas" : statusMeta[s].label}
                </button>
              ))}
            </div>
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</li>
            )}
            {filtered.map(c => {
              const SM = statusMeta[c.statusKey];
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "flex w-full gap-3 border-b border-border p-3 text-left hover:bg-muted/40 transition-colors",
                      selectedId === c.id && "bg-primary-soft/60",
                    )}
                  >
                    <div className="relative shrink-0">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                        {c.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                        c.canal === "Comercial" ? "bg-primary" : "bg-accent",
                      )} title={c.canal} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold flex items-center gap-1">
                          {c.isPriority && <Star className="h-3 w-3 fill-warning text-warning" />}
                          {c.nome}
                        </p>
                        {c.unread > 0 && !closed[c.id] && (
                          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                            {c.unread}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.ultima}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", tagTone[c.tag] ?? tagTone.Lead)}>
                          {c.tag}
                        </span>
                        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", SM.tone)}>
                          {SM.label}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* COLUNA CENTRAL */}
        <section className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {selected.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <p className="font-semibold leading-tight flex items-center gap-1.5">
                  {selected.nome}
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", canalTone[selected.canal] ?? "bg-muted")}>
                    {selected.canal}
                  </span>
                  {selected.isPriority && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Responsável: {selected.responsavel} · {statusMeta[selected.statusKey].label}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm" variant="outline"
                className={cn("gap-1", selected.isPriority && "border-warning text-warning")}
                onClick={() => setPriority(p => ({ ...p, [selected.id]: !p[selected.id] }))}
              >
                <Pin className="h-3.5 w-3.5" />{selected.isPriority ? "Tirar prioridade" : "Prioridade"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowTemplates(s => !s)}>
                <FileText className="h-3.5 w-3.5" />Template
              </Button>
              <Button size="sm" variant="outline" className="gap-1"><ArrowRightLeft className="h-3.5 w-3.5" />Transferir</Button>
              <Button size="sm" variant="outline" className="gap-1"><Bot className="h-3.5 w-3.5" />Bot</Button>
              <Button
                size="sm" variant="outline"
                className={cn("gap-1", closed[selected.id] && "border-success text-success")}
                onClick={() => setClosed(c => ({ ...c, [selected.id]: !c[selected.id] }))}
              >
                <CheckCheck className="h-3.5 w-3.5" />{closed[selected.id] ? "Reabrir" : "Finalizar"}
              </Button>
            </div>
          </div>

          {showTemplates && (
            <div className="border-b border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates rápidos</p>
                <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {templates.map(t => (
                  <button
                    key={t.nome}
                    onClick={() => useTemplate(t.body)}
                    className="rounded-lg border border-border bg-card p-2 text-left text-xs hover:border-primary"
                  >
                    <p className="font-semibold">{t.nome}</p>
                    <p className="truncate text-muted-foreground">{t.body}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
            {histMock.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "us" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  m.from === "us"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-card border border-border",
                )}>
                  <p>{m.text}</p>
                  <p className={cn("mt-1 text-[10px]", m.from === "us" ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</p>
                </div>
              </div>
            ))}
            {closed[selected.id] && (
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs text-success">
                <CheckCheck className="h-3.5 w-3.5" /> Conversa finalizada
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={closed[selected.id] ? "Conversa finalizada — reabra para responder" : "Escreva uma mensagem…"}
                disabled={closed[selected.id]}
                className="min-h-[44px] max-h-32 resize-none"
              />
              <Button className="self-end gap-1" onClick={() => setDraft("")} disabled={closed[selected.id]}>
                <Send className="h-4 w-4" />Enviar
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Integração futura com WhatsApp Business API · respostas templadas suportadas
            </p>
          </div>
        </section>

        {/* COLUNA DIREITA */}
        <aside className="hidden border-l border-border xl:flex xl:flex-col">
          <div className="border-b border-border p-4 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-lg font-bold text-primary-foreground">
              {selected.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <p className="mt-3 font-display font-semibold">{selected.nome}</p>
            <p className="text-xs text-muted-foreground">{selected.tag} · {selected.canal}</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> +55 31 9****-1234
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-1.5">
              <Button variant="outline" className="w-full justify-start gap-2"><CalendarPlus className="h-4 w-4 text-primary" />Criar agendamento</Button>
              <Button variant="outline" className="w-full justify-start gap-2"><ExternalLink className="h-4 w-4 text-primary" />Abrir perfil</Button>
              <Button variant="outline" className="w-full justify-start gap-2"><History className="h-4 w-4 text-primary" />Ver histórico</Button>
              <Button variant="outline" className="w-full justify-start gap-2"><UserPlus className="h-4 w-4 text-primary" />Vincular a paciente</Button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agendamentos vinculados</p>
              <ul className="mt-2 space-y-2">
                {agendamentosVinculados.map((a, i) => (
                  <li key={i} className="rounded-lg border border-border p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{a.data}</p>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        a.status === "Confirmado" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                      )}>{a.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.medico} · {a.esp}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                  <Tag className="h-3 w-3" /> {selected.tag}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  <MessageSquare className="h-3 w-3" /> Conversando
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />Observações internas
              </p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="mt-2 min-h-[80px] text-xs"
                placeholder="Notas visíveis apenas para a equipe…"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
