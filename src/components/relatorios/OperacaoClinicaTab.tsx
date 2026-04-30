import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { FiltrosGlobais, num, pct, toRpcArgs, downloadCSV, COLORS } from "@/lib/relatorios/utils";
import { Stethoscope, Clock, Repeat, AlertTriangle, Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";

type Props = { filtros: FiltrosGlobais };

export default function OperacaoClinicaTab({ filtros }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);

  const carregar = async () => {
    setLoading(true);
    try {
      const args = toRpcArgs(filtros);
      const { data: cli, error } = await supabase.rpc("relatorios_clinica", {
        p_inicio: args.p_inicio, p_fim: args.p_fim,
        p_medico_id: args.p_medico_id, p_especialidade: args.p_especialidade,
        p_canal: args.p_canal, p_empresa_id: args.p_empresa_id,
      });
      if (error) throw error;
      setData(cli);

      const ins: string[] = [];
      const horarios = ((cli as any)?.por_horario || []) as any[];
      if (horarios.length > 0) {
        const pico = horarios.reduce((a, b) => (a.total > b.total ? a : b));
        ins.push(`🕒 Horário de pico: ${pico.hora}h com ${pico.total} consultas`);
        const ocioso = horarios.filter((h) => h.hora >= 8 && h.hora <= 18).reduce((a, b) => (a.total < b.total ? a : b), horarios[0]);
        if (ocioso && ocioso.total < (pico.total * 0.3)) {
          ins.push(`💤 Horário ocioso: ${ocioso.hora}h com apenas ${ocioso.total} consultas`);
        }
      }
      const espec = ((cli as any)?.por_especialidade || []) as any[];
      if (espec.length > 0) {
        ins.push(`📈 Especialidade líder: ${espec[0].especialidade} (${espec[0].total} consultas)`);
      }
      if ((cli as any)?.taxa_retorno_pct < 20) {
        ins.push(`⚠️ Taxa de retorno baixa (${(cli as any).taxa_retorno_pct}%) — investigar engajamento.`);
      }
      setInsights(ins);
    } catch (e: any) {
      toast.error("Erro ao carregar operação clínica", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [JSON.stringify(filtros)]);

  const exportar = () => {
    if (!data) return;
    const linhas: any[][] = [["Especialidade", "Total", "Concluídas", "Receita (centavos)"]];
    (data.por_especialidade || []).forEach((e: any) => linhas.push([e.especialidade, e.total, e.concluidas, e.receita_centavos]));
    downloadCSV(`operacao-clinica-${filtros.inicio}-a-${filtros.fim}.csv`, linhas);
  };

  if (loading && !data) return <Skeleton className="h-96" />;

  const horariosCompletos = Array.from({ length: 24 }, (_, h) => ({
    hora: `${h}h`,
    total: ((data?.por_horario || []) as any[]).find((x) => x.hora === h)?.total || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={exportar}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Especialidades atuantes" value={num((data?.por_especialidade || []).length)} icon={Stethoscope} />
        <KpiCard label="Tempo médio (min)" value={num(data?.tempo_medio_minutos)} icon={Clock} hint="Consultas concluídas" />
        <KpiCard label="Taxa de retorno" value={pct(data?.taxa_retorno_pct)} icon={Repeat} variant={(data?.taxa_retorno_pct || 0) < 20 ? "warning" : "success"} />
        <KpiCard label="Canais de origem" value={num((data?.por_canal || []).length)} icon={AlertTriangle} />
      </div>

      {insights.length > 0 && (
        <Card className="p-4 bg-accent/30 border-accent">
          <h3 className="text-sm font-semibold mb-2">Insights automáticos</h3>
          <ul className="text-sm space-y-1">
            {insights.map((i, idx) => <li key={idx}>{i}</li>)}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Consultas por hora do dia</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={horariosCompletos}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="total" name="Consultas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Consultas por especialidade</h3>
          {(data?.por_especialidade || []).length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.por_especialidade.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="especialidade" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="total" name="Total" fill={COLORS[0]} />
                <Bar dataKey="concluidas" name="Concluídas" fill={COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Distribuição por canal de origem</h3>
        {(data?.por_canal || []).length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {data.por_canal.map((c: any, i: number) => (
              <div key={c.canal} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="text-xs text-muted-foreground capitalize">{c.canal.replace(/_/g, " ")}</div>
                  <div className="text-lg font-semibold">{num(c.total)}</div>
                </div>
                <div className="h-10 w-1 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
