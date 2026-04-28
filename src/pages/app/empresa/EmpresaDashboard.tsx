import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Calendar, TrendingUp, Wallet, UserCheck, Lock, AlertTriangle,
  ArrowRight, Plus, FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getKpis, getAlertas, getStatsPorSetor, listAgendamentos, getPerfil,
  STATUS_AGEND_LABEL, brl,
  type DashboardKpis, type SetorStats, type Alerta, type AgendamentoCorporativo,
} from "@/lib/empresa";

export default function EmpresaDashboard() {
  const [kpis, setKpis] = useState<DashboardKpis>(() => getKpis());
  const [alertas, setAlertas] = useState<Alerta[]>(() => getAlertas());
  const [setores, setSetores] = useState<SetorStats[]>(() => getStatsPorSetor());
  const [proximos, setProximos] = useState<AgendamentoCorporativo[]>([]);
  const perfil = getPerfil();

  useEffect(() => {
    const reload = () => {
      setKpis(getKpis()); setAlertas(getAlertas()); setSetores(getStatsPorSetor());
      setProximos(listAgendamentos().filter(a => a.status !== "cancelado").slice(0, 5));
    };
    reload();
    window.addEventListener("lasmar:empresa-changed", reload);
    return () => window.removeEventListener("lasmar:empresa-changed", reload);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{perfil.plano}</p>
          <h1 className="font-display text-2xl font-bold">{perfil.nomeFantasia}</h1>
          <p className="text-sm text-muted-foreground">
            Gestão estratégica de saúde corporativa · {perfil.vidasContratadas} vidas contratadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/app/empresa/relatorios"><FileBarChart className="mr-2 h-4 w-4" />Relatórios</Link>
          </Button>
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/app/empresa/agendamentos"><Plus className="mr-2 h-4 w-4" />Agendar consulta</Link>
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Funcionários" value={kpis.totalFuncionarios.toString()} hint={`${kpis.ativos} ativos`} icon={Users} to="/app/empresa/funcionarios" />
        <Kpi label="Consultas no mês" value={kpis.consultasMes.toString()} hint="Mês corrente" icon={Calendar} to="/app/empresa/agendamentos" />
        <Kpi label="Taxa de uso" value={`${kpis.taxaUso}%`} hint="consultas/ativo" icon={TrendingUp} to="/app/empresa/relatorios" />
        <Kpi label="Custo mensal" value={brl(kpis.custoMensal)} hint={`Ciclo dia ${perfil.cicloFechamento}`} icon={Wallet} to="/app/empresa/financeiro" />
        <Kpi label="Custo / colaborador" value={brl(kpis.custoMedioColaborador)} hint="Por ativo" icon={UserCheck} to="/app/empresa/financeiro" />
      </div>

      {/* Privacidade */}
      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <Lock className="mt-0.5 h-4 w-4 text-warning" />
        <p className="text-sm">
          <strong>Privacidade:</strong> a empresa <strong>não acessa o prontuário</strong> dos funcionários. Apenas relatórios agregados e documentos liberados ficam visíveis ao RH.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ALERTAS */}
        <section className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Alertas
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {alertas.length === 0 && <li className="text-sm text-muted-foreground">Nenhum alerta no momento.</li>}
            {alertas.map(a => {
              const tone = a.tone === "destructive" ? "destructive" : a.tone === "warning" ? "warning" : "primary";
              return (
                <li key={a.id} className={`rounded-lg border-l-4 border-${tone} bg-${tone}/5 p-3`}>
                  <p className="text-sm font-semibold">{a.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.descricao}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* PRÓXIMAS CONSULTAS */}
        <section className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Próximas consultas</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/empresa/agendamentos">Ver tudo <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {proximos.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nenhum agendamento.</li>}
            {proximos.map(a => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{a.funcionarioNome}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.especialidade} · {new Date(a.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {STATUS_AGEND_LABEL[a.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* SETORES */}
      <section className="card-elevated p-6">
        <h2 className="font-display text-lg font-semibold">Uso por setor</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setores.map(s => (
            <div key={s.setor} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{s.setor}</p>
                <span className="text-xs text-muted-foreground">{s.funcionarios} pessoas</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-2xl font-bold">{s.consultas}</span>
                <span className="text-xs text-muted-foreground">consultas</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(s.taxaUso, 100)}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.taxaUso}% uso · {brl(s.custo)} custo</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, to }: {
  label: string; value: string; hint?: string; icon: React.ElementType; to?: string;
}) {
  const inner = (
    <div className="card-elevated p-4 transition hover:shadow-elegant">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
