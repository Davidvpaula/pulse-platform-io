import { useEffect, useState } from "react";
import {
  Star, Trophy, TrendingUp, Users, Activity, Eye, EyeOff, Loader2, Award, BarChart3,
  Crown, Megaphone, PlusCircle, Pause, Play, XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import {
  getRankingMedico, listarAvaliacoesMedico, toggleExibirNoPerfil, getSaldoAtual,
  getMedicoPremium, listarCampanhasMedico, criarCampanha, atualizarStatusCampanha,
  type AvaliacaoMedica, type MedicoRanking, type MedicoPremium, type ImpulsionamentoCampanha,
} from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function brl(centavos: number) { return `R$ ${(centavos / 100).toFixed(2)}`; }
function recenciaLabel(f: number) {
  if (f >= 1) return { label: "Ativo", cls: "bg-success/15 text-success" };
  if (f >= 0.8) return { label: "Moderado", cls: "bg-warning/15 text-warning" };
  return { label: "Inativo", cls: "bg-destructive/15 text-destructive" };
}

export default function MedicoGamificacao() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [ranking, setRanking] = useState<MedicoRanking | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoMedica[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saldoCrescimento, setSaldoCrescimento] = useState<number>(0);
  const [premium, setPremium] = useState<MedicoPremium | null>(null);
  const [campanhas, setCampanhas] = useState<ImpulsionamentoCampanha[]>([]);
  const [novaCampanhaOpen, setNovaCampanhaOpen] = useState(false);

  const carregar = async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const medico = await getMedicoAtual();
    if (!medico) { setLoading(false); return; }
    setMedicoId(medico.id);
    const [r, a, saldo, prem, camps] = await Promise.all([
      getRankingMedico(medico.id),
      listarAvaliacoesMedico(medico.id),
      getSaldoAtual(medico.id),
      getMedicoPremium(medico.id),
      listarCampanhasMedico(medico.id),
    ]);
    setRanking(r);
    setAvaliacoes(a);
    setSaldoCrescimento(saldo);
    setPremium(prem);
    setCampanhas(camps);
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
      setCamphas((prev) => prev.map((c) => c.id === camp.id ? { ...c, status: novoStatus } : c));
      toast.success(`Campanha ${novoStatus}`);
    } catch {
      toast.error("Erro ao atualizar campanha");
    }
  };

  // fix typo helper
  const setCamphas = setCampanhas;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando gamificação…
      </div>
    );
  }

  const rec = ranking ? recenciaLabel(ranking.fator_recencia) : null;
  const isPremium = premium?.ativo ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gamificação & Ranking"
        description="Acompanhe sua performance, avaliações e posição no ranking da plataforma."
        actions={
          isPremium ? (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white px-3 py-1.5 text-sm">
              <Crown className="mr-1.5 h-4 w-4" /> Premium {premium?.tipo === "conquistado" ? "(conquistado)" : ""}
            </Badge>
          ) : null
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Nota média" value={ranking ? ranking.avaliacao_media.toFixed(1) : "—"} icon={Star} hint={`${ranking?.total_avaliacoes ?? 0} avaliações recebidas`} />
        <StatCard label="Posição no ranking" value={ranking?.posicao ? `#${ranking.posicao}` : "—"} icon={Trophy} hint="Entre todos os médicos aprovados" />
        <StatCard label="Taxa de conversão" value={ranking ? pct(ranking.taxa_conversao) : "—"} icon={TrendingUp} hint="Consultas concluídas / agendadas" />
        <StatCard label="Atendimentos" value={String(ranking?.total_atendimentos ?? 0)} icon={Users} hint={`${ranking?.total_agendamentos ?? 0} agendamentos no total`} />
        <StatCard label="Saldo crescimento" value={saldoCrescimento.toFixed(0)} icon={Award} hint="Pontos acumulados por performance" />
      </div>

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
                  ? `Ativo desde ${premium?.inicio ? new Date(premium.inicio).toLocaleDateString("pt-BR") : "—"} · Bônus de 1.2x no ranking`
                  : "Desbloqueie o bônus de 1.2x no ranking e destaque nos resultados de busca."}
              </p>
            </div>
          </div>
          {!isPremium && (
            <Badge variant="secondary" className="text-xs">Em breve</Badge>
          )}
        </div>
      </div>

      {/* Detalhes performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de No-Show</p>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? pct(ranking.taxa_no_show) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Faltas dos pacientes em relação ao total de agendamentos</p>
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
          <p className="mt-1 text-xs text-muted-foreground">Calculado com base em avaliações, volume, conversão, recência e mais</p>
        </div>
      </div>

      {/* Impulsionamento / Campanhas CPC */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Impulsionamento</h3>
          </div>
          <Button size="sm" onClick={() => setNovaCampanhaOpen(true)}>
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Nova campanha
          </Button>
        </div>

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
            Nenhuma avaliação recebida ainda. As avaliações aparecerão aqui após seus pacientes avaliarem consultas concluídas.
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
                    title={!av.avaliacao_publica ? "Apenas avaliações públicas podem ser exibidas no perfil" : av.exibir_no_perfil ? "Ocultar do perfil público" : "Exibir no perfil público"}
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
          onCriada={() => { setNovaCampanhaOpen(false); void carregar(); }}
        />
      )}
    </div>
  );
}

/* ─── Dialog criar campanha ─── */
function NovaCampanhaDialog({ open, onOpenChange, medicoId, onCriada }: {
  open: boolean; onOpenChange: (v: boolean) => void; medicoId: string; onCriada: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [orcamento, setOrcamento] = useState("50");
  const [cpc, setCpc] = useState("0.50");
  const [criando, setCriando] = useState(false);

  const handleCriar = async () => {
    if (!titulo.trim()) { toast.error("Informe um título"); return; }
    const orc = Math.round(parseFloat(orcamento) * 100);
    const cpcVal = Math.round(parseFloat(cpc) * 100);
    if (orc < 500) { toast.error("Orçamento mínimo R$ 5,00"); return; }
    if (cpcVal < 10) { toast.error("CPC mínimo R$ 0,10"); return; }
    setCriando(true);
    try {
      await criarCampanha({ medico_id: medicoId, titulo: titulo.trim(), orcamento_centavos: orc, cpc_centavos: cpcVal });
      toast.success("Campanha criada com sucesso!");
      setTitulo(""); setOrcamento("50"); setCpc("0.50");
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
            Você paga apenas por cliques reais no seu perfil.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCriar} disabled={criando} className="bg-gradient-primary hover:opacity-90">
            {criando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
            Criar campanha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
