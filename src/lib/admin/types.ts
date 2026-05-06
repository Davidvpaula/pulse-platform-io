/**
 * Types seguros para os retornos JSON/JSONB das RPCs do Admin.
 * Eliminam `as any` nas páginas.
 */

// ─── admin_visao_geral ───
export interface AdminVisaoGeralKpis {
  pacientes_total: number;
  pacientes_periodo: number;
  medicos_ativos: number;
  medicos_pendentes: number;
  empresas_total: number;
  agendamentos_periodo: number;
  faturamento_periodo_centavos: number;
  consultas_hoje: number;
  consultas_em_andamento: number;
  consultas_confirmadas_hoje: number;
  consultas_concluidas_hoje: number;
  consultas_canceladas_hoje: number;
}

export interface AdminVisaoGeralPendencias {
  confirmar_amanha: number;
  aguardando_pagamento: number;
  medicos_sem_sala: number;
  medicos_pendentes: number;
  colaboradores_pendentes: number;
}

export interface AdminAlerta {
  tone: "destructive" | "warning" | "info";
  titulo: string;
  desc: string;
}

export interface AdminAgendaRow {
  id: string;
  inicio: string;
  status: string;
  canal: string;
  paciente: string | null;
  medico: string | null;
}

export interface AdminPacienteRow {
  id: string;
  nome: string | null;
  status: string;
  created_at: string;
  empresa: string | null;
}

export interface AdminVisaoGeral {
  kpis: AdminVisaoGeralKpis;
  pendencias: AdminVisaoGeralPendencias;
  alertas: AdminAlerta[];
  ultimos_agendamentos: AdminAgendaRow[];
  ultimos_pacientes: AdminPacienteRow[];
}

// ─── financeiro_central_dashboard ───
export interface FinanceiroCentralDashboard {
  total_pagamentos: number;
  pagos: number;
  pendentes: number;
  cancelados: number;
  receita_bruta: number;
  receita_liquida: number;
  reembolsos_pendentes: number;
  fechamentos_abertos: number;
}

// ─── analytics_overview ───
export interface AnalyticsOverview {
  total_sessoes: number;
  usuarios_unicos: number;
  total_eventos: number;
  periodo_dias: number;
}

// ─── analytics_conversao ───
export interface AnalyticsConversao {
  sessoes: number;
  consultas: number;
  taxa: number;
}

// ─── analytics_financeiro ───
export interface AnalyticsFinanceiro {
  receita_bruta: number;
  receita_liquida: number;
  ticket_medio: number;
  total_pagamentos: number;
}

// ─── analytics_tempo_real ───
export interface AnalyticsTempoReal {
  sessoes_ativas: number;
  consultas_em_andamento: number;
  consultas_hoje: number;
}

// ─── analytics_trafego ───
export interface AnalyticsTrafego {
  dia: string;
  sessoes: number;
}

// ─── auditoria_dashboard ───
export interface AuditoriaDashboard {
  total_eventos: number;
  por_tipo: Array<{ event_type: string; total: number }> | null;
  por_ator: Array<{ actor_id: string; total: number }> | null;
}

// ─── permissoes_dashboard ───
export interface PermissoesDashboard {
  total_perfil_rules: number;
  total_funcao_rules: number;
  total_individual: number;
  total_revogadas: number;
  colaboradores_ativos: number;
}

// ─── relatorios_executivo ───
export interface RelatoriosExecutivo {
  consultas_total: number;
  consultas_concluidas: number;
  taxa_conclusao: number;
  receita_bruta: number;
  novos_pacientes: number;
  novos_medicos: number;
  cancelamentos: number;
  no_shows: number;
}

// ─── relatorios_clinica ───
export interface RelatoriosClinica {
  total_consultas: number;
  por_status: Array<{ status: string; total: number }> | null;
  por_modalidade: Array<{ modalidade: string; total: number }> | null;
  media_avaliacao: number | null;
}

// ─── relatorios_financeiro_snapshot ───
export interface RelatoriosFinanceiroSnapshot {
  receita_bruta: number;
  receita_liquida: number;
  total_pagamentos: number;
  ticket_medio: number;
  por_metodo: Array<{ metodo: string; total: number; valor: number }> | null;
}

// ─── plano_saude_financeira ───
export interface PlanoSaudeFinanceira {
  assinaturas_ativas: number;
  assinaturas_canceladas: number;
  receita_total: number;
}

// ─── admin_empresas_overview item ───
export interface AdminEmpresaOverviewItem {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  status: string;
  created_at: string;
  total_funcionarios: number;
  total_faturas: number;
}
