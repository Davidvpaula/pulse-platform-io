import { useEffect, useState } from "react";
import {
  Settings, Trophy, RefreshCw, Loader2, Users, Star, Save, AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getRankingConfig, salvarRankingConfig, recalcularRankingTodos, listarRankingTop,
  type RankingConfig, type MedicoRanking,
} from "@/lib/gamificacao";
import { supabase } from "@/integrations/supabase/client";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }

export default function AdminGamificacao() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [config, setConfig] = useState<RankingConfig | null>(null);
  const [top, setTop] = useState<(MedicoRanking & { nome?: string })[]>([]);

  const carregar = async () => {
    setLoading(true);
    const [cfg, ranking] = await Promise.all([
      getRankingConfig(),
      listarRankingTop(15),
    ]);
    setConfig(cfg);

    // Enriquecer com nomes
    if (ranking.length) {
      const ids = ranking.map((r) => r.medico_id);
      const { data: medicos } = await supabase
        .from("medicos")
        .select("id, nome")
        .in("id", ids);
      const nomeMap = new Map((medicos ?? []).map((m) => [m.id, m.nome]));
      setTop(ranking.map((r) => ({ ...r, nome: nomeMap.get(r.medico_id) ?? "—" })));
    } else {
      setTop([]);
    }
    setLoading(false);
  };

  useEffect(() => { void carregar(); }, []);

  const salvar = async () => {
    if (!config) return;
    const soma = (config.peso_avaliacao ?? 0) + (config.peso_atendimentos ?? 0)
      + (config.peso_conversao ?? 0) + (config.peso_no_show ?? 0)
      + (config.peso_recencia ?? 0) + (config.peso_premium ?? 0);
    if (Math.abs(soma - 1) > 0.01) {
      toast.error(`A soma dos pesos deve ser 1.00 (atual: ${soma.toFixed(2)})`);
      return;
    }
    setSaving(true);
    try {
      await salvarRankingConfig(config);
      toast.success("Configuração salva");
    } catch {
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const recalcular = async () => {
    setRecalculando(true);
    try {
      await recalcularRankingTodos();
      toast.success("Ranking recalculado com sucesso");
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao recalcular ranking");
    } finally {
      setRecalculando(false);
    }
  };

  const updatePeso = (key: keyof RankingConfig, val: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: parseFloat(val) || 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configuração…
      </div>
    );
  }

  const soma = config
    ? (config.peso_avaliacao ?? 0) + (config.peso_atendimentos ?? 0)
      + (config.peso_conversao ?? 0) + (config.peso_no_show ?? 0)
      + (config.peso_recencia ?? 0) + (config.peso_premium ?? 0)
    : 0;
  const somaOk = Math.abs(soma - 1) <= 0.01;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gamificação & Ranking"
        description="Configure pesos do ranking, monitore médicos e recalcule posições."
        actions={
          <Button onClick={recalcular} disabled={recalculando} variant="outline">
            {recalculando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recalcular ranking
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Config pesos */}
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Pesos do Ranking</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "peso_avaliacao" as const, label: "Avaliação média", desc: "Peso das estrelas" },
              { key: "peso_atendimentos" as const, label: "Atendimentos", desc: "Volume log(n+1)" },
              { key: "peso_conversao" as const, label: "Conversão", desc: "Concluídas / agendadas" },
              { key: "peso_no_show" as const, label: "No-show", desc: "Penalidade por faltas" },
              { key: "peso_recencia" as const, label: "Recência", desc: "Atividade recente" },
              { key: "peso_premium" as const, label: "Premium", desc: "Bônus premium (fase 3)" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config?.[key] ?? 0}
                  onChange={(e) => updatePeso(key, e.target.value)}
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Soma:</span>
              <Badge className={somaOk ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                {soma.toFixed(2)}
              </Badge>
              {!somaOk && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Deve ser 1.00
                </span>
              )}
            </div>
            <Button onClick={salvar} disabled={saving || !somaOk} size="sm">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Config geral */}
        <div className="card-elevated p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Configurações</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Mínimo de avaliações para exibir</Label>
              <Input
                type="number"
                min="1"
                value={config?.min_avaliacoes_exibir ?? 5}
                onChange={(e) => config && setConfig({ ...config, min_avaliacoes_exibir: parseInt(e.target.value) || 5 })}
              />
              <p className="text-[10px] text-muted-foreground">
                Até atingir esse número, o médico aparece como "Novo na plataforma"
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Dias para considerar ativo</Label>
              <Input
                type="number"
                min="1"
                value={config?.recencia_dias_ativo ?? 30}
                onChange={(e) => config && setConfig({ ...config, recencia_dias_ativo: parseInt(e.target.value) || 30 })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Dias para penalidade de inatividade</Label>
              <Input
                type="number"
                min="1"
                value={config?.recencia_dias_penalidade ?? 70}
                onChange={(e) => config && setConfig({ ...config, recencia_dias_penalidade: parseInt(e.target.value) || 70 })}
              />
              <p className="text-[10px] text-muted-foreground">
                Após esse período sem atividade, fator de recência cai para 0.5
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top ranking */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold">Top Médicos</h3>
          </div>
          <Badge variant="secondary">{top.length} médicos</Badge>
        </div>

        {top.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhum médico no ranking ainda. Clique em "Recalcular ranking" para popular.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">#</th>
                  <th className="pb-2 pr-3">Médico</th>
                  <th className="pb-2 pr-3 text-center">
                    <Star className="h-3 w-3 inline" /> Nota
                  </th>
                  <th className="pb-2 pr-3 text-center">Avaliações</th>
                  <th className="pb-2 pr-3 text-center">Atend.</th>
                  <th className="pb-2 pr-3 text-center">Conversão</th>
                  <th className="pb-2 pr-3 text-center">No-show</th>
                  <th className="pb-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {top.map((r) => (
                  <tr key={r.medico_id} className="hover:bg-muted/30">
                    <td className="py-2.5 pr-3 font-semibold text-primary">
                      {r.posicao ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-medium truncate max-w-[200px]">
                      {r.nome}
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        {r.avaliacao_media.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-center">{r.total_avaliacoes}</td>
                    <td className="py-2.5 pr-3 text-center">{r.total_atendimentos}</td>
                    <td className="py-2.5 pr-3 text-center">{pct(r.taxa_conversao)}</td>
                    <td className="py-2.5 pr-3 text-center">{pct(r.taxa_no_show)}</td>
                    <td className="py-2.5 text-right font-mono font-semibold">
                      {r.ranking_score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
