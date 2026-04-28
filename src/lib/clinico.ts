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

/** Converte status do banco para o label/variante visual usado no StatusBadge */
export function statusLabel(s: ConsultaStatus): string {
  const map: Record<ConsultaStatus, string> = {
    agendada: "agendamento_criado",
    aguardando_pagamento: "aguardando_pagamento",
    confirmada: "confirmado",
    em_andamento: "em_andamento",
    concluida: "concluido",
    cancelada: "cancelado",
    no_show: "no_show",
  };
  return map[s] ?? s;
}
