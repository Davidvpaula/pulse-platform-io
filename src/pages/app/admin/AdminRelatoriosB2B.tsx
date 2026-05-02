import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Wallet, Users, Activity, Download, Building2, Loader2,
  BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type EmpresaReport = {
  id: string;
  razao_social: string;
  vidas_contratadas: number;
  vidas_ativas: number;
  consultas_mes: number;
  custo_total_centavos: number;
  custo_por_vida_centavos: number;
  sinistralidade_pct: number;
  no_show_pct: number;
};

export default function AdminRelatoriosB2B() {
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<EmpresaReport[]>([]);

  useEffect(() => {
    carregarRelatorios();
  }, []);

  async function carregarRelatorios() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razao_social, ativo")
        .eq("ativo", true)
        .order("razao_social");

      if (error) throw error;

      // Build mock report data from empresas
      const reports: EmpresaReport[] = (data ?? []).map((e: any) => {
        const vidas = Math.floor(Math.random() * 150) + 20;
        const ativas = Math.floor(vidas * (0.7 + Math.random() * 0.3));
        const consultas = Math.floor(ativas * (Math.random() * 0.8));
        const custo = consultas * (8000 + Math.floor(Math.random() * 7000));
        return {
          id: e.id,
          razao_social: e.razao_social,
          vidas_contratadas: vidas,
          vidas_ativas: ativas,
          consultas_mes: consultas,
          custo_total_centavos: custo,
          custo_por_vida_centavos: ativas > 0 ? Math.round(custo / ativas) : 0,
          sinistralidade_pct: Math.round(Math.random() * 80 + 10),
          no_show_pct: Math.round(Math.random() * 15),
        };
      });

      setEmpresas(reports);
    } catch (e: any) {
      toast.error("Erro ao carregar relatórios", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const totais = useMemo(() => {
    const totalVidas = empresas.reduce((s, e) => s + e.vidas_contratadas, 0);
    const totalAtivas = empresas.reduce((s, e) => s + e.vidas_ativas, 0);
    const totalConsultas = empresas.reduce((s, e) => s + e.consultas_mes, 0);
    const totalCusto = empresas.reduce((s, e) => s + e.custo_total_centavos, 0);
    const avgSinistr = empresas.length > 0
      ? Math.round(empresas.reduce((s, e) => s + e.sinistralidade_pct, 0) / empresas.length)
      : 0;
    return { totalVidas, totalAtivas, totalConsultas, totalCusto, avgSinistr };
  }, [empresas]);

  function exportCsv() {
    const header = "Empresa,Vidas Contratadas,Vidas Ativas,Consultas/Mês,Custo Total,Custo/Vida,Sinistralidade %,No-Show %";
    const rows = empresas.map(e =>
      `"${e.razao_social}",${e.vidas_contratadas},${e.vidas_ativas},${e.consultas_mes},${(e.custo_total_centavos / 100).toFixed(2)},${(e.custo_por_vida_centavos / 100).toFixed(2)},${e.sinistralidade_pct},${e.no_show_pct}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-b2b-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios B2B"
        description="Sinistralidade, custo por vida e comparativo entre empresas."
        actions={
          <Button onClick={exportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Empresas ativas" value={String(empresas.length)} icon={Building2} />
        <StatCard label="Total de vidas" value={`${totais.totalAtivas}/${totais.totalVidas}`} icon={Users} />
        <StatCard label="Consultas/mês" value={String(totais.totalConsultas)} icon={Activity} />
        <StatCard label="Receita B2B" value={brl(totais.totalCusto)} icon={Wallet} />
        <StatCard label="Sinistralidade média" value={`${totais.avgSinistr}%`} icon={TrendingUp} />
      </div>

      {/* Comparativo entre empresas */}
      <div className="card-elevated p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" /> Comparativo entre empresas
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-right">Vidas</th>
                <th className="text-right">Consultas/mês</th>
                <th className="text-right">Custo total</th>
                <th className="text-right">Custo/vida</th>
                <th className="text-center">Sinistralidade</th>
                <th className="text-center">No-show</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map(e => (
                <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{e.razao_social}</td>
                  <td className="text-right">{e.vidas_ativas}/{e.vidas_contratadas}</td>
                  <td className="text-right">{e.consultas_mes}</td>
                  <td className="text-right tabular-nums">{brl(e.custo_total_centavos)}</td>
                  <td className="text-right tabular-nums">{brl(e.custo_por_vida_centavos)}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Progress value={e.sinistralidade_pct} className={`h-1.5 w-16 ${e.sinistralidade_pct > 60 ? "[&>div]:bg-destructive" : e.sinistralidade_pct > 40 ? "[&>div]:bg-warning" : ""}`} />
                      <span className={`text-xs font-medium ${e.sinistralidade_pct > 60 ? "text-destructive" : ""}`}>
                        {e.sinistralidade_pct}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center">
                    <Badge variant={e.no_show_pct > 10 ? "destructive" : "outline"} className="text-[10px]">
                      {e.no_show_pct}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top sinistralidade */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="font-semibold flex items-center gap-2 text-destructive">
            <ArrowUpRight className="h-4 w-4" /> Maior sinistralidade
          </h3>
          <ul className="mt-4 space-y-3">
            {[...empresas].sort((a, b) => b.sinistralidade_pct - a.sinistralidade_pct).slice(0, 5).map(e => (
              <li key={e.id} className="flex items-center justify-between">
                <span className="text-sm">{e.razao_social}</span>
                <span className="font-mono text-sm font-bold text-destructive">{e.sinistralidade_pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-elevated p-6">
          <h3 className="font-semibold flex items-center gap-2 text-primary">
            <ArrowDownRight className="h-4 w-4" /> Menor custo por vida
          </h3>
          <ul className="mt-4 space-y-3">
            {[...empresas].sort((a, b) => a.custo_por_vida_centavos - b.custo_por_vida_centavos).slice(0, 5).map(e => (
              <li key={e.id} className="flex items-center justify-between">
                <span className="text-sm">{e.razao_social}</span>
                <span className="font-mono text-sm font-bold text-primary">{brl(e.custo_por_vida_centavos)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
