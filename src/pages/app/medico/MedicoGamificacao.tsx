import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { brl } from "@/lib/format";
import {
  Star, Trophy, TrendingUp, Users, Activity, Eye, EyeOff, Loader2, Award, BarChart3,
  Crown, Megaphone, PlusCircle, Pause, Play, XCircle, Zap, History,
  FileText, CheckCircle2, AlertTriangle, Shield, Flame, Target,
  ArrowRight, Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import {
  getRankingMedico, listarAvaliacoesMedico, toggleExibirNoPerfil, getSaldoAtual,
  getMedicoPremium, listarCampanhasMedico, criarCampanha, atualizarStatusCampanha,
  listarSaldoCrescimento, getRankingConfig, ativarPremiumConquistado,
  getScoreDetalhado, recalcularScoreMedico, listarBadgesMedico, listarStreaksMedico,
  listarRecomendacoes, getNivelInfo,
  type AvaliacaoMedica, type MedicoRanking, type MedicoPremium,
  type ImpulsionamentoCampanha, type SaldoCrescimentoItem, type RankingConfig,
  type MedicoScoreDetalhado, type MedicoBadge, type MedicoStreak, type RecomendacaoIA,
} from "@/lib/gamificacao";
import {
  buscarTermosPendentes, registrarAceite, TERMO_TIPO_LABELS,
  type TermoRow,
} from "@/lib/termos";
import { cn } from "@/lib/utils";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

function recenciaLabel(f: number) {
  if (f >= 1) return { label: "Ativo", cls: "bg-success/15 text-success" };
  if (f >= 0.8) return { label: "Moderado", cls: "bg-warning/15 text-warning" };
  return { label: "Inativo", cls: "bg-destructive/15 text-destructive" };
}

const BADGE_ICONS: Record<string, string> = {
  perfil_completo: "✅",
  pontual: "⏱️",
  top_avaliado: "⭐",
  maratonista: "🏃",
  fidelizador: "🤝",
  velocista: "⚡",
  veterano: "🏅",
  premium_conquistado: "👑",
};

/* ── Radar chart SVG simples ── */
function ScoreRadar({ scores }: { scores: { label: string; value: number; max: number }[] }) {
  const cx = 100, cy = 100, r = 70;
  const n = scores.length;
  const angleStep = (2 * Math.PI) / n;

  const points = scores.map((s, i) => {
    const angle = -Math.PI / 2 + angleStep * i;
    const ratio = Math.min(s.value / (s.max || 1), 1);
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      label: s.label,
      value: s.value,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
      {/* Grid */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={scores.map((_, i) => {
            const angle = -Math.PI / 2 + angleStep * i;
            return `${cx + r * ring * Math.cos(angle)},${cy + r * ring * Math.sin(angle)}`;
          }).join(" ")}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity="0.5"
        />
      ))}
      {/* Axes */}
      {points.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(-Math.PI / 2 + angleStep * i)} y2={cy + r * Math.sin(-Math.PI / 2 + angleStep * i)} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
      ))}
      {/* Data polygon */}
      <polygon points={polygon} fill="hsl(var(--primary) / 0.15)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {/* Dots + labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[7px] font-medium">
            {p.label}
          </text>
          <text x={p.lx} y={p.ly + 9} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[6px]">
            {(p.value * 100).toFixed(0)}%
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function MedicoGamificacao() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<MedicoRanking | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoMedica[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saldoCrescimento, setSaldoCrescimento] = useState<number>(0);
  const [saldoHistorico, setSaldoHistorico] = useState<SaldoCrescimentoItem[]>([]);
  const [premium, setPremium] = useState<MedicoPremium | null>(null);
  const [campanhas, setCampanhas] = useState<ImpulsionamentoCampanha[]>([]);
  const [novaCampanhaOpen, setNovaCampanhaOpen] = useState(false);
  const [config, setConfig] = useState<RankingConfig | null>(null);
  const [showSaldoHistory, setShowSaldoHistory] = useState(false);
  const [scoreDetalhado, setScoreDetalhado] = useState<MedicoScoreDetalhado | null>(null);
  const [badges, setBadges] = useState<MedicoBadge[]>([]);
  const [streaks, setStreaks] = useState<MedicoStreak[]>([]);
  const [recomendacoes, setRecomendacoes] = useState<RecomendacaoIA[]>([]);

  // Premium activation + terms
  const [activatingPremium, setActivatingPremium] = useState(false);
  const [termosPendentes, setTermosPendentes] = useState<TermoRow[]>([]);
  const [termoAtual, setTermoAtual] = useState<TermoRow | null>(null);
  const [aceitandoTermo, setAceitandoTermo] = useState(false);

  const carregar = async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const medico = await getMedicoAtual();
    if (!medico) { setLoading(false); return; }
    setMedicoId(medico.id);
    const [r, a, saldo, hist, prem, camps, cfg, sd, bdg, str, rec] = await Promise.all([
      getRankingMedico(medico.id),
      listarAvaliacoesMedico(medico.id),
      getSaldoAtual(medico.id),
      listarSaldoCrescimento(medico.id),
      getMedicoPremium(medico.id),
      listarCampanhasMedico(medico.id),
      getRankingConfig(),
      getScoreDetalhado(medico.id),
      listarBadgesMedico(medico.id),
      listarStreaksMedico(medico.id),
      listarRecomendacoes(medico.id),
    ]);
    setRanking(r);
    setAvaliacoes(a);
    setSaldoCrescimento(saldo);
    setSaldoHistorico(hist);
    setPremium(prem);
    setCampanhas(camps);
    setConfig(cfg);
    setScoreDetalhado(sd);
    setBadges(bdg);
    setStreaks(str);
    setRecomendacoes(rec);
    setLoading(false);
  };

  useEffect(() => { void carregar(); }, [session]);

  const handleToggle = async (av: AvaliacaoMedica) => {
    setToggling(av.id);
    try {
      await toggleExibirNoPerfil(av.id, !av.exibir_no_perfil);
      setAvaliacoes((prev) =>
        prev.map((a) => a.id === av.id ? { ...a, exibir_no_perfil: !a.exibir_no_perfil } : a),
      );
      toast.success(av.exibir_no_perfil ? "Avaliação ocultada do perfil" : "Avaliação exibida no perfil");
    } catch {
      toast.error("Erro ao atualizar visibilidade");
    } finally {
      setToggling(null);
    }
  };

  const handleStatusCampanha = async (camp: ImpulsionamentoCampanha, novoStatus: ImpulsionamentoCampanha["status"]) => {
    try {
      await atualizarStatusCampanha(camp.id, novoStatus);
      setCampanhas((prev) => prev.map((c) => c.id === camp.id ? { ...c, status: novoStatus } : c));
      toast.success(`Campanha ${novoStatus}`);
    } catch {
      toast.error("Erro ao atualizar campanha");
    }
  };

  const handleAtivarPremium = async () => {
    if (!medicoId) return;
    setActivatingPremium(true);
    try {
      const pendentes = await buscarTermosPendentes("medico");
      const premiumTermos = pendentes.filter(t =>
        t.tipo === "gamificacao_premium" || t.tipo === "contrato_medico"
      );
      if (premiumTermos.length > 0) {
        setTermosPendentes(premiumTermos);
        setTermoAtual(premiumTermos[0]);
        setActivatingPremium(false);
        return;
      }
      await ativarPremiumConquistado(medicoId);
      toast.success("Premium ativado com sucesso! 🎉");
      const prem = await getMedicoPremium(medicoId);
      setPremium(prem);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao ativar Premium");
    } finally {
      setActivatingPremium(false);
    }
  };

  const handleAceitarTermo = async () => {
    if (!termoAtual) return;
    setAceitandoTermo(true);
    try {
      await registrarAceite(termoAtual.id);
      toast.success(`"${termoAtual.titulo}" aceito!`);
      const restantes = termosPendentes.filter(t => t.id !== termoAtual.id);
      setTermosPendentes(restantes);
      if (restantes.length > 0) {
        setTermoAtual(restantes[0]);
      } else {
        setTermoAtual(null);
        if (medicoId) {
          setActivatingPremium(true);
          try {
            await ativarPremiumConquistado(medicoId);
            toast.success("Premium ativado com sucesso! 🎉");
            const prem = await getMedicoPremium(medicoId);
            setPremium(prem);
          } catch (e: any) {
            toast.error(e.message ?? "Erro ao ativar Premium");
          } finally {
            setActivatingPremium(false);
          }
        }
      }
    } catch (e: any) {
      toast.error("Erro ao registrar aceite: " + e.message);
    } finally {
      setAceitandoTermo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando gamificação…
      </div>
    );
  }

  const rec = ranking ? recenciaLabel(ranking.fator_recencia) : null;
  const isPremium = premium?.ativo ?? false;
  const nivelInfo = getNivelInfo(scoreDetalhado?.total_pontos_acumulados ?? saldoCrescimento);

  const premiumProgress = config && ranking ? {
    atendimentos: { atual: ranking.total_atendimentos, meta: config.premium_min_atendimentos, ok: ranking.total_atendimentos >= config.premium_min_atendimentos },
    avaliacao: { atual: ranking.avaliacao_media, meta: config.premium_min_avaliacao, ok: ranking.avaliacao_media >= config.premium_min_avaliacao },
    noShow: { atual: ranking.taxa_no_show, meta: config.premium_max_no_show, ok: ranking.taxa_no_show <= config.premium_max_no_show },
  } : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gamificação & Ranking"
        description="Acompanhe sua performance, avaliações e posição no ranking da plataforma."
        actions={
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white px-3 py-1.5 text-sm">
                <Crown className="mr-1.5 h-4 w-4" /> Premium {premium?.tipo === "conquistado" ? "(conquistado)" : ""}
              </Badge>
            ) : (
              <Link to="/app/medico/premium">
                <Button variant="outline" size="sm">
                  <Crown className="mr-1.5 h-4 w-4 text-amber-500" /> Conhecer Premium
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Level + Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        {/* Level card */}
        <div className="md:col-span-2 card-elevated p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
              nivelInfo.nivel >= 5 ? "bg-gradient-to-br from-amber-500/20 to-yellow-400/20 text-amber-500" :
              nivelInfo.nivel >= 3 ? "bg-primary/10 text-primary" :
              "bg-muted text-muted-foreground",
            )}>
              {nivelInfo.nivel}
            </div>
            <div>
              <p className="font-display font-bold text-lg">{nivelInfo.nome}</p>
              <p className="text-xs text-muted-foreground">
                {nivelInfo.proximoNome
                  ? `${nivelInfo.pontosParaProximo.toFixed(0)} pts para ${nivelInfo.proximoNome}`
                  : "Nível máximo atingido!"}
              </p>
            </div>
          </div>
          <Progress value={nivelInfo.progresso * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Total acumulado: {(scoreDetalhado?.total_pontos_acumulados ?? saldoCrescimento).toFixed(0)} pontos
          </p>
        </div>

        {/* Quick stats */}
        <StatCard label="Nota média" value={ranking ? ranking.avaliacao_media.toFixed(1) : "—"} icon={Star} hint={`${ranking?.total_avaliacoes ?? 0} avaliações`} />
        <StatCard label="Posição" value={ranking?.posicao ? `#${ranking.posicao}` : "—"} icon={Trophy} hint="No ranking geral" />
        <StatCard label="Conversão" value={ranking ? pct(ranking.taxa_conversao) : "—"} icon={TrendingUp} hint="Consultas / agendamentos" />
        <StatCard label="Saldo" value={saldoCrescimento.toFixed(0)} icon={Zap} hint="Pontos disponíveis" />
      </div>

      {/* Score Radar + Badges + Streaks */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Radar chart */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Score Multi-Dimensional</h3>
          </div>
          {scoreDetalhado ? (
            <>
              <ScoreRadar scores={[
                { label: "Operacional", value: scoreDetalhado.score_operacional, max: 1 },
                { label: "Clínico", value: scoreDetalhado.score_clinico, max: 1 },
                { label: "Comercial", value: scoreDetalhado.score_comercial, max: 1 },
                { label: "Reputacional", value: scoreDetalhado.score_reputacional, max: 1 },
              ]} />
              <div className="text-center mt-2">
                <p className="text-2xl font-bold text-primary">{(scoreDetalhado.score_final * 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Score final</p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Score será calculado após suas primeiras consultas.
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Badges</h3>
            <Badge variant="secondary" className="ml-auto text-xs">{badges.length}</Badge>
          </div>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {badges.map((b) => (
                <div key={b.id} className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                  <span className="text-2xl">{BADGE_ICONS[b.badge_key] ?? "🏆"}</span>
                  <p className="text-xs font-medium mt-1 truncate">{b.badge_nome}</p>
                  {b.expira_em && (
                    <p className="text-[10px] text-muted-foreground">
                      Expira: {new Date(b.expira_em).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Continue atendendo para desbloquear badges!
            </div>
          )}
        </div>

        {/* Streaks */}
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <h3 className="font-display font-semibold">Streaks</h3>
          </div>
          {streaks.length > 0 ? (
            <div className="space-y-3">
              {streaks.map((s) => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">{s.tipo.replace(/_/g, " ")}</p>
                    <Badge className={cn(
                      "text-xs",
                      s.dias_consecutivos > 0 ? "bg-orange-500/15 text-orange-600" : "bg-muted text-muted-foreground",
                    )}>
                      🔥 {s.dias_consecutivos} dias
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recorde: {s.melhor_streak} dias
                    {s.ultima_atividade && ` · Última: ${new Date(s.ultima_atividade).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Flame className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Realize consultas consecutivas para iniciar seu streak!
            </div>
          )}
        </div>
      </div>

      {/* IA Recommendations */}
      {recomendacoes.length > 0 && (
        <div className="card-elevated p-5 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold">Recomendações Inteligentes</h3>
          </div>
          <div className="space-y-2">
            {recomendacoes.slice(0, 3).map((r) => (
              <div key={r.id} className={cn(
                "rounded-lg border p-3 text-sm",
                r.prioridade === "urgente" ? "border-destructive/30 bg-destructive/5" :
                r.prioridade === "alta" ? "border-warning/30 bg-warning/5" :
                "border-border bg-muted/30",
              )}>
                <p className="font-medium">{r.titulo}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Premium status card */}
      <div className={cn(
        "card-elevated p-5 border",
        isPremium ? "border-amber-500/30 bg-amber-500/5" : "border-border",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className={cn("h-6 w-6", isPremium ? "text-amber-500" : "text-muted-foreground")} />
            <div>
              <p className="font-semibold">{isPremium ? "Você é Premium!" : "Plano Premium"}</p>
              <p className="text-xs text-muted-foreground">
                {isPremium
                  ? `Ativo desde ${premium?.inicio ? new Date(premium.inicio).toLocaleDateString("pt-BR") : "—"} · Bônus de ${config?.premium_bonus_ranking ?? 1.2}x no ranking`
                  : "Desbloqueie campanhas, relatórios avançados e recomendações IA."}
              </p>
            </div>
          </div>
          {!isPremium && (
            <Link to="/app/medico/premium">
              <Button size="sm" variant="outline">
                Ver planos <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {/* Premium qualification progress */}
        {!isPremium && premiumProgress && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className={cn("rounded-lg p-3 border", premiumProgress.atendimentos.ok ? "border-success/30 bg-success/5" : "border-border")}>
              <p className="text-xs font-medium">Atendimentos</p>
              <p className="text-lg font-bold">{premiumProgress.atendimentos.atual} <span className="text-xs text-muted-foreground font-normal">/ {premiumProgress.atendimentos.meta}</span></p>
              {premiumProgress.atendimentos.ok && <Badge className="bg-success/15 text-success text-[10px] mt-1">✓ Atingido</Badge>}
            </div>
            <div className={cn("rounded-lg p-3 border", premiumProgress.avaliacao.ok ? "border-success/30 bg-success/5" : "border-border")}>
              <p className="text-xs font-medium">Nota média</p>
              <p className="text-lg font-bold">{premiumProgress.avaliacao.atual.toFixed(1)} <span className="text-xs text-muted-foreground font-normal">/ {premiumProgress.avaliacao.meta.toFixed(1)}</span></p>
              {premiumProgress.avaliacao.ok && <Badge className="bg-success/15 text-success text-[10px] mt-1">✓ Atingido</Badge>}
            </div>
            <div className={cn("rounded-lg p-3 border", premiumProgress.noShow.ok ? "border-success/30 bg-success/5" : "border-border")}>
              <p className="text-xs font-medium">No-show</p>
              <p className="text-lg font-bold">{pct(premiumProgress.noShow.atual)} <span className="text-xs text-muted-foreground font-normal">máx {pct(premiumProgress.noShow.meta)}</span></p>
              {premiumProgress.noShow.ok && <Badge className="bg-success/15 text-success text-[10px] mt-1">✓ Atingido</Badge>}
            </div>
          </div>
        )}

        {!isPremium && premiumProgress &&
          premiumProgress.atendimentos.ok && premiumProgress.avaliacao.ok && premiumProgress.noShow.ok && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <Crown className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Parabéns! Você atingiu todos os requisitos.</p>
              <p className="text-xs text-muted-foreground">Aceite os termos e ative seu Premium conquistado.</p>
            </div>
            <Button
              onClick={handleAtivarPremium}
              disabled={activatingPremium}
              className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white hover:opacity-90"
            >
              {activatingPremium
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ativando…</>
                : <><Crown className="mr-2 h-4 w-4" /> Ativar Premium</>}
            </Button>
          </div>
        )}
      </div>

      {/* Dialog: aceite de termos */}
      <Dialog open={!!termoAtual} onOpenChange={(o) => { if (!o) { setTermoAtual(null); setTermosPendentes([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {termoAtual?.titulo}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {termoAtual && TERMO_TIPO_LABELS[termoAtual.tipo]} • Versão {termoAtual?.versao}
            </p>
            <div className="flex items-center gap-2 mt-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Você precisa aceitar {termosPendentes.length > 1 ? `${termosPendentes.length} termos` : "este termo"} para ativar o Premium.
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[50vh] border rounded-md p-4">
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: termoAtual?.conteudo ?? "" }}
            />
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <p className="text-xs text-muted-foreground flex-1">
              Ao aceitar, você concorda com os termos acima.
            </p>
            <Button variant="outline" onClick={() => { setTermoAtual(null); setTermosPendentes([]); }} disabled={aceitandoTermo}>
              Cancelar
            </Button>
            <Button onClick={handleAceitarTermo} disabled={aceitandoTermo}>
              {aceitandoTermo
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando…</>
                : <><CheckCircle2 className="mr-2 h-4 w-4" /> Li e aceito</>}
            </Button>
          </DialogFooter>
          {termosPendentes.length > 1 && termoAtual && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              + {termosPendentes.filter(t => t.id !== termoAtual.id).length} termo(s) restante(s)
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Saldo de Crescimento */}
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Saldo de Crescimento</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-lg font-bold">{saldoCrescimento.toFixed(0)} pts</Badge>
            <Button size="sm" variant="ghost" onClick={() => setShowSaldoHistory(!showSaldoHistory)}>
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Ganhe {config?.saldo_por_consulta ?? 10} pontos por consulta concluída. Use para impulsionar seu perfil.
        </p>
        {showSaldoHistory && (
          <div className="border-t border-border pt-3 max-h-60 overflow-y-auto">
            {saldoHistorico.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum movimento ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {saldoHistorico.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className={cn("font-medium", item.tipo === "credito" ? "text-success" : "text-destructive")}>
                        {item.tipo === "credito" ? "+" : "-"}{item.valor.toFixed(0)} pts
                      </p>
                      <p className="text-xs text-muted-foreground">{item.motivo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("pt-BR")}</p>
                      <p className="text-xs font-mono">Saldo: {item.saldo_apos.toFixed(0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detalhes performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de No-Show</p>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? pct(ranking.taxa_no_show) : "—"}</p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recência</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? ranking.fator_recencia.toFixed(1) : "—"}</p>
          {rec && <Badge className={cn("mt-2", rec.cls)}>{rec.label}</Badge>}
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score do Ranking</p>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? ranking.ranking_score.toFixed(2) : "—"}</p>
        </div>
      </div>

      {/* Impulsionamento / Campanhas CPC */}
      <div className="card-elevated p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Impulsionamento</h3>
          </div>
          <Button size="sm" onClick={() => setNovaCampanhaOpen(true)}>
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Nova campanha
          </Button>
        </div>

        {(() => {
          const ativas = campanhas.filter(c => c.status === "ativa").length;
          const pausadas = campanhas.filter(c => c.status === "pausada").length;
          const encerradas = campanhas.filter(c => c.status === "encerrada").length;
          const canceladas = campanhas.filter(c => c.status === "cancelada").length;
          const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
          const totalGasto = campanhas.reduce((s, c) => s + c.gasto_centavos, 0);

          return (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-center">
                <p className="text-xl font-bold text-success">{ativas}</p>
                <p className="text-[11px] text-muted-foreground">Ativas</p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-center">
                <p className="text-xl font-bold text-warning">{pausadas}</p>
                <p className="text-[11px] text-muted-foreground">Pausadas</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xl font-bold text-muted-foreground">{encerradas}</p>
                <p className="text-[11px] text-muted-foreground">Concluídas</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                <p className="text-xl font-bold text-destructive">{canceladas}</p>
                <p className="text-[11px] text-muted-foreground">Canceladas</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-xl font-bold text-primary">{totalCliques}</p>
                <p className="text-[11px] text-muted-foreground">Cliques total</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-xl font-bold text-primary">{brl(totalGasto)}</p>
                <p className="text-[11px] text-muted-foreground">Investido</p>
              </div>
            </div>
          );
        })()}

        {campanhas.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma campanha criada. Impulsione seu perfil para aparecer em destaque nos resultados de busca.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campanhas.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.titulo}</p>
                    <Badge className={cn("text-[10px]",
                      c.status === "ativa" ? "bg-success/15 text-success" :
                      c.status === "pausada" ? "bg-warning/15 text-warning" :
                      c.status === "encerrada" ? "bg-muted text-muted-foreground" :
                      "bg-destructive/15 text-destructive"
                    )}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Orçamento: {brl(c.orcamento_centavos)} · Gasto: {brl(c.gasto_centavos)} · CPC: {brl(c.cpc_centavos)} · {c.cliques} cliques · {c.impressoes} impressões
                  </p>
                </div>
                <div className="flex gap-1">
                  {c.status === "ativa" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStatusCampanha(c, "pausada")} title="Pausar">
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                  {c.status === "pausada" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStatusCampanha(c, "ativa")} title="Retomar">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  {(c.status === "ativa" || c.status === "pausada") && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleStatusCampanha(c, "cancelada")} title="Cancelar">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avaliações recebidas */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">Avaliações recebidas</h3>
          <Badge variant="secondary">{avaliacoes.length} total</Badge>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma avaliação recebida ainda.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {avaliacoes.map((av) => (
              <div key={av.id} className="flex items-start gap-3 py-4">
                <div className="flex gap-0.5 shrink-0 mt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={cn("h-4 w-4", i <= av.nota ? "fill-warning text-warning" : "text-muted-foreground/20")} />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  {av.comentario ? <p className="text-sm">{av.comentario}</p> : <p className="text-sm text-muted-foreground italic">Sem comentário</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(av.created_at).toLocaleDateString("pt-BR")}
                    {av.avaliacao_publica && <span className="ml-2 text-primary">• Pública</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {av.exibir_no_perfil ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <Switch
                    checked={av.exibir_no_perfil}
                    disabled={toggling === av.id || !av.avaliacao_publica}
                    onCheckedChange={() => handleToggle(av)}
                    title={!av.avaliacao_publica ? "Apenas avaliações públicas" : av.exibir_no_perfil ? "Ocultar do perfil" : "Exibir no perfil"}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog nova campanha */}
      {medicoId && (
        <NovaCampanhaDialog
          open={novaCampanhaOpen}
          onOpenChange={setNovaCampanhaOpen}
          medicoId={medicoId}
          saldoAtual={saldoCrescimento}
          cpcPadrao={config?.cpc_padrao_centavos ?? 50}
          onCriada={() => { setNovaCampanhaOpen(false); void carregar(); }}
        />
      )}
    </div>
  );
}

/* ─── Dialog criar campanha ─── */
function NovaCampanhaDialog({ open, onOpenChange, medicoId, saldoAtual, cpcPadrao, onCriada }: {
  open: boolean; onOpenChange: (v: boolean) => void; medicoId: string; saldoAtual: number; cpcPadrao: number; onCriada: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [orcamento, setOrcamento] = useState("50");
  const [cpc, setCpc] = useState((cpcPadrao / 100).toFixed(2));
  const [criando, setCriando] = useState(false);

  const orc = Math.round(parseFloat(orcamento) * 100);

  const handleCriar = async () => {
    if (!titulo.trim()) { toast.error("Informe um título"); return; }
    const cpcVal = Math.round(parseFloat(cpc) * 100);
    if (orc < 500) { toast.error("Orçamento mínimo R$ 5,00"); return; }
    if (orc > saldoAtual) { toast.error("Saldo insuficiente para este orçamento"); return; }
    if (cpcVal < 10) { toast.error("CPC mínimo R$ 0,10"); return; }
    setCriando(true);
    try {
      await criarCampanha({ medico_id: medicoId, titulo: titulo.trim(), orcamento_centavos: orc, cpc_centavos: cpcVal });
      toast.success("Campanha criada com sucesso!");
      setTitulo(""); setOrcamento("50"); setCpc((cpcPadrao / 100).toFixed(2));
      onCriada();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar campanha");
    } finally {
      setCriando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova campanha de impulsionamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm">Saldo disponível: <strong>{saldoAtual.toFixed(0)} pts</strong></span>
            {orc > saldoAtual && (
              <Badge className="bg-warning/15 text-warning text-[10px]">Saldo insuficiente</Badge>
            )}
          </div>
          <div className="space-y-1">
            <Label>Título da campanha</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Destaque Cardiologia" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Orçamento (R$)</Label>
              <Input type="number" min="5" step="5" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>CPC (R$)</Label>
              <Input type="number" min="0.10" step="0.10" value={cpc} onChange={(e) => setCpc(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estimativa: ~{orcamento && cpc ? Math.floor((parseFloat(orcamento) || 0) / (parseFloat(cpc) || 1)) : 0} cliques.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={criando || orc > saldoAtual} className="bg-gradient-primary hover:opacity-90">
            {criando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
            Criar campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
