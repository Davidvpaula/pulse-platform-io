/* ============================================================================
 * INTEGRAÇÃO FEEGOW — arquitetura, schema lógico e mocks
 * ----------------------------------------------------------------------------
 * Este arquivo NÃO faz chamadas reais à API.
 * Concentra toda a lógica preparada para a integração futura via backend:
 *   - schema lógico (tabelas/coleções e seus campos)
 *   - status internos x status Feegow (mapeamento)
 *   - validações obrigatórias antes de enviar para Feegow
 *   - logs de integração (mock)
 *   - pendências de sincronização (mock)
 *
 * IMPORTANTE: nenhum token é exposto no front-end.
 * Toda comunicação real deve ocorrer via backend (edge functions / servidor).
 * ========================================================================= */

import type { Agendamento, Paciente } from "./mock";

/* ──────────────────────────────────────────────────────────────────────────
 * SCHEMA LÓGICO — usado para documentação visual no Admin
 * ──────────────────────────────────────────────────────────────────────── */

export type FieldDef = {
  nome: string;
  tipo: "uuid" | "text" | "int" | "decimal" | "date" | "datetime" | "json" | "enum" | "fk";
  obrigatorio?: boolean;
  feegow?: boolean;        // campo destinado a armazenar ID/dado da Feegow
  descricao?: string;
};

export type TableDef = {
  nome: string;
  descricao: string;
  campos: FieldDef[];
};

