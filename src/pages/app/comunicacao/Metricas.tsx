import { MessageSquare, Clock, CheckCheck, CalendarPlus, TrendingUp, Phone, Bot } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

const dias = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const conv = [62, 71, 58, 84, 92, 41, 28];
const fech = [55, 64, 51, 78, 88, 38, 25];
const max = Math.max(...conv, ...fech);

const responsaveis = [
  { nome: "Juliana Reis", atend: 142, tempo: "1m22s", csat: 4.9 },
  { nome: "Ana Lima", atend: 118, tempo: "1m45s", csat: 4.8 },
  { nome: "Mateus Silva", atend: 96, tempo: "2m04s", csat: 4.7 },
  { nome: "Bot · Lasmi", atend: 388, tempo: "0m02s", csat: 4.4 },
];

export default function Metricas() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Métricas de comunicação"
        description="Performance do atendimento humano e do bot · últimos 7 dias."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conversas no período" value="744" icon={MessageSquare} trend={{ value: "+18%", positive: true }} />
        <StatCard label="Tempo médio resposta" value="1m48s" icon={Clock} trend={{ value: "-22s", positive: true }} />
        <StatCard label="Conversas fechadas" value="671" icon={CheckCheck} hint="90.1% de resolução" />
        <StatCard label="Convertidas em agenda" value="284" icon={CalendarPlus} trend={{ value: "+5pp", positive: true }} hint="38% das conversas" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Abertas vs fechadas · 7 dias</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary" />Abertas</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-success" />Fechadas</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-3">
            {dias.map((d, i) => (
              <div key={d} className="flex flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center gap-1">
                  <div className="w-3 rounded-t bg-primary" style={{ height: `${(conv[i]/max)*100}%` }} />
                  <div className="w-3 rounded-t bg-success" style={{ height: `${(fech[i]/max)*100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />Por canal
          </h3>
          <div className="mt-4 space-y-4">
            {[
              { n: "WhatsApp Comercial", v: 432, pct: 58, color: "bg-primary" },
              { n: "WhatsApp Operacional", v: 287, pct: 38, color: "bg-accent" },
              { n: "Outros", v: 25, pct: 4, color: "bg-muted-foreground" },
            ].map(c => (
              <div key={c.n}>
                <div className="flex items-center justify-between text-sm">
                  <span>{c.n}</span>
                  <strong>{c.v} <span className="text-xs text-muted-foreground font-normal">({c.pct}%)</span></strong>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Bot className="h-3 w-3" />Resolvidas pelo bot
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-accent">64%</p>
            <p className="text-xs text-muted-foreground">476 de 744 conversas</p>
          </div>
        </div>
      </div>

      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />Performance por responsável
        </h3>
        <table className="mt-4 w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Responsável</th>
              <th className="p-2 text-left">Atendimentos</th>
              <th className="p-2 text-left">Tempo médio</th>
              <th className="p-2 text-left">CSAT</th>
              <th className="p-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {responsaveis.map(r => (
              <tr key={r.nome} className="border-t border-border">
                <td className="p-2.5 font-medium">{r.nome}</td>
                <td className="p-2.5">{r.atend}</td>
                <td className="p-2.5 font-mono text-xs">{r.tempo}</td>
                <td className="p-2.5">
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    ⭐ {r.csat}
                  </span>
                </td>
                <td className="p-2.5">
                  <div className="h-1.5 w-32 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${(r.atend / 388) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
