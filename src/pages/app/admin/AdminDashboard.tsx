import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, Building2, Calendar, Wallet, Plug, ShieldCheck, TrendingUp,
  AlertTriangle, Clock, Download, Activity, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { integracoes, filaSecretaria, pacientes } from "@/lib/mock";
import { cn } from "@/lib/utils";

const ultimosPacientes = pacientes.slice(0, 5);

const alertas = [
  { tone: "destructive", titulo: "Integração Feegow desconectada", desc: "Sincronização parada há 2h." },
  { tone: "warning", titulo: "12 cobranças pendentes", desc: "Lote precisa de revisão manual." },
  { tone: "info", titulo: "Pico de atendimento previsto", desc: "Agenda 18% acima da média para amanhã." },
];

const periodos = ["Hoje", "Semana", "Mês"] as const;

export default function AdminDashboard() {
  const [periodo, setPeriodo] = useState<typeof periodos[number]>("Mês");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral da operação"
        description="Indicadores em tempo real da plataforma Lasmar Telemed."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {periodos.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    periodo === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >{p}</button>
              ))}
            </div>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" />Exportar</Button>
            <Button><TrendingUp className="mr-2 h-4 w-4" />Relatório completo</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pacientes" value="2.418" icon={Users} trend={{ value: "+4.2%", positive: true }} hint={periodo} />
        <StatCard label="Médicos ativos" value="124" icon={Stethoscope} trend={{ value: "+6", positive: true }} />
        <StatCard label="Empresas" value="38" icon={Building2} trend={{ value: "+3", positive: true }} />
        <StatCard label="Agendamentos" value="3.962" icon={Calendar} trend={{ value: "+11%", positive: true }} hint={periodo} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Faturamento" value="R$ 487k" icon={Wallet} trend={{ value: "+8%", positive: true }} hint={periodo} />
        <StatCard label="Consultas hoje" value="142" icon={Calendar} hint="38 em andamento" />
        <StatCard label="Cobertura permissões" value="100%" icon={ShieldCheck} hint="Todos os perfis ativos" />
      </div>

      {/* Alertas do sistema */}
      <div className="grid gap-3 md:grid-cols-3">
        {alertas.map((a, i) => (
          <div
            key={i}
            className={cn(
              "card-elevated flex gap-3 p-4 border-l-4",
              a.tone === "destructive" && "border-l-destructive",
              a.tone === "warning" && "border-l-warning",
              a.tone === "info" && "border-l-info",
            )}
          >
            <AlertTriangle className={cn(
              "h-5 w-5 shrink-0",
              a.tone === "destructive" && "text-destructive",
              a.tone === "warning" && "text-warning",
              a.tone === "info" && "text-info",
            )} />
            <div>
              <p className="text-sm font-semibold">{a.titulo}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Últimos agendamentos */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Últimos agendamentos</h3>
            <Button variant="ghost" size="sm">Ver todos</Button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2">Hora</th>
                <th className="text-left">Paciente</th>
                <th className="text-left">Médico</th>
                <th className="text-left">Canal</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filaSecretaria.map(a => (
                <tr key={a.hora + a.paciente} className="border-t border-border">
                  <td className="py-2.5 font-mono text-xs">{a.hora}</td>
                  <td className="font-medium">{a.paciente}</td>
                  <td className="text-muted-foreground">{a.medico}</td>
                  <td className="text-xs"><span className="rounded bg-muted px-1.5 py-0.5">{a.canal}</span></td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pendências */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            <h3 className="font-display text-lg font-semibold">Pendências operacionais</h3>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Confirmar consultas amanhã</span><strong className="text-warning">14</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Aguardando pagamento</span><strong className="text-warning">12</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Documentos para enviar</span><strong className="text-warning">7</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Médicos sem agenda definida</span><strong className="text-destructive">3</strong>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Últimos pacientes */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Últimos pacientes cadastrados</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/fluxo"><Activity className="mr-1 h-3.5 w-3.5" />Ver fluxo</Link>
            </Button>
          </div>
          <table className="mt-4 w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2">Nome</th>
                <th className="text-left">Vínculo</th>
                <th className="text-left">Status</th>
                <th className="text-left">Criado</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ultimosPacientes.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2.5 font-medium">{p.nome}</td>
                  <td className="text-muted-foreground">{p.vinculo === "empresarial" ? p.empresa : "Particular"}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-muted-foreground">{p.criadoEm}</td>
                  <td className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/app/admin/pacientes/${p.id}`}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Integrações */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-semibold">Integrações</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {integracoes.map(i => (
              <li key={i.nome} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.nome}</p>
                  <p className="text-xs text-muted-foreground">{i.desc}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  i.cor === "warning" ? "bg-warning/10 text-warning" :
                  i.cor === "info" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground"
                }`}>
                  {i.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
