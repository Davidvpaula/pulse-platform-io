import { Link } from "react-router-dom";
import { ArrowRight, UserPlus, Database, Calendar, BellRing, Stethoscope, Building2, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { automacoesFluxo, pacientes, agendamentos } from "@/lib/mock";
import { cn } from "@/lib/utils";

const fluxoEmpresa = [
  { icon: Building2, title: "Empresa cadastra funcionário", actor: "RH · Construtora Horizonte", status: "feito" },
  { icon: UserPlus, title: "Sistema cria paciente", actor: "Automação", status: "feito" },
  { icon: Database, title: "Envio para Feegow", actor: "Integração", status: "andamento", note: "marcado como não sincronizado" },
  { icon: CheckCircle2, title: "Feegow sincronizado", actor: "Feegow", status: "pendente", note: "aguardando retorno do ID externo" },
  { icon: Calendar, title: "Empresa agenda consulta", actor: "RH · Construtora Horizonte", status: "pendente" },
  { icon: BellRing, title: "Distribui para médico, secretaria, admin", actor: "Notificação", status: "pendente" },
];

const stepTone = {
  feito: "bg-success text-success-foreground",
  andamento: "bg-warning text-warning-foreground animate-pulse",
  pendente: "bg-muted text-muted-foreground",
} as const;

export default function FluxoOperacional() {
  const novosPacientes = pacientes.filter(p => p.status !== "feegow_sincronizado");
  const ativosHoje = agendamentos.filter(a => a.data === "Hoje");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo operacional"
        description="Visualize o ciclo completo: cadastro → Feegow → agendamento → atendimento."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pacientes em sincronização" value={String(novosPacientes.length)} icon={Database} hint="aguardando Feegow" />
        <StatCard label="Agendamentos hoje" value={String(ativosHoje.length)} icon={Calendar} />
        <StatCard label="Automações ativas" value={String(automacoesFluxo.filter(a => a.ativo).length)} icon={Activity} />
        <StatCard label="Falhas em 24h" value="2" icon={AlertCircle} hint="reprocessamento manual" />
      </div>

      {/* Fluxo Empresarial - timeline horizontal */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">Fluxo empresarial completo</h3>
            <p className="text-xs text-muted-foreground">Exemplo: Construtora Horizonte adicionando colaborador</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/empresa/dashboard">Ver empresa <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {fluxoEmpresa.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="relative">
                <div className="card-elevated h-full p-4">
                  <span className={cn("inline-grid h-8 w-8 place-items-center rounded-lg", stepTone[step.status as keyof typeof stepTone])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-tight">{step.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{step.actor}</p>
                  {step.note && <p className="mt-1 text-[10px] text-warning">{step.note}</p>}
                </div>
                {i < fluxoEmpresa.length - 1 && (
                  <ArrowRight className="absolute right-[-14px] top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Automações */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Automações de fluxo</h3>
          <Button variant="outline" size="sm">Configurar</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4">Trigger</th>
                <th className="pb-2 pr-4">Ação</th>
                <th className="pb-2 pr-4">Execuções (24h)</th>
                <th className="pb-2 pr-4">Sucesso</th>
                <th className="pb-2 pr-4">Último log</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {automacoesFluxo.map(a => (
                <tr key={a.id} className="hover:bg-muted/40">
                  <td className="py-3 pr-4 font-medium">{a.trigger}</td>
                  <td className="py-3 pr-4 text-muted-foreground">→ {a.acao}</td>
                  <td className="py-3 pr-4">{a.execucoes24h}</td>
                  <td className="py-3 pr-4">
                    <span className={cn("font-semibold", a.sucesso >= 90 ? "text-success" : a.sucesso >= 70 ? "text-warning" : "text-destructive")}>
                      {a.sucesso}%
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{a.ultimoLog}</td>
                  <td className="py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      a.ativo ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                    )}>
                      {a.ativo ? "Ativa" : "Desativada"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status global de pacientes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Pacientes em sincronização</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/pacientes">Ver todos</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {novosPacientes.map(p => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.id} · {p.empresa ?? "Particular"}</p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
            {!novosPacientes.length && <p className="text-sm text-muted-foreground">Nenhum pendente.</p>}
          </ul>
        </div>

        <div className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Agendamentos de hoje</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/agendamentos">Ver agenda</Link>
            </Button>
          </div>
          <ul className="mt-4 space-y-2">
            {ativosHoje.map(a => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    <Stethoscope className="mr-1 inline h-3.5 w-3.5 text-primary" />
                    {a.medico} · {a.hora}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.paciente} · {a.modalidade}</p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
