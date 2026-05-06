import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import {
  BarChart3, TrendingUp, DollarSign, Users, Eye, MousePointerClick,
  ArrowUpRight, Crown, Loader2, Target, Percent,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import {
  getMedicoPremium, getAssinaturaPremium, getRankingMedico,
  listarCampanhasMedico, getConversoesPorCampanha, getSaldoAtual,
  getSaldoCreditos, listarMetricasDiarias,
  type MedicoPremium, type PremiumAssinatura, type MedicoRanking,
  type ImpulsionamentoCampanha, type CampanhaMetricaDiaria,
} from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

export default function MedicoROIPage() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState<MedicoPremium | null>(null);
  const [assinatura, setAssinatura] = useState<PremiumAssinatura | null>(null);
  const [ranking, setRanking] = useState<MedicoRanking | null>(null);
  const [campanhas, setCampanhas] = useState<ImpulsionamentoCampanha[]>([]);
  const [conversoes, setConversoes] = useState<Record<string, number>>({});
  const [saldo, setSaldo] = useState(0);
  const [creditos, setCreditos] = useState(0);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const medico = await getMedicoAtual();
      if (!medico) { setLoading(false); return; }
      const [p, a, r, camps, conv, s, cr] = await Promise.all([
        getMedicoPremium(medico.id),
        getAssinaturaPremium(medico.id),
        getRankingMedico(medico.id),
        listarCampanhasMedico(medico.id),
        getConversoesPorCampanha(),
        getSaldoAtual(medico.id),
        getSaldoCreditos(medico.id),
      ]);
      setPremium(p);
      setAssinatura(a);
      setRanking(r);
      setCampanhas(camps);
      setConversoes(conv);
      setSaldo(s);
      setCreditos(cr);
      setLoading(false);
    })();
  }, [session]);

  if (loading) {
    return <div className="flex items-center justify-center p-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>;
  }

  const isPremium = premium?.ativo ?? false;

  if (!isPremium) {
    return (
      <div className="space-y-6">
        <PageHeader title="ROI Premium" description="Retorno sobre investimento" />
        <div className="card-elevated p-10 text-center space-y-4">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="font-display text-xl font-bold">Recurso Premium</h2>
          <p className="text-muted-foreground">Assine o Premium para acessar relatórios detalhados de ROI.</p>
          <Button onClick={() => window.location.href = "/app/medico/premium"}>Ver planos Premium</Button>
        </div>
      </div>
    );
  }

  // Calculations
  const planoNome = assinatura?.plano ?? "basico";
  const valorMensal = assinatura?.valor_centavos ?? 14900;
  const totalCliques = campanhas.reduce((s, c) => s + c.cliques, 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + c.impressoes, 0);
  const totalGasto = campanhas.reduce((s, c) => s + c.gasto_centavos, 0);
  const totalConversoes = Object.values(conversoes).reduce((s, v) => s + v, 0);
  const ctr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const taxaConversao = totalCliques > 0 ? (totalConversoes / totalCliques) * 100 : 0;
  const custoTotal = valorMensal + totalGasto; // assinatura + campanhas
  const receitaEstimada = totalConversoes * (ranking?.total_atendimentos ? Math.round((ranking.total_agendamentos / Math.max(ranking.total_atendimentos, 1)) * 15000) : 15000);
  const roi = custoTotal > 0 ? ((receitaEstimada - custoTotal) / custoTotal) * 100 : 0;
  const cpa = totalConversoes > 0 ? Math.round(totalGasto / totalConversoes) : 0;

  const kpis = [
    { icon: DollarSign, label: "Investimento total", value: brl(custoTotal), sub: `Assinatura: ${brl(valorMensal)} + Campanhas: ${brl(totalGasto)}` },
    { icon: TrendingUp, label: "ROI estimado", value: `${roi.toFixed(0)}%`, sub: `Receita est.: ${brl(receitaEstimada)}`, highlight: roi > 0 },
    { icon: Users, label: "Conversões", value: totalConversoes.toString(), sub: `CPA: ${brl(cpa)}` },
    { icon: Eye, label: "Impressões", value: totalImpressoes.toLocaleString(), sub: `CTR: ${ctr.toFixed(1)}%` },
    { icon: MousePointerClick, label: "Cliques", value: totalCliques.toLocaleString(), sub: `Taxa conv.: ${taxaConversao.toFixed(1)}%` },
    { icon: Target, label: "Campanhas", value: campanhas.length.toString(), sub: `${campanhas.filter(c => c.status === "ativa").length} ativas` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ROI Premium"
        description="Análise do retorno sobre investimento das suas campanhas e assinatura Premium"
        actions={
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white px-3 py-1.5">
            <Crown className="mr-1.5 h-4 w-4" /> Plano {planoNome.charAt(0).toUpperCase() + planoNome.slice(1)}
          </Badge>
        }
      />

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ icon: Icon, label, value, sub, highlight }) => (
          <div key={label} className={cn("card-elevated p-4", highlight && "ring-1 ring-success/50")}>
            <Icon className={cn("h-5 w-5 mb-2", highlight ? "text-success" : "text-primary")} />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold", highlight && "text-success")}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Investment breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-bold mb-4">Decomposição do investimento</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Assinatura Premium ({planoNome})</span>
              <span className="font-semibold">{brl(valorMensal)}/mês</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Campanhas CPC</span>
              <span className="font-semibold">{brl(totalGasto)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold">Total investido</span>
              <span className="text-lg font-bold text-primary">{brl(custoTotal)}</span>
            </div>
          </div>
        </div>

        <div className="card-elevated p-6">
          <h3 className="font-display text-lg font-bold mb-4">Saldo e créditos</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Saldo de crescimento</span>
              <span className="font-semibold">{saldo} pontos</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Créditos CPC disponíveis</span>
              <span className="font-semibold">{brl(creditos)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Atendimentos totais</span>
              <span className="font-semibold">{ranking?.total_atendimentos ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Avaliação média</span>
              <span className="font-semibold">{ranking?.avaliacao_media?.toFixed(1) ?? "—"} ★</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign performance table */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-bold mb-4">Performance por campanha</h3>
        {campanhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma campanha para exibir.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs">
                  <th className="text-left py-2 pr-3">Campanha</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Imp</th>
                  <th className="text-right py-2 px-2">Cliques</th>
                  <th className="text-right py-2 px-2">Conv</th>
                  <th className="text-right py-2 px-2">Gasto</th>
                  <th className="text-right py-2 px-2">Orçamento</th>
                  <th className="text-right py-2 px-2">CPC</th>
                  <th className="text-right py-2 pl-2">ROI est.</th>
                </tr>
              </thead>
              <tbody>
                {campanhas.map(c => {
                  const conv = conversoes[c.id] || 0;
                  const estReceita = conv * 15000;
                  const campRoi = c.gasto_centavos > 0 ? ((estReceita - c.gasto_centavos) / c.gasto_centavos * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium">{c.titulo}</td>
                      <td className="text-center px-2">
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </td>
                      <td className="text-right px-2">{c.impressoes}</td>
                      <td className="text-right px-2">{c.cliques}</td>
                      <td className="text-right px-2">{conv}</td>
                      <td className="text-right px-2">{brl(c.gasto_centavos)}</td>
                      <td className="text-right px-2">{brl(c.orcamento_centavos)}</td>
                      <td className="text-right px-2">{brl(c.cpc_centavos)}</td>
                      <td className={cn("text-right pl-2 font-semibold", campRoi > 0 ? "text-success" : "text-destructive")}>
                        {campRoi.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-bold mb-4">Insights</h3>
        <div className="space-y-3 text-sm">
          {roi > 100 && (
            <div className="flex items-start gap-2 text-success">
              <ArrowUpRight className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Excelente ROI! Seu investimento Premium está gerando retorno significativo.</span>
            </div>
          )}
          {roi > 0 && roi <= 100 && (
            <div className="flex items-start gap-2 text-primary">
              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
              <span>ROI positivo. Considere aumentar o orçamento das campanhas com melhor performance.</span>
            </div>
          )}
          {roi <= 0 && totalConversoes > 0 && (
            <div className="flex items-start gap-2 text-warning">
              <Percent className="h-4 w-4 mt-0.5 shrink-0" />
              <span>ROI negativo. Revise suas campanhas — pause as de baixa conversão e redistribua o orçamento.</span>
            </div>
          )}
          {totalConversoes === 0 && campanhas.length > 0 && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Nenhuma conversão registrada ainda. As campanhas precisam de tempo para gerar resultados.</span>
            </div>
          )}
          {campanhas.length === 0 && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Crie sua primeira campanha para começar a acompanhar o ROI.</span>
            </div>
          )}
          {taxaConversao > 5 && (
            <div className="flex items-start gap-2 text-success">
              <ArrowUpRight className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Taxa de conversão acima da média ({taxaConversao.toFixed(1)}%). Seu perfil está convertendo bem!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
