import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart, Calendar, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, Filter, Users, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { listConsultasParaSecretaria, type ConsultaDetalhada } from "@/lib/clinico";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const periodos = [
  { key: "7d", label: "Últimos 7 dias", days: 7 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "90d", label: "Últimos 90 dias", days: 90 },
] as const;

export default function SecretariaRelatorios() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultaDetalhada[]>([]);
  const [periodo, setPeriodo] = useState<typeof periodos[number]["key"]>("30d");

  async function carregar() {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const cfg = periodos.find(p => p.key === periodo)!;
    const ate = new Date(); ate.setHours(23, 59, 59, 999);
    const desde = new Date(ate); desde.setDate(desde.getDate() - cfg.days); desde.setHours(0, 0, 0, 0);
    const data = await listConsultasParaSecretaria({ desde, ate });
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, periodo]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const concluidas = rows.filter(c => c.status === "concluida").length;
    const canceladas = rows.filter(c => c.status === "cancelada").length;
    const noShow = rows.filter(c => c.status === "no_show").length;
    const confirmadas = rows.filter(c => c.status === "confirmada" || c.status === "agendada").length;
    return {
      total,
      concluidas,
      canceladas,
      noShow,
      confirmadas,
      taxaConclusao: total ? Math.round((concluidas / total) * 100) : 0,
      taxaCancelamento: total ? Math.round((canceladas / total) * 100) : 0,
      taxaNoShow: total ? Math.round((noShow / total) * 100) : 0,
    };
  }, [rows]);

  const porMedico = useMemo(() => {
    const map = new Map<string, { total: number; concluidas: number; canceladas: number; noShow: number }>();
    rows.forEach(c => {
      const k = c.medico_nome ?? "—";
      if (!map.has(k)) map.set(k, { total: 0, concluidas: 0, canceladas: 0, noShow: 0 });
      const v = map.get(k)!;
      v.total++;
      if (c.status === "concluida") v.concluidas++;
      if (c.status === "cancelada") v.canceladas++;
      if (c.status === "no_show") v.noShow++;
    });
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const porModalidade = useMemo(() => {
    const online = rows.filter(c => c.modalidade === "online").length;
    const presencial = rows.filter(c => c.modalidade === "presencial").length;
    return { online, presencial };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios operacionais"
        description="Indicadores de operação clínica — visíveis para Secretaria com permissão de supervisão."
      />

      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Período:</span>
          {periodos.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                periodo === p.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card-elevated flex items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculando indicadores…
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Total no período" value={kpis.total.toString()} icon={Calendar} />
            <StatCard
              label="Taxa de conclusão"
              value={`${kpis.taxaConclusao}%`}
              icon={CheckCircle2}
              hint={`${kpis.concluidas} consultas`}
            />
            <StatCard
              label="Taxa de cancelamento"
              value={`${kpis.taxaCancelamento}%`}
              icon={TrendingDown}
              hint={`${kpis.canceladas} canceladas`}
            />
            <StatCard
              label="No-show"
              value={`${kpis.taxaNoShow}%`}
              icon={AlertTriangle}
              hint={`${kpis.noShow} faltas`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-elevated p-5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Distribuição por modalidade
              </h3>
              <div className="mt-4 space-y-3">
                <ModalidadeBar label="Online" value={porModalidade.online} total={kpis.total} />
                <ModalidadeBar label="Presencial" value={porModalidade.presencial} total={kpis.total} />
              </div>
            </div>

            <div className="card-elevated p-5">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Status atual da carteira
              </h3>
              <div className="mt-4 space-y-2 text-sm">
                <Linha label="Confirmadas/agendadas" value={kpis.confirmadas} variant="success" />
                <Linha label="Concluídas" value={kpis.concluidas} variant="default" />
                <Linha label="Canceladas" value={kpis.canceladas} variant="warning" />
                <Linha label="No-show" value={kpis.noShow} variant="destructive" />
              </div>
            </div>
          </div>

          <div className="card-elevated overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Desempenho por médico
              </h3>
              <Badge variant="outline" className="text-[10px]">
                <Users className="mr-1 h-3 w-3" />
                {porMedico.length} profissionais
              </Badge>
            </div>
            {porMedico.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum dado para exibir no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Médico</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Concluídas</th>
                      <th className="px-4 py-2 text-right">Canceladas</th>
                      <th className="px-4 py-2 text-right">No-show</th>
                      <th className="px-4 py-2 text-right">% conclusão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMedico.map(m => {
                      const taxa = m.total ? Math.round((m.concluidas / m.total) * 100) : 0;
                      return (
                        <tr key={m.nome} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium">{m.nome}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{m.total}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-success">{m.concluidas}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-warning">{m.canceladas}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-destructive">{m.noShow}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{taxa}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Dados calculados em tempo real a partir das consultas registradas.
        Para análises avançadas (BI, exportação), acesse <strong>Análises</strong> no painel admin.
      </p>
    </div>
  );
}

function ModalidadeBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Linha({
  label, value, variant,
}: { label: string; value: number; variant: "default" | "success" | "warning" | "destructive" }) {
  const cls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[variant];
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono font-semibold", cls)}>{value}</span>
    </div>
  );
}
