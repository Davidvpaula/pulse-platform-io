import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Stethoscope, Building2, Calendar, Wallet, Plug, ShieldCheck, TrendingUp,
  AlertTriangle, Clock, Download, Activity, ArrowRight, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { integracoes } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const periodos = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
] as const;

type PeriodoKey = typeof periodos[number]["key"];

interface Alerta { tone: "destructive" | "warning" | "info"; titulo: string; desc: string }
interface AgendaRow { id: string; inicio: string; status: string; canal: string; paciente: string | null; medico: string | null }
interface PacienteRow { id: string; nome: string | null; status: string; created_at: string; empresa: string | null }
interface VisaoGeral {
  kpis: Record<string, number>;
  pendencias: Record<string, number>;
  alertas: Alerta[];
  ultimos_agendamentos: AgendaRow[];
  ultimos_pacientes: PacienteRow[];
}

const fmtBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtNum = (n: number) => (n ?? 0).toLocaleString("pt-BR");

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

interface ServicosResumo {
  total_ativos: number;
  total_inativos: number;
  medicos_vinculados: number;
  overrides_pendentes: number;
  ticket_medio_centavos: number;
}

export default function AdminDashboard() {
  const [periodo, setPeriodo] = useState<PeriodoKey>("mes");
  const [data, setData] = useState<VisaoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<ServicosResumo | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const { data: rpcData, error } = await supabase.rpc("admin_visao_geral" as any, { _periodo: periodo });
      if (!active) return;
      if (error) {
        toast.error("Não foi possível carregar a visão geral", { description: error.message });
        setData(null);
      } else {
        setData(rpcData as unknown as VisaoGeral);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [periodo]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: srv }, { count: vinc }, { count: pend }] = await Promise.all([
        supabase.from("servicos_financeiros").select("ativo,valor_paciente_centavos"),
        supabase.from("medico_servicos").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("medico_servicos").select("*", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      if (!active) return;
      const ativos = (srv ?? []).filter((s: any) => s.ativo);
      const inativos = (srv ?? []).filter((s: any) => !s.ativo);
      const valores = ativos.map((s: any) => s.valor_paciente_centavos ?? 0).filter((v: number) => v > 0);
      const ticket = valores.length ? Math.round(valores.reduce((a: number, b: number) => a + b, 0) / valores.length) : 0;
      setServicos({
        total_ativos: ativos.length,
        total_inativos: inativos.length,
        medicos_vinculados: vinc ?? 0,
        overrides_pendentes: pend ?? 0,
        ticket_medio_centavos: ticket,
      });
    })();
    return () => { active = false; };
  }, []);


  const k = data?.kpis ?? {};
  const p = data?.pendencias ?? {};
  const periodoLabel = periodos.find(x => x.key === periodo)?.label ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão geral da operação"
        description="Indicadores em tempo real da plataforma Lasmar Telemed."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-card p-0.5">
              {periodos.map(po => (
                <button
                  key={po.key}
                  onClick={() => setPeriodo(po.key)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    periodo === po.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >{po.label}</button>
              ))}
            </div>
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" />Exportar</Button>
            <Button disabled><TrendingUp className="mr-2 h-4 w-4" />Relatório completo</Button>
          </div>
        }
      />

      {loading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados…
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pacientes" value={fmtNum(k.pacientes_total ?? 0)} icon={Users}
          hint={`${fmtNum(k.pacientes_periodo ?? 0)} novos no período`} />
        <StatCard label="Médicos ativos" value={fmtNum(k.medicos_ativos ?? 0)} icon={Stethoscope}
          hint={k.medicos_pendentes ? `${k.medicos_pendentes} pendentes` : "Nenhum pendente"} />
        <StatCard label="Empresas" value={fmtNum(k.empresas_total ?? 0)} icon={Building2} />
        <StatCard label="Agendamentos" value={fmtNum(k.agendamentos_periodo ?? 0)} icon={Calendar} hint={periodoLabel} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Faturamento" value={fmtBRL(k.faturamento_periodo_centavos ?? 0)} icon={Wallet} hint={periodoLabel} />
        <StatCard label="Consultas hoje" value={fmtNum(k.consultas_hoje ?? 0)} icon={Calendar}
          hint={`${k.consultas_em_andamento ?? 0} em andamento`} />
        <StatCard label="Confirmadas hoje" value={fmtNum(k.consultas_confirmadas_hoje ?? 0)} icon={ShieldCheck}
          hint={`${k.consultas_concluidas_hoje ?? 0} concluídas · ${k.consultas_canceladas_hoje ?? 0} canceladas`} />
      </div>

      {/* Alertas do sistema */}
      {data && data.alertas.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {data.alertas.map((a, i) => (
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
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Últimos agendamentos */}
        <div className="card-elevated p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Últimos agendamentos</h3>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/agendamentos">Ver todos</Link>
            </Button>
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
              {(data?.ultimos_agendamentos ?? []).length === 0 && !loading && (
                <tr><td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Nenhum agendamento ainda.</td></tr>
              )}
              {(data?.ultimos_agendamentos ?? []).map(a => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-2.5 font-mono text-xs">{fmtHora(a.inicio)}</td>
                  <td className="font-medium">{a.paciente ?? "—"}</td>
                  <td className="text-muted-foreground">{a.medico ?? "—"}</td>
                  <td className="text-xs"><span className="rounded bg-muted px-1.5 py-0.5">{a.canal}</span></td>
                  <td><StatusBadge status={a.status as any} /></td>
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
              <span>Confirmar consultas amanhã</span>
              <strong className={cn((p.confirmar_amanha ?? 0) > 0 && "text-warning")}>{fmtNum(p.confirmar_amanha ?? 0)}</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Aguardando pagamento</span>
              <strong className={cn((p.aguardando_pagamento ?? 0) > 0 && "text-warning")}>{fmtNum(p.aguardando_pagamento ?? 0)}</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Médicos sem sala padrão</span>
              <strong className={cn((p.medicos_sem_sala ?? 0) > 0 && "text-destructive")}>{fmtNum(p.medicos_sem_sala ?? 0)}</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Médicos aguardando aprovação</span>
              <strong className={cn((p.medicos_pendentes ?? 0) > 0 && "text-warning")}>{fmtNum(p.medicos_pendentes ?? 0)}</strong>
            </li>
            <li className="flex justify-between rounded-lg border border-border p-2.5">
              <span>Colaboradores não convidados</span>
              <strong className={cn((p.colaboradores_pendentes ?? 0) > 0 && "text-info")}>{fmtNum(p.colaboradores_pendentes ?? 0)}</strong>
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
              {(data?.ultimos_pacientes ?? []).length === 0 && !loading && (
                <tr><td colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Nenhum paciente cadastrado ainda.</td></tr>
              )}
              {(data?.ultimos_pacientes ?? []).map(pa => (
                <tr key={pa.id} className="border-t border-border">
                  <td className="py-2.5 font-medium">{pa.nome ?? "—"}</td>
                  <td className="text-muted-foreground">{pa.empresa ?? "Particular"}</td>
                  <td><StatusBadge status={pa.status as any} /></td>
                  <td className="text-muted-foreground">{fmtData(pa.created_at)}</td>
                  <td className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/app/admin/pacientes/${pa.id}`}>Abrir <ArrowRight className="ml-1 h-3 w-3" /></Link>
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
