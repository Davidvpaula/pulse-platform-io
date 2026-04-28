import { useMemo } from "react";
import { Download, Lock, Brain, Activity, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  getKpis, getStatsPorSetor, listFuncionarios, listAgendamentos, getPerfil, brl,
} from "@/lib/empresa";

export default function EmpresaRelatorios() {
  const kpis = getKpis();
  const setores = getStatsPorSetor();
  const funcs = listFuncionarios();
  const ags = listAgendamentos();
  const perfil = getPerfil();

  const topColaboradores = useMemo(() =>
    [...funcs].sort((a, b) => b.consultasTotal - a.consultasTotal).slice(0, 5),
  [funcs]);

  // absenteísmo simulado: % de no_show / cancelado
  const absenteismo = useMemo(() => {
    if (ags.length === 0) return 0;
    const x = ags.filter(a => a.status === "cancelado").length;
    return Math.round((x / ags.length) * 100);
  }, [ags]);

  // saúde mental (indicador): % consultas em psiquiatria
  const saudeMental = useMemo(() => {
    if (ags.length === 0) return 0;
    const x = ags.filter(a => a.especialidade.toLowerCase().includes("psiq")).length;
    return Math.round((x / ags.length) * 100);
  }, [ags]);

  function exportPdf() {
    // Mock — em produção, geração via edge function/PDFKit
    window.print();
    toast({ title: "Relatório enviado para impressão", description: "Use 'Salvar como PDF' no diálogo de impressão." });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Inteligência</p>
          <h1 className="font-display text-2xl font-bold">Relatórios corporativos</h1>
          <p className="text-sm text-muted-foreground">Indicadores agregados · {perfil.nomeFantasia}</p>
        </div>
        <Button onClick={exportPdf} className="bg-gradient-primary hover:opacity-90">
          <Download className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </header>

      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4 print:hidden">
        <Lock className="mt-0.5 h-4 w-4 text-warning" />
        <p className="text-sm">
          Estes relatórios são <strong>agregados e anônimos por setor</strong>. Dados clínicos individuais não são compartilhados com a empresa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Indicator label="Taxa de uso" value={`${kpis.taxaUso}%`} icon={TrendingUp} hint="consultas/ativo" />
        <Indicator label="Absenteísmo" value={`${absenteismo}%`} icon={Activity} hint="cancelamentos no período" />
        <Indicator label="Saúde mental" value={`${saudeMental}%`} icon={Brain} hint="% consultas psiquiatria" />
        <Indicator label="Custo médio" value={brl(kpis.custoMedioColaborador)} icon={Activity} hint="por colaborador ativo" />
      </div>

      <section className="card-elevated p-6">
        <h2 className="font-display text-lg font-semibold">Custo e uso por setor</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="pb-2 pr-3">Setor</th><th className="pb-2 pr-3">Funcionários</th><th className="pb-2 pr-3">Consultas</th><th className="pb-2 pr-3">Taxa de uso</th><th className="pb-2">Custo</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {setores.map(s => (
                <tr key={s.setor}>
                  <td className="py-3 pr-3 font-medium">{s.setor}</td>
                  <td className="py-3 pr-3">{s.funcionarios}</td>
                  <td className="py-3 pr-3">{s.consultas}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-gradient-primary" style={{ width: `${Math.min(s.taxaUso, 100)}%` }} />
                      </div>
                      <span className="text-xs">{s.taxaUso}%</span>
                    </div>
                  </td>
                  <td className="py-3">{brl(s.custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-elevated p-6">
        <h2 className="font-display text-lg font-semibold">Consultas por colaborador</h2>
        <p className="mt-1 text-xs text-muted-foreground">Top 5 — apenas volume, sem detalhes clínicos.</p>
        <ul className="mt-4 space-y-2">
          {topColaboradores.map(c => {
            const max = topColaboradores[0]?.consultasTotal || 1;
            return (
              <li key={c.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{c.nome}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-primary" style={{ width: `${(c.consultasTotal / max) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold">{c.consultasTotal}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Indicator({ label, value, icon: Icon, hint }: { label: string; value: string; icon: React.ElementType; hint?: string }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
