import {
  MessageSquare, Phone, Bot, Clock, CalendarPlus, TrendingUp, Inbox, CheckCheck,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { conversasWpp } from "@/lib/mock";

const tagTone: Record<string, string> = {
  Paciente: "bg-primary-soft text-primary",
  Confirmado: "bg-success/10 text-success",
  Empresa: "bg-warning/10 text-warning",
  Financeiro: "bg-info/10 text-info",
  "Médico": "bg-accent/10 text-accent",
};

export default function ComunicacaoDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Central de Comunicação"
        description="Visão consolidada de WhatsApp, bot e atendimento humano."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/comunicacao/conversas">
              <Inbox className="mr-2 h-4 w-4" />Abrir inbox
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conversas abertas" value="23" icon={MessageSquare} trend={{ value: "+12%", positive: true }} />
        <StatCard label="Tempo médio resposta" value="1m48s" icon={Clock} trend={{ value: "-22s", positive: true }} />
        <StatCard label="Resolvidas pelo bot" value="64%" icon={Bot} hint="Últimos 30 dias" />
        <StatCard label="Convertidas em agenda" value="38%" icon={CalendarPlus} trend={{ value: "+5pp", positive: true }} />
      </div>

      {/* Linhas WhatsApp */}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { n: "WhatsApp Comercial", num: "+55 31 9000-0001", abertas: 12, tone: "primary", desc: "Vendas, leads e novos pacientes" },
          { n: "WhatsApp Operacional", num: "+55 31 9000-0002", abertas: 8, tone: "accent", desc: "Confirmações, lembretes e suporte" },
        ].map(c => (
          <div key={c.n} className="card-elevated p-5 flex items-start gap-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${
              c.tone === "primary" ? "bg-primary-soft text-primary" : "bg-accent/10 text-accent"
            }`}>
              <Phone className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold">{c.n}</p>
              <p className="text-xs text-muted-foreground font-mono">{c.num}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">{c.abertas} ativas</span>
              <p className="mt-2 text-[11px] text-muted-foreground">SLA &lt; 5min: 92%</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Volume por canal */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Volume por canal · últimos 7 dias</h3>
            <span className="text-xs text-muted-foreground">Mock</span>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-3">
            {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d, i) => {
              const com = [62, 71, 58, 84, 92, 41, 28][i];
              const ope = [38, 45, 52, 60, 67, 22, 15][i];
              const total = com + ope;
              const max = 160;
              return (
                <div key={d} className="flex flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center gap-1">
                    <div className="w-3 rounded-t bg-primary" style={{ height: `${(com/max)*100}%` }} title={`Comercial: ${com}`} />
                    <div className="w-3 rounded-t bg-accent" style={{ height: `${(ope/max)*100}%` }} title={`Operacional: ${ope}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">{d}</p>
                  <p className="text-[11px] font-semibold">{total}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" /> Comercial</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-accent" /> Operacional</span>
          </div>
        </div>

        {/* Status */}
        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-semibold">Status</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success" />Em atendimento</span>
              <strong>14</strong>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-warning" />Aguardando</span>
              <strong>9</strong>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-destructive" />Atrasadas</span>
              <strong>3</strong>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2"><CheckCheck className="h-4 w-4 text-muted-foreground" />Fechadas hoje</span>
              <strong>47</strong>
            </li>
          </ul>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/app/comunicacao/metricas">
              <TrendingUp className="mr-2 h-4 w-4" />Ver métricas completas
            </Link>
          </Button>
        </div>
      </div>

      {/* Últimas conversas */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Últimas conversas</h3>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/comunicacao/conversas">Abrir inbox <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        <ul className="mt-4 divide-y divide-border">
          {conversasWpp.map(c => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {c.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{c.nome}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tagTone[c.tag] ?? "bg-muted text-muted-foreground"}`}>{c.tag}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.canal}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{c.ultima}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{c.responsavel}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
