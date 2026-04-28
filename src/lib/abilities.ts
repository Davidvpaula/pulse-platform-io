import type { ProfileKey } from "./profiles";

/**
 * Sistema de permissões mockado.
 * Estrutura preparada para futura integração com backend real (claims/JWT).
 */

export type Action = "view" | "create" | "edit" | "delete";

export type Resource =
  | "agenda.own"
  | "agenda.others"
  | "consulta.start"
  | "prontuario.feegow"
  | "consulta.cancel"
  | "usuarios"
  | "integracoes"
  | "financeiro.platform"
  | "financeiro.own"
  | "relatorios.empresa"
  | "whatsapp.central"
  | "permissoes"
  | "auditoria"
  | "tarefas"
  | "configuracoes.criticas"
  | "empresa.dados"
  | "medico.dados.outros";

type Matrix = Partial<Record<Resource, Action[] | "*">>;

const ALL: Action[] = ["view", "create", "edit", "delete"];

export const abilities: Record<ProfileKey, Matrix> = {
  paciente: {
    "agenda.own": ALL,
    "consulta.start": ["view"],
    "consulta.cancel": ["view", "edit"],
    "financeiro.own": ["view"],
  },
  paciente_empresa: {
    "agenda.own": ["view", "create"],
    "consulta.start": ["view"],
    "consulta.cancel": ["view", "edit"],
  },
  medico: {
    "agenda.own": ALL,
    "consulta.start": ALL,
    "prontuario.feegow": ["view", "edit"],
    "consulta.cancel": ALL,
    "financeiro.own": ["view"],
    "tarefas": ["view"],
  },
  secretaria: {
    "agenda.own": ALL,
    "agenda.others": ["view", "edit"],
    "consulta.cancel": ALL,
    "whatsapp.central": ["view", "edit"],
    "tarefas": ALL,
  },
  supervisor: {
    "agenda.own": ALL,
    "agenda.others": ALL,
    "consulta.cancel": ALL,
    "whatsapp.central": ALL,
    "tarefas": ALL,
    "financeiro.platform": ["view"],
    "relatorios.empresa": ["view"],
  },
  admin: {
    "agenda.own": ALL,
    "agenda.others": ALL,
    "consulta.start": ALL,
    "prontuario.feegow": ["view"],
    "consulta.cancel": ALL,
    "usuarios": ALL,
    "integracoes": ["view", "edit"],
    "financeiro.platform": ALL,
    "relatorios.empresa": ALL,
    "whatsapp.central": ALL,
    "permissoes": ["view", "edit"],
    "tarefas": ALL,
    "medico.dados.outros": ["view", "edit"],
    "empresa.dados": ALL,
  },
  superadmin: {
    "agenda.own": "*",
    "agenda.others": "*",
    "consulta.start": "*",
    "prontuario.feegow": "*",
    "consulta.cancel": "*",
    "usuarios": "*",
    "integracoes": "*",
    "financeiro.platform": "*",
    "financeiro.own": "*",
    "relatorios.empresa": "*",
    "whatsapp.central": "*",
    "permissoes": "*",
    "auditoria": "*",
    "tarefas": "*",
    "configuracoes.criticas": "*",
    "empresa.dados": "*",
    "medico.dados.outros": "*",
  },
  empresa: {
    "agenda.others": ["view"],
    "relatorios.empresa": ["view"],
    "empresa.dados": ["view", "edit"],
    "financeiro.own": ["view"],
  },
  comunicacao: {
    "whatsapp.central": ALL,
    "tarefas": ["view", "create", "edit"],
  },
};

export function can(profile: ProfileKey, resource: Resource, action: Action = "view"): boolean {
  const m = abilities[profile]?.[resource];
  if (!m) return false;
  if (m === "*") return true;
  return m.includes(action);
}

/** Mapa de quais áreas (basePath) cada perfil pode acessar */
export const allowedAreas: Record<ProfileKey, string[]> = {
  paciente: ["/app/paciente"],
  paciente_empresa: ["/app/paciente"],
  medico: ["/app/medico"],
  secretaria: ["/app/secretaria", "/app/comunicacao"],
  supervisor: ["/app/supervisor", "/app/secretaria", "/app/comunicacao"],
  admin: ["/app/admin", "/app/comunicacao", "/app/secretaria", "/app/medico", "/app/empresa", "/app/paciente"],
  superadmin: ["/app"],
  empresa: ["/app/empresa"],
  comunicacao: ["/app/comunicacao"],
};

export function canAccessPath(profile: ProfileKey, pathname: string): boolean {
  const areas = allowedAreas[profile] ?? [];
  if (areas.includes("/app")) return pathname.startsWith("/app");
  return areas.some(a => pathname.startsWith(a));
}
