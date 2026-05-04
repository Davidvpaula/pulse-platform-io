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

/** Atualiza dados do paciente. Cria registro caso não exista. */
export async function updatePacientePerfil(patch: {
  nome_completo?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  sexo?: Database["public"]["Enums"]["sexo_biologico"];
  cep?: string | null;
  alergias?: string | null;
  condicoes_cronicas?: string | null;
  medicamentos_uso?: string | null;
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return { ok: false, error: "Não autenticado." };

  const existing = await getPacienteAtual();
  if (existing) {
    const { error } = await supabase.from("pacientes").update(patch as any).eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const { error } = await supabase.from("pacientes").insert({ user_id: uid, ...patch } as any);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* ─────────────────────────────────────────────────────────────────────────
 * DOCUMENTOS PESSOAIS DO PACIENTE
 * ────────────────────────────────────────────────────────────────────── */

export type DocumentoPacienteTipo =
  | "exame" | "laudo" | "receita" | "identidade" | "plano" | "vacina" | "outro";

export type DocumentoPaciente = {
  id: string;
  paciente_id: string;
  user_id: string;
  tipo: DocumentoPacienteTipo;
  titulo: string;
  descricao: string | null;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
};

export async function listDocumentosDoPaciente(): Promise<DocumentoPaciente[]> {
  const p = await getPacienteAtual();
  if (!p) return [];
  const { data, error } = await supabase
    .from("documentos_paciente" as any)
    .select("*")
    .eq("paciente_id", p.id)
    .order("created_at", { ascending: false });
  if (error) { console.error("[clinico] listDocumentosDoPaciente:", error); return []; }
  return (data ?? []) as any;
}

export async function uploadDocumentoPaciente(input: {
  file: File;
  tipo: DocumentoPacienteTipo;
  titulo: string;
  descricao?: string | null;
}): Promise<{ ok: boolean; error?: string; doc?: DocumentoPaciente }> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return { ok: false, error: "Não autenticado." };
  const paciente = await ensurePaciente();
  if (!paciente) return { ok: false, error: "Cadastro de paciente não encontrado." };

  if (input.file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "Arquivo muito grande (máx. 20 MB)." };
  }
  const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${uid}/${Date.now()}-${safeName}`;
  const up = await supabase.storage.from("paciente-docs").upload(path, input.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: input.file.type || undefined,
  });
  if (up.error) return { ok: false, error: up.error.message };

  const { data, error } = await supabase
    .from("documentos_paciente" as any)
    .insert({
      paciente_id: paciente.id,
      user_id: uid,
      tipo: input.tipo,
      titulo: input.titulo.trim() || input.file.name,
      descricao: input.descricao ?? null,
      storage_path: path,
      mime_type: input.file.type || null,
      tamanho_bytes: input.file.size,
    } as any)
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from("paciente-docs").remove([path]);
    return { ok: false, error: error.message };
  }
  return { ok: true, doc: data as any };
}

export async function getDocumentoPacienteUrl(path: string, expiresInSec = 60): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("paciente-docs")
    .createSignedUrl(path, expiresInSec);
  if (error) { console.error("[clinico] signed url:", error); return null; }
  return data?.signedUrl ?? null;
}

export async function deletarDocumentoPaciente(doc: DocumentoPaciente): Promise<boolean> {
  await supabase.storage.from("paciente-docs").remove([doc.storage_path]);
  const { error } = await supabase.from("documentos_paciente" as any).delete().eq("id", doc.id);
  if (error) { console.error("[clinico] deletar doc:", error); return false; }
  return true;
}

/** Anexos enviados em consultas (pelo médico ou pelo próprio paciente), visíveis via RLS. */
export type AnexoConsulta = {
  id: string;
  consulta_id: string;
  uploader_id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  descricao: string | null;
  created_at: string;
};

export async function listAnexosConsultaDoPaciente(): Promise<AnexoConsulta[]> {
  const p = await getPacienteAtual();
  if (!p) return [];
  // Pega ids das consultas do paciente e busca anexos respeitando RLS
  const { data: cs } = await supabase.from("consultas").select("id").eq("paciente_id", p.id);
  const ids = (cs ?? []).map((c: any) => c.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("anexos_consulta")
    .select("*")
    .in("consulta_id", ids)
    .order("created_at", { ascending: false });
  if (error) { console.error("[clinico] listAnexosConsultaDoPaciente:", error); return []; }
  return (data ?? []) as any;
}

export async function getAnexoConsultaUrl(path: string, expiresInSec = 60): Promise<string | null> {
  const { data, error } = await supabase.storage.from("consultas").createSignedUrl(path, expiresInSec);
  if (error) { console.error("[clinico] anexo signed url:", error); return null; }
  return data?.signedUrl ?? null;
}

/** Atualiza nome/telefone no profile (espelho user). */
export async function updateProfileBasico(patch: {
  nome?: string;
  telefone?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return { ok: false, error: "Não autenticado." };
  const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

export type MedicoRow = Database["public"]["Tables"]["medicos"]["Row"];

/** Retorna o registro completo do médico logado. */
export async function getMedicoAtual(): Promise<MedicoRow | null> {
  const { data: s } = await supabase.auth.getSession();
  const uid = s.session?.user.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("medicos")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.error("[clinico] getMedicoAtual:", error);
    return null;
  }
  return data ?? null;
}

/** Atualiza campos editáveis do perfil do médico (nome, bio, telefone, link sala). */
export async function updateMedicoPerfil(patch: {
  nome?: string;
  bio?: string | null;
  telefone?: string | null;
  link_sala_padrao?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const id = await getMedicoAtualId();
  if (!id) return { ok: false, error: "Médico não encontrado." };
  const { error } = await supabase.from("medicos").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

/** Paciente agregado a partir das consultas do médico logado. */
export type PacienteDoMedico = {
  paciente_id: string;
  user_id: string | null;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  empresa_id: string | null;
  empresa_nome: string | null;
  total_consultas: number;
  proxima_consulta: string | null; // ISO
  ultima_consulta: string | null;  // ISO
  tem_pendencia_pagamento: boolean;
  ativo: boolean; // teve consulta nos últimos 6 meses
};

/**
 * Lista pacientes únicos atendidos (ou agendados) com o médico logado,
 * agregando consultas para informar status, próxima visita e empresa.
 */
export async function listPacientesDoMedico(): Promise<PacienteDoMedico[]> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return [];

  const { data: consultas, error } = await supabase
    .from("consultas")
    .select("id, paciente_id, inicio, status, empresa_id")
    .eq("medico_id", medicoId)
    .order("inicio", { ascending: false });

  if (error) {
    console.error("[clinico] listPacientesDoMedico:", error);
    return [];
  }
  if (!consultas || consultas.length === 0) return [];

  const pacienteIds = Array.from(new Set(consultas.map((c) => c.paciente_id)));

  const { data: pacientes } = await supabase
    .from("pacientes")
    .select("id, user_id, nome_completo, cpf, telefone, empresa_id")
    .in("id", pacienteIds);

  const userIds = Array.from(new Set((pacientes ?? []).map((p) => p.user_id).filter(Boolean) as string[]));
  const { data: profs } = userIds.length
    ? await supabase.from("profiles").select("id, nome").in("id", userIds)
    : { data: [] as { id: string; nome: string }[] };
  const nomePorUser = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]));

  // Empresas (se tiver tabela; tolera ausência)
  const empresaIds = Array.from(
    new Set((pacientes ?? []).map((p) => p.empresa_id).filter(Boolean) as string[]),
  );
  let empresaNomePorId: Record<string, string> = {};
  if (empresaIds.length) {
    const { data: emps } = await supabase
      .from("empresas" as any)
      .select("id, nome")
      .in("id", empresaIds);
    empresaNomePorId = Object.fromEntries(((emps ?? []) as any[]).map((e) => [e.id, e.nome]));
  }

  const agora = Date.now();
  const seisMeses = 1000 * 60 * 60 * 24 * 30 * 6;

  return pacienteIds.map<PacienteDoMedico>((pid) => {
    const p = (pacientes ?? []).find((x) => x.id === pid);
    const cs = consultas.filter((c) => c.paciente_id === pid);
    const futuras = cs.filter((c) => new Date(c.inicio).getTime() >= agora && c.status !== "cancelada");
    const passadas = cs.filter((c) => new Date(c.inicio).getTime() < agora);
    const proxima = futuras.sort((a, b) => +new Date(a.inicio) - +new Date(b.inicio))[0]?.inicio ?? null;
    const ultima = passadas[0]?.inicio ?? null; // já vem desc
    const ativo = ultima ? agora - new Date(ultima).getTime() <= seisMeses : !!proxima;
    const pendente = cs.some((c) => c.status === "aguardando_pagamento");
    const nome =
      (p?.user_id && nomePorUser[p.user_id]) ||
      p?.nome_completo ||
      "Paciente sem nome";

    return {
      paciente_id: pid,
      user_id: p?.user_id ?? null,
      nome,
      cpf: p?.cpf ?? null,
      telefone: p?.telefone ?? null,
      empresa_id: p?.empresa_id ?? null,
      empresa_nome: p?.empresa_id ? empresaNomePorId[p.empresa_id] ?? null : null,
      total_consultas: cs.length,
      proxima_consulta: proxima,
      ultima_consulta: ultima,
      tem_pendencia_pagamento: pendente,
      ativo,
    };
  }).sort((a, b) => {
    // ordena por próxima consulta (asc), depois última (desc)
    if (a.proxima_consulta && b.proxima_consulta) return +new Date(a.proxima_consulta) - +new Date(b.proxima_consulta);
    if (a.proxima_consulta) return -1;
    if (b.proxima_consulta) return 1;
    return +new Date(b.ultima_consulta ?? 0) - +new Date(a.ultima_consulta ?? 0);
  });
}

/** Lista consultas para secretaria/admin com nomes de paciente e médico. */
export async function listConsultasParaSecretaria(opts?: {
  desde?: Date;
  ate?: Date;
  medico_id?: string;
}): Promise<ConsultaDetalhada[]> {
  let q = supabase
    .from("consultas")
    .select(`
      *,
      pacientes:paciente_id ( user_id ),
      medicos:medico_id ( nome ),
      especialidades:especialidade_id ( nome )
    `)
    .order("inicio", { ascending: true });

  if (opts?.desde) q = q.gte("inicio", opts.desde.toISOString());
  if (opts?.ate) q = q.lte("inicio", opts.ate.toISOString());
  if (opts?.medico_id) q = q.eq("medico_id", opts.medico_id);

  const { data, error } = await q;
  if (error) {
    console.error("[clinico] listConsultasParaSecretaria:", error);
    return [];
  }

  const userIds = Array.from(new Set(
    (data ?? []).map((c: any) => c.pacientes?.user_id).filter(Boolean) as string[],
  ));
  let nomes: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("id, nome").in("id", userIds);
    nomes = Object.fromEntries((profs ?? []).map((p) => [p.id, p.nome]));
  }

  return (data ?? []).map((c: any) => ({
    ...c,
    paciente_nome: c.pacientes?.user_id ? nomes[c.pacientes.user_id] ?? null : null,
    medico_nome: c.medicos?.nome ?? null,
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
  // Retry para PGRST002 (schema cache reload após migração)
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data, error } = await supabase
      .from("especialidades")
      .select("*")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (!error) return data ?? [];
    if (error.code !== "PGRST002") {
      console.error("[clinico] listEspecialidades:", error);
      return [];
    }
    // schema cache reloading — espera e tenta de novo
    await new Promise((r) => setTimeout(r, 500 * (tentativa + 1)));
  }
  console.error("[clinico] listEspecialidades: schema cache não disponível após retries");
  return [];
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
  especialista?: boolean;
  rqe?: string | null;
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

  const payload: any = {
    medico_id: medicoId,
    especialidade_id: input.especialidade_id,
    ativo: input.ativo,
    duracao_minutos: input.duracao_minutos,
    preco_centavos: input.preco_centavos,
    pronto_atendimento: input.pronto_atendimento,
    especialista: input.especialista ?? false,
    rqe: input.rqe?.trim() || null,
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
  const cfg = await getServicoAtendimentoImediato();
  if (cfg && cfg.duracao_min > 0) return cfg.duracao_min;
  return 15;
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
  servicoId?: string | null;
}): Promise<{ ok: boolean; criados: number; pulados: number; error?: string }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, criados: 0, pulados: 0, error: "Médico não encontrado." };
  if (input.duracaoMin <= 0) return { ok: false, criados: 0, pulados: 0, error: "Duração inválida." };

  const agora = new Date();
  type Row = { medico_id: string; inicio: string; fim: string; modalidade: ConsultaModalidade; servico_id?: string | null };
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
            servico_id: input.servicoId ?? null,
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

/**
 * Exclui todos os slots disponíveis de um dia específico para o médico logado.
 */
export async function excluirSlotsDoDia(dataISO: string): Promise<{ ok: boolean; removidos: number; error?: string }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, removidos: 0, error: "Médico não encontrado." };

  // Calcula início e fim do dia
  const dia = new Date(dataISO + "T00:00:00");
  const iniciodia = dia.toISOString();
  const fimDia = new Date(dia.getTime() + 86400000).toISOString();

  // Busca IDs dos slots disponíveis naquele dia
  const { data: slotsDisponiveis } = await supabase
    .from("agenda_slots")
    .select("id")
    .eq("medico_id", medicoId)
    .eq("status", "disponivel")
    .gte("inicio", iniciodia)
    .lt("inicio", fimDia);

  if (!slotsDisponiveis || slotsDisponiveis.length === 0) {
    return { ok: false, removidos: 0, error: "Nenhum slot disponível para excluir neste dia." };
  }

  const ids = slotsDisponiveis.map((s) => s.id);
  const { error } = await supabase.from("agenda_slots").delete().in("id", ids);
  if (error) {
    console.error("[clinico] excluirSlotsDoDia:", error);
    return { ok: false, removidos: 0, error: error.message };
  }
  return { ok: true, removidos: ids.length };
}

/** Exclui TODOS os slots disponíveis do médico logado. */
export async function excluirTodosSlots(): Promise<{ ok: boolean; removidos: number; error?: string }> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return { ok: false, removidos: 0, error: "Médico não encontrado." };

  const { data: slotsDisponiveis } = await supabase
    .from("agenda_slots")
    .select("id")
    .eq("medico_id", medicoId)
    .eq("status", "disponivel");

  if (!slotsDisponiveis || slotsDisponiveis.length === 0) {
    return { ok: false, removidos: 0, error: "Nenhum slot disponível para excluir." };
  }

  const ids = slotsDisponiveis.map((s) => s.id);
  const { error } = await supabase.from("agenda_slots").delete().in("id", ids);
  if (error) {
    console.error("[clinico] excluirTodosSlots:", error);
    return { ok: false, removidos: 0, error: error.message };
  }
  return { ok: true, removidos: ids.length };
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
 * RETORNOS GRATUITOS
 * ────────────────────────────────────────────────────────────────────── */

export type RetornoGratuito = Database["public"]["Tables"]["retornos_gratuitos"]["Row"];
export type RetornoComContexto = RetornoGratuito & {
  medico_nome?: string | null;
  especialidade_nome?: string | null;
};

export async function criarRetornoGratuito(input: {
  consulta_id: string;
  dias_validade: number;
  observacao?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data: c, error: cErr } = await supabase
    .from("consultas")
    .select("id, paciente_id, medico_id, especialidade_id")
    .eq("id", input.consulta_id)
    .maybeSingle();
  if (cErr || !c) return { ok: false, error: cErr?.message ?? "Consulta não encontrada" };

  const validoAte = new Date();
  validoAte.setDate(validoAte.getDate() + Math.max(1, Math.floor(input.dias_validade)));

  const { data: s } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("retornos_gratuitos")
    .insert({
      paciente_id: c.paciente_id,
      medico_id: c.medico_id,
      especialidade_id: c.especialidade_id,
      consulta_origem_id: c.id,
      valido_ate: validoAte.toISOString(),
      observacao: input.observacao?.trim() || null,
      created_by: s.session?.user.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function getRetornoDaConsulta(consultaId: string): Promise<RetornoGratuito | null> {
  const { data } = await supabase
    .from("retornos_gratuitos")
    .select("*")
    .eq("consulta_origem_id", consultaId)
    .maybeSingle();
  return data ?? null;
}

export async function listRetornosDisponiveis(): Promise<RetornoComContexto[]> {
  const paciente = await getPacienteAtual();
  if (!paciente) return [];
  const { data, error } = await supabase
    .from("retornos_gratuitos")
    .select(`*, medicos:medico_id ( nome ), especialidades:especialidade_id ( nome )`)
    .eq("paciente_id", paciente.id)
    .eq("status", "disponivel")
    .gt("valido_ate", new Date().toISOString())
    .order("valido_ate", { ascending: true });
  if (error) { console.error("[clinico] listRetornosDisponiveis:", error); return []; }
  return (data ?? []).map((r: any) => ({
    ...r,
    medico_nome: r.medicos?.nome ?? null,
    especialidade_nome: r.especialidades?.nome ?? null,
  }));
}

export async function agendarRetornoGratuito(input: {
  slot_id: string;
  voucher_id: string;
  motivo?: string;
}): Promise<{ consulta_id: string; voucher_id: string }> {
  const { data, error } = await supabase.rpc("agendar_retorno_gratuito", {
    _slot_id: input.slot_id,
    _voucher_id: input.voucher_id,
    _motivo: input.motivo ?? null,
  });
  if (error) throw error;
  return data as unknown as { consulta_id: string; voucher_id: string };
}

/** Lista slots disponíveis de UM médico específico (para usar voucher de retorno). */
export async function listSlotsDisponiveisDoMedico(medicoId: string): Promise<AgendaSlot[]> {
  const agora = new Date().toISOString();
  const { data, error } = await supabase
    .from("agenda_slots")
    .select("*")
    .eq("medico_id", medicoId)
    .eq("status", "disponivel")
    .gte("inicio", agora)
    .order("inicio", { ascending: true })
    .limit(60);
  if (error) { console.error("[clinico] listSlotsDisponiveisDoMedico:", error); return []; }
  return data ?? [];
}

/* ─────────────────────────────────────────────────────────────────────────
 * TROCA DE PROFISSIONAL (admin/secretaria)
 * ────────────────────────────────────────────────────────────────────── */

export type MedicoCompativel = {
  id: string;
  nome: string;
  link_sala_padrao: string | null;
  preco_centavos: number | null;
};

/** Lista médicos ativos que atendem a especialidade da consulta (exceto o atual). */
export async function listMedicosCompativeis(
  consultaId: string,
): Promise<MedicoCompativel[]> {
  const { data: c } = await supabase
    .from("consultas")
    .select("medico_id, especialidade_id")
    .eq("id", consultaId)
    .maybeSingle();
  if (!c) return [];

  let query = supabase
    .from("medico_especialidades")
    .select(`preco_centavos, medico_id, medicos:medico_id ( id, nome, link_sala_padrao, status )`)
    .eq("ativo", true)
    .neq("medico_id", c.medico_id);
  if (c.especialidade_id) query = query.eq("especialidade_id", c.especialidade_id);

  const { data, error } = await query;
  if (error) { console.error("[clinico] listMedicosCompativeis:", error); return []; }
  return (data ?? [])
    .map((row: any) => ({
      id: row.medicos?.id,
      nome: row.medicos?.nome,
      link_sala_padrao: row.medicos?.link_sala_padrao ?? null,
      preco_centavos: row.preco_centavos ?? null,
      status: row.medicos?.status,
    }))
    .filter((m) => m.id && m.status === "aprovado")
    .map(({ status, ...m }) => m);
}

/** Troca o médico de uma consulta para um novo slot disponível. */
export async function trocarMedicoConsulta(input: {
  consulta_id: string;
  novo_slot_id: string;
  motivo?: string;
}): Promise<{
  consulta_id: string;
  novo_medico_id: string;
  novo_slot_id: string;
  novo_valor_centavos: number;
  novo_link_sala: string | null;
}> {
  const { data, error } = await supabase.rpc("trocar_medico_consulta", {
    _consulta_id: input.consulta_id,
    _novo_slot_id: input.novo_slot_id,
    _motivo: input.motivo ?? null,
  });
  if (error) throw error;
  return data as any;
}

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

/* ─────────────────────────────────────────────────────────────────────────
 * AGENDAMENTO PÚBLICO (slot disponível → consulta aguardando_pagamento)
 * ────────────────────────────────────────────────────────────────────── */

export type SlotDisponivel = {
  id: string;
  medico_id: string;
  inicio: string;
  fim: string;
  modalidade: ConsultaModalidade;
  medico_nome: string;
  especialidade_id: string;
  especialidade_nome: string;
  preco_centavos: number;
  duracao_minutos: number;
};

/**
 * Lista slots disponíveis com dados do médico/especialidade. Combinação simples para
 * tela de agendamento — em produção pode virar uma view materializada.
 */
export async function listSlotsDisponiveisPorEspecialidade(
  especialidadeId: string,
): Promise<SlotDisponivel[]> {
  // 1) vínculos médico ↔ especialidade ativos
  const { data: vinculos } = await supabase
    .from("medico_especialidades")
    .select("medico_id, especialidade_id, preco_centavos, duracao_minutos")
    .eq("especialidade_id", especialidadeId)
    .eq("ativo", true);
  if (!vinculos?.length) return [];

  const medicoIds = [...new Set(vinculos.map((v) => v.medico_id))];

  const [{ data: medicos }, { data: esp }, { data: slots }] = await Promise.all([
    supabase.from("medicos").select("id, nome").in("id", medicoIds),
    supabase.from("especialidades").select("id, nome").eq("id", especialidadeId).maybeSingle(),
    supabase
      .from("agenda_slots")
      .select("id, medico_id, inicio, fim, modalidade, status")
      .in("medico_id", medicoIds)
      .eq("status", "disponivel")
      .gte("inicio", new Date().toISOString())
      .order("inicio", { ascending: true })
      .limit(100),
  ]);

  const medicoMap = new Map((medicos ?? []).map((m) => [m.id, m.nome]));
  const vincMap = new Map(vinculos.map((v) => [v.medico_id, v]));

  return (slots ?? []).map((s) => {
    const v = vincMap.get(s.medico_id)!;
    return {
      id: s.id,
      medico_id: s.medico_id,
      inicio: s.inicio,
      fim: s.fim,
      modalidade: s.modalidade,
      medico_nome: medicoMap.get(s.medico_id) ?? "Médico",
      especialidade_id: especialidadeId,
      especialidade_nome: esp?.nome ?? "—",
      preco_centavos: v.preco_centavos,
      duracao_minutos: v.duracao_minutos,
    };
  });
}

export async function getSlotDisponivel(slotId: string): Promise<SlotDisponivel | null> {
  const { data: slot } = await supabase
    .from("agenda_slots")
    .select("id, medico_id, inicio, fim, modalidade, status")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot || slot.status !== "disponivel") return null;

  const [{ data: medico }, { data: vinculos }] = await Promise.all([
    supabase.from("medicos").select("id, nome").eq("id", slot.medico_id).maybeSingle(),
    supabase
      .from("medico_especialidades")
      .select("especialidade_id, preco_centavos, duracao_minutos")
      .eq("medico_id", slot.medico_id)
      .eq("ativo", true)
      .limit(1),
  ]);
  const v = vinculos?.[0];
  if (!v) return null;
  const { data: esp } = await supabase
    .from("especialidades")
    .select("nome")
    .eq("id", v.especialidade_id)
    .maybeSingle();

  return {
    id: slot.id,
    medico_id: slot.medico_id,
    inicio: slot.inicio,
    fim: slot.fim,
    modalidade: slot.modalidade,
    medico_nome: medico?.nome ?? "Médico",
    especialidade_id: v.especialidade_id,
    especialidade_nome: esp?.nome ?? "—",
    preco_centavos: v.preco_centavos,
    duracao_minutos: v.duracao_minutos,
  };
}

export type DadosPaciente = {
  nome_completo: string;
  cpf: string;
  telefone: string;
  data_nascimento: string; // ISO yyyy-mm-dd
  sexo: Database["public"]["Enums"]["sexo_biologico"];
  cep: string;
};

export type CriarConsultaInput = DadosPaciente & {
  slot_id: string;
  especialidade_id: string;
  motivo?: string;
};

export type CriarConsultaResult = {
  consulta_id: string;
  paciente_id: string;
  valor_centavos: number;
  reserva_expira_em: string;
};

/**
 * Cria a consulta como aguardando_pagamento e reserva o slot por 15 minutos.
 * Atualiza os dados do paciente atomicamente. Em caso de slot indisponível,
 * lança erro com a mensagem do Postgres.
 */
export async function criarConsultaComReserva(
  input: CriarConsultaInput,
): Promise<CriarConsultaResult> {
  const { data, error } = await supabase.rpc("criar_consulta_com_reserva", {
    _slot_id: input.slot_id,
    _especialidade_id: input.especialidade_id,
    _motivo: input.motivo ?? null,
    _nome_completo: input.nome_completo,
    _cpf: input.cpf,
    _telefone: input.telefone,
    _data_nascimento: input.data_nascimento,
    _sexo: input.sexo,
    _cep: input.cep,
  });
  if (error) throw error;
  return data as unknown as CriarConsultaResult;
}

/* ─────────────────────────────────────────────────────────────────────────
 * HISTÓRICO DE STATUS
 * ────────────────────────────────────────────────────────────────────── */

export type ConsultaStatusLogItem = {
  id: string;
  consulta_id: string;
  status_anterior: ConsultaStatus | null;
  status_novo: ConsultaStatus;
  motivo: string | null;
  actor_id: string | null;
  actor_nome: string | null;
  created_at: string;
};

/** Lista o histórico de mudanças de status de uma consulta (ordenado do mais recente). */
export async function listConsultaStatusLog(
  consultaId: string,
): Promise<ConsultaStatusLogItem[]> {
  const { data, error } = await supabase
    .from("consulta_status_log")
    .select("id, consulta_id, status_anterior, status_novo, motivo, actor_id, created_at")
    .eq("consulta_id", consultaId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[clinico] listConsultaStatusLog:", error);
    return [];
  }

  const rows = data ?? [];
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((v): v is string => !!v)),
  );

  let nomes = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .in("id", actorIds);
    nomes = new Map(
      (profs ?? []).map((p) => [p.id, p.nome?.trim() || p.email || "Usuário"]),
    );
  }

  return rows.map((r) => ({
    ...r,
    actor_nome: r.actor_id ? nomes.get(r.actor_id) ?? "Usuário" : "Sistema",
  })) as ConsultaStatusLogItem[];
}

/* Cupons: tipos e CRUD migrados para src/lib/cupons.ts */

/* ─────────────────────────────────────────────────────────────────────────
 * DOCUMENTOS / PRESCRIÇÕES (visão do médico)
 * ────────────────────────────────────────────────────────────────────── */

export type DocumentoMedico = {
  consulta_id: string;
  consulta_inicio: string;
  consulta_status: ConsultaStatus;
  paciente_id: string;
  paciente_nome: string | null;
  especialidade_nome: string | null;
  prescricao_id: string | null;
  prescricao_emitida_em: string | null;
  prescricao_validade_dias: number | null;
  prescricao_qtd_medicamentos: number;
  tem_prontuario: boolean;
  qtd_anexos: number;
};

export type DocumentoFiltro = "todos" | "emitidas" | "pendentes" | "vencidas";

/** Lista consultas do médico com info de prescrição/prontuário/anexos. */
export async function listDocumentosDoMedico(): Promise<DocumentoMedico[]> {
  const medicoId = await getMedicoAtualId();
  if (!medicoId) return [];

  const consultas = await listConsultasDoMedico();
  if (consultas.length === 0) return [];

  const consultaIds = consultas.map((c) => c.id);

  const [{ data: presc }, { data: pront }, { data: anex }] = await Promise.all([
    supabase
      .from("prescricoes")
      .select("id, consulta_id, emitida_em, validade_dias, medicamentos")
      .in("consulta_id", consultaIds),
    supabase.from("prontuarios").select("consulta_id").in("consulta_id", consultaIds),
    supabase.from("anexos_consulta").select("consulta_id").in("consulta_id", consultaIds),
  ]);

  const prescPorConsulta = new Map<string, any>();
  (presc ?? []).forEach((p: any) => prescPorConsulta.set(p.consulta_id, p));
  const prontSet = new Set((pront ?? []).map((p: any) => p.consulta_id));
  const anexCount = new Map<string, number>();
  (anex ?? []).forEach((a: any) => {
    anexCount.set(a.consulta_id, (anexCount.get(a.consulta_id) ?? 0) + 1);
  });

  return consultas.map<DocumentoMedico>((c) => {
    const p = prescPorConsulta.get(c.id);
    const meds = Array.isArray(p?.medicamentos) ? p.medicamentos : [];
    return {
      consulta_id: c.id,
      consulta_inicio: c.inicio,
      consulta_status: c.status,
      paciente_id: c.paciente_id,
      paciente_nome: c.paciente_nome ?? null,
      especialidade_nome: c.especialidade_nome ?? null,
      prescricao_id: p?.id ?? null,
      prescricao_emitida_em: p?.emitida_em ?? null,
      prescricao_validade_dias: p?.validade_dias ?? null,
      prescricao_qtd_medicamentos: meds.length,
      tem_prontuario: prontSet.has(c.id),
      qtd_anexos: anexCount.get(c.id) ?? 0,
    };
  });
}

/** Emite uma prescrição simulada para a consulta (apenas se ainda não houver). */
export async function emitirPrescricaoSimulada(consultaId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: existente } = await supabase
    .from("prescricoes")
    .select("id")
    .eq("consulta_id", consultaId)
    .maybeSingle();
  if (existente) return { ok: false, error: "Já existe uma prescrição para esta consulta." };

  const medicamentos = [
    {
      nome: "Dipirona Sódica 500mg",
      posologia: "1 comprimido a cada 6 horas se dor ou febre",
      duracao: "5 dias",
    },
    {
      nome: "Omeprazol 20mg",
      posologia: "1 cápsula em jejum, uma vez ao dia",
      duracao: "14 dias",
    },
  ];

  const { error } = await supabase.from("prescricoes").insert({
    consulta_id: consultaId,
    medicamentos,
    orientacoes:
      "Prescrição simulada gerada automaticamente para fins de demonstração. Ingerir bastante líquido e retornar em caso de piora.",
    validade_dias: 30,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================
// Atendimento Imediato — config dinâmica do serviço público
// ============================================================
export type AtendimentoImediatoConfig = {
  servico_id: string;
  nome: string;
  preco_centavos: number;
  duracao_min: number;
  modelo: "percentual" | "valor_fixo";
  comissao_pct: number | null;
  valor_fixo_centavos: number | null;
};

export async function getServicoAtendimentoImediato(): Promise<AtendimentoImediatoConfig | null> {
  const { data: cfg } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "atendimento_imediato.servico_id")
    .maybeSingle();
  const servicoId = (cfg?.value as string | null) ?? null;
  if (!servicoId) return null;
  const { data: svc, error } = await supabase
    .from("servicos_financeiros")
    .select("id, nome, valor_paciente_centavos, duracao_min, modelo, comissao_pct, valor_fixo_centavos")
    .eq("id", servicoId)
    .maybeSingle();
  if (error || !svc) return null;
  return {
    servico_id: svc.id,
    nome: svc.nome,
    preco_centavos: svc.valor_paciente_centavos ?? 0,
    duracao_min: svc.duracao_min ?? 30,
    modelo: svc.modelo as "percentual" | "valor_fixo",
    comissao_pct: svc.comissao_pct as number | null,
    valor_fixo_centavos: svc.valor_fixo_centavos as number | null,
  };
}

export async function updateServicoAtendimentoImediato(
  servicoId: string,
  patch: Partial<{
    valor_paciente_centavos: number;
    duracao_min: number;
    modelo: "percentual" | "valor_fixo";
    comissao_pct: number | null;
    valor_fixo_centavos: number | null;
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("servicos_financeiros")
    .update(patch as any)
    .eq("id", servicoId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Canal cross-tab para sinalizar mudanças do serviço de atendimento imediato. */
export const ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL = "atendimento_imediato_config_v1";
export function broadcastAtendimentoImediatoConfigChanged() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const ch = new BroadcastChannel(ATENDIMENTO_IMEDIATO_CONFIG_CHANNEL);
    ch.postMessage({ t: "changed", at: Date.now() });
    ch.close();
  } catch {
    // no-op
  }
}
