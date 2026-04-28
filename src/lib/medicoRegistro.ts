/**
 * Camada de cadastro de médicos — agora usa Supabase (tabelas `medicos`,
 * `medicos_auditoria`) e Storage (bucket `medico-docs`).
 *
 * As funções antigas baseadas em localStorage foram removidas. Mantemos
 * apenas as constantes e tipos que ainda são consumidos pelas telas.
 */
import { supabase } from "@/integrations/supabase/client";

export type DocKind = "crm" | "rqe" | "documento_pessoal" | "selfie";

export type DocumentoMedico = {
  kind: DocKind;
  fileName: string;
  size: number;
  mimeType: string;
  /** path dentro do bucket `medico-docs` (ex: <user_id>/crm-xxx.pdf) */
  storagePath: string;
  uploadedAt: string;
};

export type MedicoStatus = "pendente" | "em_analise" | "aprovado" | "reprovado";

export type MedicoRow = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crm: string;
  crm_estado: string;
  especialidade: string;
  rqe: string | null;
  bio: string | null;
  documentos: DocumentoMedico[];
  status: MedicoStatus;
  motivo_reprovacao: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditoriaRow = {
  id: string;
  medico_id: string;
  actor_id: string | null;
  acao: string;
  status_anterior: MedicoStatus | null;
  status_novo: MedicoStatus | null;
  motivo: string | null;
  created_at: string;
};

export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const ESPECIALIDADES = [
  "Cardiologia","Clínica Geral","Dermatologia","Endocrinologia","Ginecologia",
  "Neurologia","Ortopedia","Pediatria","Psiquiatria","Urologia","Outra",
];

export const STATUS_LABEL: Record<MedicoStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

export const DOC_LABEL: Record<DocKind, string> = {
  crm: "Documento CRM",
  rqe: "RQE (opcional)",
  documento_pessoal: "Documento pessoal (RG/CNH)",
  selfie: "Foto de validação (selfie)",
};

// =========================================
// Upload / signed URL
// =========================================
export async function uploadDocumento(
  userId: string,
  kind: DocKind,
  file: File,
): Promise<DocumentoMedico> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("medico-docs")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return {
    kind,
    fileName: file.name,
    size: file.size,
    mimeType: file.type,
    storagePath: path,
    uploadedAt: new Date().toISOString(),
  };
}

export async function getSignedUrl(path: string, expiresIn = 60 * 5): Promise<string> {
  const { data, error } = await supabase.storage
    .from("medico-docs")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// =========================================
// CRUD médico
// =========================================
export async function createMedico(input: {
  user_id: string;
  nome: string;
  email: string;
  telefone?: string;
  crm: string;
  crm_estado: string;
  especialidade: string;
  rqe?: string;
  documentos: DocumentoMedico[];
}): Promise<MedicoRow> {
  const { data, error } = await supabase
    .from("medicos")
    .insert({
      user_id: input.user_id,
      nome: input.nome,
      email: input.email,
      telefone: input.telefone ?? null,
      crm: input.crm,
      crm_estado: input.crm_estado,
      especialidade: input.especialidade,
      rqe: input.rqe ?? null,
      documentos: input.documentos as any,
      status: "pendente",
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as MedicoRow;
}

export async function getMedicoByUser(userId: string): Promise<MedicoRow | null> {
  const { data, error } = await supabase
    .from("medicos")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as MedicoRow | null;
}

export async function listMedicos(): Promise<MedicoRow[]> {
  const { data, error } = await supabase
    .from("medicos")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MedicoRow[];
}

export async function updateMedicoStatus(
  id: string,
  novoStatus: MedicoStatus,
  motivo?: string,
): Promise<void> {
  // pega status anterior (pra auditoria)
  const { data: atual } = await supabase
    .from("medicos")
    .select("status")
    .eq("id", id)
    .single();
  const statusAnterior = (atual?.status ?? null) as MedicoStatus | null;

  const { error: e1 } = await supabase
    .from("medicos")
    .update({
      status: novoStatus,
      motivo_reprovacao: novoStatus === "reprovado" ? (motivo ?? null) : null,
    })
    .eq("id", id);
  if (e1) throw e1;

  const { data: u } = await supabase.auth.getUser();
  await supabase.from("medicos_auditoria").insert({
    medico_id: id,
    actor_id: u.user?.id ?? null,
    acao: novoStatus,
    status_anterior: statusAnterior,
    status_novo: novoStatus,
    motivo: motivo ?? null,
  });
}

export async function listAuditoria(medicoId: string): Promise<AuditoriaRow[]> {
  const { data, error } = await supabase
    .from("medicos_auditoria")
    .select("*")
    .eq("medico_id", medicoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuditoriaRow[];
}
