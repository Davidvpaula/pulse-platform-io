import type { ProfileKey } from "./profiles";

/**
 * Matriz estática de capacidades por perfil.
 * Define quais recursos cada perfil pode acessar por natureza (regra de produto).
 * NÃO é usada para o menu lateral — que consulta has_permission no banco.
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
  admin: {
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
  colaborador: {
    "agenda.own": ALL,
    "agenda.others": ["view", "edit"],
    "consulta.cancel": ALL,
    "tarefas": ALL,
  },
};

export function can(profile: ProfileKey, resource: Resource, action: Action = "view"): boolean {
  const m = abilities[profile]?.[resource];
  if (!m) return false;
  if (m === "*") return true;
  return m.includes(action);
}
