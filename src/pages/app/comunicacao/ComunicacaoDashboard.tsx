import { MessageSquare, Phone, Bot, Tag, User, Send, ArrowRightLeft, CalendarPlus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conversasWpp } from "@/lib/mock";
import { useState } from "react";

export default function ComunicacaoDashboard() {
  const [selected, setSelected] = useState(conversasWpp[0]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Comunicação"
        description="WhatsApp, e-mail e chat — em uma caixa unificada."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Conversas abertas" value="23" icon={MessageSquare} />
        <StatCard label="WhatsApp Comercial" value="12" icon={Phone} hint="6 pendentes" />
        <StatCard label="WhatsApp Operacional" value="8" icon={Phone} hint="2 sem resposta" />
        <StatCard label="Resolvidas pelo Bot" value="64%" icon={Bot} hint="Últimos 30 dias" />
      </div>

      {/* Caixas WhatsApp */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { n: "WhatsApp Comercial", num: "+55 31 9000-0001", abertas: 12, cor: "primary" },
          { n: "WhatsApp Operacional / Suporte", num: "+55 31 9000-0002", abertas: 8, cor: "accent" },
        ].map(c => (
          <div key={c.n} className="card-elevated p-5 flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{c.n}</p>
              <p className="text-xs text-muted-foreground font-mono">{c.num}</p>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">{c.abertas} ativas</span>
          </div>
        ))}
      </div>

      {/* Inbox + chat */}
      <div className="card-elevated grid overflow-hidden md:grid-cols-[320px_1fr] min-h-[520px]">
        <aside className="border-r border-border bg-muted/30">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9 bg-background" placeholder="Buscar conversa…" />
            </div>
          </div>
          <ul>
            {conversasWpp.map(c => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={`w-full px-4 py-3 text-left border-b border-border hover:bg-muted ${selected.id === c.id ? "bg-card" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.nome}</span>
                    {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.ultima}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">{c.tag}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.canal}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="flex flex-col">
          <header className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
                {selected.nome.split(" ").map(s => s[0]).slice(0,2).join("")}
              </span>
              <div>
                <p className="font-semibold">{selected.nome}</p>
                <p className="text-xs text-muted-foreground">Responsável: {selected.responsavel} · {selected.canal}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline"><Tag className="mr-1.5 h-3.5 w-3.5" />Tags</Button>
              <Button size="sm" variant="outline"><User className="mr-1.5 h-3.5 w-3.5" />Vincular paciente</Button>
              <Button size="sm" variant="outline"><CalendarPlus className="mr-1.5 h-3.5 w-3.5" />Criar agendamento</Button>
              <Button size="sm" variant="outline"><ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />Transferir</Button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
            <Bubble side="them" text="Olá, gostaria de agendar uma consulta para amanhã." />
            <Bubble side="us" text="Claro! Posso ajudar. Para qual especialidade?" />
            <Bubble side="them" text="Cardiologia." />
            <Bubble side="us" text="Temos disponibilidade às 14:30 com Dr. Rafael Lasmar. Posso reservar?" />
          </div>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["Confirmar", "Reagendar", "Enviar link Meet", "Cobrança"].map(t => (
                <button key={t} className="rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:bg-muted">{t}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Escreva uma mensagem…" />
              <Button className="bg-gradient-primary hover:opacity-90"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const Bubble = ({ side, text }: { side: "us" | "them"; text: string }) => (
  <div className={`flex ${side === "us" ? "justify-end" : "justify-start"}`}>
    <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
      side === "us" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm"
    }`}>{text}</div>
  </div>
);
