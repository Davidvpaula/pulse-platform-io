/* ============================================================================
 * SISTEMA DE STATUS GLOBAL
 * ========================================================================= */

export type Status =
  // Ciclo de paciente
  | "paciente_criado"
  | "feegow_enviado"
  | "feegow_sincronizado"
  // Ciclo de agendamento
  | "agendamento_criado"
  | "confirmado"
  | "aguardando"            // aguardando pagamento
  | "em_andamento"          // em atendimento
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

/** Grupos lógicos para filtros e exibição */
export const statusGroups = {
  paciente: ["paciente_criado", "feegow_enviado", "feegow_sincronizado"] as Status[],
  agendamento: ["agendamento_criado", "confirmado", "aguardando", "em_andamento", "concluido", "cancelado", "no_show"] as Status[],
};

/* ============================================================================
 * CATÁLOGOS PÚBLICOS
 * ========================================================================= */

export const especialidades = [
  { slug: "cardiologia", nome: "Cardiologia", icon: "❤️" },
  { slug: "dermatologia", nome: "Dermatologia", icon: "🧴" },
  { slug: "pediatria", nome: "Pediatria", icon: "🧸" },
  { slug: "psiquiatria", nome: "Psiquiatria", icon: "🧠" },
  { slug: "ortopedia", nome: "Ortopedia", icon: "🦴" },
  { slug: "ginecologia", nome: "Ginecologia", icon: "🌷" },
  { slug: "clinica-geral", nome: "Clínica Geral", icon: "🩺" },
  { slug: "endocrinologia", nome: "Endocrinologia", icon: "⚗️" },
];

export const medicos = [
  { slug: "rafael-lasmar", nome: "Dr. Rafael Lasmar", especialidade: "Cardiologia", crm: "CRM/MG 12345", rating: 4.9, valor: 250, online: true },
  { slug: "ana-figueiredo", nome: "Dra. Ana Figueiredo", especialidade: "Dermatologia", crm: "CRM/SP 98712", rating: 4.8, valor: 220, online: true },
  { slug: "lucas-pereira", nome: "Dr. Lucas Pereira", especialidade: "Pediatria", crm: "CRM/RJ 44521", rating: 4.9, valor: 200, online: false },
  { slug: "beatriz-souza", nome: "Dra. Beatriz Souza", especialidade: "Psiquiatria", crm: "CRM/MG 33890", rating: 5.0, valor: 320, online: true },
  { slug: "marcos-vieira", nome: "Dr. Marcos Vieira", especialidade: "Ortopedia", crm: "CRM/SP 22117", rating: 4.7, valor: 280, online: false },
  { slug: "camila-rocha", nome: "Dra. Camila Rocha", especialidade: "Clínica Geral", crm: "CRM/MG 55781", rating: 4.8, valor: 180, online: true },
];

/* ============================================================================
 * PACIENTES — base unificada com status global
 * ========================================================================= */

export type Paciente = {
  id: string;
  nome: string;
  vinculo: "particular" | "empresarial";
  empresa?: string;
  plano?: string;
  status: Status;       // status do ciclo do paciente (Feegow)
  criadoEm: string;
  ultimaConsulta?: string;
};

export const pacientes: Paciente[] = [
  { id: "P-1001", nome: "Marina Costa", vinculo: "particular", plano: "Saúde+", status: "feegow_sincronizado", criadoEm: "12/Mar/2025", ultimaConsulta: "20/Abr/2026" },
  { id: "P-1002", nome: "Bruno Carvalho", vinculo: "empresarial", empresa: "Construtora Horizonte", plano: "Saúde Empresa", status: "feegow_sincronizado", criadoEm: "01/Fev/2026", ultimaConsulta: "10/Abr/2026" },
  { id: "P-1003", nome: "Patrícia Nunes", vinculo: "empresarial", empresa: "Construtora Horizonte", plano: "Saúde Empresa", status: "feegow_enviado", criadoEm: "ontem" },
  { id: "P-1004", nome: "Eduardo Lopes", vinculo: "empresarial", empresa: "Construtora Horizonte", plano: "Saúde Empresa", status: "paciente_criado", criadoEm: "há 12 min" },
  { id: "P-1005", nome: "Sofia Mendes", vinculo: "particular", plano: "Essencial", status: "feegow_sincronizado", criadoEm: "há 3h" },
  { id: "P-1006", nome: "João Almeida", vinculo: "particular", status: "feegow_sincronizado", criadoEm: "20/Mar/2026" },
  { id: "P-1007", nome: "Larissa Antunes", vinculo: "empresarial", empresa: "Construtora Horizonte", plano: "Saúde Empresa", status: "feegow_sincronizado", criadoEm: "25/Abr/2026" },
];

