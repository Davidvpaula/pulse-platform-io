import { useEffect, useState } from "react";
import {
  Star, Trophy, TrendingUp, Users, Activity, Eye, EyeOff, Loader2, Award, BarChart3,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import {
  getRankingMedico, listarAvaliacoesMedico, toggleExibirNoPerfil, getSaldoAtual,
  type AvaliacaoMedica, type MedicoRanking,
} from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function recenciaLabel(f: number) {
  if (f >= 1) return { label: "Ativo", cls: "bg-success/15 text-success" };
  if (f >= 0.8) return { label: "Moderado", cls: "bg-warning/15 text-warning" };
  return { label: "Inativo", cls: "bg-destructive/15 text-destructive" };
}

export default function MedicoGamificacao() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<MedicoRanking | null>(null);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoMedica[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const carregar = async () => {
    if (!session) { setLoading(false); return; }
    setLoading(true);
    const medico = await getMedicoAtual();
    if (!medico) { setLoading(false); return; }
    const [r, a] = await Promise.all([
      getRankingMedico(medico.id),
      listarAvaliacoesMedico(medico.id),
    ]);
    setRanking(r);
    setAvaliacoes(a);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando gamificação…
      </div>
    );
  }

  const rec = ranking ? recenciaLabel(ranking.fator_recencia) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gamificação & Ranking"
        description="Acompanhe sua performance, avaliações e posição no ranking da plataforma."
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Nota média"
          value={ranking ? ranking.avaliacao_media.toFixed(1) : "—"}
          icon={Star}
          hint={`${ranking?.total_avaliacoes ?? 0} avaliações recebidas`}
        />
        <StatCard
          label="Posição no ranking"
          value={ranking?.posicao ? `#${ranking.posicao}` : "—"}
          icon={Trophy}
          hint="Entre todos os médicos aprovados"
        />
        <StatCard
          label="Taxa de conversão"
          value={ranking ? pct(ranking.taxa_conversao) : "—"}
          icon={TrendingUp}
          hint="Consultas concluídas / agendadas"
        />
        <StatCard
          label="Atendimentos"
          value={String(ranking?.total_atendimentos ?? 0)}
          icon={Users}
          hint={`${ranking?.total_agendamentos ?? 0} agendamentos no total`}
        />
      </div>

      {/* Detalhes performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de No-Show</p>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? pct(ranking.taxa_no_show) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Faltas dos pacientes em relação ao total de agendamentos
          </p>
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recência</p>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? ranking.fator_recencia.toFixed(1) : "—"}</p>
          {rec && (
            <Badge className={cn("mt-2", rec.cls)}>{rec.label}</Badge>
          )}
        </div>
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score do Ranking</p>
            <Award className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{ranking ? ranking.ranking_score.toFixed(2) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Calculado com base em avaliações, volume, conversão, recência e mais
          </p>
        </div>
      </div>

      {/* Avaliações recebidas */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold">Avaliações recebidas</h3>
          <Badge variant="secondary">{avaliacoes.length} total</Badge>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma avaliação recebida ainda. As avaliações aparecerão aqui após seus pacientes
            avaliarem consultas concluídas.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {avaliacoes.map((av) => (
              <div key={av.id} className="flex items-start gap-3 py-4">
                <div className="flex gap-0.5 shrink-0 mt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i <= av.nota ? "fill-warning text-warning" : "text-muted-foreground/20",
                      )}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  {av.comentario ? (
                    <p className="text-sm">{av.comentario}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem comentário</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(av.created_at).toLocaleDateString("pt-BR")}
                    {av.avaliacao_publica && (
                      <span className="ml-2 text-primary">• Pública</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {av.exibir_no_perfil ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={av.exibir_no_perfil}
                    disabled={toggling === av.id || !av.avaliacao_publica}
                    onCheckedChange={() => handleToggle(av)}
                    title={
                      !av.avaliacao_publica
                        ? "Apenas avaliações públicas podem ser exibidas no perfil"
                        : av.exibir_no_perfil
                        ? "Ocultar do perfil público"
                        : "Exibir no perfil público"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
