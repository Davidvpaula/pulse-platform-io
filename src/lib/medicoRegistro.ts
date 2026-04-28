/**
 * Mock store de cadastros de médicos.
 * Persiste em localStorage. Quando Lovable Cloud for ativado, esta camada
 * pode ser substituída por chamadas reais (Supabase + Storage).
 */

export type DocKind = "crm" | "rqe" | "documento_pessoal" | "selfie";

export type DocumentoMedico = {
  kind: DocKind;
  fileName: string;
  size: number;
  mimeType: string;
  /** dataURL — apenas para preview no mock; em produção será URL assinada do Storage */
  dataUrl: string;
  uploadedAt: string;
};

export type MedicoStatus = "pendente" | "em_analise" | "aprovado" | "reprovado";

export type AuditoriaEntry = {
  at: string;
  ator: string;
  acao: "criado" | "em_analise" | "aprovado" | "reprovado" | "correcao_solicitada";
  motivo?: string;
};

export type MedicoCadastro = {
  id: string;
  nome: string;
  crm: string;
  ufCrm: string;
  especialidade: string;
  telefone: string;
  email: string;
  /** mock — em produção nunca armazenamos senha em claro */
  senhaHash: string;
  status: MedicoStatus;
  motivoCorrecao?: string;
  documentos: DocumentoMedico[];
  criadoEm: string;
  atualizadoEm: string;
  auditoria: AuditoriaEntry[];
};

const KEY = "lasmar.medicoRegistros";
const SESSION_KEY = "lasmar.medicoSessionId";

function read(): MedicoCadastro[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(list: MedicoCadastro[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("lasmar:medicos-changed"));
}

export const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export const ESPECIALIDADES = [
  "Cardiologia","Clínica Geral","Dermatologia","Endocrinologia","Ginecologia",
  "Neurologia","Ortopedia","Pediatria","Psiquiatria","Urologia","Outra",
];

export function listMedicos(): MedicoCadastro[] {
  return read().sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function getMedico(id: string): MedicoCadastro | undefined {
  return read().find(m => m.id === id);
}

export function getMedicoByEmail(email: string): MedicoCadastro | undefined {
  return read().find(m => m.email.toLowerCase() === email.toLowerCase());
}

export function getCurrentMedicoId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setCurrentMedicoId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

/** "hash" simbólico — apenas para demo, NÃO usar em produção. */
function fakeHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `mock$${h}`;
}

export function createMedico(input: {
  nome: string; crm: string; ufCrm: string; especialidade: string;
  telefone: string; email: string; senha: string;
  documentos: DocumentoMedico[];
}): MedicoCadastro {
  const list = read();
  if (list.some(m => m.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("Já existe um cadastro com este e-mail.");
  }
  if (list.some(m => m.crm === input.crm && m.ufCrm === input.ufCrm)) {
    throw new Error("Já existe um cadastro com este CRM/UF.");
  }
  const now = new Date().toISOString();
  const novo: MedicoCadastro = {
    id: `med_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    nome: input.nome.trim(),
    crm: input.crm.trim(),
    ufCrm: input.ufCrm,
    especialidade: input.especialidade,
    telefone: input.telefone.trim(),
    email: input.email.trim().toLowerCase(),
    senhaHash: fakeHash(input.senha),
    status: "pendente",
    documentos: input.documentos,
    criadoEm: now,
    atualizadoEm: now,
    auditoria: [{ at: now, ator: "sistema", acao: "criado" }],
  };
  list.push(novo);
  write(list);
  return novo;
}

export function updateStatus(
  id: string,
  status: MedicoStatus,
  ator: string,
  motivo?: string,
): MedicoCadastro | undefined {
  const list = read();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  const acao =
    status === "aprovado" ? "aprovado" :
    status === "reprovado" ? "reprovado" :
    status === "em_analise" ? "em_analise" : "criado";
  list[idx] = {
    ...list[idx],
    status,
    motivoCorrecao: status === "reprovado" || status === "pendente" ? motivo : undefined,
    atualizadoEm: now,
    auditoria: [...list[idx].auditoria, { at: now, ator, acao, motivo }],
  };
  write(list);
  return list[idx];
}

export function solicitarCorrecao(id: string, ator: string, motivo: string) {
  const list = read();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) return;
  const now = new Date().toISOString();
  list[idx] = {
    ...list[idx],
    status: "pendente",
    motivoCorrecao: motivo,
    atualizadoEm: now,
    auditoria: [...list[idx].auditoria, { at: now, ator, acao: "correcao_solicitada", motivo }],
  };
  write(list);
  return list[idx];
}

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

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
