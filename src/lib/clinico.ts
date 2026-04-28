/**
 * Camada de serviço para o núcleo clínico.
 * Encapsula chamadas ao Supabase e converte para os tipos usados pelas telas.
 *
 * Regra: só usar quando houver sessão real. Sem sessão (modo demo) as telas
 * continuam com o mock antigo.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Consulta = Database["public"]["Tables"]["consultas"]["Row"];
export type ConsultaStatus = Database["public"]["Enums"]["consulta_status"];
export type ConsultaModalidade = Database["public"]["Enums"]["consulta_modalidade"];
export type Paciente = Database["public"]["Tables"]["pacientes"]["Row"];
export type AgendaSlot = Database["public"]["Tables"]["agenda_slots"]["Row"];

export type ConsultaDetalhada = Consulta & {
  paciente_nome?: string | null;
  medico_nome?: string | null;
  especialidade_nome?: string | null;
};

/* ─────────────────────────────────────────────────────────────────────────
 * PACIENTE
 * ────────────────────────────────────────────────────────────────────── */

/** Garante que existe um registro em `pacientes` para o usuário logado. */
export async function ensurePaciente(): Promise<Paciente | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return null;

  const { data: existing } = await supabase
    .from("pacientes")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("pacientes")
    .insert({ user_id: uid })
    .select("*")
    .single();
  if (error) {
    console.error("[clinico] ensurePaciente:", error);
    return null;
  }
  return created;
}

export async function getPacienteAtual(): Promise<Paciente | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("pacientes")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  return data ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * MÉDICO
 * ────────────────────────────────────────────────────────────────────── */

export async function getMedicoAtualId(): Promise<string | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return null;
  const { data } = await supabase
    .from("medicos")
    .select("id")
    .eq("user_id", uid)
    .maybeSingle();
  return data?.id ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────
 * CONSULTAS
 * ────────────────────────────────────────────────────────────────────── */

export async function listConsultasDoMedico(opts?: {
  desde?: Date;
  ate?: Date;
  status?: ConsultaStatus;
}): Promise<ConsultaDetalhada[]> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return [];

  let q = supabase
    .from("consultas")
    .select(`
      *,
      pacientes:paciente_id ( user_id ),
      especialidades:especialidade_id ( nome )
    `)
    .eq("medico_id", medicoId)
    .order("inicio", { ascending: true });

  if (opts?.desde) q = q.gte("inicio", opts.desde.toISOString());
  if (opts?.ate) q = q.lte("inicio", opts.ate.toISOString());
  if (opts?.status) q = q.eq("status", opts.status);

  const { data, error } = await q;
  if (error) {
    console.error("[clinico] listConsultasDoMedico:", error);
    return [];
  }

  // Busca nomes de pacientes em lote
  const userIds = Array.from(
    new Set(
      (data ?? [])
        .map((c: any) => c.pacientes?.user_id)
        .filter(Boolean) as string[]
    )
  );
  let nomes: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", userIds);
    nomes = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]));
  }

  return (data ?? []).map((c: any) => ({
    ...c,
    paciente_nome: c.pacientes?.user_id ? nomes[c.pacientes.user_id] ?? null : null,
    especialidade_nome: c.especialidades?.nome ?? null,
  }));
}

export async function listConsultasDoPaciente(): Promise<ConsultaDetalhada[]> {
  const paciente = await getPacienteAtual();
  if (!paciente) return [];

  const { data, error } = await supabase
    .from("consultas")
    .select(`
      *,
      medicos:medico_id ( nome ),
      especialidades:especialidade_id ( nome )
    `)
    .eq("paciente_id", paciente.id)
    .order("inicio", { ascending: true });

  if (error) {
    console.error("[clinico] listConsultasDoPaciente:", error);
    return [];
  }

  return (data ?? []).map((c: any) => ({
    ...c,
    medico_nome: c.medicos?.nome ?? null,
    especialidade_nome: c.especialidades?.nome ?? null,
  }));
}

/* ─────────────────────────────────────────────────────────────────────────
 * AGENDA SLOTS (horários disponíveis do médico)
 * ────────────────────────────────────────────────────────────────────── */

export type SlotStatus = Database["public"]["Enums"]["slot_status"];

export async function listSlotsDoMedico(opts?: {
  desde?: Date;
  ate?: Date;
}): Promise<AgendaSlot[]> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return [];

  let q = supabase
    .from("agenda_slots")
    .select("*")
    .eq("medico_id", medicoId)
    .order("inicio", { ascending: true });

  if (opts?.desde) q = q.gte("inicio", opts.desde.toISOString());
  if (opts?.ate) q = q.lte("inicio", opts.ate.toISOString());

  const { data, error } = await q;
  if (error) {
    console.error("[clinico] listSlotsDoMedico:", error);
    return [];
  }
  return data ?? [];
}

