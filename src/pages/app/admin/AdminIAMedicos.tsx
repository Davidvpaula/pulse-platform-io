import { useEffect, useState, useCallback } from "react";
import {
  Shield, AlertTriangle, Activity, Brain, Users, TrendingDown,
  ChevronDown, ChevronRight, Loader2, RefreshCw, Eye, Search,
  CheckCircle2, XCircle, Clock, BarChart3, Zap, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { listarRankingTop, recalcularRankingTodos, type MedicoRanking } from "@/lib/gamificacao";
import {
  listarScoresOperacionais, listarScoresCompliance,
  listarAlertasIA, atualizarStatusAlerta,
  listarAnomalias, atualizarStatusAnomalia,
  listarAuditoriaIA,
  executarAnaliseIA, executarAnaliseBatch, executarDeteccaoAnomalias,
  type ScoreOperacional, type ScoreCompliance, type AlertaIA, type Anomalia, type AuditoriaIA,
} from "@/lib/ia-auditoria";

/* ── Helpers ── */

const SEVERIDADE_STYLES: Record<string, string> = {
  info: "bg-blue-500/10 text-blue-600 border-blue-200",
  atencao: "bg-amber-500/10 text-amber-600 border-amber-200",
  alerta: "bg-orange-500/10 text-orange-600 border-orange-200",
  critico: "bg-destructive/10 text-destructive border-destructive/30",
};

const RISCO_STYLES: Record<string, string> = {
  baixo: "bg-success/10 text-success",
  medio: "bg-amber-500/10 text-amber-600",
  alto: "bg-orange-500/10 text-orange-600",
  critico: "bg-destructive/10 text-destructive",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  novo: <AlertTriangle className="h-3.5 w-3.5" />,
  visto: <Eye className="h-3.5 w-3.5" />,
  em_acompanhamento: <Clock className="h-3.5 w-3.5" />,
  resolvido: <CheckCircle2 className="h-3.5 w-3.5" />,
  ignorado: <XCircle className="h-3.5 w-3.5" />,
};

function scoreBar(value: number, max = 100) {
  const pct = Math.min(value / max * 100, 100);
  const color = pct >= 80 ? "bg-success" : pct >= 60 ? "bg-amber-500" : pct >= 40 ? "bg-orange-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );
}

export default function AdminIAMedicos() {
  const [loading, setLoading] = useState(true);
  const [medicos, setMedicos] = useState<{ id: string; nome: string; ativo: boolean }[]>([]);
  const [scoresOp, setScoresOp] = useState<ScoreOperacional[]>([]);
  const [scoresComp, setScoresComp] = useState<ScoreCompliance[]>([]);
  const [alertas, setAlertas] = useState<AlertaIA[]>([]);
  const [anomalias, setAnomalias] = useState<Anomalia[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaIA[]>([]);
  const [rankings, setRankings] = useState<MedicoRanking[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroSeveridade, setFiltroSeveridade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [expandedMedico, setExpandedMedico] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState<string | null>(null);
  const [analisandoBatch, setAnalisandoBatch] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: meds }, ops, comps, alts, anos, auds, rnks] = await Promise.all([
        supabase.from("medicos" as any).select("id, nome, ativo").eq("ativo", true).order("nome"),
        listarScoresOperacionais(),
        listarScoresCompliance(),
        listarAlertasIA(),
        listarAnomalias(),
        listarAuditoriaIA(),
        listarRankingTop(200),
      ]);
      setMedicos((meds ?? []) as any);
      setScoresOp(ops);
      setScoresComp(comps);
      setAlertas(alts);
      setAnomalias(anos);
      setAuditoria(auds);
      setRankings(rnks);
    } catch (e: any) {
      toast.error("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const handleAnalisarMedico = async (medicoId: string) => {
    setAnalisando(medicoId);
    try {
      await executarAnaliseIA(medicoId);
      toast.success("Análise IA concluída!");
      await carregar();
    } catch (e: any) {
      toast.error("Erro na análise: " + e.message);
    } finally {
      setAnalisando(null);
    }
  };

  const handleAnalisarTodos = async () => {
    setAnalisandoBatch(true);
    try {
      const result = await executarAnaliseBatch();
      toast.success(`Análise em lote concluída: ${result?.total ?? 0} médicos`);
      await carregar();
    } catch (e: any) {
      toast.error("Erro na análise em lote: " + e.message);
    } finally {
      setAnalisandoBatch(false);
    }
  };

  const handleDetectarAnomalias = async () => {
    try {
      const result = await executarDeteccaoAnomalias();
      toast.success(`Detecção concluída: ${result?.anomalias_detectadas ?? 0} anomalias encontradas`);
      await carregar();
    } catch (e: any) {
      toast.error("Erro na detecção: " + e.message);
    }
  };

  const handleStatusAlerta = async (alertaId: string, status: AlertaIA["status"]) => {
    try {
      await atualizarStatusAlerta(alertaId, status);
      setAlertas(prev => prev.map(a => a.id === alertaId ? { ...a, status } : a));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleStatusAnomalia = async (anomaliaId: string, status: Anomalia["status"]) => {
    try {
      await atualizarStatusAnomalia(anomaliaId, status);
      setAnomalias(prev => prev.map(a => a.id === anomaliaId ? { ...a, status } : a));
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando painel IA…
      </div>
    );
  }

  const medicoMap = Object.fromEntries(medicos.map(m => [m.id, m.nome]));
  const opMap = Object.fromEntries(scoresOp.map(s => [s.medico_id, s]));
  const compMap = Object.fromEntries(scoresComp.map(s => [s.medico_id, s]));
  const rankMap = Object.fromEntries(rankings.map(r => [r.medico_id, r]));

  const alertasAtivos = alertas.filter(a => a.status === "novo" || a.status === "em_acompanhamento").length;
  const alertasCriticos = alertas.filter(a => a.severidade === "critico" && a.status !== "resolvido").length;
  const anomaliasAbertas = anomalias.filter(a => a.status === "detectada" || a.status === "investigando").length;
  const medicosRiscoAlto = scoresComp.filter(c => c.nivel_risco === "alto" || c.nivel_risco === "critico").length;

  // Build merged medico list
  const medicosMerged = medicos
    .filter(m => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()))
    .map(m => ({
      ...m,
      op: opMap[m.id] ?? null,
      comp: compMap[m.id] ?? null,
      alertasCount: alertas.filter(a => a.medico_id === m.id && (a.status === "novo" || a.status === "em_acompanhamento")).length,
      anomaliasCount: anomalias.filter(a => a.medico_id === m.id && (a.status === "detectada" || a.status === "investigando")).length,
    }))
    .sort((a, b) => (a.op?.score_total ?? 999) - (b.op?.score_total ?? 999));

  const alertasFiltrados = alertas.filter(a => {
    if (filtroSeveridade !== "todos" && a.severidade !== filtroSeveridade) return false;
    if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="IA Auditora — Gestão Médica Inteligente"
        description="Auditoria operacional, compliance, antifraude e recomendações estratégicas por IA."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDetectarAnomalias}>
              <Shield className="mr-1.5 h-4 w-4" /> Detectar Anomalias
            </Button>
            <Button size="sm" onClick={handleAnalisarTodos} disabled={analisandoBatch}>
              {analisandoBatch ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Brain className="mr-1.5 h-4 w-4" />}
              {analisandoBatch ? "Analisando…" : "Analisar Todos"}
            </Button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Médicos ativos" value={medicos.length} icon={Users} />
        <StatCard label="Alertas ativos" value={alertasAtivos} icon={AlertTriangle} hint={`${alertasCriticos} críticos`} />
        <StatCard label="Anomalias abertas" value={anomaliasAbertas} icon={Shield} />
        <StatCard label="Risco alto/crítico" value={medicosRiscoAlto} icon={TrendingDown} />
        <StatCard label="Análises realizadas" value={auditoria.length} icon={Brain} />
      </div>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking"><BarChart3 className="mr-1.5 h-4 w-4" /> Ranking Interno</TabsTrigger>
          <TabsTrigger value="alertas">
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Alertas
            {alertasAtivos > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{alertasAtivos}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="anomalias"><Shield className="mr-1.5 h-4 w-4" /> Anomalias</TabsTrigger>
          <TabsTrigger value="auditoria"><FileText className="mr-1.5 h-4 w-4" /> Log Auditoria</TabsTrigger>
        </TabsList>

        {/* ── Tab: Ranking Interno ── */}
        <TabsContent value="ranking" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar médico…" value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Button variant="ghost" size="sm" onClick={carregar}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_80px_80px_60px_60px_100px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground">
              <span>Médico</span>
              <span className="text-center">Op. Score</span>
              <span className="text-center">Compliance</span>
              <span className="text-center">Risco</span>
              <span className="text-center">Confiança</span>
              <span className="text-center">Alertas</span>
              <span className="text-center">Anom.</span>
              <span className="text-center">Ações</span>
            </div>

            <ScrollArea className="max-h-[500px]">
              {medicosMerged.map(m => (
                <div key={m.id}>
                  <div
                    className={cn(
                      "grid grid-cols-[1fr_80px_80px_80px_80px_60px_60px_100px] gap-2 px-4 py-3 border-t border-border text-sm items-center cursor-pointer hover:bg-muted/30 transition-colors",
                      expandedMedico === m.id && "bg-muted/20",
                    )}
                    onClick={() => setExpandedMedico(expandedMedico === m.id ? null : m.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedMedico === m.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium truncate">{m.nome}</span>
                    </div>
                    <div className="text-center">{m.op ? scoreBar(m.op.score_total) : <span className="text-xs text-muted-foreground">—</span>}</div>
                    <div className="text-center">{m.comp ? scoreBar(m.comp.score_total) : <span className="text-xs text-muted-foreground">—</span>}</div>
                    <div className="text-center">
                      {m.comp ? (
                        <Badge className={cn("text-[10px]", RISCO_STYLES[m.comp.nivel_risco])}>
                          {m.comp.nivel_risco}
                        </Badge>
                      ) : "—"}
                    </div>
                    <div className="text-center">{m.comp ? <span className="text-xs font-medium">{m.comp.score_confianca.toFixed(0)}</span> : "—"}</div>
                    <div className="text-center">
                      {m.alertasCount > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">{m.alertasCount}</Badge>
                      ) : <span className="text-xs text-muted-foreground">0</span>}
                    </div>
                    <div className="text-center">
                      {m.anomaliasCount > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">{m.anomaliasCount}</Badge>
                      ) : <span className="text-xs text-muted-foreground">0</span>}
                    </div>
                    <div className="text-center" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        disabled={analisando === m.id}
                        onClick={() => handleAnalisarMedico(m.id)}
                      >
                        {analisando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1" />}
                        Analisar
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedMedico === m.id && (
                    <div className="px-6 py-4 bg-muted/10 border-t border-border">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Score Operacional */}
                        <div className="rounded-lg border border-border p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-500" /> Score Operacional Interno
                          </h4>
                          {m.op ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span>Pontualidade</span>{scoreBar(m.op.score_pontualidade)}</div>
                              <div className="flex justify-between text-xs"><span>Cancelamento</span>{scoreBar(m.op.score_cancelamento)}</div>
                              <div className="flex justify-between text-xs"><span>No-show</span>{scoreBar(m.op.score_no_show)}</div>
                              <div className="flex justify-between text-xs"><span>Resposta</span>{scoreBar(m.op.score_resposta)}</div>
                              <div className="flex justify-between text-xs"><span>Uso do sistema</span>{scoreBar(m.op.score_uso_sistema)}</div>
                              <div className="flex justify-between text-xs"><span>Documentação</span>{scoreBar(m.op.score_documentacao)}</div>
                              <div className="pt-2 border-t border-border flex justify-between items-center">
                                <span className="text-xs font-semibold">Total</span>
                                <span className="text-lg font-bold">{m.op.score_total.toFixed(1)}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Última atualização: {new Date(m.op.updated_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sem dados — execute uma análise IA.</p>
                          )}
                        </div>

                        {/* Score Compliance */}
                        <div className="rounded-lg border border-border p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-purple-500" /> Score Compliance & Confiança
                          </h4>
                          {m.comp ? (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span>Confiança</span>{scoreBar(m.comp.score_confianca)}</div>
                              <div className="flex justify-between text-xs"><span>Padrão comportamental</span>{scoreBar(m.comp.score_padrao_comportamento)}</div>
                              <div className="flex justify-between text-xs"><span>Integridade avaliações</span>{scoreBar(m.comp.score_avaliacoes_integridade)}</div>
                              <div className="flex justify-between text-xs"><span>Integridade campanhas</span>{scoreBar(m.comp.score_campanhas_integridade)}</div>
                              <div className="pt-2 border-t border-border flex justify-between items-center">
                                <span className="text-xs font-semibold">Total</span>
                                <span className="text-lg font-bold">{m.comp.score_total.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Nível de risco:</span>
                                <Badge className={cn("text-[10px]", RISCO_STYLES[m.comp.nivel_risco])}>
                                  {m.comp.nivel_risco}
                                </Badge>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sem dados — execute uma análise IA.</p>
                          )}
                        </div>
                      </div>

                      {/* Métricas brutas */}
                      {m.op?.detalhes && Object.keys(m.op.detalhes).length > 0 && (
                        <div className="mt-4 rounded-lg border border-border p-4">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" /> Métricas Coletadas
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            {Object.entries(m.op.detalhes).filter(([k]) => k !== "medico_id" && k !== "collected_at").map(([k, v]) => (
                              <div key={k} className="rounded bg-muted/30 p-2">
                                <p className="text-muted-foreground truncate">{k.replace(/_/g, " ")}</p>
                                <p className="font-medium">{typeof v === "number" ? (v as number).toFixed(1) : String(v)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {medicosMerged.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum médico encontrado.
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── Tab: Alertas ── */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="critico">Crítico</SelectItem>
                <SelectItem value="alerta">Alerta</SelectItem>
                <SelectItem value="atencao">Atenção</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="visto">Visto</SelectItem>
                <SelectItem value="em_acompanhamento">Em acompanhamento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="ignorado">Ignorado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {alertasFiltrados.map(a => (
              <div key={a.id} className={cn("rounded-lg border p-4 space-y-2", SEVERIDADE_STYLES[a.severidade])}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-[10px]", SEVERIDADE_STYLES[a.severidade])}>
                        {a.severidade}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                        {STATUS_ICON[a.status]} {a.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {medicoMap[a.medico_id] ?? a.medico_id.slice(0, 8)}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold">{a.titulo}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>
                    {a.justificativa && (
                      <p className="text-xs mt-1"><strong>Justificativa:</strong> {a.justificativa}</p>
                    )}
                    {a.recomendacao_ia && (
                      <p className="text-xs mt-1 text-primary"><strong>Recomendação IA:</strong> {a.recomendacao_ia}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {a.status === "novo" && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleStatusAlerta(a.id, "em_acompanhamento")}>
                          Acompanhar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleStatusAlerta(a.id, "ignorado")}>
                          Ignorar
                        </Button>
                      </>
                    )}
                    {a.status === "em_acompanhamento" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleStatusAlerta(a.id, "resolvido")}>
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
            {alertasFiltrados.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum alerta encontrado com os filtros selecionados.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Anomalias ── */}
        <TabsContent value="anomalias" className="space-y-4">
          <div className="space-y-3">
            {anomalias.map(a => (
              <div key={a.id} className={cn("rounded-lg border p-4 space-y-2", SEVERIDADE_STYLES[a.severidade])}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn("text-[10px]", SEVERIDADE_STYLES[a.severidade])}>{a.severidade}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {medicoMap[a.medico_id] ?? a.medico_id.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Confiança: {(a.score_confianca * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold">{a.tipo_anomalia.replace(/_/g, " ")}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>
                    {Object.keys(a.dados_evidencia).length > 0 && (
                      <pre className="text-[10px] mt-2 bg-muted/30 p-2 rounded overflow-auto max-h-24">
                        {JSON.stringify(a.dados_evidencia, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {a.status === "detectada" && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleStatusAnomalia(a.id, "investigando")}>
                          Investigar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleStatusAnomalia(a.id, "descartada")}>
                          Descartar
                        </Button>
                      </>
                    )}
                    {a.status === "investigando" && (
                      <>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleStatusAnomalia(a.id, "confirmada")}>
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleStatusAnomalia(a.id, "descartada")}>
                          Descartar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
            {anomalias.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma anomalia detectada.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab: Log Auditoria ── */}
        <TabsContent value="auditoria" className="space-y-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_100px_150px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground">
              <span>Médico</span>
              <span>Tipo análise</span>
              <span>Modelo IA</span>
              <span>Data</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              {auditoria.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr_120px_100px_150px] gap-2 px-4 py-3 border-t border-border text-xs items-center">
                  <span className="truncate font-medium">{medicoMap[a.medico_id] ?? a.medico_id.slice(0, 8)}</span>
                  <span>{a.tipo_analise}</span>
                  <Badge variant="outline" className="text-[10px] w-fit">{a.modelo_ia.split("/").pop()}</Badge>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                </div>
              ))}
              {auditoria.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum log de auditoria IA registrado.
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
