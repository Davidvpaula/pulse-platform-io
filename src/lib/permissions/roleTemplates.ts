/**
 * Templates de função — presets de permissões que o Admin pode aplicar
 * de uma vez a um colaborador ou a uma função interna.
 *
 * Cada template define um conjunto de permission_keys que devem ser concedidas.
 */

export type RoleTemplate = {
  key: string;
  label: string;
  description: string;
  permissions: string[];
};

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: "secretaria",
    label: "Secretária",
    description: "Agenda, pacientes, agendamentos e comunicação básica.",
    permissions: [
      "pacientes.ver",
      "agenda.ver_todas",
      "comunicacao.ver_inbox",
      "comunicacao.usar_templates",
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    description: "Visão financeira completa, serviços e cupons.",
    permissions: [
      "financeiro.ver",
      "financeiro.servicos_gerenciar",
      "pacientes.ver",
    ],
  },
  {
    key: "supervisor",
    label: "Supervisor",
    description: "Visão de equipe, relatórios operacionais, pendências e auditoria.",
    permissions: [
      "pacientes.ver",
      "agenda.ver_todas",
      "supervisor.fila_geral",
      "supervisor.pendencias_feegow",
      "supervisor.ver_produtividade",
      "relatorios.ver_operacional",
      "auditoria.ver",
      "comunicacao.ver_inbox",
      "comunicacao.ver_metricas",
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    description: "Pacientes, comunicação e métricas de conversão.",
    permissions: [
      "pacientes.ver",
      "comunicacao.ver_inbox",
      "comunicacao.usar_templates",
      "comunicacao.ver_metricas",
    ],
  },
  {
    key: "suporte",
    label: "Suporte",
    description: "Pacientes, agendamentos e inbox.",
    permissions: [
      "pacientes.ver",
      "agenda.ver_todas",
      "comunicacao.ver_inbox",
    ],
  },
  {
    key: "gestor_operacional",
    label: "Gestor Operacional",
    description: "Acesso completo a operação, financeiro e supervisão.",
    permissions: [
      "pacientes.ver",
      "agenda.ver_todas",
      "financeiro.ver",
      "financeiro.servicos_gerenciar",
      "supervisor.fila_geral",
      "supervisor.pendencias_feegow",
      "supervisor.ver_produtividade",
      "relatorios.ver_operacional",
      "auditoria.ver",
      "comunicacao.ver_inbox",
      "comunicacao.usar_templates",
      "comunicacao.ver_metricas",
    ],
  },
];
