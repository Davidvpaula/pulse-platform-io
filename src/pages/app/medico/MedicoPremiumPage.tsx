import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import {
  Crown, Rocket, TrendingUp, BarChart3, Megaphone, Shield, Check, Loader2,
  Zap, Star, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { getMedicoAtual } from "@/lib/clinico";
import {
  getMedicoPremium, getAssinaturaPremium, getRankingMedico, getRankingConfig,
  type MedicoPremium, type PremiumAssinatura, type MedicoRanking, type RankingConfig,
} from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

const PLANOS = [
  {
    id: "basico",
    nome: "Básico",
    valor: 14900,
    destaque: false,
    beneficios: [
      "Selo Premium no perfil",
      "1 campanha CPC interna ativa",
      "Relatórios básicos de performance",
      "Destaque sutil nos resultados de busca",
    ],
  },
  {
    id: "profissional",
    nome: "Profissional",
    valor: 34900,
    destaque: true,
    beneficios: [
      "Tudo do Básico",
      "Até 3 campanhas CPC simultâneas",
      "Relatórios avançados com IA",
      "Destaque prioritário na busca",
      "Recomendações estratégicas semanais",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    valor: 69900,
    destaque: false,
    beneficios: [
      "Tudo do Profissional",
      "Campanhas ilimitadas",
      "Integração futura com Google Ads",
      "Consultor IA personalizado",
      "Suporte prioritário",
      "Relatórios de ROI detalhados",
    ],
  },
];

export default function MedicoPremiumPage() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState<MedicoPremium | null>(null);
  const [assinatura, setAssinatura] = useState<PremiumAssinatura | null>(null);
  const [ranking, setRanking] = useState<MedicoRanking | null>(null);
  const [config, setConfig] = useState<RankingConfig | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoading(true);
      const medico = await getMedicoAtual();
      if (!medico) { setLoading(false); return; }
      const [p, a, r, c] = await Promise.all([
        getMedicoPremium(medico.id),
        getAssinaturaPremium(medico.id),
        getRankingMedico(medico.id),
        getRankingConfig(),
      ]);
      setPremium(p);
      setAssinatura(a);
      setRanking(r);
      setConfig(c);
      setLoading(false);
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
      </div>
    );
  }

  const isPremium = premium?.ativo ?? false;
  const planoAtual = assinatura?.plano;

  // Simulador de alcance estimado
  const estimarAlcance = (plano: string) => {
    const base = ranking?.total_atendimentos ?? 10;
    const multiplier = plano === "basico" ? 1.5 : plano === "profissional" ? 3 : 5;
    return Math.round(base * multiplier);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Premium"
        description="Impulsione seu crescimento profissional com campanhas patrocinadas e ferramentas avançadas."
        actions={
          isPremium ? (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white px-3 py-1.5">
              <Crown className="mr-1.5 h-4 w-4" /> {planoAtual ? `Plano ${planoAtual.charAt(0).toUpperCase() + planoAtual.slice(1)}` : "Premium Ativo"}
            </Badge>
          ) : null
        }
      />

      {/* Value proposition */}
      <div className="card-elevated p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-400/20 p-3">
            <Rocket className="h-8 w-8 text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold">Cresça além do orgânico</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              O Premium não compra posição no ranking interno — seu mérito orgânico permanece intacto.
              O investimento é direcionado exclusivamente para campanhas externas, impulsionamento de perfil
              na busca pública e ferramentas avançadas de análise.
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-success" />
                <span>Ranking orgânico preservado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Megaphone className="h-4 w-4 text-primary" />
                <span>Campanhas externas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Relatórios avançados</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Recomendações IA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLANOS.map((plano) => {
          const isAtual = planoAtual === plano.id;
          return (
            <div
              key={plano.id}
              className={cn(
                "card-elevated p-6 flex flex-col relative",
                plano.destaque && "ring-2 ring-primary",
                isAtual && "ring-2 ring-amber-500",
              )}
            >
              {plano.destaque && !isAtual && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                  Mais popular
                </Badge>
              )}
              {isAtual && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs">
                  Plano atual
                </Badge>
              )}
              <div className="mb-4">
                <h3 className="font-display text-lg font-bold">{plano.nome}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">{brl(plano.valor)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 mb-6">
                {plano.beneficios.map((b) => (
                  <div key={b} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              {/* Simulador de alcance */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 mb-4">
                <p className="text-xs text-muted-foreground">Alcance estimado mensal</p>
                <p className="text-lg font-bold text-primary">~{estimarAlcance(plano.id)} visualizações</p>
                <p className="text-[10px] text-muted-foreground">Baseado nos seus {ranking?.total_atendimentos ?? 0} atendimentos</p>
              </div>

              <Button
                className={cn(
                  "w-full",
                  plano.destaque ? "bg-gradient-primary text-white hover:opacity-90" : "",
                )}
                variant={plano.destaque ? "default" : "outline"}
                disabled={isAtual}
                onClick={() => {
                  toast.info("Checkout Premium será integrado com Stripe em breve. Estrutura preparada!");
                }}
              >
                {isAtual ? "Plano atual" : (
                  <>
                    {isPremium ? "Mudar plano" : "Assinar"} <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-bold mb-4">Como funciona</h3>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: Crown, title: "Assine", desc: "Escolha o plano que cabe no seu orçamento" },
            { icon: Megaphone, title: "Crie campanhas", desc: "Configure suas campanhas de impulsionamento" },
            { icon: TrendingUp, title: "Acompanhe", desc: "Monitore métricas em tempo real" },
            { icon: Star, title: "Cresça", desc: "Atraia novos pacientes e aumente sua visibilidade" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="card-elevated p-6">
        <h3 className="font-display text-lg font-bold mb-4">Perguntas frequentes</h3>
        <div className="space-y-4">
          {[
            { q: "O Premium muda minha posição no ranking?", a: "Não. O ranking orgânico é baseado exclusivamente no seu desempenho real. O Premium apenas impulsiona sua visibilidade externa." },
            { q: "Posso cancelar a qualquer momento?", a: "Sim. O cancelamento mantém seu acesso até o fim do ciclo pago. Campanhas ativas serão pausadas automaticamente." },
            { q: "O que acontece se eu ficar inadimplente?", a: "Após 3 tentativas de cobrança, suas campanhas serão pausadas e o selo Premium será removido temporariamente." },
            { q: "Posso fazer upgrade ou downgrade?", a: "Sim. O upgrade é imediato com cálculo pro-rata. O downgrade entra em vigor no próximo ciclo." },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="font-medium text-sm">{q}</p>
              <p className="text-sm text-muted-foreground mt-1">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