export async function criarSlot(input: {
  inicio: Date;
  fim: Date;
  modalidade: ConsultaModalidade;
  observacoes?: string;
}): Promise<{ ok: boolean; error?: string; slot?: AgendaSlot }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, error: "Médico não encontrado." };

  if (input.fim <= input.inicio) {
    return { ok: false, error: "O horário de fim deve ser posterior ao início." };
  }
  if (input.inicio < new Date()) {
    return { ok: false, error: "Não é possível criar slots no passado." };
  }

  // Checa sobreposição com slots existentes do mesmo médico
  const { data: overlaps } = await supabase
    .from("agenda_slots")
    .select("id, inicio, fim")
    .eq("medico_id", medicoId)
    .lt("inicio", input.fim.toISOString())
    .gt("fim", input.inicio.toISOString());

  if (overlaps && overlaps.length > 0) {
    return { ok: false, error: "Já existe um horário cadastrado nesse intervalo." };
  }

  const { data, error } = await supabase
    .from("agenda_slots")
    .insert({
      medico_id: medicoId,
      inicio: input.inicio.toISOString(),
      fim: input.fim.toISOString(),
      modalidade: input.modalidade,
      observacoes: input.observacoes,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[clinico] criarSlot:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, slot: data };
}

/* ─────────────────────────────────────────────────────────────────────────
 * ESPECIALIDADES & VÍNCULOS DO MÉDICO
 * ────────────────────────────────────────────────────────────────────── */

export type Especialidade = Database["public"]["Tables"]["especialidades"]["Row"];
export type MedicoEspecialidade = Database["public"]["Tables"]["medico_especialidades"]["Row"];

export async function listEspecialidades(): Promise<Especialidade[]> {
  const { data, error } = await supabase
    .from("especialidades")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error("[clinico] listEspecialidades:", error);
    return [];
  }
  return data ?? [];
}

export async function listVinculosDoMedico(): Promise<MedicoEspecialidade[]> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return [];
  const { data, error } = await supabase
    .from("medico_especialidades")
    .select("*")
    .eq("medico_id", medicoId);
  if (error) {
    console.error("[clinico] listVinculosDoMedico:", error);
    return [];
  }
  return data ?? [];
}

export async function upsertVinculoEspecialidade(input: {
  especialidade_id: string;
  ativo: boolean;
  duracao_minutos: number;
  preco_centavos: number;
  pronto_atendimento: boolean;
  modalidades?: ConsultaModalidade[];
}): Promise<{ ok: boolean; error?: string }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, error: "Médico não encontrado." };

  const { data: existing } = await supabase
    .from("medico_especialidades")
    .select("id")
    .eq("medico_id", medicoId)
    .eq("especialidade_id", input.especialidade_id)
    .maybeSingle();

  const payload = {
    medico_id: medicoId,
    especialidade_id: input.especialidade_id,
    ativo: input.ativo,
    duracao_minutos: input.duracao_minutos,
    preco_centavos: input.preco_centavos,
    pronto_atendimento: input.pronto_atendimento,
    modalidades: input.modalidades ?? ["online" as ConsultaModalidade],
  };

  const { error } = existing
    ? await supabase.from("medico_especialidades").update(payload).eq("id", existing.id)
    : await supabase.from("medico_especialidades").insert(payload);

  if (error) {
    console.error("[clinico] upsertVinculoEspecialidade:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/* ─────────────────────────────────────────────────────────────────────────
 * APP SETTINGS (configurações globais geridas pelo Admin)
 * ────────────────────────────────────────────────────────────────────── */

export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("[clinico] getAppSetting:", error);
    return null;
  }
  return (data?.value as T) ?? null;
}

export async function getProntoAtendimentoDuracao(): Promise<number> {
  const v = await getAppSetting<number>("pronto_atendimento_duracao_min");
  return typeof v === "number" && v > 0 ? v : 15;
}

/**
 * Retorna a duração de consulta a usar para gerar slots:
 * a MENOR `duracao_minutos` entre as especialidades ativas do médico.
 * Se não houver vínculo, retorna null.
 */
export async function getDuracaoSlotMedico(): Promise<number | null> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return null;
  const { data } = await supabase
    .from("medico_especialidades")
    .select("duracao_minutos, ativo")
    .eq("medico_id", medicoId)
    .eq("ativo", true);
  if (!data || data.length === 0) return null;
  return Math.min(...data.map((d) => d.duracao_minutos || 30));
}

export type FaixaHorario = { hi: string; hf: string }; // "HH:MM"

