import { Users, Stethoscope, Building2, Calendar, Wallet, Plug, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { integracoes } from "@/lib/mock";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral da operação"
        description="Indicadores em tempo real da plataforma Lasmar Telemed."
        actions={<Button variant="outline"><TrendingUp className="mr-2 h-4 w-4" />Relatório completo</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pacientes" value="2.418" icon={Users} trend={{ value: "+4.2%", positive: true }} hint="Mês atual" />
        <StatCard label="Médicos ativos" value="124" icon={Stethoscope} trend={{ value: "+6", positive: true }} />
        <StatCard label="Empresas" value="38" icon={Building2} trend={{ value: "+3", positive: true }} />
        <StatCard label="Agendamentos / mês" value="3.962" icon={Calendar} trend={{ value: "+11%", positive: true }} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Faturamento" value="R$ 487k" icon={Wallet} trend={{ value: "+8%", positive: true }} hint="Últimos 30 dias" />
        <StatCard label="Consultas hoje" value="142" icon={Calendar} hint="38 em andamento" />
        <StatCard label="Cobertura permissões" value="100%" icon={ShieldCheck} hint="Todos os perfis ativos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Atividade recente */}
        <div className="card-elevated p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Atividade recente</h3>
          <div className="mt-4 divide-y divide-border">
            {[
              { t: "Novo médico cadastrado", d: "Dra. Helena Prado · Endocrinologia", time: "há 12 min" },
              { t: "Empresa contratou plano", d: "Construtora Horizonte · Plano Corporativo Premium", time: "há 1h" },
              { t: "Integração ativada", d: "Google Meet configurado para 8 médicos", time: "há 2h" },
              { t: "Atualização de permissão", d: "Juliana Reis promovida a Secretária Supervisora", time: "ontem" },
              { t: "Pagamento recebido", d: "Lote de 24 cobranças · R$ 5.280", time: "ontem" },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.t}</p>
                  <p className="text-xs text-muted-foreground">{a.d}</p>
                </div>
                <span className="text-xs text-muted-foreground">{a.time}</span>
              </div>
            ))}
          </div>
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
