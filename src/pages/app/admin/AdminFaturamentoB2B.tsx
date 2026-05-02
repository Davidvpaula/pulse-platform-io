import { useEffect, useMemo, useState } from "react";
import {
  FileText, Download, Search, Loader2, Building2, Wallet,
  Clock, CheckCircle2, AlertTriangle, XCircle, Filter, CalendarDays,
  ReceiptText, Eye, ExternalLink, Stethoscope, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { gerarFaturaPdf } from "@/lib/gerarFaturaPdf";

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

type FaturaRow = {
  id: string;
  empresa_id: string;
  razao_social: string;
  contrato_id: string | null;
  competencia_mes: number;
  competencia_ano: number;
  competencia_label: string;
  vencimento: string;
  valor_total_centavos: number;
  qtd_funcionarios: number;
  qtd_consultas: number;
  status: string;
  pago_em: string | null;
  observacoes: string | null;
  detalhamento: any;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "em_aberto", label: "Em aberto" },
  { value: "paga", label: "Paga" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_STYLE: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
  paga: { cls: "bg-success/10 text-success border-success/30", icon: CheckCircle2 },
  em_aberto: { cls: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  atrasada: { cls: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
  cancelada: { cls: "bg-muted text-muted-foreground border-border", icon: XCircle },
};

function gerarAnosDisponiveis(): string[] {
  const anoAtual = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => String(anoAtual - i));
}

export default function AdminFaturamentoB2B() {
  const [loading, setLoading] = useState(true);
  const [faturas, setFaturas] = useState<FaturaRow[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [filtroEmpresa, setFiltroEmpresa] = useState("todas");

  type SortKey = "valor" | "competencia" | "vencimento";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("competencia");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPagina(1);
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />;
  }
  const [detalheAberto, setDetalheAberto] = useState<FaturaRow | null>(null);
  const [medicosVinculados, setMedicosVinculados] = useState<{ id: string; nome: string; qtd: number }[]>([]);
  const [loadingMedicos, setLoadingMedicos] = useState(false);

  async function carregarMedicosFatura(fatura: FaturaRow) {
    setLoadingMedicos(true);
    try {
      const { data } = await supabase
        .from("consultas")
        .select("medico_id, medico:profiles!consultas_medico_id_fkey(id, full_name)")
        .eq("empresa_id", fatura.empresa_id)
        .gte("inicio", `${fatura.competencia_ano}-${String(fatura.competencia_mes).padStart(2, "0")}-01`)
        .lt("inicio", fatura.competencia_mes === 12
          ? `${fatura.competencia_ano + 1}-01-01`
          : `${fatura.competencia_ano}-${String(fatura.competencia_mes + 1).padStart(2, "0")}-01`
        );

      const map = new Map<string, { id: string; nome: string; qtd: number }>();
      (data ?? []).forEach((c: any) => {
        const id = c.medico_id;
        const nome = c.medico?.full_name ?? "Médico";
        const existing = map.get(id);
        if (existing) existing.qtd++;
        else map.set(id, { id, nome, qtd: 1 });
      });
      setMedicosVinculados(Array.from(map.values()).sort((a, b) => b.qtd - a.qtd));
    } catch {
      setMedicosVinculados([]);
    } finally {
      setLoadingMedicos(false);
    }
  }

  function abrirDetalhe(f: FaturaRow) {
    setDetalheAberto(f);
    setMedicosVinculados([]);
    carregarMedicosFatura(f);
  }

  const empresasUnicas = useMemo(() => {
    const map = new Map<string, string>();
    faturas.forEach(f => map.set(f.empresa_id, f.razao_social));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [faturas]);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas_faturas")
        .select("*, empresas(razao_social)")
        .order("competencia_ano", { ascending: false })
        .order("competencia_mes", { ascending: false })
        .limit(500);

      if (error) throw error;

      setFaturas(
        (data ?? []).map((f: any) => ({
          id: f.id,
          empresa_id: f.empresa_id,
          razao_social: f.empresas?.razao_social ?? "—",
          contrato_id: f.contrato_id,
          competencia_mes: f.competencia_mes,
          competencia_ano: f.competencia_ano,
          competencia_label: `${String(f.competencia_mes).padStart(2, "0")}/${f.competencia_ano}`,
          vencimento: f.vencimento,
          valor_total_centavos: f.valor_total_centavos ?? 0,
          qtd_funcionarios: f.qtd_funcionarios ?? 0,
          qtd_consultas: f.qtd_consultas ?? 0,
          status: f.status,
          pago_em: f.pago_em,
          observacoes: f.observacoes,
          detalhamento: f.detalhamento,
          created_at: f.created_at,
        })),
      );
    } catch (e: any) {
      toast.error("Erro ao carregar faturas", { description: e.message });
    } finally {
      setLoading(false);
    }
  }

  const listaFiltrada = useMemo(() => {
    let arr = faturas;
    if (filtroStatus !== "todos") arr = arr.filter(f => f.status === filtroStatus);
    if (filtroAno !== "todos") arr = arr.filter(f => String(f.competencia_ano) === filtroAno);
    if (filtroEmpresa !== "todas") arr = arr.filter(f => f.empresa_id === filtroEmpresa);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(f => f.razao_social.toLowerCase().includes(q) || f.competencia_label.includes(q));
    }
    // Ordenação
    const sorted = [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "valor") {
        cmp = a.valor_total_centavos - b.valor_total_centavos;
      } else if (sortKey === "competencia") {
        cmp = (a.competencia_ano * 100 + a.competencia_mes) - (b.competencia_ano * 100 + b.competencia_mes);
      } else if (sortKey === "vencimento") {
        cmp = (a.vencimento ?? "").localeCompare(b.vencimento ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [faturas, filtroStatus, filtroAno, filtroEmpresa, busca, sortKey, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / POR_PAGINA));
  const lista = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return listaFiltrada.slice(inicio, inicio + POR_PAGINA);
  }, [listaFiltrada, pagina]);

  const kpis = useMemo(() => {
    const abertas = listaFiltrada.filter(f => f.status === "em_aberto");
    const atrasadas = listaFiltrada.filter(f => f.status === "atrasada");
    const pagas = listaFiltrada.filter(f => f.status === "paga");
    return {
      total: listaFiltrada.length,
      valorTotal: listaFiltrada.reduce((s, f) => s + f.valor_total_centavos, 0),
      abertas: abertas.length,
      valorAberto: abertas.reduce((s, f) => s + f.valor_total_centavos, 0),
      atrasadas: atrasadas.length,
      valorAtrasado: atrasadas.reduce((s, f) => s + f.valor_total_centavos, 0),
      pagas: pagas.length,
      valorPago: pagas.reduce((s, f) => s + f.valor_total_centavos, 0),
    };
  }, [listaFiltrada]);

  function exportarCSV() {
    if (listaFiltrada.length === 0) { toast.info("Nenhuma fatura para exportar"); return; }
    const header = "Empresa;Competência;Vencimento;Valor (R$);Funcionários;Consultas;Status;Pago em\n";
    const rows = listaFiltrada.map(f =>
      [
        f.razao_social,
        f.competencia_label,
        fmtDate(f.vencimento),
        (f.valor_total_centavos / 100).toFixed(2).replace(".", ","),
        f.qtd_funcionarios,
        f.qtd_consultas,
        f.status,
        fmtDate(f.pago_em),
      ].join(";"),
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturas-b2b-${filtroAno}.csv`;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturamento B2B"
        description="Faturas corporativas detalhadas por empresa, competência e status."
        actions={
          <Button variant="outline" onClick={exportarCSV}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Total no período" value={brl(kpis.valorTotal)} icon={Wallet} hint={`${kpis.total} faturas`} />
        <StatCard label="Em aberto" value={brl(kpis.valorAberto)} icon={Clock} hint={`${kpis.abertas} faturas`} />
        <StatCard label="Atrasadas" value={brl(kpis.valorAtrasado)} icon={AlertTriangle} hint={`${kpis.atrasadas} faturas`} />
        <StatCard label="Pagas" value={brl(kpis.valorPago)} icon={CheckCircle2} hint={`${kpis.pagas} faturas`} />
      </div>

      {/* Filtros */}
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar empresa ou competência…" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[150px]">
              <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroAno} onValueChange={setFiltroAno}>
            <SelectTrigger className="w-[120px]">
              <CalendarDays className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {gerarAnosDisponiveis().map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {empresasUnicas.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{lista.length} resultado(s)</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="card-elevated overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-3 py-3">Competência</th>
              <th className="text-right px-3 py-3">Valor</th>
              <th className="text-right px-3 py-3">Funcionários</th>
              <th className="text-right px-3 py-3">Consultas</th>
              <th className="text-left px-3 py-3">Vencimento</th>
              <th className="text-left px-3 py-3">Pago em</th>
              <th className="text-left px-3 py-3">Status</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted-foreground">
                  <ReceiptText className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Nenhuma fatura encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
            {lista.map(f => {
              const st = STATUS_STYLE[f.status] ?? STATUS_STYLE.em_aberto;
              const StIcon = st.icon;
              return (
                <tr key={f.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{f.razao_social}</td>
                  <td className="px-3 py-3 tabular-nums">{f.competencia_label}</td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{brl(f.valor_total_centavos)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{f.qtd_funcionarios}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{f.qtd_consultas}</td>
                  <td className="px-3 py-3 tabular-nums">{fmtDate(f.vencimento)}</td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">{fmtDate(f.pago_em)}</td>
                  <td className="px-3 py-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", st.cls)}>
                      <StIcon className="h-3 w-3" />
                      {f.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Baixar PDF" onClick={() => gerarFaturaPdf(f)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Ver detalhes" onClick={() => abrirDetalhe(f)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!detalheAberto} onOpenChange={() => setDetalheAberto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Fatura {detalheAberto?.competencia_label}
            </DialogTitle>
          </DialogHeader>
          {detalheAberto && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="font-medium">{detalheAberto.razao_social}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[detalheAberto.status]?.cls)}>
                    {detalheAberto.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor total</p>
                  <p className="text-lg font-bold">{brl(detalheAberto.valor_total_centavos)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="font-medium">{fmtDate(detalheAberto.vencimento)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Funcionários</p>
                  <p className="font-medium">{detalheAberto.qtd_funcionarios}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Consultas</p>
                  <p className="font-medium">{detalheAberto.qtd_consultas}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Emissão</p>
                  <p className="font-medium">{fmtDate(detalheAberto.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pago em</p>
                  <p className="font-medium">{fmtDate(detalheAberto.pago_em)}</p>
                </div>
              </div>
              {detalheAberto.observacoes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs">{detalheAberto.observacoes}</p>
                </div>
              )}
              {detalheAberto.detalhamento && typeof detalheAberto.detalhamento === "object" && Object.keys(detalheAberto.detalhamento).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Detalhamento</p>
                  <pre className="rounded-lg border border-border bg-muted/30 p-3 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                    {JSON.stringify(detalheAberto.detalhamento, null, 2)}
                  </pre>
                </div>
              )}

              {/* Links de navegação */}
              <div className="space-y-3 border-t border-border pt-3">
                {detalheAberto.contrato_id && (
                  <Link
                    to={`/app/admin/contrato-b2b/${detalheAberto.contrato_id}`}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium hover:bg-muted/40 transition-colors"
                    onClick={() => setDetalheAberto(null)}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    Ver contrato vinculado
                    <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Médicos com consultas nesta competência
                  </p>
                  {loadingMedicos ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
                    </div>
                  ) : medicosVinculados.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhuma consulta encontrada neste período.</p>
                  ) : (
                    <div className="space-y-1">
                      {medicosVinculados.map(m => (
                        <Link
                          key={m.id}
                          to={`/app/admin/medico/${m.id}`}
                          className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                          onClick={() => setDetalheAberto(null)}
                        >
                          <span className="font-medium">{m.nome}</span>
                          <span className="text-xs text-muted-foreground">{m.qtd} consulta(s)</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => {
                  gerarFaturaPdf(detalheAberto);
                  toast.success("PDF gerado com sucesso");
                }}>
                  <Download className="mr-2 h-4 w-4" /> Baixar NF / Boleto
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
