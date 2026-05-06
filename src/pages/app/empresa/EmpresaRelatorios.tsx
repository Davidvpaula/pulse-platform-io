import { useEffect, useMemo, useState } from "react";
import {
  Download, Lock, Activity, TrendingUp, Users, Wallet, Loader2,
  CalendarDays, Search, BarChart3,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export default function EmpresaRelatorios() {
  const { empresa: empAtual } = useEmpresaAtual();
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [faturas, setFaturas] = useState<any[]>([]);

  const [de, setDe] = useState<Date>(startOfMonth(subMonths(new Date(), 2)));
  const [ate, setAte] = useState<Date>(endOfMonth(new Date()));
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("consumo");

  useEffect(() => {
    if (empAtual) carregarDados();
  }, [empAtual, de, ate]);

  async function carregarDados() {
    if (!empAtual) return;
    const empresaId = empAtual.empresaId;
    setLoading(true);
    try {
      const deISO = de.toISOString();
      const ateISO = ate.toISOString();

      const [{ data: cons }, { data: funcs }, { data: fats }] = await Promise.all([
        supabase.from("consultas")
          .select("id, paciente_id, status, inicio, valor_centavos, valor_snapshot_centavos")
          .eq("empresa_id", empresaId)
          .gte("inicio", deISO).lte("inicio", ateISO)
          .order("inicio", { ascending: false })
          .limit(1000),
        supabase.from("empresas_funcionarios")
          .select("id, nome, setor, paciente_id, status")
          .eq("empresa_id", empresaId),
        supabase.from("empresas_faturas")
          .select("id, competencia_mes, competencia_ano, valor_total_centavos, qtd_consultas, qtd_funcionarios, status, vencimento")
          .eq("empresa_id", empresaId)
          .order("competencia_ano", { ascending: false })
          .order("competencia_mes", { ascending: false })
          .limit(100),
      ]);

      setConsultas(cons ?? []);
      setFuncionarios(funcs ?? []);
      setFaturas(fats ?? []);
    } catch (e: any) {
      toast.error("Erro ao carregar relatórios", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const realizadas = consultas.filter((c: any) => c.status === "concluida");
    const noShow = consultas.filter((c: any) => c.status === "no_show");
    const totalValor = realizadas.reduce((s: number, c: any) => s + (c.valor_snapshot_centavos ?? c.valor_centavos ?? 0), 0);
    const funcsAtivos = funcionarios.filter((f: any) => f.status === "ativo");
    const custoMedio = funcsAtivos.length > 0 ? Math.round(totalValor / funcsAtivos.length) : 0;
    const taxaUso = funcsAtivos.length > 0 ? Math.round((realizadas.length / funcsAtivos.length) * 100) : 0;
    const noShowPct = consultas.length > 0 ? Math.round((noShow.length / consultas.length) * 100) : 0;
    return { totalConsultas: consultas.length, realizadas: realizadas.length, noShow: noShow.length, noShowPct, totalValor, funcsAtivos: funcsAtivos.length, custoMedio, taxaUso };
  }, [consultas, funcionarios]);

  /* ─── Consumo por funcionário ─── */
  const consumoPorFunc = useMemo(() => {
    const map = new Map<string, { nome: string; setor: string; consultas: number; valor: number; noShow: number }>();
    const funcsAtivos = funcionarios.filter((f: any) => f.status === "ativo" && f.paciente_id);
    for (const f of funcsAtivos) {
      map.set(f.paciente_id, { nome: f.nome, setor: f.setor ?? "—", consultas: 0, valor: 0, noShow: 0 });
    }
    for (const c of consultas) {
      const entry = map.get(c.paciente_id);
      if (!entry) continue;
      if (c.status === "concluida") {
        entry.consultas++;
        entry.valor += c.valor_snapshot_centavos ?? c.valor_centavos ?? 0;
      } else if (c.status === "no_show") {
        entry.noShow++;
      }
    }
    return [...map.values()].sort((a, b) => b.consultas - a.consultas);
  }, [consultas, funcionarios]);

  /* ─── Por setor ─── */
  const porSetor = useMemo(() => {
    const map = new Map<string, { funcionarios: number; consultas: number; valor: number }>();
    const funcsAtivos = funcionarios.filter((f: any) => f.status === "ativo");
    for (const f of funcsAtivos) {
      const setor = f.setor ?? "Sem setor";
      if (!map.has(setor)) map.set(setor, { funcionarios: 0, consultas: 0, valor: 0 });
      map.get(setor)!.funcionarios++;
    }
    for (const c of consultas) {
      if (c.status !== "concluida") continue;
      const func = funcionarios.find((f: any) => f.paciente_id === c.paciente_id);
      const setor = func?.setor ?? "Sem setor";
      if (!map.has(setor)) map.set(setor, { funcionarios: 0, consultas: 0, valor: 0 });
      map.get(setor)!.consultas++;
      map.get(setor)!.valor += c.valor_snapshot_centavos ?? c.valor_centavos ?? 0;
    }
    return [...map.entries()].map(([setor, data]) => ({
      setor,
      ...data,
      taxaUso: data.funcionarios > 0 ? Math.round((data.consultas / data.funcionarios) * 100) : 0,
    })).sort((a, b) => b.consultas - a.consultas);
  }, [consultas, funcionarios]);

  /* ─── Export CSV ─── */
  function exportCsv() {
    if (consumoPorFunc.length === 0) { toast.info("Nada para exportar"); return; }
    const header = "Funcionário;Setor;Consultas;Valor (R$);No-Show";
    const rows = consumoPorFunc.map(f =>
      `"${f.nome}";"${f.setor}";${f.consultas};${(f.valor / 100).toFixed(2).replace(".", ",")};${f.noShow}`
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-empresa-${format(de, "yyyy-MM")}-a-${format(ate, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!empAtual) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Empresa não vinculada à sua conta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios corporativos"
        description={`Indicadores agregados · ${empAtual.nomeFantasia || empAtual.razaoSocial}`}
        actions={
          <Button onClick={exportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="card-elevated flex items-start gap-3 border-warning/30 bg-warning/5 p-4">
        <Lock className="mt-0.5 h-4 w-4 text-warning shrink-0" />
        <p className="text-sm">
          Estes relatórios são <strong>agregados por setor</strong>. Dados clínicos individuais não são compartilhados com a empresa.
        </p>
      </div>

      {/* Filtros */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3">
          <DatePick label="De" value={de} onChange={setDe} />
          <DatePick label="Até" value={ate} onChange={setAte} />
          <Button variant="outline" size="sm" onClick={carregarDados}>Atualizar</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Taxa de uso" value={`${kpis.taxaUso}%`} icon={TrendingUp} hint="consultas / ativo" />
        <StatCard label="No-show" value={`${kpis.noShowPct}%`} icon={Activity} hint={`${kpis.noShow} ocorrências`} />
        <StatCard label="Custo médio/colaborador" value={brl(kpis.custoMedio)} icon={Wallet} />
        <StatCard label="Funcionários ativos" value={String(kpis.funcsAtivos)} icon={Users} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="consumo">Consumo por funcionário</TabsTrigger>
          <TabsTrigger value="setor">Por setor</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento</TabsTrigger>
        </TabsList>

        {/* ─── Consumo ─── */}
        <TabsContent value="consumo" className="mt-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar funcionário…" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Funcionário</th>
                    <th className="text-left px-3">Setor</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-right px-3">Valor</th>
                    <th className="text-center px-3">No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoPorFunc.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum dado no período.</td></tr>
                  )}
                  {consumoPorFunc.filter(f => !busca.trim() || f.nome.toLowerCase().includes(busca.toLowerCase())).map((f, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{f.nome}</td>
                      <td className="px-3 py-3 text-muted-foreground">{f.setor}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{f.consultas}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(f.valor)}</td>
                      <td className="px-3 py-3 text-center">
                        {f.noShow > 0 ? <Badge variant="destructive" className="text-[10px]">{f.noShow}</Badge> : <span className="text-muted-foreground">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Por setor ─── */}
        <TabsContent value="setor" className="mt-4">
          <div className="card-elevated p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Setor</th>
                    <th className="text-right px-3">Funcionários</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-right px-3">Taxa de uso</th>
                    <th className="text-right px-3">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {porSetor.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum dado.</td></tr>
                  )}
                  {porSetor.map((s, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{s.setor}</td>
                      <td className="px-3 py-3 text-right">{s.funcionarios}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.consultas}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(s.taxaUso, 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">{s.taxaUso}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(s.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Faturamento ─── */}
        <TabsContent value="faturamento" className="mt-4">
          <div className="card-elevated p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Competência</th>
                    <th className="text-right px-3">Valor</th>
                    <th className="text-right px-3">Funcionários</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-left px-3">Vencimento</th>
                    <th className="text-left px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {faturas.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma fatura encontrada.</td></tr>
                  )}
                  {faturas.map((f: any) => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 tabular-nums font-medium">{String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(f.valor_total_centavos)}</td>
                      <td className="px-3 py-3 text-right">{f.qtd_funcionarios}</td>
                      <td className="px-3 py-3 text-right">{f.qtd_consultas}</td>
                      <td className="px-3 py-3 tabular-nums">{fmtDate(f.vencimento)}</td>
                      <td className="px-3 py-3">
                        <Badge variant={f.status === "paga" ? "default" : f.status === "atrasada" ? "destructive" : "secondary"} className="capitalize text-[10px]">
                          {f.status.replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Date picker helper ─── */
function DatePick({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
          <CalendarDays className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
          {label}: {format(value, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => d && onChange(d)}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
