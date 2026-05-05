import { supabase } from "@/integrations/supabase/client";
import type { ReembolsoAcao, ReembolsoSituacao } from "./reembolsoConfig";

export interface EstimativaReembolso {
  situacao: ReembolsoSituacao;
  tipo: ReembolsoAcao;
  percentual: number;
  valor_reembolso_centavos: number;
  valor_consulta_centavos: number;
  horas_restantes: number;
  descricao: string | null;
}

/**
 * Calcula a estimativa de reembolso para um cancelamento de consulta.
 * Busca primeiro regra do médico, depois regra global.
 */
export async function estimarReembolso(
  consultaId: string,
): Promise<EstimativaReembolso | null> {
  const { data: consulta } = await supabase
    .from("consultas")
    .select("id, medico_id, valor_centavos, valor_snapshot_centavos, inicio")
    .eq("id", consultaId)
    .maybeSingle();
  if (!consulta) return null;

  const valorCentavos = consulta.valor_snapshot_centavos ?? consulta.valor_centavos ?? 0;
  const inicio = new Date(consulta.inicio);
  const agora = new Date();
  const horasRestantes = Math.max(0, (inicio.getTime() - agora.getTime()) / (1000 * 60 * 60));

  // Determinar situação baseado na antecedência
  const situacao: ReembolsoSituacao = horasRestantes >= 24
    ? "cancelamento_antecipado"
    : "cancelamento_tardio";

  // Buscar regra do médico primeiro
  const { data: regraMedico } = await supabase
    .from("politica_reembolso")
    .select("*")
    .eq("escopo", "medico")
    .eq("medico_id", consulta.medico_id)
    .eq("situacao", situacao)
    .eq("ativo", true)
    .maybeSingle();

  // Fallback para global
  const regra = regraMedico ?? (await supabase
    .from("politica_reembolso")
    .select("*")
    .eq("escopo", "global")
    .eq("situacao", situacao)
    .eq("ativo", true)
    .maybeSingle()).data;

  if (!regra) {
    return {
      situacao,
      tipo: "zero",
      percentual: 0,
      valor_reembolso_centavos: 0,
      valor_consulta_centavos: valorCentavos,
      horas_restantes: Math.round(horasRestantes * 10) / 10,
      descricao: null,
    };
  }

  const atendeAntecedencia = horasRestantes >= (regra.horas_antecedencia_min ?? 0);

  let tipo: ReembolsoAcao = "zero";
  let percentual = 0;

  if (atendeAntecedencia) {
    tipo = regra.tipo_reembolso as ReembolsoAcao;
    percentual = tipo === "total" ? 100 : tipo === "parcial" ? Number(regra.percentual) : 0;
  }

  const valorReembolso = Math.round(valorCentavos * percentual / 100);

  return {
    situacao,
    tipo,
    percentual,
    valor_reembolso_centavos: valorReembolso,
    valor_consulta_centavos: valorCentavos,
    horas_restantes: Math.round(horasRestantes * 10) / 10,
    descricao: regra.descricao,
  };
}
