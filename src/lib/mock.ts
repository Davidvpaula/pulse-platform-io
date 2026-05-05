/* ============================================================================
 * SISTEMA DE STATUS GLOBAL (tipos e constantes reutilizáveis)
 * ========================================================================= */

export type Status =
  | "paciente_criado"
  | "feegow_enviado"
  | "feegow_sincronizado"
  | "agendamento_criado"
  | "confirmado"
  | "aguardando"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "no_show";

export const statusLabel: Record<Status, string> = {
  paciente_criado: "Paciente criado",
  feegow_enviado: "Enviado para Feegow",
  feegow_sincronizado: "Sincronizado",
  agendamento_criado: "Agendamento criado",
  confirmado: "Confirmado",
  aguardando: "Aguardando pagamento",
  em_andamento: "Em atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  no_show: "No-show",
};

export const statusTone: Record<Status, string> = {
  paciente_criado: "bg-info/10 text-info border-info/20",
  feegow_enviado: "bg-warning/10 text-warning border-warning/30",
  feegow_sincronizado: "bg-accent/15 text-accent border-accent/30",
  agendamento_criado: "bg-info/10 text-info border-info/20",
  confirmado: "bg-success/10 text-success border-success/20",
  aguardando: "bg-warning/10 text-warning border-warning/30",
  em_andamento: "bg-primary/10 text-primary border-primary/20",
  concluido: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-destructive/10 text-destructive border-destructive/20",
};

export const statusGroups = {
  paciente: ["paciente_criado", "feegow_enviado", "feegow_sincronizado"] as Status[],
  agendamento: ["agendamento_criado", "confirmado", "aguardando", "em_andamento", "concluido", "cancelado", "no_show"] as Status[],
};

/* ============================================================================
 * TIMELINE — tipos reutilizáveis
 * ========================================================================= */

export type TimelineKind =
  | "cadastro" | "feegow" | "agendamento" | "atendimento"
  | "documento" | "mensagem" | "alteracao" | "pagamento";

export type TimelineEvent = {
  id: string;
  pacienteId: string;
  kind: TimelineKind;
  titulo: string;
  desc?: string;
  data: string;
  ator?: string;
};

/* ============================================================================
 * TIPOS LEGADOS (usados por feegow.ts)
 * ========================================================================= */

export type Paciente = {
  id: string;
  nome: string;
  vinculo: "particular" | "empresarial";
  empresa?: string;
  plano?: string;
  status: Status;
  criadoEm: string;
  ultimaConsulta?: string;
};

export type Agendamento = {
  id: string;
  pacienteId: string;
  paciente: string;
  medico: string;
  esp: string;
  data: string;
  hora: string;
  modalidade: "Telemedicina" | "Empresarial" | "Pronto atendimento" | "Retorno";
  canal: "App" | "WhatsApp" | "Site" | "Empresa";
  status: Status;
  origem?: string;
};

export type Automacao = {
  id: string;
  trigger: string;
  acao: string;
  ativo: boolean;
  execucoes24h: number;
  sucesso: number;
  ultimoLog: string;
};

/* Dados mock removidos — todas as telas agora carregam do banco de dados. */
