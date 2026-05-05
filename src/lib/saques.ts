/**
 * Lógica de saques médicos — cálculo de saldo, elegibilidade e configurações.
 */
import { supabase } from "@/integrations/supabase/client";

export type SaqueConfig = {
  frequencia: string;
  dias_fechamento: number[];
  prazo_liberacao_dias: number;
  valor_minimo_centavos: number;
  exigir_nfe: boolean;
  permitir_parcial: boolean;
};

const DEFAULTS: SaqueConfig = {
  frequencia: "quinzenal",
  dias_fechamento: [1, 15],
  prazo_liberacao_dias: 7,
  valor_minimo_centavos: 5000,
  exigir_nfe: false,
  permitir_parcial: true,
};

export async function getSaqueConfig(): Promise<SaqueConfig> {
  const keys = [
    "financeiro.saque.frequencia",
    "financeiro.saque.dias_fechamento",
    "financeiro.saque.prazo_liberacao_dias",
    "financeiro.saque.valor_minimo_centavos",
    "financeiro.saque.exigir_nfe",
    "financeiro.saque.permitir_parcial",
  ];
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", keys);

  const map: Record<string, any> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });

  // Helper: DB jsonb may return string, number, boolean, or array — normalize each field
  const parseStr = (v: any, fallback: string) => (typeof v === "string" ? v.replace(/^"|"$/g, "") : v) ?? fallback;
  const parseNum = (v: any, fallback: number): number => {
    if (v == null) return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };
  const parseBool = (v: any, fallback: boolean): boolean => {
    if (v == null) return fallback;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v === "true";
    return fallback;
  };
  const parseArr = (v: any, fallback: number[]): number[] => {
    if (Array.isArray(v)) return v.map(Number).filter(n => !isNaN(n));
    if (typeof v === "string") {
      try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(Number).filter(n => !isNaN(n)); } catch { /* ignore */ }
    }
    return fallback;
  };

  return {
    frequencia: parseStr(map["financeiro.saque.frequencia"], DEFAULTS.frequencia),
    dias_fechamento: parseArr(map["financeiro.saque.dias_fechamento"], DEFAULTS.dias_fechamento),
    prazo_liberacao_dias: parseNum(map["financeiro.saque.prazo_liberacao_dias"], DEFAULTS.prazo_liberacao_dias),
    valor_minimo_centavos: parseNum(map["financeiro.saque.valor_minimo_centavos"], DEFAULTS.valor_minimo_centavos),
    exigir_nfe: parseBool(map["financeiro.saque.exigir_nfe"], DEFAULTS.exigir_nfe),
    permitir_parcial: parseBool(map["financeiro.saque.permitir_parcial"], DEFAULTS.permitir_parcial),
  };
}

export type SaldoInfo = {
  liberado_centavos: number;
  aguardando_centavos: number;
  ids_elegiveis: string[];
  proxima_liberacao: Date | null;
};

/**
 * Calcula saldo disponível para saque de um médico.
 * - "liberado": consultas_financeiro com status 'valido', data_consulta + prazo < agora, NÃO vinculada a saque
 * - "aguardando": consultas_financeiro com status 'valido', data_consulta + prazo >= agora
 */
export async function calcularSaldo(medicoId: string, config: SaqueConfig): Promise<SaldoInfo> {
  const prazo = config.prazo_liberacao_dias;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - prazo);

  // Buscar todas consultas financeiras válidas do médico
  const { data: todas } = await supabase
    .from("consultas_financeiro")
    .select("id, valor_medico_centavos, data_consulta, status")
    .eq("medico_id", medicoId)
    .eq("status", "valido");

  // IDs já vinculados a saques (não cancelados/recusados)
  const { data: jaVinculados } = await supabase
    .from("saque_medico_itens")
    .select("consulta_financeiro_id, saques_medicos!inner(status)")
    .neq("saques_medicos.status", "recusado")
    .neq("saques_medicos.status", "cancelado");

  const idsUsados = new Set(
    (jaVinculados ?? []).map((r: any) => r.consulta_financeiro_id)
  );

  let liberado = 0;
  let aguardando = 0;
  const ids_elegiveis: string[] = [];

  for (const row of todas ?? []) {
    if (idsUsados.has(row.id)) continue;
    const dataConsulta = new Date(row.data_consulta);
    if (dataConsulta <= cutoff) {
      liberado += row.valor_medico_centavos;
      ids_elegiveis.push(row.id);
    } else {
      aguardando += row.valor_medico_centavos;
    }
  }

  return {
    liberado_centavos: liberado,
    aguardando_centavos: aguardando,
    ids_elegiveis,
    proxima_liberacao: calcularProximaLiberacao(config),
  };
}

function calcularProximaLiberacao(config: SaqueConfig): Date | null {
  // Frequência diária = próximo dia útil (amanhã)
  if (config.frequencia === "diaria") {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    return amanha;
  }

  const dias = Array.isArray(config.dias_fechamento) ? [...config.dias_fechamento] : [];
  if (!dias.length) return null;
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const dia = hoje.getDate();

  dias.sort((a, b) => a - b);
  for (const d of dias) {
    if (d > dia) return new Date(ano, mes, d);
  }
  // Próximo mês, primeiro dia de fechamento
  return new Date(ano, mes + 1, dias[0]);
}

export { brl } from "@/lib/format";

export const mascarar = (v: string, visivel = 4) => {
  if (!v || v.length <= visivel) return v;
  return "•".repeat(v.length - visivel) + v.slice(-visivel);
};
