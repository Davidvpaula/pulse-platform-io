/**
 * Validação e aplicação de cupons no fluxo de pagamento.
 *
 * Regras:
 *  - código é case-insensitive (cupons.codigo armazena em UPPER).
 *  - precisa estar ativo, dentro da validade e abaixo do uso máximo.
 *  - escopo:
 *      "global"        → vale para qualquer consulta
 *      "medico"        → só vale se cupom.medico_id == consulta.medico_id
 *      "especialidade" → só vale se cupom.especialidade_id == consulta.especialidade_id
 *  - tipo:
 *      "percentual" (1..100) → desconto = round(valor * v / 100)
 *      "fixo"                → desconto = min(v, valor)
 *  - desconto nunca ultrapassa o valor original; valor final mínimo = 0.
 *
 * O registro em `cupons_uso` é feito apenas quando o pagamento é confirmado.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Cupom = Database["public"]["Tables"]["cupons"]["Row"];

export type CupomAplicado = {
  cupom_id: string;
  codigo: string;
  nome: string;
  tipo: Database["public"]["Enums"]["cupom_tipo"];
  valor_original_centavos: number;
  desconto_centavos: number;
  valor_final_centavos: number;
};

export type ValidarCupomInput = {
  codigo: string;
  valorCentavos: number;
  medicoId: string | null;
  especialidadeId: string | null;
};

export type ValidarCupomResultado =
  | { ok: true; cupom: Cupom; aplicado: CupomAplicado }
  | { ok: false; error: string };

export async function validarCupomParaConsulta(
  input: ValidarCupomInput,
): Promise<ValidarCupomResultado> {
  const codigo = input.codigo.trim().toUpperCase();
  if (!codigo) return { ok: false, error: "Informe um código de cupom." };

  const { data: cupom, error } = await supabase
    .from("cupons")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();

  if (error) return { ok: false, error: "Não foi possível validar o cupom." };
  if (!cupom) return { ok: false, error: "Cupom não encontrado." };
  if (!cupom.ativo) return { ok: false, error: "Cupom inativo." };

  const agora = new Date();
  if (cupom.valido_de && new Date(cupom.valido_de) > agora) {
    return { ok: false, error: "Cupom ainda não está válido." };
  }
  if (cupom.valido_ate && new Date(cupom.valido_ate) < agora) {
    return { ok: false, error: "Cupom expirado." };
  }
  if (cupom.uso_maximo !== null && cupom.uso_atual >= cupom.uso_maximo) {
    return { ok: false, error: "Cupom esgotou o limite de usos." };
  }

  if (cupom.escopo === "medico" && cupom.medico_id && cupom.medico_id !== input.medicoId) {
    return { ok: false, error: "Cupom não vale para este médico." };
  }
  if (
    cupom.escopo === "especialidade" &&
    cupom.especialidade_id &&
    cupom.especialidade_id !== input.especialidadeId
  ) {
    return { ok: false, error: "Cupom não vale para esta especialidade." };
  }

  let desconto = 0;
  if (cupom.tipo === "percentual") {
    desconto = Math.round((input.valorCentavos * cupom.valor) / 100);
  } else {
    desconto = cupom.valor;
  }
  desconto = Math.min(Math.max(0, desconto), input.valorCentavos);
  const final = Math.max(0, input.valorCentavos - desconto);

  return {
    ok: true,
    cupom,
    aplicado: {
      cupom_id: cupom.id,
      codigo: cupom.codigo,
      nome: cupom.nome,
      tipo: cupom.tipo,
      valor_original_centavos: input.valorCentavos,
      desconto_centavos: desconto,
      valor_final_centavos: final,
    },
  };
}

/**
 * Aplica o cupom ao pagamento via RPC backend `validar_e_aplicar_cupom`,
 * que revalida código, validade, limite de uso e escopo (médico/especialidade)
 * de forma atômica (com lock) e atualiza valor_centavos + metadata.
 *
 * O parâmetro `aplicado` é mantido por compatibilidade com a UI — só usamos
 * o `codigo` para enviar ao backend (a fonte de verdade é o servidor).
 */
export async function aplicarCupomNoPagamento(
  pagamentoId: string,
  aplicado: CupomAplicado,
): Promise<{ ok: boolean; error?: string; aplicado?: CupomAplicado }> {
  const { data, error } = await supabase.rpc("validar_e_aplicar_cupom", {
    _pagamento_id: pagamentoId,
    _codigo: aplicado.codigo,
  });
  if (error) return { ok: false, error: error.message };
  const r = (data ?? {}) as Record<string, any>;
  if (!r.ok) return { ok: false, error: "Não foi possível aplicar o cupom." };
  return {
    ok: true,
    aplicado: {
      cupom_id: r.cupom_id,
      codigo: r.codigo,
      nome: r.nome,
      tipo: r.tipo,
      valor_original_centavos: r.valor_original_centavos,
      desconto_centavos: r.desconto_centavos,
      valor_final_centavos: r.valor_final_centavos,
    },
  };
}

/** Remove o cupom aplicado, restaurando o valor original (via RPC backend). */
export async function removerCupomDoPagamento(
  pagamentoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("remover_cupom_pagamento", {
    _pagamento_id: pagamentoId,
  });
  if (error) return { ok: false, error: error.message };
  const r = (data ?? {}) as Record<string, any>;
  if (!r.ok) return { ok: false, error: "Não foi possível remover o cupom." };
  return { ok: true };
}

/**
 * Registra o uso do cupom (após confirmar pagamento). O trigger
 * `cupons_uso_after_insert` incrementa `cupons.uso_atual` e preenche
 * `aplicado_por` com auth.uid() automaticamente.
 */
export async function registrarUsoCupom(input: {
  cupomId: string;
  consultaId: string;
  pacienteId: string | null;
  medicoId: string | null;
  codigoSnapshot: string;
  tipoSnapshot: Database["public"]["Enums"]["cupom_tipo"];
  valorOriginalCentavos: number;
  valorDescontoCentavos: number;
  valorFinalCentavos: number;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("cupons_uso").insert({
    cupom_id: input.cupomId,
    consulta_id: input.consultaId,
    paciente_id: input.pacienteId,
    medico_id: input.medicoId,
    codigo_snapshot: input.codigoSnapshot,
    tipo_snapshot: input.tipoSnapshot,
    valor_original_centavos: input.valorOriginalCentavos,
    valor_desconto_centavos: input.valorDescontoCentavos,
    valor_final_centavos: input.valorFinalCentavos,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
