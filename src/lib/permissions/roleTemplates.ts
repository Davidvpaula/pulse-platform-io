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
    description: "Visão financeira completa, serviços, cupons e gestão de saques.",
    permissions: [
      "financeiro.ver",
      "financeiro.servicos_gerenciar",
      "financeiro.saques_ver",
      "financeiro.saques_aprovar",
      "financeiro.saques_recusar",
      "financeiro.saques_marcar_pago",
      "financeiro.saques_solicitar_correcao",
      "financeiro.dados_bancarios_ver",
      "financeiro.saques_config",
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
      "financeiro.saques_ver",
      "financeiro.saques_aprovar",
      "financeiro.saques_recusar",
      "financeiro.saques_marcar_pago",
      "financeiro.saques_solicitar_correcao",
      "financeiro.dados_bancarios_ver",
      "financeiro.saques_config",
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
  {
    key: "atendimento_ilimitado",
    label: "Atendimento Ilimitado",
    description: "Vê e gerencia todas as conversas do Inbox. Não acessa configurações sensíveis.",
    permissions: [
      "pacientes.ver",
      "agenda.ver_todas",
      "comunicacao.ver_inbox",
      "comunicacao.ver_todas",
      "comunicacao.ver_atribuidas",
      "comunicacao.responder",
      "comunicacao.transferir",
      "comunicacao.finalizar",
      "comunicacao.inbox.assumir",
      "comunicacao.inbox.encerrar",
      "comunicacao.usar_templates",
      "comunicacao.ver_metricas",
      "comunicacao.inbox.resolver",
      "comunicacao.inbox.alterar_prioridade",
      "comunicacao.inbox.supervisionar",
      "comunicacao.metricas.operacionais",
    ],
  },
];
