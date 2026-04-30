import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from "lucide-react";
import {
  carregarSaudeFinanceira,
  brl,
  corClassificacao,
  labelClassificacao,
  gerarSugestoes,
  type SaudeFinanceira,
} from "@/lib/planos/saude";

interface Props {
  planoId: string;
}

export function SaudeFinanceiraCard({ planoId }: Props) {
  const [data, setData] = useState<SaudeFinanceira | null>(null);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setLoading(true);
    setData(await carregarSaudeFinanceira(planoId));
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoId]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saúde financeira do plano</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {loading ? "Calculando..." : "Sem dados disponíveis."}
        </CardContent>
      </Card>
    );
  }

  const positivo = data.lucro_centavos >= 0;
  const sugestoes = gerarSugestoes(data);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Saúde financeira do plano</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Custo {data.origem_custo === "real" ? "calculado a partir de consultas reais" : "estimado pela composição do plano"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={corClassificacao[data.classificacao]}>
            {labelClassificacao[data.classificacao]}
          </Badge>
          <Button variant="ghost" size="icon" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Receita total" value={brl(data.receita_total_centavos)} />
          <Metric label="Receita / assinante" value={brl(data.receita_por_assinante_centavos)} />
          <Metric label="Custo total" value={brl(data.custo_total_centavos)} />
          <Metric label="Custo / assinante" value={brl(data.custo_por_assinante_centavos)} />
          <Metric
            label="Lucro / prejuízo"
            value={brl(data.lucro_centavos)}
            icon={positivo ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            tone={positivo ? "positive" : "negative"}
          />
          <Metric label="Margem" value={`${data.margem_pct.toFixed(1)}%`} tone={positivo ? "positive" : "negative"} />
          <Metric label="Assinantes" value={String(data.qtd_assinantes)} />
          <Metric label="Custo real (consultas)" value={brl(data.custo_real_centavos)} />
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4" /> Sugestões automáticas
          </div>
          <ul className="space-y-1.5 text-sm">
            {sugestoes.map((s, i) => (
              <li key={i} className="flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-semibold mt-1 flex items-center gap-1 ${
          tone === "positive" ? "text-emerald-600 dark:text-emerald-400" : tone === "negative" ? "text-red-600 dark:text-red-400" : ""
        }`}
      >
        {icon}
        {value}
      </div>
    </div>
  );
}
