export type EventoAuditoria = {
  modulo: string;
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_nome: string | null;
  acao: string;
  entidade_tipo: string | null;
  entidade_id: string | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  motivo: string | null;
  observacao: string | null;
  payload: any;
  risco: "baixo" | "medio" | "alto" | "critico";
  origem: "manual" | "sistema";
  revisado: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  revisao_nota: string | null;
  total_count: number;
};

export type FiltrosAuditoria = {
  inicio: string; // yyyy-mm-dd
  fim: string;
  modulo: string; // "todos" | valor
  risco: string;
  origem: string;
  actor: string | null; // uuid ou null
  entidadeId: string | null; // uuid ou null
  acao: string; // texto livre
  busca: string;
  actorTipo: string; // "todos" | "admin" | "medico" | "paciente" | "colaborador" | "supervisor" | "sistema"
  categoriaFinanceira: string; // texto livre, vazio = sem filtro
  correlationId: string; // texto livre, vazio = sem filtro
};

export const ACTOR_TIPOS_AUDITORIA = [
  { value: "admin", label: "Admin" },
  { value: "supervisor", label: "Supervisor" },
  { value: "medico", label: "Médico" },
  { value: "colaborador", label: "Colaborador" },
  { value: "paciente", label: "Paciente" },
  { value: "empresa", label: "Empresa" },
  { value: "sistema", label: "Sistema (sem ator)" },
];

export const CATEGORIAS_FINANCEIRAS_AUDITORIA = [
  { value: "consulta", label: "Consulta" },
  { value: "plano", label: "Plano" },
  { value: "assinatura", label: "Assinatura" },
  { value: "saque", label: "Saque" },
  { value: "repasse", label: "Repasse" },
  { value: "reembolso", label: "Reembolso" },
  { value: "estorno", label: "Estorno" },
  { value: "ajuste", label: "Ajuste" },
  { value: "personalizado", label: "Personalizado" },
];

export const MODULOS_AUDITORIA = [
  { value: "consultas", label: "Consultas" },
  { value: "colaboradores", label: "Colaboradores" },
  { value: "planos", label: "Planos & Assinaturas" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "financeiro", label: "Financeiro" },
  { value: "medicos", label: "Médicos" },
  { value: "pacientes", label: "Pacientes" },
  { value: "empresas", label: "Empresas" },
  { value: "permissoes", label: "Permissões" },
  { value: "geral", label: "Geral / Sistema" },
];

export const RISCOS_AUDITORIA = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
  { value: "critico", label: "Crítico" },
];

export const ORIGENS_AUDITORIA = [
  { value: "manual", label: "Manual" },
  { value: "sistema", label: "Sistema/Automático" },
];

export function classeRisco(r: string): string {
  const map: Record<string, string> = {
    critico: "bg-destructive/15 text-destructive border-destructive/30",
    alto: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    medio: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    baixo: "bg-muted text-muted-foreground",
  };
  return map[r] || map.baixo;
}

export function fmtDataHoraBR(s: string): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}