/* ============================================================================
 * AGENDAMENTOS — com referências ao paciente e médico
 * ========================================================================= */

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

export const agendamentos: Agendamento[] = [
  { id: "C-1024", pacienteId: "P-1001", paciente: "Marina Costa", medico: "Dr. Rafael Lasmar", esp: "Cardiologia", data: "Hoje", hora: "14:30", modalidade: "Telemedicina", canal: "App", status: "confirmado" },
  { id: "C-1031", pacienteId: "P-1001", paciente: "Marina Costa", medico: "Dra. Ana Figueiredo", esp: "Dermatologia", data: "28/Abr", hora: "09:00", modalidade: "Telemedicina", canal: "App", status: "aguardando" },
  { id: "C-0992", pacienteId: "P-1001", paciente: "Marina Costa", medico: "Dr. Lucas Pereira", esp: "Pediatria", data: "20/Abr", hora: "16:00", modalidade: "Telemedicina", canal: "Site", status: "concluido" },
  { id: "C-1108", pacienteId: "P-1002", paciente: "Bruno Carvalho", medico: "Dra. Camila Rocha", esp: "Clínica Geral", data: "Hoje", hora: "09:00", modalidade: "Empresarial", canal: "Empresa", status: "em_andamento", origem: "Construtora Horizonte" },
  { id: "C-1110", pacienteId: "P-1003", paciente: "Patrícia Nunes", medico: "Dr. Marcos Vieira", esp: "Ortopedia", data: "Hoje", hora: "10:30", modalidade: "Empresarial", canal: "Empresa", status: "agendamento_criado", origem: "Construtora Horizonte" },
  { id: "C-1112", pacienteId: "P-1005", paciente: "Sofia Mendes", medico: "Dra. Camila Rocha", esp: "Clínica Geral", data: "Hoje", hora: "11:00", modalidade: "Telemedicina", canal: "App", status: "confirmado" },
  { id: "C-1113", pacienteId: "P-1006", paciente: "João Almeida", medico: "Dr. Rafael Lasmar", esp: "Cardiologia", data: "Hoje", hora: "08:30", modalidade: "Telemedicina", canal: "WhatsApp", status: "concluido" },
  { id: "C-1114", pacienteId: "P-1007", paciente: "Larissa Antunes", medico: "Dr. Rafael Lasmar", esp: "Cardiologia", data: "Hoje", hora: "15:00", modalidade: "Empresarial", canal: "Empresa", status: "no_show", origem: "Construtora Horizonte" },
];

/* ============================================================================
 * TIMELINE DO PACIENTE — eventos cronológicos
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
  data: string;     // ex: "Hoje 14:30"
  ator?: string;    // quem disparou (médico, secretaria, sistema, empresa)
};

export const timelinePaciente = (pacienteId: string): TimelineEvent[] => {
  // Mock determinístico — gera eventos plausíveis a partir dos dados existentes
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return [];

  const base: TimelineEvent[] = [
    { id: `${pacienteId}-1`, pacienteId, kind: "cadastro", titulo: "Cadastro realizado",
      desc: p.vinculo === "empresarial" ? `Adicionado pela empresa ${p.empresa}` : "Cadastro pelo próprio paciente",
      data: p.criadoEm, ator: p.vinculo === "empresarial" ? "Empresa" : "Sistema" },
    { id: `${pacienteId}-2`, pacienteId, kind: "feegow", titulo: "Envio para Feegow",
      desc: "Sincronização do prontuário iniciada", data: p.criadoEm, ator: "Automação" },
  ];

  if (p.status === "feegow_sincronizado") {
    base.push({
      id: `${pacienteId}-3`, pacienteId, kind: "feegow",
      titulo: "Feegow sincronizado",
      desc: "ID externo recebido · prontuário disponível",
      data: p.criadoEm, ator: "Feegow",
    });
  }

  // Eventos relacionados aos agendamentos do paciente
  const ags = agendamentos.filter(a => a.pacienteId === pacienteId);
  ags.forEach((a, idx) => {
    base.push({
      id: `${pacienteId}-ag-${idx}`, pacienteId, kind: "agendamento",
      titulo: `Agendamento ${a.id}`, desc: `${a.medico} · ${a.esp} · ${a.data} ${a.hora}`,
      data: a.data, ator: a.canal,
    });
    if (a.status === "concluido") {
      base.push({
        id: `${pacienteId}-at-${idx}`, pacienteId, kind: "atendimento",
        titulo: "Atendimento concluído", desc: `${a.medico} finalizou a consulta`,
        data: a.data, ator: a.medico,
      });
      base.push({
        id: `${pacienteId}-doc-${idx}`, pacienteId, kind: "documento",
        titulo: "Documentos emitidos", desc: "Receita e atestado disponíveis",
        data: a.data, ator: a.medico,
      });
    }
    if (a.status === "aguardando") {
      base.push({
        id: `${pacienteId}-pg-${idx}`, pacienteId, kind: "pagamento",
        titulo: "Aguardando pagamento", desc: `Cobrança gerada para ${a.id}`,
        data: a.data, ator: "Financeiro",
      });
    }
  });

  base.push({
    id: `${pacienteId}-msg`, pacienteId, kind: "mensagem",
    titulo: "Mensagem WhatsApp", desc: "Confirmação automática enviada",
    data: "há 2h", ator: "Bot",
  });

  return base;
};

/* ============================================================================
 * COMPATIBILIDADE com componentes legados
 * ========================================================================= */

