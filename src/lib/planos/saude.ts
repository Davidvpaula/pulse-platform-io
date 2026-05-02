import { supabase } from "@/integrations/supabase/client";

export type Classificacao = "saudavel" | "atencao" | "risco_alto" | "prejuizo" | "sem_dados";

export interface SaudeFinanceira {
  plano_id: string;
  qtd_assinantes: number;
  receita_total_centavos: number;
  receita_por_assinante_centavos: number;
  custo_total_centavos: number;
  custo_por_assinante_centavos: number;
  custo_real_centavos: number;
  custo_estimado_centavos: number;
  origem_custo: "real" | "estimado";
  lucro_centavos: number;
  margem_pct: number;
  classificacao: Classificacao;
}

export async function carregarSaudeFinanceira(planoId: string): Promise<SaudeFinanceira | null> {
  const { data, error } = await supabase.rpc("plano_saude_financeira", { _plano_id: planoId });
  if (error) {
    console.error("plano_saude_financeira", error);
    return null;
  }
  return data as unknown as SaudeFinanceira;
}

export const corClassificacao: Record<Classificacao, string> = {
  saudavel: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  atencao: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-300",
  risco_alto: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300",
  prejuizo: "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300",
  sem_dados: "bg-muted text-muted-foreground border-border",
};

export const labelClassificacao: Record<Classificacao, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  risco_alto: "Risco alto",
  prejuizo: "Prejuízo",
  sem_dados: "Sem dados",
};

export function gerarSugestoes(s: SaudeFinanceira): string[] {
  const sugestoes: string[] = [];
  const lucroPorAss = s.lucro_centavos / Math.max(s.qtd_assinantes, 1) / 100;

  if (s.classificacao === "prejuizo") {
    sugestoes.push(
      `Plano com prejuízo médio de R$ ${Math.abs(lucroPorAss).toFixed(2)} por assinante. Sugerimos aumentar a mensalidade em ~20%.`,
    );
    sugestoes.push("Reduzir 1 consulta inclusa por período ou limitar a especialidade de maior custo.");
    sugestoes.push("Cobrar valor adicional após o limite de uso e revisar a composição dos benefícios.");
  } else if (s.classificacao === "risco_alto") {
    sugestoes.push("Margem muito apertada — revisar custo do principal benefício ou aumentar a mensalidade em 5–10%.");
    sugestoes.push("Considerar mover algum benefício para 'cobrança adicional após limite'.");
  } else if (s.classificacao === "atencao") {
    sugestoes.push("Plano operando com margem moderada — monitorar evolução do custo médio.");
    sugestoes.push("Avaliar criar variação 'plus' com benefícios extras pagos.");
  } else if (s.classificacao === "saudavel") {
    sugestoes.push("Plano saudável — destacar no site e em campanhas comerciais.");
    sugestoes.push("Considerar criar uma variação premium para capturar mais receita.");
    sugestoes.push("Manter o preço atual no próximo ciclo de revisão.");
  } else {
    sugestoes.push("Sem dados suficientes — aguardar primeiras assinaturas para análise.");
  }
  return sugestoes;
}

export { brl } from "@/lib/format";
