import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertTriangle, Clock, DollarSign, Key, Plug, Ban,
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
import { gerarPdfAuditoria } from "@/lib/relatorios/pdfAuditoria";

const PAGE = 50;
const LIMITE_EXPORT = 5000;

function periodoInicial(): { inicio: string; fim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 30);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

function downloadCSV(filename: string, rows: (string | number | null)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function KpiCard({
  label, value, icon: Icon, variant,
}: { label: string; value: any; icon: any; variant?: "danger" | "warning" }) {
  const cor =
    variant === "danger" ? "text-destructive" :
    variant === "warning" ? "text-amber-600 dark:text-amber-400" :
    "text-foreground";
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className={`text-2xl font-semibold mt-1 ${cor}`}>{value}</div>
        </div>
        <Icon className={`h-4 w-4 mt-1 ${cor}`} />
      </div>
    </Card>
  );
}

const PRESETS: { value: string; label: string; dias: number }[] = [
  { value: "7d", label: "7 dias", dias: 7 },
  { value: "30d", label: "30 dias", dias: 30 },
  { value: "90d", label: "90 dias", dias: 90 },
];

export default function AdminRelatorioAuditoria() {
  const inicial = useMemo(periodoInicial, []);
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    inicio: inicial.inicio,
    fim: inicial.fim,
    modulo: "todos",
    risco: "todos",
    origem: "todas",
    actor: null,
    entidadeId: null,
    acao: "",
    busca: "",
  });
  const [aplicado, setAplicado] = useState<FiltrosAuditoria>(filtros);
  const [page, setPage] = useState(1);

  const [dash, setDash] = useState<any>(null);
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingDash, setLoadingDash] = useState(false);
  const [exportando, setExportando] = useState(false);

  const [detalhe, setDetalhe] = useState<EventoAuditoria | null>(null);

  const carregarDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const { data, error } = await supabase.rpc("auditoria_dashboard", {
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
  }, [aplicado]);

  const carregarLista = useCallback(async () => {
    setLoadingLista(true);
    try {
      const { data, error } = await supabase.rpc("auditoria_listar", {
        p_inicio: new Date(aplicado.inicio + "T00:00:00").toISOString(),
        p_fim: new Date(aplicado.fim + "T00:00:00").toISOString(),
        p_modulo: aplicado.modulo === "todos" ? null : aplicado.modulo,
        p_risco: aplicado.risco === "todos" ? null : aplicado.risco,
        p_actor: aplicado.actor || null,
        p_acao: aplicado.acao.trim() || null,
        p_entidade_id: aplicado.entidadeId || null,
        p_origem: aplicado.origem === "todas" ? null : aplicado.origem,
        p_revisado: null,
        p_busca: aplicado.busca.trim() || null,
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

  const buscarTodosEventos = useCallback(async (): Promise<EventoAuditoria[]> => {
    const { data, error } = await supabase.rpc("auditoria_listar", {
      p_inicio: new Date(aplicado.inicio + "T00:00:00").toISOString(),
      p_fim: new Date(aplicado.fim + "T00:00:00").toISOString(),
      p_modulo: aplicado.modulo === "todos" ? null : aplicado.modulo,
      p_risco: aplicado.risco === "todos" ? null : aplicado.risco,
      p_actor: aplicado.actor || null,
      p_acao: aplicado.acao.trim() || null,
      p_entidade_id: aplicado.entidadeId || null,
      p_origem: aplicado.origem === "todas" ? null : aplicado.origem,
      p_revisado: null,
      p_busca: aplicado.busca.trim() || null,
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
      if (total > LIMITE_EXPORT) {
        toast.warning(`Exportando primeiros ${LIMITE_EXPORT} de ${total} eventos. Refine os filtros para exportar tudo.`);
      }
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
      gerarPdfAuditoria({
        filtros: aplicado,
        dashboard: dash || {},
        eventos: todos,
        totalEventos: total,
      });
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error("Falha ao gerar PDF", { description: e.message });
    } finally {
      setExportando(false);
    }
  };

  const porDia = (dash?.por_dia || []) as { dia: string; total: number }[];
  const topAtores = (dash?.top_atores || []) as { actor_nome: string; total: number }[];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Relatório de Auditoria"
        description="Análise dos eventos sensíveis registrados na plataforma — entidade, usuário, severidade e período."
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
              <Button key={p.value} variant="ghost" size="sm" onClick={() => aplicarPreset(p.dias)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={filtros.inicio}
              onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={filtros.fim}
              onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Severidade</Label>
            <Select value={filtros.risco} onValueChange={(v) => setFiltros({ ...filtros, risco: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {RISCOS_AUDITORIA.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Módulo / Entidade</Label>
            <Select value={filtros.modulo} onValueChange={(v) => setFiltros({ ...filtros, modulo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {MODULOS_AUDITORIA.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Usuário (ator) — UUID</Label>
            <Input
              placeholder="UUID do usuário"
              value={filtros.actor || ""}
              onChange={(e) => setFiltros({ ...filtros, actor: e.target.value.trim() || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Entidade ID (UUID)</Label>
            <Input
              placeholder="ex: a1b2c3d4-…"
              value={filtros.entidadeId || ""}
              onChange={(e) => setFiltros({ ...filtros, entidadeId: e.target.value.trim() || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Ação contém</Label>
            <Input value={filtros.acao}
              onChange={(e) => setFiltros({ ...filtros, acao: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Select value={filtros.origem} onValueChange={(v) => setFiltros({ ...filtros, origem: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {ORIGENS_AUDITORIA.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-end gap-2 mt-3">
          <div className="flex-1">
            <Label className="text-xs">Busca livre (texto em ação, motivo, payload)</Label>
            <Input value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
          </div>
          <Button onClick={aplicarFiltros}>Aplicar</Button>
          <Button variant="outline" onClick={limparFiltros}>Limpar</Button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Dica: copie o UUID do usuário ou da entidade a partir das telas de detalhe. Os filtros são aplicados ao clicar em <strong>Aplicar</strong>.
        </p>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {loadingDash && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        {!loadingDash && (
          <>
            <KpiCard label="Total no período" value={dash?.total ?? "—"} icon={Clock} />
            <KpiCard label="Hoje" value={dash?.hoje ?? "—"} icon={Clock} />
            <KpiCard label="Críticos" value={dash?.criticos ?? "—"} icon={AlertTriangle} variant="danger" />
            <KpiCard label="Altos" value={dash?.altos ?? "—"} icon={AlertTriangle} variant="warning" />
            <KpiCard label="Financeiro" value={dash?.financeiro ?? "—"} icon={DollarSign} variant="warning" />
            <KpiCard label="Permissões" value={dash?.permissoes ?? "—"} icon={Key} />
            <KpiCard label="Integrações" value={dash?.integracao ?? "—"} icon={Plug} />
            <KpiCard label="Bloqueios" value={dash?.bloqueios ?? "—"} icon={Ban} variant="danger" />
            <KpiCard label="Não revisados (sensíveis)" value={dash?.nao_revisados_sensiveis ?? "—"} icon={AlertTriangle} variant="warning" />
            <KpiCard label="Médios" value={dash?.medios ?? "—"} icon={Clock} />
            <KpiCard label="Baixos" value={dash?.baixos ?? "—"} icon={Clock} />
            <KpiCard label="Páginas (50/pg)" value={totalPages} icon={Clock} />
          </>
        )}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-sm font-medium mb-3">Eventos por dia</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
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

      {/* TABELA */}
      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm font-medium">
            Eventos {total > 0 && <span className="text-muted-foreground">({total} no filtro)</span>}
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
                <TableHead>Campo</TableHead>
                <TableHead>Antes → Depois</TableHead>
                <TableHead className="w-[80px]">Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingLista && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6" /></TableCell></TableRow>
              ))}
              {!loadingLista && eventos.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum evento encontrado para os filtros aplicados.
                </TableCell></TableRow>
              )}
              {!loadingLista && eventos.map((e) => (
                <TableRow key={`${e.modulo}-${e.id}`} className="cursor-pointer" onClick={() => setDetalhe(e)}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDataHoraBR(e.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={classeRisco(e.risco)}>{e.risco}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{e.modulo}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate" title={e.acao}>{e.acao}</TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={e.actor_nome || ""}>{e.actor_nome || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate" title={`${e.entidade_tipo || ""}:${e.entidade_id || ""}`}>
                    {e.entidade_tipo ? <>
                      <span className="text-muted-foreground">{e.entidade_tipo}:</span>
                      <span className="ml-1 font-mono">{e.entidade_id?.slice(0, 8)}</span>
                    </> : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{e.campo || "—"}</TableCell>
                  <TableCell className="text-xs max-w-[260px] truncate">
                    {e.valor_anterior || e.valor_novo
                      ? <span title={`${e.valor_anterior || ""} → ${e.valor_novo || ""}`}>
                          <span className="text-muted-foreground">{e.valor_anterior || "∅"}</span>
                          <span className="mx-1">→</span>
                          <span>{e.valor_novo || "∅"}</span>
                        </span>
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{e.origem}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* DETALHE */}
      <Sheet open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {detalhe && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant="outline" className={classeRisco(detalhe.risco)}>{detalhe.risco}</Badge>
                  {detalhe.acao}
                </SheetTitle>
                <SheetDescription>{fmtDataHoraBR(detalhe.created_at)} · {detalhe.modulo} · origem {detalhe.origem}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-xs text-muted-foreground">Ator</div><div>{detalhe.actor_nome || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Ator ID</div><div className="font-mono text-xs">{detalhe.actor_id || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Entidade</div><div>{detalhe.entidade_tipo || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Entidade ID</div><div className="font-mono text-xs break-all">{detalhe.entidade_id || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Campo</div><div>{detalhe.campo || "—"}</div></div>
                  <div>
                    <div className="text-xs text-muted-foreground">Revisado</div>
                    <div>{detalhe.revisado ? `Sim (${fmtDataHoraBR(detalhe.reviewed_at || "")})` : "Não"}</div>
                  </div>
                </div>
                {(detalhe.valor_anterior || detalhe.valor_novo) && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mudança</div>
                    <div className="rounded border p-2 bg-muted/40 text-xs font-mono whitespace-pre-wrap break-words">
                      <div className="text-destructive">- {detalhe.valor_anterior || "∅"}</div>
                      <div className="text-emerald-600 dark:text-emerald-400">+ {detalhe.valor_novo || "∅"}</div>
                    </div>
                  </div>
                )}
                {detalhe.motivo && (
                  <div>
                    <div className="text-xs text-muted-foreground">Motivo</div>
                    <div className="text-sm">{detalhe.motivo}</div>
                  </div>
                )}
                {detalhe.observacao && (
                  <div>
                    <div className="text-xs text-muted-foreground">Observação</div>
                    <div className="text-sm">{detalhe.observacao}</div>
                  </div>
                )}
                {detalhe.payload && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Payload</div>
                    <pre className="rounded border p-2 bg-muted/40 text-xs overflow-x-auto max-h-80">
{JSON.stringify(detalhe.payload, null, 2)}
                    </pre>
                  </div>
                )}
                {detalhe.revisado && detalhe.revisao_nota && (
                  <div>
                    <div className="text-xs text-muted-foreground">Nota da revisão</div>
                    <div className="text-sm">{detalhe.revisao_nota}</div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  Esta tela é somente leitura. Para revisar e marcar eventos, use <strong>Admin → Auditoria</strong>.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
