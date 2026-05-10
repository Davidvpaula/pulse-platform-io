import { useEffect, useState, useCallback } from "react";
import {
  Shield, AlertTriangle, Activity, Brain, Users, TrendingDown,
  ChevronDown, ChevronRight, Loader2, RefreshCw, Eye, Search,
  CheckCircle2, XCircle, Clock, BarChart3, Zap, FileText,
  Lock, Unlock, ThumbsUp, ThumbsDown, TrendingUp, Gavel,
  MessageSquare, Ban, Star, Award,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { listarRankingTop, recalcularRankingTodos, type MedicoRanking } from "@/lib/gamificacao";
import {
  listarScoresOperacionais, listarScoresCompliance,
  listarAlertasIA, atualizarStatusAlerta,
  listarAnomalias, atualizarStatusAnomalia,
  listarAuditoriaIA, listarAcoesAdmin, listarRestricoesAtivas,
  executarAnaliseIA, executarAnaliseBatch, executarDeteccaoAnomalias,
  executarAcaoAdmin, removerRestricao,
  TIPO_ACAO_LABELS,
  type ScoreOperacional, type ScoreCompliance, type AlertaIA, type Anomalia, type AuditoriaIA,
  type AdminAcao, type MedicoRestricao,
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

const TENDENCIA_ICON: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  melhorando: { icon: <TrendingUp className="h-4 w-4" />, label: "Melhorando", className: "text-success" },
  estavel: { icon: <Activity className="h-4 w-4" />, label: "Estável", className: "text-amber-500" },
  piorando: { icon: <TrendingDown className="h-4 w-4" />, label: "Piorando", className: "text-destructive" },
};

const SUGESTAO_STYLES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  promover: { label: "Promover", className: "bg-success/10 text-success", icon: <ThumbsUp className="h-3.5 w-3.5" /> },
  manter: { label: "Manter", className: "bg-blue-500/10 text-blue-600", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  reduzir_destaque: { label: "Reduzir destaque", className: "bg-orange-500/10 text-orange-600", icon: <ThumbsDown className="h-3.5 w-3.5" /> },
  acompanhar: { label: "Acompanhar", className: "bg-amber-500/10 text-amber-600", icon: <Eye className="h-3.5 w-3.5" /> },
};

const ACAO_OPTIONS = [
  { value: "promover", label: "Promover médico", icon: <Award className="h-4 w-4" /> },
  { value: "reduzir_destaque", label: "Reduzir destaque", icon: <ThumbsDown className="h-4 w-4" /> },
  { value: "pausar_impulsionamento", label: "Pausar impulsionamento", icon: <Ban className="h-4 w-4" /> },
  { value: "bloquear_beneficios", label: "Bloquear benefícios", icon: <Lock className="h-4 w-4" /> },
  { value: "sinalizar_acompanhamento", label: "Sinalizar acompanhamento", icon: <Eye className="h-4 w-4" /> },
  { value: "solicitar_correcao", label: "Solicitar correção", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "registrar_observacao", label: "Registrar observação", icon: <FileText className="h-4 w-4" /> },
  { value: "congelar_ranking", label: "Congelar ranking", icon: <Lock className="h-4 w-4" /> },
  { value: "liberar_selo", label: "Liberar selo", icon: <Star className="h-4 w-4" /> },
  { value: "remover_selo", label: "Remover selo", icon: <XCircle className="h-4 w-4" /> },
];

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

/* ── Action Modal ── */
function AcaoAdminModal({
  open, onOpenChange, medicoId, medicoNome, onSuccess,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  medicoId: string; medicoNome: string;
  onSuccess: () => void;
}) {
  const [tipoAcao, setTipoAcao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tipoAcao || !motivo.trim()) {
      toast.error("Selecione uma ação e informe o motivo");
      return;
    }
    setLoading(true);
    try {
      await executarAcaoAdmin({ medicoId, tipoAcao, motivo: motivo.trim() });
      toast.success(`Ação "${TIPO_ACAO_LABELS[tipoAcao]}" registrada com sucesso`);
      setTipoAcao("");
      setMotivo("");
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" /> Ação Administrativa
          </DialogTitle>
          <DialogDescription>
            Médico: <strong>{medicoNome}</strong>. Toda ação é registrada em log de auditoria imutável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={tipoAcao} onValueChange={setTipoAcao}>
            <SelectTrigger><SelectValue placeholder="Selecione a ação…" /></SelectTrigger>
            <SelectContent>
              {ACAO_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">{o.icon} {o.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Motivo obrigatório — descreva a justificativa para esta ação…"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
          />

          <div className="rounded-lg bg-amber-500/10 border border-amber-200 p-3 text-xs text-amber-700">
            <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
            A IA sugere, mas a decisão é sua. Esta ação será registrada permanentemente.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !tipoAcao || !motivo.trim()}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Gavel className="mr-1.5 h-4 w-4" />}
            Confirmar Ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Component ── */

export default function AdminIAMedicos() {
  const [loading, setLoading] = useState(true);
  const [medicos, setMedicos] = useState<{ id: string; nome: string; ativo: boolean }[]>([]);
  const [scoresOp, setScoresOp] = useState<ScoreOperacional[]>([]);
  const [scoresComp, setScoresComp] = useState<ScoreCompliance[]>([]);
  const [alertas, setAlertas] = useState<AlertaIA[]>([]);
  const [anomalias, setAnomalias] = useState<Anomalia[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaIA[]>([]);
  const [rankings, setRankings] = useState<MedicoRanking[]>([]);
  const [acoesAdmin, setAcoesAdmin] = useState<AdminAcao[]>([]);
  const [restricoes, setRestricoes] = useState<MedicoRestricao[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroSeveridade, setFiltroSeveridade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [expandedMedico, setExpandedMedico] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState<string | null>(null);
  const [analisandoBatch, setAnalisandoBatch] = useState(false);
  const [acaoModal, setAcaoModal] = useState<{ open: boolean; medicoId: string; medicoNome: string }>({
    open: false, medicoId: "", medicoNome: "",
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: meds }, ops, comps, alts, anos, auds, rnks, acoes, rests] = await Promise.all([
        supabase.from("medicos" as any).select("id, nome, status").eq("status", "aprovado").order("nome"),
        listarScoresOperacionais(),
        listarScoresCompliance(),
        listarAlertasIA(),
        listarAnomalias(),
        listarAuditoriaIA(),
        listarRankingTop(200),
        listarAcoesAdmin(),
        listarRestricoesAtivas(),
      ]);
      setMedicos((meds ?? []) as any);
      setScoresOp(ops);
      setScoresComp(comps);
      setAlertas(alts);
      setAnomalias(anos);
      setAuditoria(auds);
      setRankings(rnks);
      setAcoesAdmin(acoes);
      setRestricoes(rests);
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

  const handleRemoverRestricao = async (medicoId: string) => {
    const motivo = prompt("Motivo para remover restrições:");
    if (!motivo?.trim()) return;
    try {
      await removerRestricao(medicoId, motivo);
      toast.success("Restrições removidas");
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
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
  const restricaoMap = Object.fromEntries(restricoes.map(r => [r.medico_id, r]));

  const alertasAtivos = alertas.filter(a => a.status === "novo" || a.status === "em_acompanhamento").length;
  const alertasCriticos = alertas.filter(a => a.severidade === "critico" && a.status !== "resolvido").length;
  const anomaliasAbertas = anomalias.filter(a => a.status === "detectada" || a.status === "investigando").length;
  const medicosRiscoAlto = scoresComp.filter(c => c.nivel_risco === "alto" || c.nivel_risco === "critico").length;
  const medicosComRestricao = restricoes.length;

  // Build merged medico list
  const medicosMerged = medicos
    .filter(m => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()))
    .map(m => ({
      ...m,
      op: opMap[m.id] ?? null,
      comp: compMap[m.id] ?? null,
      rank: rankMap[m.id] ?? null,
      restricao: restricaoMap[m.id] ?? null,
      alertasCount: alertas.filter(a => a.medico_id === m.id && (a.status === "novo" || a.status === "em_acompanhamento")).length,
      anomaliasCount: anomalias.filter(a => a.medico_id === m.id && (a.status === "detectada" || a.status === "investigando")).length,
    }))
    .sort((a, b) => (b.rank?.ranking_score ?? 0) - (a.rank?.ranking_score ?? 0));

  const alertasFiltrados = alertas.filter(a => {
    if (filtroSeveridade !== "todos" && a.severidade !== filtroSeveridade) return false;
    if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório Médico Interno IA"
        description="Auditoria operacional, compliance, antifraude, ações admin e recomendações estratégicas por IA."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                await recalcularRankingTodos();
                toast.success("Ranking recalculado!");
                await carregar();
              } catch { toast.error("Erro ao recalcular ranking"); }
            }}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Recalcular Ranking
            </Button>
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
      <div className="grid gap-4 md:grid-cols-6">
        <StatCard label="Médicos ativos" value={medicos.length} icon={Users} />
        <StatCard label="Alertas ativos" value={alertasAtivos} icon={AlertTriangle} hint={`${alertasCriticos} críticos`} />
        <StatCard label="Anomalias abertas" value={anomaliasAbertas} icon={Shield} />
        <StatCard label="Risco alto/crítico" value={medicosRiscoAlto} icon={TrendingDown} />
        <StatCard label="Restrições ativas" value={medicosComRestricao} icon={Lock} />
        <StatCard label="Análises realizadas" value={auditoria.length} icon={Brain} />
      </div>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ranking"><BarChart3 className="mr-1.5 h-4 w-4" /> Ranking Interno</TabsTrigger>
          <TabsTrigger value="alertas">
            <AlertTriangle className="mr-1.5 h-4 w-4" /> Alertas
            {alertasAtivos > 0 && <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5">{alertasAtivos}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="anomalias"><Shield className="mr-1.5 h-4 w-4" /> Anomalias</TabsTrigger>
          <TabsTrigger value="acoes"><Gavel className="mr-1.5 h-4 w-4" /> Ações Admin</TabsTrigger>
          <TabsTrigger value="restricoes">
            <Lock className="mr-1.5 h-4 w-4" /> Restrições
            {medicosComRestricao > 0 && <Badge className="ml-1.5 text-[10px] px-1.5 bg-orange-500/20 text-orange-600">{medicosComRestricao}</Badge>}
          </TabsTrigger>
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

          {/* Antifraude info banner */}
          <div className="rounded-lg bg-blue-500/5 border border-blue-200 p-3 text-xs text-blue-700 flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>Separação orgânico vs pago:</strong> O score orgânico reflete métricas reais (pontualidade, avaliações, compliance).
              Premium adiciona visibilidade (+5%) mas <strong>NUNCA</strong> anula penalidades por anomalia, compliance ou problemas operacionais.
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_70px_70px_70px_70px_70px_50px_50px_90px] gap-1 px-4 py-2.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
              <span className="text-center">#</span>
              <span>Médico</span>
              <span className="text-center">Ranking</span>
              <span className="text-center">Bayesian</span>
              <span className="text-center">Risco</span>
              <span className="text-center">Status</span>
              <span className="text-center">Compliance</span>
              <span className="text-center">Alert.</span>
              <span className="text-center">Anom.</span>
              <span className="text-center">Ações</span>
            </div>

            <ScrollArea className="max-h-[500px]">
              {medicosMerged.map((m, idx) => (
                <div key={m.id}>
                  <div
                    className={cn(
                      "grid grid-cols-[40px_1fr_70px_70px_70px_70px_70px_50px_50px_90px] gap-1 px-4 py-3 border-t border-border text-sm items-center cursor-pointer hover:bg-muted/30 transition-colors",
                      expandedMedico === m.id && "bg-muted/20",
                      m.restricao && "bg-orange-500/5",
                    )}
                    onClick={() => setExpandedMedico(expandedMedico === m.id ? null : m.id)}
                  >
                    <div className="text-center text-xs font-bold text-muted-foreground">
                      {m.rank?.posicao ?? idx + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedMedico === m.id ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="font-medium truncate">{m.nome}</span>
                      {m.rank && m.rank.bonus_novato > 0 && (
                        <Badge className="bg-blue-500/10 text-blue-600 text-[9px] px-1">Novato</Badge>
                      )}
                      {m.restricao?.ranking_congelado && (
                        <Badge className="bg-destructive/10 text-destructive text-[9px] px-1"><Lock className="h-2.5 w-2.5 mr-0.5" />Congelado</Badge>
                      )}
                    </div>
                    <div className="text-center">
                      {m.rank ? (
                        <span className="text-xs font-bold">{m.rank.ranking_score.toFixed(2)}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <div className="text-center">
                      {m.rank ? (
                        <span className="text-xs">{m.rank.avaliacao_bayesiana.toFixed(2)}</span>
                      ) : "—"}
                    </div>
                    <div className="text-center">
                      {m.comp ? (
                        <Badge className={cn("text-[10px]", RISCO_STYLES[m.comp.nivel_risco])}>
                          {m.comp.nivel_risco}
                        </Badge>
                      ) : "—"}
                    </div>
                    <div className="text-center">
                      {m.restricao ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {m.restricao.ranking_congelado && <span className="text-[9px] text-destructive">🔒 Ranking</span>}
                          {m.restricao.impulsionamento_pausado && <span className="text-[9px] text-orange-600">⏸ Impulso</span>}
                          {m.restricao.beneficios_bloqueados && <span className="text-[9px] text-destructive">🚫 Benef.</span>}
                          {m.restricao.em_acompanhamento && <span className="text-[9px] text-amber-600">👁 Acomp.</span>}
                        </div>
                      ) : (
                        <span className="text-[9px] text-success">✓ Livre</span>
                      )}
                    </div>
                    <div className="text-center">{m.comp ? scoreBar(m.comp.score_total) : <span className="text-xs text-muted-foreground">—</span>}</div>
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
                    <div className="text-center flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        disabled={analisando === m.id}
                        onClick={() => handleAnalisarMedico(m.id)}
                      >
                        {analisando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => setAcaoModal({ open: true, medicoId: m.id, medicoNome: m.nome })}
                      >
                        <Gavel className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedMedico === m.id && (
                    <div className="px-6 py-4 bg-muted/10 border-t border-border space-y-4">
                      {/* IA Insights: Pontos positivos/críticos + sugestão */}
                      {m.op?.detalhes?.pontos_positivos && (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-success">
                              <ThumbsUp className="h-4 w-4" /> Pontos Positivos
                            </h4>
                            <ul className="text-xs space-y-1">
                              {(m.op.detalhes.pontos_positivos as string[])?.map((p, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <CheckCircle2 className="h-3 w-3 mt-0.5 text-success shrink-0" />
                                  {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                              <ThumbsDown className="h-4 w-4" /> Pontos Críticos
                            </h4>
                            <ul className="text-xs space-y-1">
                              {(m.op.detalhes.pontos_criticos as string[])?.map((p, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
                                  {p}
                                </li>
                              ))}
                              {!(m.op.detalhes.pontos_criticos as string[])?.length && (
                                <li className="text-muted-foreground">Nenhum ponto crítico identificado</li>
                              )}
                            </ul>
                          </div>
                          <div className="rounded-lg border border-border p-4 space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Brain className="h-4 w-4 text-purple-500" /> Recomendação IA
                            </h4>
                            {m.op.detalhes.sugestao_acao && (
                              <div className="flex items-center gap-2">
                                <Badge className={cn("text-xs", SUGESTAO_STYLES[m.op.detalhes.sugestao_acao as string]?.className)}>
                                  {SUGESTAO_STYLES[m.op.detalhes.sugestao_acao as string]?.icon}
                                  <span className="ml-1">{SUGESTAO_STYLES[m.op.detalhes.sugestao_acao as string]?.label}</span>
                                </Badge>
                              </div>
                            )}
                            {m.op.detalhes.evolucao_tendencia && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Tendência:</span>
                                <span className={cn("flex items-center gap-1 font-medium", TENDENCIA_ICON[m.op.detalhes.evolucao_tendencia as string]?.className)}>
                                  {TENDENCIA_ICON[m.op.detalhes.evolucao_tendencia as string]?.icon}
                                  {TENDENCIA_ICON[m.op.detalhes.evolucao_tendencia as string]?.label}
                                </span>
                              </div>
                            )}
                            {m.op.detalhes.risco_reputacional != null && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Risco reputacional:</span>
                                <div className="mt-1">{scoreBar(100 - (m.op.detalhes.risco_reputacional as number))}</div>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground italic">
                              ⚠ A IA não toma decisões. Toda ação deve ser validada pelo admin.
                            </p>
                          </div>
                        </div>
                      )}

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
                                <span className="text-xs font-semibold">Total Orgânico</span>
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

                      {/* Ranking Protection Details */}
                      {m.rank && (
                        <div className="rounded-lg border border-border p-4 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-green-500" /> Proteção do Ranking
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Score Final</p>
                              <p className="text-lg font-bold">{m.rank.ranking_score.toFixed(3)}</p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Avaliação Bayesiana</p>
                              <p className="font-bold">{m.rank.avaliacao_bayesiana.toFixed(3)}</p>
                              <p className="text-[10px] text-muted-foreground">Raw: {m.rank.avaliacao_media.toFixed(2)} ({m.rank.total_avaliacoes} aval.)</p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Pen. Anomalia</p>
                              <p className={cn("font-bold", m.rank.penalidade_anomalia > 0 ? "text-destructive" : "text-success")}>
                                {m.rank.penalidade_anomalia > 0 ? `-${(m.rank.penalidade_anomalia * 100).toFixed(0)}%` : "Nenhuma"}
                              </p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Pen. Compliance</p>
                              <p className={cn("font-bold", m.rank.penalidade_compliance > 0 ? "text-orange-600" : "text-success")}>
                                {m.rank.penalidade_compliance > 0 ? `-${(m.rank.penalidade_compliance * 100).toFixed(0)}%` : "Nenhuma"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Premium Boost</p>
                              <p className="font-bold">{m.rank.fator_premium > 1 ? `+${((m.rank.fator_premium - 1) * 100).toFixed(0)}% (visual)` : "Padrão"}</p>
                              <p className="text-[10px] text-muted-foreground">Não anula penalidades</p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Bônus Novato</p>
                              <p className={cn("font-bold", m.rank.bonus_novato > 0 ? "text-blue-600" : "text-muted-foreground")}>
                                {m.rank.bonus_novato > 0 ? `+${(m.rank.bonus_novato * 100).toFixed(0)}%` : "N/A"}
                              </p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Recência</p>
                              <p className="font-bold">{(m.rank.fator_recencia * 100).toFixed(0)}%</p>
                            </div>
                            <div className="rounded bg-muted/30 p-2.5">
                              <p className="text-muted-foreground">Posição</p>
                              <p className="text-lg font-bold">#{m.rank.posicao ?? "—"}</p>
                            </div>
                          </div>
                          {m.rank.protecao_detalhes && (
                            <details className="text-[10px] text-muted-foreground">
                              <summary className="cursor-pointer hover:text-foreground">Detalhes técnicos do cálculo</summary>
                              <pre className="mt-1 bg-muted/30 p-2 rounded overflow-auto max-h-32">
                                {JSON.stringify(m.rank.protecao_detalhes, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}

                      {/* Admin action buttons */}
                      <div className="rounded-lg border border-border p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Gavel className="h-4 w-4" /> Ações Administrativas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAcaoModal({ open: true, medicoId: m.id, medicoNome: m.nome })}>
                            <Gavel className="h-3.5 w-3.5 mr-1" /> Abrir Painel de Ação
                          </Button>
                          {m.restricao && (
                            <Button size="sm" variant="outline" className="text-success" onClick={() => handleRemoverRestricao(m.id)}>
                              <Unlock className="h-3.5 w-3.5 mr-1" /> Remover Restrições
                            </Button>
                          )}
                        </div>
                      </div>
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

        {/* ── Tab: Ações Admin ── */}
        <TabsContent value="acoes" className="space-y-4">
          <div className="rounded-lg bg-amber-500/5 border border-amber-200 p-3 text-xs text-amber-700 flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>Log imutável:</strong> Todas as ações administrativas são registradas permanentemente.
              Não é possível editar ou excluir registros deste log.
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_1fr_150px] gap-2 px-4 py-2.5 bg-muted/50 text-xs font-semibold text-muted-foreground">
              <span>Médico</span>
              <span>Ação</span>
              <span>Motivo</span>
              <span>Data</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              {acoesAdmin.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr_130px_1fr_150px] gap-2 px-4 py-3 border-t border-border text-xs items-center">
                  <span className="truncate font-medium">{medicoMap[a.medico_id] ?? a.medico_id.slice(0, 8)}</span>
                  <Badge variant="outline" className="text-[10px] w-fit">
                    {TIPO_ACAO_LABELS[a.tipo_acao] ?? a.tipo_acao}
                  </Badge>
                  <span className="text-muted-foreground truncate">{a.motivo}</span>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                </div>
              ))}
              {acoesAdmin.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <Gavel className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhuma ação administrativa registrada.
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── Tab: Restrições Ativas ── */}
        <TabsContent value="restricoes" className="space-y-4">
          {restricoes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Unlock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhum médico com restrições ativas.
            </div>
          ) : (
            <div className="space-y-3">
              {restricoes.map(r => (
                <div key={r.medico_id} className="rounded-lg border border-orange-200 bg-orange-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">{medicoMap[r.medico_id] ?? r.medico_id.slice(0, 8)}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{r.motivo}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRemoverRestricao(r.medico_id)}>
                      <Unlock className="h-3.5 w-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.ranking_congelado && <Badge className="bg-destructive/10 text-destructive text-[10px]"><Lock className="h-2.5 w-2.5 mr-0.5" /> Ranking congelado</Badge>}
                    {r.impulsionamento_pausado && <Badge className="bg-orange-500/10 text-orange-600 text-[10px]"><Ban className="h-2.5 w-2.5 mr-0.5" /> Impulso pausado</Badge>}
                    {r.beneficios_bloqueados && <Badge className="bg-destructive/10 text-destructive text-[10px]"><Lock className="h-2.5 w-2.5 mr-0.5" /> Benefícios bloqueados</Badge>}
                    {r.em_acompanhamento && <Badge className="bg-amber-500/10 text-amber-600 text-[10px]"><Eye className="h-2.5 w-2.5 mr-0.5" /> Em acompanhamento</Badge>}
                    {r.selo_removido && <Badge className="bg-destructive/10 text-destructive text-[10px]"><XCircle className="h-2.5 w-2.5 mr-0.5" /> Selo removido</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>Aplicado em: {r.aplicado_em ? new Date(r.aplicado_em).toLocaleString("pt-BR") : "—"}</span>
                    {r.expira_em && <span>Expira em: {new Date(r.expira_em).toLocaleString("pt-BR")}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Action Modal */}
      <AcaoAdminModal
        open={acaoModal.open}
        onOpenChange={(open) => setAcaoModal(prev => ({ ...prev, open }))}
        medicoId={acaoModal.medicoId}
        medicoNome={acaoModal.medicoNome}
        onSuccess={carregar}
      />
    </div>
  );
}
