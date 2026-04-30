import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { FiltrosGlobais, brl, num, pct, toRpcArgs, downloadCSV, formatDia, COLORS } from "@/lib/relatorios/utils";
import {
  DollarSign, Calendar, Users, TrendingUp, AlertTriangle, CheckCircle2, Activity, UserPlus, Repeat, Download,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";

type Props = { filtros: FiltrosGlobais };

export default function VisaoExecutivaTab({ filtros }: Props) {
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [serie, setSerie] = useState<any[]>([]);
  const [porEspec, setPorEspec] = useState<any[]>([]);

  const carregar = async () => {
    setLoading(true);
    try {
      const args = toRpcArgs(filtros);
      const [{ data: ex, error: e1 }, { data: dia, error: e2 }, { data: cli, error: e3 }] = await Promise.all([
        supabase.rpc("relatorios_executivo", args),
        supabase.rpc("relatorios_consultas_diarias", args),
        supabase.rpc("relatorios_clinica", {
          p_inicio: args.p_inicio, p_fim: args.p_fim,
          p_medico_id: args.p_medico_id, p_especialidade: args.p_especialidade,
          p_canal: args.p_canal, p_empresa_id: args.p_empresa_id,
        }),
      ]);
      if (e1 || e2 || e3) throw e1 || e2 || e3;
      setKpis(ex);
      setSerie((dia || []).map((d: any) => ({
        ...d, dia_label: formatDia(d.dia), receita: (d.receita_centavos || 0) / 100,
      })));
      setPorEspec(((cli as any)?.por_especialidade || []).slice(0, 8));
    } catch (e: any) {
      toast.error("Erro ao carregar visão executiva", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [JSON.stringify(filtros)]);

  const exportar = () => {
    if (!kpis) return;
    const linhas = [
      ["Indicador", "Valor"],
      ["Receita bruta", brl(kpis.receita_bruta_centavos)],
      ["Lucro estimado (plataforma)", brl(kpis.lucro_estimado_centavos)],
      ["Repasse médicos", brl(kpis.receita_medico_centavos)],
      ["Total consultas", kpis.total_consultas],
      ["Concluídas", kpis.concluidas],
      ["No-show", kpis.no_show],
      ["Canceladas", kpis.canceladas],
      ["Ticket médio", brl(kpis.ticket_medio_centavos)],
      ["Taxa comparecimento", pct(kpis.taxa_comparecimento)],
      ["Taxa no-show", pct(kpis.taxa_no_show)],
      ["Novos pacientes", kpis.novos_pacientes],
      ["Pacientes recorrentes", kpis.pacientes_recorrentes],
      ["Leads", kpis.leads],
      ["Conversão lead→consulta", pct(kpis.taxa_conversao_lead)],
      ["Crescimento receita vs período anterior", pct(kpis.crescimento_receita_pct)],
    ];
    downloadCSV(`visao-executiva-${filtros.inicio}-a-${filtros.fim}.csv`, linhas);
  };

  if (loading && !kpis) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button size="sm" variant="outline" onClick={exportar}>
          <Download className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Receita bruta" value={brl(kpis?.receita_bruta_centavos)} icon={DollarSign} variant="success" delta={kpis?.crescimento_receita_pct} />
        <KpiCard label="Lucro estimado" value={brl(kpis?.lucro_estimado_centavos)} icon={TrendingUp} variant="success" hint="Comissão da plataforma" />
        <KpiCard label="Consultas" value={num(kpis?.total_consultas)} icon={Calendar} delta={kpis?.crescimento_consultas_pct} />
        <KpiCard label="Ticket médio" value={brl(kpis?.ticket_medio_centavos)} icon={Activity} hint="Sobre concluídas" />
        <KpiCard label="Taxa comparecimento" value={pct(kpis?.taxa_comparecimento)} icon={CheckCircle2} variant="success" />
        <KpiCard label="Taxa no-show" value={pct(kpis?.taxa_no_show)} icon={AlertTriangle} variant={(kpis?.taxa_no_show || 0) > 15 ? "danger" : "warning"} />
        <KpiCard label="Novos pacientes" value={num(kpis?.novos_pacientes)} icon={UserPlus} hint={`${num(kpis?.pacientes_recorrentes)} recorrentes`} />
        <KpiCard label="Conversão lead→consulta" value={pct(kpis?.taxa_conversao_lead)} icon={Users} hint={`${num(kpis?.leads)} leads`} />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Receita e consultas por dia</h3>
            <p className="text-xs text-muted-foreground">Evolução diária no período selecionado</p>
          </div>
        </div>
        {serie.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia_label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any, name: string) => name === "Receita (R$)" ? brl((v as number) * 100) : v}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="total_consultas" name="Consultas" stroke={COLORS[0]} strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="concluidas" name="Concluídas" stroke={COLORS[3]} strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="receita" name="Receita (R$)" stroke={COLORS[4]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Receita por especialidade</h3>
          {porEspec.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porEspec.map((p) => ({ ...p, receita: (p.receita_centavos || 0) / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="especialidade" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => brl((v as number) * 100)} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="receita" name="Receita" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição de consultas</h3>
          {!kpis || kpis.total_consultas === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Concluídas", value: kpis.concluidas },
                    { name: "Confirmadas", value: kpis.confirmadas },
                    { name: "No-show", value: kpis.no_show },
                    { name: "Canceladas", value: kpis.canceladas },
                  ].filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%" outerRadius={90} label
                >
                  {[COLORS[3], COLORS[2], COLORS[5], COLORS[4]].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
