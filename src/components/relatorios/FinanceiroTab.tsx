import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { FiltrosGlobais, brl, num, toRpcArgs, downloadCSV, COLORS } from "@/lib/relatorios/utils";
import { DollarSign, Wallet, Receipt, AlertCircle, Download, RotateCcw } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";

type Props = { filtros: FiltrosGlobais };

export default function FinanceiroTab({ filtros }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const args = toRpcArgs(filtros);
      const { data: fin, error } = await supabase.rpc("relatorios_financeiro", {
        p_inicio: args.p_inicio, p_fim: args.p_fim,
        p_medico_id: args.p_medico_id, p_empresa_id: args.p_empresa_id,
      });
      if (error) throw error;
      setData(fin);
    } catch (e: any) {
      toast.error("Erro ao carregar financeiro", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [JSON.stringify(filtros)]);

  const exportar = () => {
    if (!data) return;
    const linhas: any[][] = [["Indicador", "Valor"]];
    linhas.push(["Receita bruta", brl(data.receita_bruta_centavos)]);
    linhas.push(["Receita líquida (pagamentos)", brl(data.receita_liquida_centavos)]);
    linhas.push(["Comissão da plataforma", brl(data.comissao_plataforma_centavos)]);
    linhas.push(["Repasse médicos", brl(data.repasse_medicos_centavos)]);
    linhas.push(["Reembolsos", brl(data.reembolsos_centavos)]);
    linhas.push(["Pendente", brl(data.pendente_centavos)]);
    linhas.push([]);
    linhas.push(["--- Por serviço ---"]);
    linhas.push(["Serviço", "Total", "Receita"]);
    (data.por_servico || []).forEach((s: any) => linhas.push([s.servico, s.total, brl(s.receita_centavos)]));
    linhas.push([]);
    linhas.push(["--- Por canal ---"]);
    linhas.push(["Canal", "Receita"]);
    (data.por_canal || []).forEach((c: any) => linhas.push([c.canal, brl(c.receita_centavos)]));
    downloadCSV(`financeiro-${filtros.inicio}-a-${filtros.fim}.csv`, linhas);
  };

  if (loading && !data) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/app/admin/relatorios/financeiro" className="text-sm text-primary hover:underline">
          Ver relatório completo com snapshots imutáveis e exportação PDF →
        </Link>
        <Button size="sm" variant="outline" onClick={exportar}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Receita bruta" value={brl(data?.receita_bruta_centavos)} icon={DollarSign} variant="success" />
        <KpiCard label="Receita líquida" value={brl(data?.receita_liquida_centavos)} icon={Wallet} variant="success" hint="Pagamentos confirmados" />
        <KpiCard label="Comissão plataforma" value={brl(data?.comissao_plataforma_centavos)} icon={Receipt} />
        <KpiCard label="Repasse médicos" value={brl(data?.repasse_medicos_centavos)} icon={Wallet} />
        <KpiCard label="Reembolsos" value={brl(data?.reembolsos_centavos)} icon={RotateCcw} variant="warning" />
        <KpiCard label="Pendente" value={brl(data?.pendente_centavos)} icon={AlertCircle} variant="warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Receita por serviço</h3>
          {(data?.por_servico || []).length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.por_servico.slice(0, 10).map((s: any) => ({ ...s, receita: (s.receita_centavos || 0) / 100 }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="servico" tick={{ fontSize: 10 }} width={130} />
                <Tooltip formatter={(v: any) => brl((v as number) * 100)} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="receita" name="Receita" fill={COLORS[3]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Receita por canal</h3>
          {(data?.por_canal || []).length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.por_canal.map((c: any) => ({ ...c, receita: (c.receita_centavos || 0) / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="canal" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => brl((v as number) * 100)} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="receita" name="Receita" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Pagamentos por status</h3>
        {(data?.por_status_pagamento || []).length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Sem pagamentos no período.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-2">Status</th><th className="text-right py-2">Quantidade</th><th className="text-right py-2">Valor total</th></tr>
              </thead>
              <tbody>
                {data.por_status_pagamento.map((s: any) => (
                  <tr key={s.status} className="border-b last:border-0">
                    <td className="py-2"><Badge variant="outline" className="capitalize">{s.status?.replace(/_/g, " ")}</Badge></td>
                    <td className="py-2 text-right">{num(s.total)}</td>
                    <td className="py-2 text-right font-medium">{brl(s.valor_centavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
