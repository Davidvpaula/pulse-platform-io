import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, Wallet, Users, Activity, Download, Building2, Loader2,
  BarChart3, ArrowUpRight, ArrowDownRight, CalendarDays, Filter, Search,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

/* ─── Types ─── */
type ConsultaRow = {
  id: string;
  empresa_id: string;
  paciente_id: string;
  status: string;
  inicio: string;
  valor_centavos: number;
  valor_snapshot_centavos: number | null;
};

type FuncionarioRow = {
  id: string;
  empresa_id: string;
  nome: string;
  setor: string | null;
  paciente_id: string | null;
  status: string;
};

type FaturaRow = {
  id: string;
  empresa_id: string;
  competencia_mes: number;
  competencia_ano: number;
  valor_total_centavos: number;
  qtd_consultas: number;
  qtd_funcionarios: number;
  status: string;
  vencimento: string;
};

type EmpresaBasic = { id: string; razao_social: string };

export default function AdminRelatoriosB2B() {
  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<ConsultaRow[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncionarioRow[]>([]);
  const [faturas, setFaturas] = useState<FaturaRow[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaBasic[]>([]);

  const [de, setDe] = useState<Date>(startOfMonth(subMonths(new Date(), 2)));
  const [ate, setAte] = useState<Date>(endOfMonth(new Date()));
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");
  const [busca, setBusca] = useState("");
  const [tab, setTab] = useState("consumo");

  useEffect(() => { carregar(); }, [de, ate]);

  async function carregar() {
    setLoading(true);
    try {
      const deISO = de.toISOString();
      const ateISO = ate.toISOString();

      const [{ data: emp }, { data: cons }, { data: funcs }, { data: fats }] = await Promise.all([
        supabase.from("empresas").select("id, razao_social").eq("ativo", true).order("razao_social"),
        supabase.from("consultas").select("id, empresa_id, paciente_id, status, inicio, valor_centavos, valor_snapshot_centavos")
          .not("empresa_id", "is", null)
          .gte("inicio", deISO).lte("inicio", ateISO)
          .order("inicio", { ascending: false })
          .limit(1000),
        supabase.from("empresas_funcionarios").select("id, empresa_id, nome, setor, paciente_id, status"),
        supabase.from("empresas_faturas").select("id, empresa_id, competencia_mes, competencia_ano, valor_total_centavos, qtd_consultas, qtd_funcionarios, status, vencimento")
          .order("competencia_ano", { ascending: false })
          .order("competencia_mes", { ascending: false })
          .limit(500),
      ]);

      setEmpresas(emp ?? []);
      setConsultas((cons ?? []) as ConsultaRow[]);
      setFuncionarios((funcs ?? []) as FuncionarioRow[]);
      setFaturas((fats ?? []) as FaturaRow[]);
    } catch (e: any) {
      toast.error("Erro ao carregar relatórios", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  /* ─── Filtered data ─── */
  const filteredConsultas = useMemo(() => {
    if (filtroEmpresa === "todas") return consultas;
    return consultas.filter(c => c.empresa_id === filtroEmpresa);
  }, [consultas, filtroEmpresa]);

  const filteredFuncionarios = useMemo(() => {
    let arr = funcionarios;
    if (filtroEmpresa !== "todas") arr = arr.filter(f => f.empresa_id === filtroEmpresa);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(f => f.nome.toLowerCase().includes(q));
    }
    return arr;
  }, [funcionarios, filtroEmpresa, busca]);

  const filteredFaturas = useMemo(() => {
    if (filtroEmpresa === "todas") return faturas;
    return faturas.filter(f => f.empresa_id === filtroEmpresa);
  }, [faturas, filtroEmpresa]);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    const realizadas = filteredConsultas.filter(c => c.status === "concluida");
    const noShow = filteredConsultas.filter(c => c.status === "no_show");
    const totalValor = realizadas.reduce((s, c) => s + (c.valor_snapshot_centavos ?? c.valor_centavos ?? 0), 0);
    const funcsAtivos = filteredFuncionarios.filter(f => f.status === "ativo");
    const custoMedio = funcsAtivos.length > 0 ? Math.round(totalValor / funcsAtivos.length) : 0;
    const noShowPct = filteredConsultas.length > 0 ? Math.round((noShow.length / filteredConsultas.length) * 100) : 0;
    return {
      totalConsultas: filteredConsultas.length,
      realizadas: realizadas.length,
      noShow: noShow.length,
      noShowPct,
      totalValor,
      funcsAtivos: funcsAtivos.length,
      custoMedio,
    };
  }, [filteredConsultas, filteredFuncionarios]);

  /* ─── Consumo por funcionário ─── */
  const consumoPorFunc = useMemo(() => {
    const map = new Map<string, { nome: string; setor: string; consultas: number; valor: number; noShow: number }>();
    const funcsAtivos = filteredFuncionarios.filter(f => f.status === "ativo" && f.paciente_id);

    for (const f of funcsAtivos) {
      map.set(f.paciente_id!, { nome: f.nome, setor: f.setor ?? "—", consultas: 0, valor: 0, noShow: 0 });
    }

    for (const c of filteredConsultas) {
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
  }, [filteredConsultas, filteredFuncionarios]);

  /* ─── Comparativo empresas ─── */
  const comparativo = useMemo(() => {
    return empresas.map(e => {
      const cons = consultas.filter(c => c.empresa_id === e.id);
      const realizadas = cons.filter(c => c.status === "concluida");
      const noShowCount = cons.filter(c => c.status === "no_show").length;
      const funcs = funcionarios.filter(f => f.empresa_id === e.id && f.status === "ativo");
      const totalValor = realizadas.reduce((s, c) => s + (c.valor_snapshot_centavos ?? c.valor_centavos ?? 0), 0);
      const custoVida = funcs.length > 0 ? Math.round(totalValor / funcs.length) : 0;
      const sinistralidade = funcs.length > 0 ? Math.round((realizadas.length / Math.max(funcs.length, 1)) * 100) : 0;
      const noShowPct = cons.length > 0 ? Math.round((noShowCount / cons.length) * 100) : 0;
      return {
        id: e.id,
        razao_social: e.razao_social,
        vidasAtivas: funcs.length,
        consultas: realizadas.length,
        totalValor,
        custoVida,
        sinistralidade,
        noShowPct,
      };
    }).filter(e => e.vidasAtivas > 0 || e.consultas > 0);
  }, [empresas, consultas, funcionarios]);

  /* ─── Export ─── */
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
    a.download = `relatorio-b2b-${format(de, "yyyy-MM")}-a-${format(ate, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  }

  const empNome = (id: string) => empresas.find(e => e.id === id)?.razao_social ?? "—";

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
        title="Relatórios B2B Corporativos"
        description="Consumo por funcionário, coparticipação e faturamento detalhado por período."
        actions={
          <Button onClick={exportCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {/* Filtros de período */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3">
          <DatePick label="De" value={de} onChange={setDe} />
          <DatePick label="Até" value={ate} onChange={setAte} />
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-[220px]">
              <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={carregar}>
            <Filter className="mr-2 h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Consultas no período" value={String(kpis.totalConsultas)} icon={Activity} hint={`${kpis.realizadas} realizadas`} />
        <StatCard label="Funcionários ativos" value={String(kpis.funcsAtivos)} icon={Users} />
        <StatCard label="Receita B2B" value={brl(kpis.totalValor)} icon={Wallet} />
        <StatCard label="Custo médio/funcionário" value={brl(kpis.custoMedio)} icon={TrendingUp} />
        <StatCard label="No-show" value={`${kpis.noShowPct}%`} icon={ArrowUpRight} hint={`${kpis.noShow} ocorrências`} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="consumo">Consumo por funcionário</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo empresas</TabsTrigger>
          <TabsTrigger value="faturamento">Faturamento detalhado</TabsTrigger>
        </TabsList>

        {/* ─── Tab Consumo ─── */}
        <TabsContent value="consumo" className="mt-4">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar funcionário…" value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <span className="text-xs text-muted-foreground">{consumoPorFunc.length} funcionários</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Funcionário</th>
                    <th className="text-left px-3">Setor</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-right px-3">Valor total</th>
                    <th className="text-right px-3">Valor médio</th>
                    <th className="text-center px-3">No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {consumoPorFunc.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum dado no período.</td></tr>
                  )}
                  {consumoPorFunc.filter(f => !busca.trim() || f.nome.toLowerCase().includes(busca.toLowerCase())).map((f, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{f.nome}</td>
                      <td className="px-3 py-3 text-muted-foreground">{f.setor}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{f.consultas}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(f.valor)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{f.consultas > 0 ? brl(Math.round(f.valor / f.consultas)) : "—"}</td>
                      <td className="px-3 py-3 text-center">
                        {f.noShow > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{f.noShow}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab Comparativo ─── */}
        <TabsContent value="comparativo" className="mt-4">
          <div className="card-elevated p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-right px-3">Vidas ativas</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-right px-3">Receita</th>
                    <th className="text-right px-3">Custo/vida</th>
                    <th className="text-center px-3">Sinistralidade</th>
                    <th className="text-center px-3">No-show</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma empresa com dados no período.</td></tr>
                  )}
                  {comparativo.map(e => (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{e.razao_social}</td>
                      <td className="px-3 py-3 text-right">{e.vidasAtivas}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{e.consultas}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(e.totalValor)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{brl(e.custoVida)}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={Math.min(e.sinistralidade, 100)} className={cn("h-1.5 w-16", e.sinistralidade > 60 && "[&>div]:bg-destructive", e.sinistralidade > 40 && e.sinistralidade <= 60 && "[&>div]:bg-warning")} />
                          <span className={cn("text-xs font-medium", e.sinistralidade > 60 && "text-destructive")}>{e.sinistralidade}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={e.noShowPct > 10 ? "destructive" : "outline"} className="text-[10px]">{e.noShowPct}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rankings */}
          {comparativo.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2 mt-4">
              <div className="card-elevated p-6">
                <h3 className="font-semibold flex items-center gap-2 text-destructive">
                  <ArrowUpRight className="h-4 w-4" /> Maior sinistralidade
                </h3>
                <ul className="mt-4 space-y-3">
                  {[...comparativo].sort((a, b) => b.sinistralidade - a.sinistralidade).slice(0, 5).map(e => (
                    <li key={e.id} className="flex items-center justify-between">
                      <span className="text-sm">{e.razao_social}</span>
                      <span className="font-mono text-sm font-bold text-destructive">{e.sinistralidade}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-elevated p-6">
                <h3 className="font-semibold flex items-center gap-2 text-primary">
                  <ArrowDownRight className="h-4 w-4" /> Menor custo por vida
                </h3>
                <ul className="mt-4 space-y-3">
                  {[...comparativo].filter(e => e.custoVida > 0).sort((a, b) => a.custoVida - b.custoVida).slice(0, 5).map(e => (
                    <li key={e.id} className="flex items-center justify-between">
                      <span className="text-sm">{e.razao_social}</span>
                      <span className="font-mono text-sm font-bold text-primary">{brl(e.custoVida)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Tab Faturamento ─── */}
        <TabsContent value="faturamento" className="mt-4">
          <div className="card-elevated p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Empresa</th>
                    <th className="text-left px-3">Competência</th>
                    <th className="text-right px-3">Valor</th>
                    <th className="text-right px-3">Funcionários</th>
                    <th className="text-right px-3">Consultas</th>
                    <th className="text-left px-3">Vencimento</th>
                    <th className="text-left px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaturas.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Nenhuma fatura encontrada.</td></tr>
                  )}
                  {filteredFaturas.map(f => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{empNome(f.empresa_id)}</td>
                      <td className="px-3 py-3 tabular-nums">{String(f.competencia_mes).padStart(2, "0")}/{f.competencia_ano}</td>
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