export const proximasConsultasPaciente = agendamentos
  .filter(a => a.pacienteId === "P-1001")
  .map(a => ({ id: a.id, medico: a.medico, esp: a.esp, data: a.data, hora: a.hora, status: a.status, modalidade: a.modalidade }));

export const documentosPaciente = [
  { id: "D-01", tipo: "Receita", titulo: "Losartana 50mg", emitido: "Dr. Rafael Lasmar", data: "20/Abr/2026" },
  { id: "D-02", tipo: "Atestado", titulo: "Atestado 2 dias", emitido: "Dra. Camila Rocha", data: "12/Abr/2026" },
  { id: "D-03", tipo: "Exame", titulo: "Hemograma completo", emitido: "Lab. Parceiro", data: "05/Abr/2026" },
  { id: "D-04", tipo: "Relatório", titulo: "Relatório clínico", emitido: "Dr. Lucas Pereira", data: "01/Abr/2026" },
];

export const agendaMedico = agendamentos
  .filter(a => a.medico === "Dr. Rafael Lasmar" && a.data === "Hoje")
  .map(a => ({ hora: a.hora, paciente: a.paciente, tipo: a.modalidade, status: a.status, pacienteId: a.pacienteId, id: a.id }));

export const filaSecretaria = agendamentos
  .filter(a => a.data === "Hoje")
  .map(a => ({ hora: a.hora, paciente: a.paciente, medico: a.medico, status: a.status, canal: a.canal, pacienteId: a.pacienteId, id: a.id }));

/* ============================================================================
 * COMUNICAÇÃO EXTERNA (WhatsApp)
 * ========================================================================= */

export const conversasWpp = [
  { id: 1, nome: "Marina Costa", ultima: "Pode confirmar minha consulta de amanhã?", tag: "Paciente", responsavel: "Juliana", status: "aberta", canal: "Comercial", unread: 2 },
  { id: 2, nome: "João Almeida", ultima: "Recebi o link do Meet, obrigado!", tag: "Confirmado", responsavel: "Bot", status: "resolvida", canal: "Operacional", unread: 0 },
  { id: 3, nome: "Construtora Horizonte", ultima: "Precisamos agendar 12 funcionários", tag: "Empresa", responsavel: "Carlos", status: "aberta", canal: "Comercial", unread: 5 },
  { id: 4, nome: "Pedro Tavares", ultima: "Como faço o pagamento?", tag: "Financeiro", responsavel: "—", status: "pendente", canal: "Comercial", unread: 1 },
  { id: 5, nome: "Dra. Ana Figueiredo", ultima: "Pode bloquear quinta de manhã?", tag: "Médico", responsavel: "Juliana", status: "aberta", canal: "Operacional", unread: 0 },
];

/* ============================================================================
 * COMUNICAÇÃO INTERNA (equipe)
 * ========================================================================= */

export type InternalThread = {
  id: string;
  assunto: string;
  participantes: string[];   // labels: "Secretaria · Juliana", "Médico · Dr. Rafael"
  origem: "Secretaria ↔ Médico" | "Secretaria ↔ Admin" | "Empresa ↔ Secretaria" | "Médico ↔ Admin";
  ultima: string;
  data: string;
  status: "aberta" | "respondida" | "resolvida";
  prioridade: "baixa" | "normal" | "alta";
  nao_lidas: number;
  pacienteId?: string;
  agendamentoId?: string;
};

