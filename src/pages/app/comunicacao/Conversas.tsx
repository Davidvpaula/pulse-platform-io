import { useState } from "react";
import {
  Send, Paperclip, FileText, ArrowRightLeft, UserPlus, CalendarPlus,
  History, ExternalLink, Phone, Search, Filter, Tag, MessageSquare, Bot,
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

const histMock = [
  { from: "them", text: "Olá! Tudo bem? Pode confirmar minha consulta de amanhã?", time: "09:12" },
  { from: "us", text: "Olá Marina! Sim, sua consulta com Dr. Rafael está confirmada para 14:30.", time: "09:14" },
  { from: "them", text: "Perfeito, obrigada! E o link da videochamada?", time: "09:15" },
  { from: "us", text: "Vou te enviar 30 minutos antes. Lembre de testar câmera e microfone 🙂", time: "09:16" },
  { from: "them", text: "Combinado!", time: "09:17" },
];

export default function Conversas() {
  const [selected, setSelected] = useState(conversasWpp[0]);
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inbox de conversas"
        description="Atendimento unificado · base preparada para WhatsApp Business API."
      />

      <div className="card-elevated grid h-[calc(100vh-220px)] min-h-[560px] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr_320px]">
        {/* Coluna esquerda - lista */}
        <aside className="flex flex-col border-r border-border">
          <div className="border-b border-border p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar conversa…" className="pl-8 h-9" />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" className="h-7 px-2 text-xs">Todas</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Não lidas</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1"><Filter className="h-3 w-3" /></Button>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {conversasWpp.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={cn(
                    "flex w-full gap-3 border-b border-border p-3 text-left hover:bg-muted/40",
                    selected.id === c.id && "bg-primary-soft/60",
                  )}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                    {c.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{c.nome}</p>
                      {c.unread > 0 && (
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
                      <span className="text-[10px] text-muted-foreground">· {c.responsavel}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Coluna central - chat */}
        <section className="flex min-w-0 flex-col">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {selected.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <p className="font-semibold leading-tight">{selected.nome}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  Canal: {selected.canal} · Responsável: {selected.responsavel}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="gap-1"><FileText className="h-3.5 w-3.5" />Template</Button>
              <Button size="sm" variant="outline" className="gap-1"><ArrowRightLeft className="h-3.5 w-3.5" />Transferir</Button>
              <Button size="sm" variant="outline" className="gap-1"><Bot className="h-3.5 w-3.5" />Bot</Button>
            </div>
          </div>

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
          </div>

          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Escreva uma mensagem…"
                className="min-h-[44px] max-h-32 resize-none"
              />
              <Button className="self-end gap-1" onClick={() => setDraft("")}>
                <Send className="h-4 w-4" />Enviar
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Integração futura com WhatsApp Business API · respostas templadas suportadas
            </p>
          </div>
        </section>

        {/* Coluna direita - contato */}
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

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2"><CalendarPlus className="h-4 w-4 text-primary" />Criar agendamento</Button>
            <Button variant="outline" className="w-full justify-start gap-2"><ExternalLink className="h-4 w-4 text-primary" />Abrir perfil</Button>
            <Button variant="outline" className="w-full justify-start gap-2"><History className="h-4 w-4 text-primary" />Ver histórico</Button>
            <Button variant="outline" className="w-full justify-start gap-2"><UserPlus className="h-4 w-4 text-primary" />Vincular a paciente</Button>

            <div className="mt-6">
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

            <div className="mt-6 rounded-lg border border-dashed border-border p-3">
              <p className="text-xs font-semibold">Última consulta</p>
              <p className="text-xs text-muted-foreground">20/Abr · Dr. Rafael Lasmar · Cardiologia</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
