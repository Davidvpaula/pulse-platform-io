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
export type CupomTipo = Database["public"]["Enums"]["cupom_tipo"];
export type CupomEscopo = Database["public"]["Enums"]["cupom_escopo"];

export type CupomDetalhado = Cupom & {
  medico_nome?: string | null;
  especialidade_nome?: string | null;
};

export type CupomInput = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo: CupomTipo;
  valor: number;
  escopo: CupomEscopo;
  medico_id?: string | null;
  especialidade_id?: string | null;
  valido_de?: string;
  valido_ate?: string | null;
  uso_maximo?: number | null;
  ativo?: boolean;
};

/* ── CRUD ── */

export async function listCupons(): Promise<CupomDetalhado[]> {
  const { data, error } = await (supabase.from as any)("cupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[cupons] listCupons:", error); return []; }
  const rows = (data ?? []) as Cupom[];
  const medIds = Array.from(new Set(rows.map((r) => r.medico_id).filter((v): v is string => !!v)));
  const espIds = Array.from(new Set(rows.map((r) => r.especialidade_id).filter((v): v is string => !!v)));
  const [medRes, espRes] = await Promise.all([
    medIds.length ? supabase.from("medicos").select("id, nome").in("id", medIds) : Promise.resolve({ data: [] as any[] } as any),
    espIds.length ? supabase.from("especialidades").select("id, nome").in("id", espIds) : Promise.resolve({ data: [] as any[] } as any),
  ]);
  const med = new Map<string, string>((medRes.data ?? []).map((m: any) => [m.id, m.nome]));
  const esp = new Map<string, string>((espRes.data ?? []).map((e: any) => [e.id, e.nome]));
  return rows.map((r) => ({
    ...r,
    medico_nome: r.medico_id ? med.get(r.medico_id) ?? null : null,
    especialidade_nome: r.especialidade_id ? esp.get(r.especialidade_id) ?? null : null,
  }));
}

export async function createCupom(input: CupomInput): Promise<Cupom> {
  const { data: s } = await supabase.auth.getSession();
  const payload: any = {
    ...input,
    descricao: input.descricao ?? null,
    medico_id: input.escopo === "medico" ? input.medico_id ?? null : null,
    especialidade_id: input.escopo === "especialidade" ? input.especialidade_id ?? null : null,
    valido_de: input.valido_de ?? new Date().toISOString(),
    valido_ate: input.valido_ate ?? null,
    uso_maximo: input.uso_maximo ?? null,
    ativo: input.ativo ?? true,
    created_by: s.session?.user.id ?? null,
  };
  const { data, error } = await (supabase.from as any)("cupons").insert(payload).select("*").single();
  if (error) throw error;
  return data as Cupom;
}

export async function updateCupom(id: string, input: Partial<CupomInput>): Promise<void> {
  const patch: any = { ...input };
  if (input.escopo === "global") { patch.medico_id = null; patch.especialidade_id = null; }
  const { error } = await (supabase.from as any)("cupons").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCupom(id: string): Promise<void> {
  const { error } = await (supabase.from as any)("cupons").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleCupomAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await (supabase.from as any)("cupons").update({ ativo }).eq("id", id);
  if (error) throw error;
}

export async function listMedicosResumo(): Promise<{ id: string; nome: string }[]> {
  const { data } = await supabase.from("medicos").select("id, nome").order("nome");
  return (data ?? []) as any;
}

export async function listEspecialidadesResumo(): Promise<{ id: string; nome: string }[]> {
  const { data } = await supabase.from("especialidades").select("id, nome").eq("ativo", true).order("nome");
  return (data ?? []) as any;
}

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
