import type { ProfileKey } from "./profiles";

/**
 * Sistema de permissões mockado.
 *
 * Modelo:
 *   1. Cada PERFIL principal (paciente, medico, secretaria, admin, empresa) tem
 *      uma matriz base de capacidades por recurso/ação.
 *   2. Internamente, o Admin pode liberar CAPABILITIES adicionais a um usuário
 *      (ex.: "secretaria.supervisor", "medico.comunicacao"). Essas capabilities
 *      controlam menus, botões e telas extras dentro do mesmo dashboard.
 *
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
  // Colaborador: matriz mock vazia. As permissões reais vêm de has_permission no banco.
  colaborador: {},
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
  medico: ["/app/medico", "/app/comunicacao"], // comunicação restrita por capability no menu
  secretaria: ["/app/secretaria", "/app/comunicacao"],
  colaborador: ["/app/colaborador", "/app/secretaria", "/app/comunicacao"],
  admin: ["/app"], // acesso total
  empresa: ["/app/empresa"],
};

export function canAccessPath(profile: ProfileKey, pathname: string): boolean {
  const areas = allowedAreas[profile] ?? [];
  if (areas.includes("/app")) return pathname.startsWith("/app");
  return areas.some(a => pathname.startsWith(a));
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CAPABILITIES (LEGADO) — flags mock usadas por algumas páginas para mostrar/
 * ocultar widgets internos. NÃO são mais consultadas para montar o menu lateral
 * (o menu agora usa has_permission do banco via usePermissionsBatch).
 *
 * Este mock é mantido apenas para 3 consumidores legados:
 *   - SecretariaDashboard (flag "secretaria.supervisor")
 *   - MedicoDashboard ("medico.financeiro")
 *   - AdminConfiguracoes ("financeiro.editar_comissao" — read-only check)
 *
 * Quando esses 3 lugares migrarem para usePermission, este bloco pode ser
 * removido inteiro junto com hasCapability/toggleCapability em useAuth.
 * ────────────────────────────────────────────────────────────────────────── */

export type Capability =
  // Secretaria
  | "secretaria.supervisor"
  | "secretaria.financeiro"
  | "secretaria.reembolso"
  | "comunicacao.acessar"
  | "comunicacao.todas_conversas"
  // Médico
  | "medico.comunicacao"
  | "medico.feegow"
  | "medico.financeiro"
  // Empresa
  | "empresa.relatorios"
  | "empresa.financeiro"
  // Espelho mínimo de chave do banco usada por AdminConfiguracoes (legado)
  | "financeiro.editar_comissao";

/** Capabilities padrão por perfil — apenas para retrocompatibilidade dos 3 widgets legados. */
export const defaultCapabilities: Record<ProfileKey, Capability[]> = {
  paciente: [],
  medico: ["medico.comunicacao", "medico.feegow", "medico.financeiro"],
  secretaria: ["comunicacao.acessar", "secretaria.financeiro"],
  colaborador: ["comunicacao.acessar"],
  admin: [
    "secretaria.supervisor", "secretaria.financeiro", "secretaria.reembolso",
    "comunicacao.acessar", "comunicacao.todas_conversas",
    "medico.comunicacao", "medico.feegow", "medico.financeiro",
    "empresa.relatorios", "empresa.financeiro",
    "financeiro.editar_comissao",
  ],
  empresa: ["empresa.relatorios", "empresa.financeiro"],
};