export const inboxInterno: InternalThread[] = [
  {
    id: "INT-001",
    assunto: "Paciente Bruno Carvalho — confirmar exame",
    participantes: ["Secretaria · Juliana", "Médico · Dra. Camila"],
    origem: "Secretaria ↔ Médico",
    ultima: "Doutora, o paciente perguntou se precisa de jejum.",
    data: "há 8 min",
    status: "aberta",
    prioridade: "alta",
    nao_lidas: 2,
    pacienteId: "P-1002",
    agendamentoId: "C-1108",
  },
  {
    id: "INT-002",
    assunto: "Bloqueio de agenda quinta-feira",
    participantes: ["Médico · Dra. Ana", "Secretaria · Juliana"],
    origem: "Secretaria ↔ Médico",
    ultima: "Bloqueado das 8h às 12h, ok.",
    data: "há 35 min",
    status: "respondida",
    prioridade: "normal",
    nao_lidas: 0,
  },
  {
    id: "INT-003",
    assunto: "Lote 12 funcionários Construtora Horizonte",
    participantes: ["Empresa · RH Horizonte", "Secretaria · Juliana"],
    origem: "Empresa ↔ Secretaria",
    ultima: "Enviei a planilha com CPFs, podem cadastrar.",
    data: "há 1h",
    status: "aberta",
    prioridade: "alta",
    nao_lidas: 5,
  },
  {
    id: "INT-004",
    assunto: "Reembolso paciente João Almeida",
    participantes: ["Secretaria · Juliana", "Admin · Carlos"],
    origem: "Secretaria ↔ Admin",
    ultima: "Aprovado, pode prosseguir com o estorno.",
    data: "ontem",
    status: "resolvida",
    prioridade: "normal",
    nao_lidas: 0,
    pacienteId: "P-1006",
  },
  {
    id: "INT-005",
    assunto: "Feegow desconectado — qual ação?",
    participantes: ["Médico · Dr. Rafael", "Admin · Carlos"],
    origem: "Médico ↔ Admin",
    ultima: "Equipe técnica notificada, prazo de 30min.",
    data: "ontem",
    status: "respondida",
    prioridade: "alta",
    nao_lidas: 1,
  },
];

/* ============================================================================
 * AUTOMAÇÕES DE FLUXO
 * ========================================================================= */

export type Automacao = {
  id: string;
  trigger: string;
  acao: string;
  ativo: boolean;
  execucoes24h: number;
  sucesso: number; // %
  ultimoLog: string;
};

export const automacoesFluxo: Automacao[] = [
  { id: "A1", trigger: "Novo paciente", acao: "Enviar para Feegow", ativo: true, execucoes24h: 18, sucesso: 94, ultimoLog: "há 12 min · sucesso" },
  { id: "A2", trigger: "Novo agendamento", acao: "Notificar médico", ativo: true, execucoes24h: 42, sucesso: 100, ultimoLog: "há 4 min · sucesso" },
  { id: "A3", trigger: "Agendamento confirmado", acao: "Enviar WhatsApp ao paciente", ativo: true, execucoes24h: 36, sucesso: 97, ultimoLog: "há 7 min · sucesso" },
  { id: "A4", trigger: "Consulta iniciando em 10min", acao: "Alertar paciente + enviar link Meet", ativo: true, execucoes24h: 24, sucesso: 92, ultimoLog: "há 22 min · sucesso" },
  { id: "A5", trigger: "Consulta finalizada", acao: "Enviar pesquisa de feedback", ativo: false, execucoes24h: 0, sucesso: 0, ultimoLog: "desativada" },
  { id: "A6", trigger: "Pagamento pendente +24h", acao: "Cobrança automática WhatsApp", ativo: true, execucoes24h: 9, sucesso: 78, ultimoLog: "há 1h · sucesso" },
];

/* ============================================================================
 * INTEGRAÇÕES E EMPRESA
 * ========================================================================= */

export const integracoes = [
  { nome: "Feegow", desc: "Prontuário eletrônico", status: "Aguardando configuração", cor: "warning" },
  { nome: "WhatsApp Business API", desc: "Mensageria oficial", status: "Aguardando configuração", cor: "warning" },
  { nome: "Google Meet / Agenda", desc: "Videoconsulta e calendário", status: "Modo manual ativo", cor: "info" },
  { nome: "Pagamentos", desc: "Stripe / Pix", status: "Não conectado", cor: "muted" },
  { nome: "Assinatura digital", desc: "ICP-Brasil para receitas", status: "Não conectado", cor: "muted" },
];

export const empresaFuncionarios = pacientes
  .filter(p => p.vinculo === "empresarial")
  .map(p => ({
    nome: p.nome,
    setor: p.id === "P-1004" ? "Obra Sul" : p.id === "P-1003" ? "Administrativo" : p.id === "P-1007" ? "Administrativo" : "Obra Centro",
    consultas: agendamentos.filter(a => a.pacienteId === p.id).length,
    ultima: p.ultimaConsulta ?? "—",
    status: p.status,
    pacienteId: p.id,
  }));
