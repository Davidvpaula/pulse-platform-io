import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Settings, Trophy, RefreshCw, Loader2, Users, Star, Save, AlertTriangle,
  Crown, Megaphone, DollarSign, Target, Zap,
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  getRankingConfig, salvarRankingConfig, recalcularRankingTodos, listarRankingTop,
  listarTodasCampanhas, togglePremiumAdmin, getConversoesPorCampanha,
  type RankingConfig, type MedicoRanking, type ImpulsionamentoCampanha,
} from "@/lib/gamificacao";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function pct(v: number) { return `${(v * 100).toFixed(1)}%`; }
function brl(c: number) { return `R$ ${(c / 100).toFixed(2)}`; }

export default function AdminGamificacao() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [config, setConfig] = useState<RankingConfig | null>(null);
  const [top, setTop] = useState<(MedicoRanking & { nome?: string; premium_ativo?: boolean })[]>([]);
  const [campanhas, setCampanhas] = useState<(ImpulsionamentoCampanha & { nome?: string; conversoes?: number })[]>([]);
  const [togglingPremium, setTogglingPremium] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    const [cfg, ranking, camps, convMap] = await Promise.all([
      getRankingConfig(),
      listarRankingTop(15),
      listarTodasCampanhas(20),
      getConversoesPorCampanha(),
    ]);
    setConfig(cfg);

    const allMedicoIds = [
      ...new Set([...ranking.map((r) => r.medico_id), ...camps.map((c) => c.medico_id)]),
    ];
    let nomeMap = new Map<string, string>();
    let premiumMap = new Map<string, boolean>();

    if (allMedicoIds.length) {
      const { data: medicos } = await supabase
        .from("medicos")
        .select("id, nome")
        .in("id", allMedicoIds);
      nomeMap = new Map((medicos ?? []).map((m) => [m.id, m.nome]));

      const { data: premiums } = await supabase
        .from("medico_premium" as any)
        .select("medico_id, ativo")
        .in("medico_id", allMedicoIds);
      premiumMap = new Map(((premiums ?? []) as any[]).map((p) => [p.medico_id, p.ativo]));
    }

    setTop(ranking.map((r) => ({ ...r, nome: nomeMap.get(r.medico_id) ?? "—", premium_ativo: premiumMap.get(r.medico_id) ?? false })));
    setCampanhas(camps.map((c) => ({ ...c, nome: nomeMap.get(c.medico_id) ?? "—", conversoes: convMap[c.id] ?? 0 })));
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

  const handleTogglePremium = async (medicoId: string, ativo: boolean) => {
    setTogglingPremium(medicoId);
    try {
      await togglePremiumAdmin(medicoId, ativo, "conquistado");
      setTop((prev) => prev.map((r) => r.medico_id === medicoId ? { ...r, premium_ativo: ativo } : r));
      toast.success(ativo ? "Premium ativado" : "Premium desativado");
    } catch {
      toast.error("Erro ao alterar premium");
    } finally {
      setTogglingPremium(null);
    }
  };

  const updateConfig = (key: keyof RankingConfig, val: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: parseFloat(val) || 0 });
  };
  const updateConfigInt = (key: keyof RankingConfig, val: string) => {
    if (!config) return;
    setConfig({ ...config, [key]: parseInt(val) || 0 });
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

  // ROI metrics
  const totalGasto = campanhas.reduce((s, c) => s + c.gasto_centavos, 0);
  const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
  const totalConversoes = campanhas.reduce((s, c) => s + (c.conversoes ?? 0), 0);
  const cpcMedio = totalCliques > 0 ? totalGasto / totalCliques : 0;
  const taxaConversao = totalCliques > 0 ? totalConversoes / totalCliques : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/app/admin/dashboard">Admin</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Gamificação</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configuração &amp; Ranking</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        title="Gamificação & Ranking"
        description="Configure pesos, regras premium, CPC, saldo e monitore campanhas."
        actions={
          <Button onClick={recalcular} disabled={recalculando} variant="outline">
            {recalculando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recalcular ranking
          </Button>
        }
      />

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking"><Trophy className="mr-1.5 h-4 w-4" /> Ranking</TabsTrigger>
          <TabsTrigger value="premium"><Crown className="mr-1.5 h-4 w-4" /> Premium</TabsTrigger>
          <TabsTrigger value="cpc"><Megaphone className="mr-1.5 h-4 w-4" /> CPC & Campanhas</TabsTrigger>
          <TabsTrigger value="saldo"><Zap className="mr-1.5 h-4 w-4" /> Saldo</TabsTrigger>
        </TabsList>

        {/* ── Tab Ranking ── */}
        <TabsContent value="ranking" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pesos */}
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
                  { key: "peso_premium" as const, label: "Premium", desc: "Bônus para premium ativos" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" step="0.05" min="0" max="1" value={config?.[key] ?? 0} onChange={(e) => updateConfig(key, e.target.value)} className="font-mono" />
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Soma:</span>
                  <Badge className={somaOk ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>{soma.toFixed(2)}</Badge>
                  {!somaOk && <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Deve ser 1.00</span>}
                </div>
                <Button onClick={salvar} disabled={saving || !somaOk} size="sm">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
                </Button>
              </div>
            </div>

            {/* Config geral */}
            <div className="card-elevated p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Parâmetros Gerais</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Mínimo de avaliações para exibir</Label>
                  <Input type="number" min="1" value={config?.min_avaliacoes_exibir ?? 5} onChange={(e) => updateConfigInt("min_avaliacoes_exibir", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dias para considerar ativo</Label>
                  <Input type="number" min="1" value={config?.recencia_dias_ativo ?? 30} onChange={(e) => updateConfigInt("recencia_dias_ativo", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dias para penalidade de inatividade</Label>
                  <Input type="number" min="1" value={config?.recencia_dias_penalidade ?? 70} onChange={(e) => updateConfigInt("recencia_dias_penalidade", e.target.value)} />
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
                Nenhum médico no ranking. Clique em "Recalcular ranking" para popular.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3">#</th>
                      <th className="pb-2 pr-3">Médico</th>
                      <th className="pb-2 pr-3 text-center"><Star className="h-3 w-3 inline" /> Nota</th>
                      <th className="pb-2 pr-3 text-center">Aval.</th>
                      <th className="pb-2 pr-3 text-center">Atend.</th>
                      <th className="pb-2 pr-3 text-center">Conv.</th>
                      <th className="pb-2 pr-3 text-center">No-show</th>
                      <th className="pb-2 pr-3 text-center"><Crown className="h-3 w-3 inline text-amber-500" /></th>
                      <th className="pb-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {top.map((r) => (
                      <tr key={r.medico_id} className="hover:bg-muted/30">
                        <td className="py-2.5 pr-3 font-semibold text-primary">{r.posicao ?? "—"}</td>
                        <td className="py-2.5 pr-3 font-medium truncate max-w-[200px]">{r.nome}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{r.avaliacao_media.toFixed(1)}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-center">{r.total_avaliacoes}</td>
                        <td className="py-2.5 pr-3 text-center">{r.total_atendimentos}</td>
                        <td className="py-2.5 pr-3 text-center">{pct(r.taxa_conversao)}</td>
                        <td className="py-2.5 pr-3 text-center">{pct(r.taxa_no_show)}</td>
                        <td className="py-2.5 pr-3 text-center">
                          <Switch
                            checked={r.premium_ativo ?? false}
                            disabled={togglingPremium === r.medico_id}
                            onCheckedChange={(v) => handleTogglePremium(r.medico_id, v)}
                          />
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold">{r.ranking_score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Premium ── */}
        <TabsContent value="premium" className="space-y-6">
          <div className="card-elevated p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <h3 className="font-display text-lg font-semibold">Regras Premium Conquistado</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Médicos que atingem TODOS os critérios abaixo recebem Premium automaticamente ao recalcular o ranking.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Mínimo de atendimentos concluídos</Label>
                <Input type="number" min="1" value={config?.premium_min_atendimentos ?? 50} onChange={(e) => updateConfigInt("premium_min_atendimentos", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nota média mínima (1-5)</Label>
                <Input type="number" min="1" max="5" step="0.1" value={config?.premium_min_avaliacao ?? 4.0} onChange={(e) => updateConfig("premium_min_avaliacao", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Taxa máxima de no-show (0-1)</Label>
                <Input type="number" min="0" max="1" step="0.01" value={config?.premium_max_no_show ?? 0.1} onChange={(e) => updateConfig("premium_max_no_show", e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Ex: 0.10 = máximo 10% de no-show</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Meses mínimos de atividade</Label>
                <Input type="number" min="1" value={config?.premium_min_meses_ativo ?? 3} onChange={(e) => updateConfigInt("premium_min_meses_ativo", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bônus de ranking (multiplicador)</Label>
                <Input type="number" min="1" max="3" step="0.1" value={config?.premium_bonus_ranking ?? 1.2} onChange={(e) => updateConfig("premium_bonus_ranking", e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Aplicado ao fator_premium no score. Ex: 1.2 = 20% de bônus</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={salvar} disabled={saving} size="sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar regras
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab CPC & Campanhas ── */}
        <TabsContent value="cpc" className="space-y-6">
          {/* ROI KPIs */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card-elevated p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{brl(totalGasto)}</p>
              <p className="text-xs text-muted-foreground">Receita CPC total</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{totalCliques}</p>
              <p className="text-xs text-muted-foreground">Cliques totais</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Megaphone className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{totalConversoes}</p>
              <p className="text-xs text-muted-foreground">Conversões</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{pct(taxaConversao)}</p>
              <p className="text-xs text-muted-foreground">Taxa conversão (clique→consulta)</p>
            </div>
          </div>

          {/* CPC Config */}
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Configuração CPC</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 max-w-md">
              <div className="space-y-1">
                <Label className="text-xs">CPC padrão (centavos)</Label>
                <Input type="number" min="10" value={config?.cpc_padrao_centavos ?? 50} onChange={(e) => updateConfigInt("cpc_padrao_centavos", e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Valor padrão: {brl(config?.cpc_padrao_centavos ?? 50)} por clique</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-border pt-4 mt-4">
              <Button onClick={salvar} disabled={saving} size="sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>

          {/* Campanhas com ROI */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-semibold">Campanhas</h3>
              </div>
              <Badge variant="secondary">{campanhas.length} total</Badge>
            </div>
            {campanhas.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma campanha criada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3">Médico</th>
                      <th className="pb-2 pr-3">Campanha</th>
                      <th className="pb-2 pr-3 text-center">Status</th>
                      <th className="pb-2 pr-3 text-right">Orçamento</th>
                      <th className="pb-2 pr-3 text-right">Gasto</th>
                      <th className="pb-2 pr-3 text-center">Cliques</th>
                      <th className="pb-2 pr-3 text-center">Conv.</th>
                      <th className="pb-2 pr-3 text-right">CPC</th>
                      <th className="pb-2 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {campanhas.map((c) => {
                      const roi = c.cliques > 0 ? ((c.conversoes ?? 0) / c.cliques * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={c.id} className="hover:bg-muted/30">
                          <td className="py-2.5 pr-3 font-medium truncate max-w-[150px]">{c.nome}</td>
                          <td className="py-2.5 pr-3 truncate max-w-[150px]">{c.titulo}</td>
                          <td className="py-2.5 pr-3 text-center">
                            <Badge className={cn("text-[10px]",
                              c.status === "ativa" ? "bg-success/15 text-success" :
                              c.status === "pausada" ? "bg-warning/15 text-warning" :
                              c.status === "encerrada" ? "bg-muted text-muted-foreground" :
                              "bg-destructive/15 text-destructive"
                            )}>{c.status}</Badge>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono">{brl(c.orcamento_centavos)}</td>
                          <td className="py-2.5 pr-3 text-right font-mono">{brl(c.gasto_centavos)}</td>
                          <td className="py-2.5 pr-3 text-center">{c.cliques}</td>
                          <td className="py-2.5 pr-3 text-center">{c.conversoes ?? 0}</td>
                          <td className="py-2.5 pr-3 text-right font-mono">{brl(c.cpc_centavos)}</td>
                          <td className="py-2.5 text-right font-mono">{roi}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Saldo ── */}
        <TabsContent value="saldo" className="space-y-6">
          <div className="card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Configuração de Saldo</h3>
            </div>
            <div className="max-w-md space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Pontos por consulta concluída</Label>
                <Input type="number" min="0" step="1" value={config?.saldo_por_consulta ?? 10} onChange={(e) => updateConfig("saldo_por_consulta", e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Creditado automaticamente ao médico quando a consulta muda para "concluída"</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-border pt-4 mt-4">
              <Button onClick={salvar} disabled={saving} size="sm">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
