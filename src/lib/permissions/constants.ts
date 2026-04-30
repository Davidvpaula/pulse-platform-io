export const RISCO_COLORS: Record<string, string> = {
  baixo: "bg-muted text-muted-foreground",
  medio: "bg-info/15 text-info",
  alto: "bg-warning/15 text-warning",
  critico: "bg-destructive/15 text-destructive",
};

export const ORIGEM_LABEL: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "bg-primary/15 text-primary" },
  revoke_individual: { label: "Bloqueado", cls: "bg-destructive/15 text-destructive" },
  grant_individual: { label: "Concedida", cls: "bg-success/15 text-success" },
  funcao: { label: "Via função", cls: "bg-info/15 text-info" },
  role: { label: "Via perfil", cls: "bg-secondary/40 text-foreground" },
  nenhum: { label: "—", cls: "bg-muted text-muted-foreground" },
};

export const FUNCOES = [
  { key: "secretaria", label: "Secretaria" },
  { key: "supervisor", label: "Supervisor" },
  { key: "financeiro", label: "Financeiro" },
  { key: "comercial", label: "Comercial" },
  { key: "atendimento", label: "Atendimento" },
  { key: "suporte", label: "Suporte" },
  { key: "gestor_operacional", label: "Gestor Operacional" },
  { key: "outro", label: "Outro" },
] as const;

export const ROLES = [
  { key: "paciente", label: "Paciente" },
  { key: "medico", label: "Médico" },
  { key: "secretaria", label: "Colaborador" },
  { key: "admin", label: "Admin" },
  { key: "empresa", label: "Empresa" },
] as const;

export const STATUS_BADGE: Record<string, string> = {
  ativo: "bg-success/15 text-success",
  pendente_convite: "bg-warning/15 text-warning",
  suspenso: "bg-warning/15 text-warning",
  bloqueado: "bg-destructive/15 text-destructive",
  removido: "bg-muted text-muted-foreground",
};