/**
 * Cria múltiplos slots de uma vez para um conjunto de datas e faixas.
 * Cada faixa é dividida em slots de `duracaoMin`.
 * Pula silenciosamente slots que conflitam com já existentes.
 */
export async function criarSlotsEmLote(input: {
  datas: Date[];
  faixas: FaixaHorario[];
  duracaoMin: number;
  modalidade: ConsultaModalidade;
}): Promise<{ ok: boolean; criados: number; pulados: number; error?: string }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, criados: 0, pulados: 0, error: "Médico não encontrado." };
  if (input.duracaoMin <= 0) return { ok: false, criados: 0, pulados: 0, error: "Duração inválida." };

  const agora = new Date();
  type Row = { medico_id: string; inicio: string; fim: string; modalidade: ConsultaModalidade };
  const rows: Row[] = [];

  for (const dia of input.datas) {
    for (const f of input.faixas) {
      const [hi, mi] = f.hi.split(":").map(Number);
      const [hf, mf] = f.hf.split(":").map(Number);
      if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) continue;
      const inicioFaixa = new Date(dia);
      inicioFaixa.setHours(hi, mi, 0, 0);
      const fimFaixa = new Date(dia);
      fimFaixa.setHours(hf, mf, 0, 0);
      if (fimFaixa <= inicioFaixa) continue;

      let cursor = new Date(inicioFaixa);
      while (cursor < fimFaixa) {
        const next = new Date(cursor.getTime() + input.duracaoMin * 60_000);
        if (next > fimFaixa) break;
        if (cursor >= agora) {
          rows.push({
            medico_id: medicoId,
            inicio: cursor.toISOString(),
            fim: next.toISOString(),
            modalidade: input.modalidade,
          });
        }
        cursor = next;
      }
    }
  }

  if (rows.length === 0) {
    return { ok: false, criados: 0, pulados: 0, error: "Nenhum horário válido para criar." };
  }

  // Busca slots existentes no intervalo total para evitar conflito.
  const minIni = rows.reduce((m, r) => (r.inicio < m ? r.inicio : m), rows[0].inicio);
  const maxFim = rows.reduce((m, r) => (r.fim > m ? r.fim : m), rows[0].fim);
  const { data: existentes } = await supabase
    .from("agenda_slots")
    .select("inicio, fim")
    .eq("medico_id", medicoId)
    .lt("inicio", maxFim)
    .gt("fim", minIni);

  const conflita = (r: Row) =>
    (existentes ?? []).some((e) => e.inicio < r.fim && e.fim > r.inicio);

  const aInserir = rows.filter((r) => !conflita(r));
  const pulados = rows.length - aInserir.length;

  if (aInserir.length === 0) {
    return { ok: true, criados: 0, pulados };
  }

  const { error } = await supabase.from("agenda_slots").insert(aInserir);
  if (error) {
    console.error("[clinico] criarSlotsEmLote:", error);
    return { ok: false, criados: 0, pulados, error: error.message };
  }
  return { ok: true, criados: aInserir.length, pulados };
}

export async function excluirSlot(slotId: string): Promise<{ ok: boolean; error?: string }> {
  // Só permite excluir slot disponível (RLS já protege, mas reforçamos UX)
  const { data: slot } = await supabase
    .from("agenda_slots")
    .select("status")
    .eq("id", slotId)
    .maybeSingle();

  if (!slot) return { ok: false, error: "Horário não encontrado." };
  if (slot.status !== "disponivel") {
    return { ok: false, error: "Só é possível excluir horários disponíveis." };
  }

  const { error } = await supabase.from("agenda_slots").delete().eq("id", slotId);
  if (error) {
    console.error("[clinico] excluirSlot:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateConsultaStatus(
  consultaId: string,
  status: ConsultaStatus
): Promise<boolean> {
  const { error } = await supabase
    .from("consultas")
    .update({ status })
    .eq("id", consultaId);
  if (error) console.error("[clinico] updateConsultaStatus:", error);
  return !error;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Helpers de UI
 * ────────────────────────────────────────────────────────────────────── */

export function formatDataBR(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const isHoje =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();
  if (isHoje) return "Hoje";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

import type { Status } from "@/lib/mock";
/** Converte status do banco para o tipo Status do StatusBadge. */
export function toStatusBadge(s: ConsultaStatus): Status {
  const map: Record<ConsultaStatus, Status> = {
    agendada: "agendamento_criado",
    aguardando_pagamento: "aguardando",
    confirmada: "confirmado",
    em_andamento: "em_andamento",
    concluida: "concluido",
    cancelada: "cancelado",
    no_show: "no_show",
  };
  return map[s];
}
