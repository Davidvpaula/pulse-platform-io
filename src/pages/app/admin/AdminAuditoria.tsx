import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft, ChevronRight, Download, FileText, Filter, RefreshCw,
  AlertTriangle, Clock, Shield, Eye, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import {
  EventoAuditoria, FiltrosAuditoria,
  MODULOS_AUDITORIA, RISCOS_AUDITORIA, ORIGENS_AUDITORIA,
  classeRisco, fmtDataHoraBR,
} from "@/lib/relatorios/typesAuditoria";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { downloadCSV } from "@/lib/relatorios/utils";
import { gerarPdfAuditoria } from "@/lib/relatorios/pdfAuditoria";

const PAGE = 50;
const LIMITE_EXPORT = 5000;

const PRESETS = [
  { label: "7d", dias: 7 },
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
];

function periodoInicial(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

export default function AdminAuditoria() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabInicial = searchParams.get("tab") || "eventos";

  const inicial = useMemo(periodoInicial, []);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    inicio: inicial.inicio, fim: inicial.fim,
    modulo: "todos", risco: "todos", origem: "todas",
    actor: null, entidadeId: null, acao: "", busca: "",
  });
  const [aplicado, setAplicado] = useState<FiltrosAuditoria>(filtros);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(tabInicial);

  const [dash, setDash] = useState<any>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingDash, setLoadingDash] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [detalhe, setDetalhe] = useState<EventoAuditoria | null>(null);
  const [revisaoNota, setRevisaoNota] = useState("");
  const [salvandoRevisao, setSalvandoRevisao] = useState(false);

  const handleTab = (v: string) => {
    setTab(v);
    setSearchParams({ tab: v }, { replace: true });
  };

  // ─── Data fetching ───
  const carregarDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const { data, error } = await supabase.rpc("auditoria_dashboard" as any, {
        p_inicio: new Date(aplicado.inicio + "T00:00:00").toISOString(),
        p_fim: new Date(aplicado.fim + "T00:00:00").toISOString(),
      });
      if (error) throw error;
      setDash(data);
    } catch (e: any) {
      toast.error("Falha no painel", { description: e.message });
    } finally {
      setLoadingDash(false);
    }
  }, [aplicado.inicio, aplicado.fim]);

  const carregarLista = useCallback(async () => {
    setLoadingLista(true);
    try {
      const { data, error } = await supabase.rpc("auditoria_listar" as any, {
        p_inicio: new Date(aplicado.inicio + "T00:00:00").toISOString(),
        p_fim: new Date(aplicado.fim + "T00:00:00").toISOString(),
        p_modulo: aplicado.modulo === "todos" ? "todos" : aplicado.modulo,
        p_risco: aplicado.risco === "todos" ? "todos" : aplicado.risco,
        p_origem: aplicado.origem === "todas" ? "todos" : aplicado.origem,
        p_actor: aplicado.actor || null,
        p_entidade_id: aplicado.entidadeId || null,
        p_acao: aplicado.acao.trim() || "",
        p_busca: aplicado.busca.trim() || "",
        p_limit: PAGE,
        p_offset: (page - 1) * PAGE,
      });
      if (error) throw error;
      const lista = (data || []) as EventoAuditoria[];
      setEventos(lista);
      setTotal(Number(lista[0]?.total_count || 0));
    } catch (e: any) {
      toast.error("Erro ao listar eventos", { description: e.message });
    } finally {
      setLoadingLista(false);
    }
  }, [aplicado, page]);

  useEffect(() => { carregarDashboard(); }, [carregarDashboard]);
  useEffect(() => { carregarLista(); }, [carregarLista]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  // ─── Filtros ───
  const aplicarFiltros = () => { setAplicado(filtros); setPage(1); };
  const limparFiltros = () => {
    const reset: FiltrosAuditoria = {
      inicio: inicial.inicio, fim: inicial.fim,
      modulo: "todos", risco: "todos", origem: "todas",
      actor: null, entidadeId: null, acao: "", busca: "",
    };
    setFiltros(reset); setAplicado(reset); setPage(1);
  };
  const aplicarPreset = (dias: number) => {
    const hoje = new Date();
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - dias);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const f = { ...filtros, inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
    setFiltros(f); setAplicado(f); setPage(1);
  };

  // ─── Export ───
  const buscarTodosEventos = useCallback(async (): Promise<EventoAuditoria[]> => {
    const { data, error } = await supabase.rpc("auditoria_listar" as any, {
      p_inicio: new Date(aplicado.inicio + "T00:00:00").toISOString(),
      p_fim: new Date(aplicado.fim + "T00:00:00").toISOString(),
      p_modulo: aplicado.modulo === "todos" ? "todos" : aplicado.modulo,
      p_risco: aplicado.risco === "todos" ? "todos" : aplicado.risco,
      p_origem: aplicado.origem === "todas" ? "todos" : aplicado.origem,
      p_actor: aplicado.actor || null,
      p_entidade_id: aplicado.entidadeId || null,
      p_acao: aplicado.acao.trim() || "",
      p_busca: aplicado.busca.trim() || "",
      p_limit: LIMITE_EXPORT,
      p_offset: 0,
    });
    if (error) throw error;
    return (data || []) as EventoAuditoria[];
  }, [aplicado]);

  const exportarCSV = async () => {
    setExportando(true);
    try {
      const todos = await buscarTodosEventos();
      if (total > LIMITE_EXPORT) toast.warning(`Exportando primeiros ${LIMITE_EXPORT} de ${total} eventos.`);
      const linhas: any[][] = [
        ["Data/hora", "Severidade", "Módulo", "Ação", "Ator", "Entidade tipo", "Entidade ID", "Campo", "Antes", "Depois", "Motivo", "Observação", "Origem", "Revisado"],
      ];
      todos.forEach((e) => linhas.push([
        fmtDataHoraBR(e.created_at), e.risco, e.modulo, e.acao,
        e.actor_nome, e.entidade_tipo, e.entidade_id,
        e.campo, e.valor_anterior, e.valor_novo, e.motivo, e.observacao,
        e.origem, e.revisado ? "sim" : "não",
      ]));
      downloadCSV(`auditoria-${aplicado.inicio}-a-${aplicado.fim}.csv`, linhas);
      toast.success(`CSV gerado com ${todos.length} evento(s)`);
    } catch (e: any) {
      toast.error("Falha ao exportar CSV", { description: e.message });
    } finally {
      setExportando(false);
    }
  };

  const exportarPDF = async () => {
    setExportando(true);
    try {
      const todos = await buscarTodosEventos();
      gerarPdfAuditoria({ filtros: aplicado, dashboard: dash || {}, eventos: todos, totalEventos: total });
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar PDF", { description: e.message });
    } finally {
      setExportando(false);
    }
  };

  // ─── Revisão ───
  const marcarRevisado = async () => {
    if (!detalhe) return;
    setSalvandoRevisao(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão inválida");
      const { error } = await supabase.from("audit_revisoes").insert({
        evento_modulo: detalhe.modulo,
        evento_id: detalhe.id,
        reviewed_by: u.user.id,
        nota: revisaoNota || null,
      } as any);
      if (error) throw error;
      toast.success("Evento marcado como revisado");
      setDetalhe(null); setRevisaoNota("");
      carregarLista(); carregarDashboard();
    } catch (e: any) {
      toast.error("Não foi possível salvar revisão", { description: e.message });
    } finally {
      setSalvandoRevisao(false);
    }
  };

  // ─── Dashboard data ───
  const porRisco = dash?.por_risco || {};
  const porModulo = dash?.por_modulo || {};
  const topAtores = (dash?.top_atores || []) as { actor_nome: string; total: number }[];
  const moduloChart = Object.entries(porModulo).map(([k, v]) => ({ modulo: k, total: v as number }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Auditoria"
        description="Rastreamento e análise de ações sensíveis na plataforma."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { carregarDashboard(); carregarLista(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={exportarCSV} disabled={exportando}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button size="sm" onClick={exportarPDF} disabled={exportando}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        }
      />

      {/* FILTROS */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <Button key={p.label} variant="ghost" size="sm" onClick={() => aplicarPreset(p.dias)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label className="text-xs">Início</Label><Input type="date" value={filtros.inicio} onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} /></div>
          <div><Label className="text-xs">Fim</Label><Input type="date" value={filtros.fim} onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} /></div>
          <div>
            <Label className="text-xs">Severidade</Label>
            <Select value={filtros.risco} onValueChange={(v) => setFiltros({ ...filtros, risco: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {RISCOS_AUDITORIA.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Módulo</Label>
            <Select value={filtros.modulo} onValueChange={(v) => setFiltros({ ...filtros, modulo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MODULOS_AUDITORIA.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={filtros.origem} onValueChange={(v) => setFiltros({ ...filtros, origem: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {ORIGENS_AUDITORIA.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ação contém</Label>
            <Input value={filtros.acao} onChange={(e) => setFiltros({ ...filtros, acao: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Ator (UUID)</Label>
            <Input placeholder="UUID" value={filtros.actor || ""} onChange={(e) => setFiltros({ ...filtros, actor: e.target.value.trim() || null })} />
          </div>
          <div>
            <Label className="text-xs">Entidade ID</Label>
            <Input placeholder="UUID" value={filtros.entidadeId || ""} onChange={(e) => setFiltros({ ...filtros, entidadeId: e.target.value.trim() || null })} />
          </div>
        </div>
        <div className="flex items-end gap-2 mt-3">
          <div className="flex-1">
            <Label className="text-xs">Busca livre</Label>
            <Input value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} placeholder="ação, motivo, ator..." />
          </div>
          <Button onClick={aplicarFiltros}>Aplicar</Button>
          <Button variant="outline" onClick={limparFiltros}>Limpar</Button>
        </div>
      </Card>

      {/* TABS */}
      <Tabs value={tab} onValueChange={handleTab}>
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="painel">Painel Analítico</TabsTrigger>
        </TabsList>

        {/* ─── TAB: EVENTOS ─── */}
        <TabsContent value="eventos" className="mt-4 space-y-4">
          {/* KPIs resumidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {loadingDash ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                <KpiCard label="Total no período" value={dash?.total ?? "—"} icon={Clock} />
                <KpiCard label="Últimas 24h" value={dash?.ultimas_24h ?? "—"} icon={Clock} />
                <KpiCard label="Críticos" value={porRisco.critico ?? 0} icon={AlertTriangle} variant="danger" />
                <KpiCard label="Altos" value={porRisco.alto ?? 0} icon={AlertTriangle} variant="warning" />
                <KpiCard label="Não revisados" value={dash?.nao_revisados ?? "—"} icon={Eye} variant="warning" />
                <KpiCard label="Revisados" value={dash?.revisados ?? "—"} icon={CheckCircle2} variant="success" />
              </>
            )}
          </div>

          {/* Tabela */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm text-muted-foreground">
                {loadingLista ? "Carregando..." : `${total} evento(s)`}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground">Página {page} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/hora</TableHead>
                    <TableHead className="w-[90px]">Sev.</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLista && Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6" /></TableCell></TableRow>
                  ))}
                  {!loadingLista && eventos.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum evento encontrado.</TableCell></TableRow>
                  )}
                  {!loadingLista && eventos.map((e) => (
                    <TableRow key={`${e.modulo}-${e.id}`}>
                      <TableCell className="text-xs whitespace-nowrap">{fmtDataHoraBR(e.created_at)}</TableCell>
                      <TableCell><Badge variant="outline" className={classeRisco(e.risco)}>{e.risco}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{e.modulo}</Badge></TableCell>
                      <TableCell className="text-sm font-medium max-w-[220px] truncate" title={e.acao}>{e.acao}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{e.actor_nome || <span className="text-muted-foreground italic">Sistema</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.entidade_tipo ? <>
                          <span>{e.entidade_tipo}</span>
                          {e.entidade_id && <div className="font-mono text-[10px]">{String(e.entidade_id).slice(0, 8)}…</div>}
                        </> : "—"}
                      </TableCell>
                      <TableCell>
                        {e.revisado ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Revisado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setDetalhe(e); setRevisaoNota(e.revisao_nota || ""); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── TAB: PAINEL ─── */}
        <TabsContent value="painel" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {loadingDash ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : (
              <>
                <KpiCard label="Total no período" value={dash?.total ?? "—"} icon={Clock} />
                <KpiCard label="Últimas 24h" value={dash?.ultimas_24h ?? "—"} icon={Clock} />
                <KpiCard label="Críticos" value={porRisco.critico ?? 0} icon={AlertTriangle} variant="danger" />
                <KpiCard label="Altos" value={porRisco.alto ?? 0} icon={AlertTriangle} variant="warning" />
                <KpiCard label="Revisados" value={dash?.revisados ?? 0} icon={CheckCircle2} variant="success" />
                <KpiCard label="Não revisados" value={dash?.nao_revisados ?? 0} icon={Eye} variant="warning" />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="text-sm font-medium mb-3">Eventos por módulo</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={moduloChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="modulo" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium mb-3">Top usuários por volume</div>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={topAtores.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis type="category" dataKey="actor_nome" tick={{ fontSize: 11 }} width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Risco breakdown */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-3">Distribuição por severidade</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["critico", "alto", "medio", "baixo"] as const).map((r) => (
                <div key={r} className="text-center">
                  <Badge variant="outline" className={classeRisco(r) + " text-base px-3 py-1"}>{r}</Badge>
                  <div className="text-2xl font-semibold mt-1">{porRisco[r] ?? 0}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Origem */}
          <Card className="p-4">
            <div className="text-sm font-medium mb-3">Origem dos eventos</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Manual</div>
                <div className="text-2xl font-semibold">{dash?.por_origem?.manual ?? 0}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Sistema</div>
                <div className="text-2xl font-semibold">{dash?.por_origem?.sistema ?? 0}</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── DETALHE DRAWER ─── */}
      <Sheet open={!!detalhe} onOpenChange={(o) => { if (!o) { setDetalhe(null); setRevisaoNota(""); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <Badge variant="outline" className={classeRisco(detalhe.risco)}>{detalhe.risco}</Badge>
                  <span className="truncate">{detalhe.acao}</span>
                </SheetTitle>
                <SheetDescription>{fmtDataHoraBR(detalhe.created_at)} · {detalhe.modulo} · {detalhe.origem}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Ator" value={detalhe.actor_nome || "Sistema"} />
                  <Field label="Ator ID" value={<span className="font-mono text-xs">{detalhe.actor_id || "—"}</span>} />
                  <Field label="Entidade" value={detalhe.entidade_tipo || "—"} />
                  <Field label="Entidade ID" value={<span className="font-mono text-xs break-all">{detalhe.entidade_id || "—"}</span>} />
                </div>

                {(detalhe.campo || detalhe.valor_anterior || detalhe.valor_novo) && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase">Alteração</div>
                    {detalhe.campo && <div className="text-sm"><span className="text-muted-foreground">Campo:</span> <code className="text-xs">{detalhe.campo}</code></div>}
                    <div className="rounded border p-2 bg-muted/40 text-xs font-mono whitespace-pre-wrap break-words">
                      <div className="text-destructive">- {detalhe.valor_anterior || "∅"}</div>
                      <div className="text-emerald-600 dark:text-emerald-400">+ {detalhe.valor_novo || "∅"}</div>
                    </div>
                  </div>
                )}

                {detalhe.motivo && <Field label="Motivo" value={detalhe.motivo} />}
                {detalhe.observacao && <Field label="Observação" value={detalhe.observacao} />}

                {detalhe.payload && Object.keys(detalhe.payload).length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Payload</div>
                    <pre className="text-[11px] p-2 bg-muted rounded overflow-auto max-h-48">{JSON.stringify(detalhe.payload, null, 2)}</pre>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-2">Revisão</div>
                  {detalhe.revisado ? (
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> Revisado em {fmtDataHoraBR(detalhe.reviewed_at!)}
                      </div>
                      {detalhe.revisao_nota && <div className="p-2 rounded bg-muted/30 text-xs">{detalhe.revisao_nota}</div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea placeholder="Nota da revisão (opcional)" value={revisaoNota} onChange={(e) => setRevisaoNota(e.target.value)} rows={3} />
                      <Button onClick={marcarRevisado} disabled={salvandoRevisao} className="w-full">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {salvandoRevisao ? "Salvando..." : "Marcar como revisado"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
