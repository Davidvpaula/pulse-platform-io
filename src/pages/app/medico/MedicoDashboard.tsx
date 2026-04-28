import { Link } from "react-router-dom";
import {
  Video, Users, FileText, Wallet, ExternalLink, Play, Calendar, Stethoscope,
  CheckCircle2, AlertTriangle, ArrowRight, Clock, BookOpen, Settings, Search,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { agendaMedico } from "@/lib/mock";
import { cn } from "@/lib/utils";

const alertas = [
  { tone: "warning", icon: Calendar, titulo: "Próxima consulta em 12 min", desc: "Renata Lima · Empresarial · Construtora Horizonte" },
  { tone: "info", icon: Users, titulo: "2 pacientes aguardando pagamento", desc: "Confirmação automática após quitação" },
  { tone: "destructive", icon: ExternalLink, titulo: "Feegow desconectado", desc: "Prontuário em modo offline · admin notificado" },
];

const toneClasses = {
  warning: { wrap: "border-l-warning", chip: "bg-warning/10 text-warning" },
  info: { wrap: "border-l-info", chip: "bg-info/10 text-info" },
  destructive: { wrap: "border-l-destructive", chip: "bg-destructive/10 text-destructive" },
} as const;

export default function MedicoDashboard() {
  const proxima = agendaMedico[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bom dia, Dr. Rafael"
        description="O que você precisa fazer agora — atendimentos, fila e alertas."
      />

      {/* Fluxo de atendimento guiado */}
      <div className="card-elevated overflow-hidden">
        <div className="gradient-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Próximo atendimento</p>
              <h2 className="mt-1 font-display text-2xl font-bold">{proxima?.paciente ?? "Sem agendamento"}</h2>
              <p className="text-sm text-muted-foreground">
                {proxima?.hora} · {proxima?.tipo} · <StatusBadge status={proxima?.status ?? "confirmado"} />
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold border border-border">
              <Clock className="h-3.5 w-3.5 text-primary" /> em 12 min
            </span>
          </div>

          {/* Sequência de ações */}
          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90">
              <Play className="mr-2 h-4 w-4" /> 1. Iniciar consulta
            </Button>
            <ArrowRight className="hidden h-4 w-4 justify-self-center text-muted-foreground sm:block" />
            <Button size="lg" variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" /> 2. Abrir prontuário (Feegow)
            </Button>
            <ArrowRight className="hidden h-4 w-4 justify-self-center text-muted-foreground sm:block" />
            <Button size="lg" variant="outline">
              <CheckCircle2 className="mr-2 h-4 w-4" /> 3. Finalizar atendimento
            </Button>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      <div className="grid gap-3 md:grid-cols-3">
        {alertas.map((a, i) => {
          const t = toneClasses[a.tone as keyof typeof toneClasses];
          const Icon = a.icon;
          return (
            <div key={i} className={cn("card-elevated flex items-start gap-3 border-l-4 p-4", t.wrap)}>
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", t.chip)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{a.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Consultas hoje" value="6" icon={Calendar} hint="2 telemedicina" />
        <StatCard label="Pacientes ativos" value="184" icon={Users} hint="+8 este mês" trend={{ value: "+4.5%", positive: true }} />
        <StatCard label="Documentos emitidos" value="42" icon={FileText} hint="Mês atual" />
        <StatCard label="Receita do mês" value="R$ 18.450" icon={Wallet} trend={{ value: "+12%", positive: true }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Próximas consultas */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Próximas consultas</h3>
            <Link to="/app/medico/agenda" className="text-xs text-primary hover:underline">Ver agenda completa</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {agendaMedico.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary font-mono text-xs font-semibold">
                  {a.hora}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.paciente}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.tipo}</p>
                </div>
                <StatusBadge status={a.status} />
                <Button size="sm" variant={a.status === "em_andamento" ? "default" : "outline"} className={a.status === "em_andamento" ? "bg-gradient-primary hover:opacity-90" : ""}>
                  <Play className="mr-1.5 h-3.5 w-3.5" /> {a.status === "em_andamento" ? "Continuar" : "Iniciar"}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Atalhos */}
        <div className="space-y-4">
          <Link to="/app/medico/pacientes" className="card-elevated block p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <p className="font-semibold">Buscar paciente</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Por nome, CPF ou ID interno</p>
          </Link>

          <Link to="/app/medico/integracoes" className="card-elevated block p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              <p className="font-semibold">Status Feegow</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Visualizar prontuários · sem permissão de configuração</p>
          </Link>

          <Link to="/app/medico/treinamento" className="card-elevated block p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <p className="font-semibold">Treinamento</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Vídeos e boas práticas</p>
          </Link>

          <Link to="/app/medico/configuracoes" className="card-elevated block p-5 transition hover:border-primary/40">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <p className="font-semibold">Configurações</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Perfil, agenda, Google Meet</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