export const feegowSchema: TableDef[] = [
  {
    nome: "patients",
    descricao: "Pacientes da plataforma com IDs externos da Feegow.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true, descricao: "ID interno" },
      { nome: "feegow_patient_id", tipo: "int", feegow: true, descricao: "ID do paciente na Feegow" },
      { nome: "nome", tipo: "text", obrigatorio: true },
      { nome: "cpf", tipo: "text", obrigatorio: true },
      { nome: "telefone", tipo: "text", obrigatorio: true },
      { nome: "email", tipo: "text", obrigatorio: true },
      { nome: "data_nascimento", tipo: "date" },
      { nome: "empresa_id", tipo: "fk", descricao: "FK para companies (se vínculo empresarial)" },
      { nome: "tipo_vinculo", tipo: "enum", descricao: "particular | empresarial" },
      { nome: "status_sincronizacao_feegow", tipo: "enum", feegow: true, descricao: "pendente | sincronizado | erro" },
      { nome: "ultimo_envio_feegow", tipo: "datetime", feegow: true },
      { nome: "erro_feegow", tipo: "text", feegow: true },
    ],
  },
  {
    nome: "doctors",
    descricao: "Profissionais e seus IDs externos + configuração Google Meet.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "feegow_professional_id", tipo: "int", feegow: true },
      { nome: "nome", tipo: "text", obrigatorio: true },
      { nome: "crm", tipo: "text", obrigatorio: true },
      { nome: "especialidades", tipo: "json", descricao: "Lista de specialty_id" },
      { nome: "email", tipo: "text" },
      { nome: "telefone", tipo: "text" },
      { nome: "google_meet_link_fixo", tipo: "text", descricao: "Usado quando tipo_link_consulta=fixo" },
      { nome: "google_calendar_connected", tipo: "enum", descricao: "sim | nao" },
      { nome: "tipo_link_consulta", tipo: "enum", descricao: "fixo | dinamico | pendente" },
      { nome: "status_sincronizacao_feegow", tipo: "enum", feegow: true },
    ],
  },
  {
    nome: "specialties",
    descricao: "Especialidades médicas espelhadas com a Feegow.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "feegow_specialty_id", tipo: "int", feegow: true },
      { nome: "nome", tipo: "text", obrigatorio: true },
      { nome: "status", tipo: "enum", descricao: "ativo | inativo" },
    ],
  },
  {
    nome: "procedures",
    descricao: "Procedimentos/serviços oferecidos.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "feegow_procedure_id", tipo: "int", feegow: true },
      { nome: "nome", tipo: "text", obrigatorio: true },
      { nome: "valor", tipo: "decimal" },
      { nome: "tipo", tipo: "enum", descricao: "consulta | pronto-atendimento | retorno | empresarial" },
      { nome: "especialidade_id", tipo: "fk" },
      { nome: "status", tipo: "enum" },
    ],
  },
  {
    nome: "appointments",
    descricao: "Agendamentos com referência cruzada interna ↔ Feegow.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "feegow_appointment_id", tipo: "int", feegow: true },
      { nome: "patient_id", tipo: "fk", obrigatorio: true },
      { nome: "feegow_patient_id", tipo: "int", feegow: true },
      { nome: "doctor_id", tipo: "fk", obrigatorio: true },
      { nome: "feegow_professional_id", tipo: "int", feegow: true },
      { nome: "specialty_id", tipo: "fk", obrigatorio: true },
      { nome: "feegow_specialty_id", tipo: "int", feegow: true },
      { nome: "procedure_id", tipo: "fk", obrigatorio: true },
      { nome: "feegow_procedure_id", tipo: "int", feegow: true },
      { nome: "data", tipo: "date", obrigatorio: true },
      { nome: "horario", tipo: "text", obrigatorio: true },
      { nome: "valor", tipo: "decimal" },
      { nome: "canal_id", tipo: "fk" },
      { nome: "feegow_channel_id", tipo: "int", feegow: true },
      { nome: "status_interno", tipo: "enum", obrigatorio: true },
      { nome: "status_feegow_id", tipo: "int", feegow: true },
      { nome: "status_sincronizacao_feegow", tipo: "enum", feegow: true },
      { nome: "google_meet_link", tipo: "text" },
      { nome: "origem", tipo: "enum", descricao: "paciente | empresa | secretaria | admin | whatsapp" },
      { nome: "empresa_id", tipo: "fk" },
      { nome: "criado_por", tipo: "uuid" },
      { nome: "notas", tipo: "text" },
      { nome: "ultimo_envio_feegow", tipo: "datetime", feegow: true },
      { nome: "erro_feegow", tipo: "text", feegow: true },
    ],
  },
  {
    nome: "companies",
    descricao: "Empresas/clientes corporativos.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "nome", tipo: "text", obrigatorio: true },
      { nome: "cnpj", tipo: "text", obrigatorio: true },
      { nome: "status", tipo: "enum" },
      { nome: "plano_id", tipo: "fk" },
      { nome: "contato_responsavel", tipo: "text" },
      { nome: "email", tipo: "text" },
      { nome: "telefone", tipo: "text" },
    ],
  },
  {
    nome: "company_employees",
    descricao: "Vínculo entre empresa e paciente.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "empresa_id", tipo: "fk", obrigatorio: true },
      { nome: "patient_id", tipo: "fk", obrigatorio: true },
      { nome: "feegow_patient_id", tipo: "int", feegow: true },
      { nome: "nome", tipo: "text" },
      { nome: "cpf", tipo: "text" },
      { nome: "cargo", tipo: "text" },
      { nome: "setor", tipo: "text" },
      { nome: "unidade", tipo: "text" },
      { nome: "status", tipo: "enum" },
    ],
  },
  {
    nome: "integration_logs",
    descricao: "Histórico de tentativas de sincronização com sistemas externos.",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "tipo_integracao", tipo: "enum", descricao: "feegow | whatsapp | meet" },
      { nome: "entidade", tipo: "enum", descricao: "paciente | agendamento | medico | especialidade | procedimento" },
      { nome: "entidade_id_interno", tipo: "uuid" },
      { nome: "entidade_id_feegow", tipo: "int", feegow: true },
      { nome: "acao", tipo: "enum", descricao: "criar | atualizar | sincronizar | cancelar | remarcar" },
      { nome: "status", tipo: "enum", descricao: "sucesso | erro | pendente" },
      { nome: "payload_enviado", tipo: "json" },
      { nome: "resposta_recebida", tipo: "json" },
      { nome: "mensagem_erro", tipo: "text" },
      { nome: "data_hora", tipo: "datetime", obrigatorio: true },
    ],
  },
  {
    nome: "communication_events",
    descricao: "Eventos automáticos de comunicação (WhatsApp/email/notificações).",
    campos: [
      { nome: "id", tipo: "uuid", obrigatorio: true },
      { nome: "tipo", tipo: "enum", descricao: "whatsapp | email | notificacao | tarefa" },
      { nome: "origem", tipo: "text" },
      { nome: "destino", tipo: "text" },
      { nome: "paciente_id", tipo: "fk" },
      { nome: "medico_id", tipo: "fk" },
      { nome: "empresa_id", tipo: "fk" },
      { nome: "agendamento_id", tipo: "fk" },
      { nome: "mensagem", tipo: "text" },
      { nome: "status", tipo: "enum", descricao: "enviado | falha | pendente" },
      { nome: "data_hora", tipo: "datetime" },
    ],
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * STATUS — internos x Feegow
 * ──────────────────────────────────────────────────────────────────────── */

export type StatusInterno =
  | "criado"
  | "aguardando_sincronizacao"
  | "sincronizado_feegow"
  | "confirmado"
  | "aguardando_pagamento"
  | "em_atendimento"
  | "atendido"
  | "cancelado"
  | "remarcado"
  | "nao_compareceu"
  | "erro_sincronizacao";

export const statusInternoLabel: Record<StatusInterno, string> = {
  criado: "Criado",
  aguardando_sincronizacao: "Aguardando sincronização",
  sincronizado_feegow: "Sincronizado com Feegow",
  confirmado: "Confirmado",
  aguardando_pagamento: "Aguardando pagamento",
  em_atendimento: "Em atendimento",
  atendido: "Atendido",
  cancelado: "Cancelado",
  remarcado: "Remarcado",
  nao_compareceu: "Não compareceu",
  erro_sincronizacao: "Erro de sincronização",
};

/** Status conhecidos da Feegow (para mapeamento futuro). */
export type StatusFeegow =
  | "marcado_nao_confirmado"
  | "marcado_confirmado"
  | "aguardando_atendimento"
  | "em_atendimento"
  | "atendido"
  | "nao_compareceu"
  | "desmarcado_paciente"
  | "desmarcado_profissional"
  | "remarcado";

export const statusFeegowLabel: Record<StatusFeegow, string> = {
  marcado_nao_confirmado: "Marcado — não confirmado",
  marcado_confirmado: "Marcado — confirmado",
  aguardando_atendimento: "Aguardando atendimento",
  em_atendimento: "Em atendimento",
  atendido: "Atendido",
  nao_compareceu: "Não compareceu",
  desmarcado_paciente: "Desmarcado pelo paciente",
  desmarcado_profissional: "Desmarcado pelo profissional",
  remarcado: "Remarcado",
};

/** Mapeamento padrão (editável futuramente no Admin). */
export const statusMap: Array<{ interno: StatusInterno; feegow: StatusFeegow | null }> = [
  { interno: "criado", feegow: null },
  { interno: "aguardando_sincronizacao", feegow: null },
  { interno: "sincronizado_feegow", feegow: "marcado_nao_confirmado" },
  { interno: "confirmado", feegow: "marcado_confirmado" },
  { interno: "aguardando_pagamento", feegow: "marcado_nao_confirmado" },
  { interno: "em_atendimento", feegow: "em_atendimento" },
  { interno: "atendido", feegow: "atendido" },
  { interno: "cancelado", feegow: "desmarcado_profissional" },
  { interno: "remarcado", feegow: "remarcado" },
  { interno: "nao_compareceu", feegow: "nao_compareceu" },
  { interno: "erro_sincronizacao", feegow: null },
];

/* ──────────────────────────────────────────────────────────────────────────
 * VALIDAÇÕES — checklist obrigatório antes de enviar para a Feegow
 * ──────────────────────────────────────────────────────────────────────── */

export type ValidationResult = {
  ok: boolean;
  faltando: string[];
};

export const validatePacienteParaFeegow = (
  p: Partial<Paciente> & { cpf?: string; telefone?: string; email?: string; data_nascimento?: string }
): ValidationResult => {
  const faltando: string[] = [];
  if (!p.nome) faltando.push("Nome");
  if (!p.cpf) faltando.push("CPF");
  if (!p.telefone) faltando.push("Telefone");
  if (!p.email) faltando.push("E-mail");
  return { ok: faltando.length === 0, faltando };
};

export const validateAgendamentoParaFeegow = (
  a: Partial<Agendamento> & { procedimento?: string; valor?: number; origem?: string }
): ValidationResult => {
  const faltando: string[] = [];
  if (!a.pacienteId) faltando.push("Paciente vinculado");
  if (!a.medico) faltando.push("Médico vinculado");
  if (!a.esp) faltando.push("Especialidade");
  if (!a.procedimento) faltando.push("Procedimento");
  if (!a.data) faltando.push("Data");
  if (!a.hora) faltando.push("Horário");
  if (!a.canal) faltando.push("Canal de agendamento");
  if (a.valor == null) faltando.push("Valor");
  if (!a.origem) faltando.push("Origem");
  return { ok: faltando.length === 0, faltando };
};

/* ──────────────────────────────────────────────────────────────────────────
 * LOGS DE INTEGRAÇÃO (mock)
 * ──────────────────────────────────────────────────────────────────────── */

export type IntegrationLog = {
  id: string;
  data_hora: string;
  entidade: "paciente" | "agendamento" | "medico" | "especialidade" | "procedimento";
  entidade_id_interno: string;
  acao: "criar" | "atualizar" | "sincronizar" | "cancelar" | "remarcar";
  status: "sucesso" | "erro" | "pendente";
  mensagem: string;
};

export const integrationLogsMock: IntegrationLog[] = [
  { id: "L-1001", data_hora: "Hoje 14:32", entidade: "paciente", entidade_id_interno: "P-1003", acao: "criar", status: "pendente", mensagem: "Aguardando envio para Feegow." },
  { id: "L-1000", data_hora: "Hoje 14:22", entidade: "agendamento", entidade_id_interno: "C-1110", acao: "criar", status: "erro", mensagem: "Token de integração não configurado." },
  { id: "L-0999", data_hora: "Hoje 13:58", entidade: "agendamento", entidade_id_interno: "C-1112", acao: "criar", status: "sucesso", mensagem: "Mock: agendamento sincronizado (id Feegow simulado #44821)." },
  { id: "L-0998", data_hora: "Hoje 12:11", entidade: "paciente", entidade_id_interno: "P-1004", acao: "criar", status: "pendente", mensagem: "Empresa adicionou colaborador. Falta CPF." },
  { id: "L-0997", data_hora: "Hoje 11:02", entidade: "medico", entidade_id_interno: "M-RL", acao: "sincronizar", status: "sucesso", mensagem: "Lista de profissionais sincronizada (mock)." },
  { id: "L-0996", data_hora: "Ontem 18:40", entidade: "especialidade", entidade_id_interno: "E-CARD", acao: "sincronizar", status: "sucesso", mensagem: "Especialidades sincronizadas (mock)." },
];

/* ──────────────────────────────────────────────────────────────────────────
 * PENDÊNCIAS — derivadas dos mocks atuais
 * ──────────────────────────────────────────────────────────────────────── */

export type Pendencia = {
  tipo: "paciente" | "agendamento";
  id: string;
  titulo: string;
  motivo: string;
  acao: string;
};

export const pendenciasFeegow = (): Pendencia[] => {
  // Dados reais serão carregados do banco quando a integração Feegow estiver ativa.
  return [];
};

/* ──────────────────────────────────────────────────────────────────────────
 * CONFIG / STATUS DA INTEGRAÇÃO (mock — token vive apenas no backend)
 * ──────────────────────────────────────────────────────────────────────── */

export type FeegowConnectionState = {
  status: "conectado" | "pendente" | "erro";
  token_configurado: boolean;
  ultima_sincronizacao: string | null;
  ambiente: "produção" | "homologação";
  modo: "mock" | "real";
};

export const feegowConnection: FeegowConnectionState = {
  status: "pendente",
  token_configurado: false,
  ultima_sincronizacao: null,
  ambiente: "homologação",
  modo: "mock",
};
