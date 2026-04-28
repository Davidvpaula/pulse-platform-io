import { Users, Activity, ListTodo, TrendingUp, Phone, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

const equipe = [
  { nome: "Juliana Reis", funcao: "Secretária", atend: 38, pend: 2, status: "online" },
  { nome: "Ana Lima", funcao: "Secretária", atend: 24, pend: 5, status: "online" },
  { nome: "Mateus Silva", funcao: "Atendimento", atend: 41, pend: 1, status: "ausente" },
  { nome: "Paula Cardoso", funcao: "Atendimento", atend: 19, pend: 3, status: "online" },
];

export default function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão da supervisão"
        description="Monitore atendimento, fila e desempenho operacional em tempo real."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Atendimentos hoje" value="142" icon={Activity} trend={{ value: "+12%", positive: true }} />
        <StatCard label="Tempo médio" value="3min42" icon={Phone} trend={{ value: "-18s", positive: true }} />
        <StatCard label="Tarefas pendentes" value="11" icon={ListTodo} hint="3 atrasadas" />
        <StatCard label="Equipe online" value="6 / 8" icon={Users} hint="2 ausentes" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Equipe operacional</h3>
            <span className="text-xs text-muted-foreground">Atualizado agora</span>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left py-2">Pessoa</th><th className="text-left">Função</th><th className="text-left">Atendimentos</th><th className="text-left">Pendências</th><th className="text-left">Status</th></tr>
            </thead>
            <tbody>
              {equipe.map(p => (
                <tr key={p.nome} className="border-t border-border">
                  <td className="py-2.5 font-medium">{p.nome}</td>
                  <td className="text-muted-foreground">{p.funcao}</td>
                  <td>{p.atend}</td>
                  <td>{p.pend}</td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      p.status === "online" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Indicadores</h3>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Taxa confirmação</span><strong>92%</strong></li>
            <li className="flex justify-between"><span className="text-muted-foreground">No-show</span><strong>4.1%</strong></li>
            <li className="flex justify-between"><span className="text-muted-foreground">SLA &lt; 5min</span><strong className="text-success">88%</strong></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Cancelamentos</span><strong>3.2%</strong></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Reagendamentos</span><strong>11</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
