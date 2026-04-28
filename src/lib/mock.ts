export type Status = "confirmado" | "aguardando" | "concluido" | "cancelado" | "em_andamento";

export const statusLabel: Record<Status, string> = {
  confirmado: "Confirmado",
  aguardando: "Aguardando pagamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  em_andamento: "Em andamento",
};

export const statusTone: Record<Status, string> = {
  confirmado: "bg-success/10 text-success border-success/20",
  aguardando: "bg-warning/10 text-warning border-warning/30",
  concluido: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  em_andamento: "bg-info/10 text-info border-info/20",
};

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

export const proximasConsultasPaciente = [
  { id: "C-1024", medico: "Dr. Rafael Lasmar", esp: "Cardiologia", data: "Hoje", hora: "14:30", status: "confirmado" as Status, modalidade: "Telemedicina" },
  { id: "C-1031", medico: "Dra. Ana Figueiredo", esp: "Dermatologia", data: "28/Abr", hora: "09:00", status: "aguardando" as Status, modalidade: "Telemedicina" },
  { id: "C-0992", medico: "Dr. Lucas Pereira", esp: "Pediatria", data: "20/Abr", hora: "16:00", status: "concluido" as Status, modalidade: "Presencial" },
];

export const documentosPaciente = [
  { id: "D-01", tipo: "Receita", titulo: "Losartana 50mg", emitido: "Dr. Rafael Lasmar", data: "20/Abr/2026" },
  { id: "D-02", tipo: "Atestado", titulo: "Atestado 2 dias", emitido: "Dra. Camila Rocha", data: "12/Abr/2026" },
  { id: "D-03", tipo: "Exame", titulo: "Hemograma completo", emitido: "Lab. Parceiro", data: "05/Abr/2026" },
  { id: "D-04", tipo: "Relatório", titulo: "Relatório clínico", emitido: "Dr. Lucas Pereira", data: "01/Abr/2026" },
];

export const agendaMedico = [
  { hora: "08:00", paciente: "Marina Costa", tipo: "Retorno", status: "confirmado" as Status },
  { hora: "08:30", paciente: "João Almeida", tipo: "Particular", status: "confirmado" as Status },
  { hora: "09:00", paciente: "Renata Lima", tipo: "Empresarial", status: "em_andamento" as Status },
  { hora: "09:30", paciente: "Pedro Tavares", tipo: "Pronto atendimento", status: "aguardando" as Status },
  { hora: "10:00", paciente: "Sofia Mendes", tipo: "Particular", status: "confirmado" as Status },
  { hora: "10:30", paciente: "Camila Borges", tipo: "Retorno", status: "cancelado" as Status },
];

export const filaSecretaria = [
  { hora: "08:00", paciente: "Marina Costa", medico: "Dr. Rafael Lasmar", status: "confirmado" as Status, canal: "App" },
  { hora: "08:30", paciente: "João Almeida", medico: "Dr. Rafael Lasmar", status: "confirmado" as Status, canal: "WhatsApp" },
  { hora: "09:00", paciente: "Renata Lima", medico: "Dra. Ana Figueiredo", status: "em_andamento" as Status, canal: "Empresa" },
  { hora: "09:15", paciente: "Pedro Tavares", medico: "Dr. Marcos Vieira", status: "aguardando" as Status, canal: "Site" },
  { hora: "10:00", paciente: "Sofia Mendes", medico: "Dra. Camila Rocha", status: "confirmado" as Status, canal: "App" },
];

export const conversasWpp = [
  { id: 1, nome: "Marina Costa", ultima: "Pode confirmar minha consulta de amanhã?", tag: "Paciente", responsavel: "Juliana", status: "aberta", canal: "Comercial", unread: 2 },
  { id: 2, nome: "João Almeida", ultima: "Recebi o link do Meet, obrigado!", tag: "Confirmado", responsavel: "Bot", status: "resolvida", canal: "Operacional", unread: 0 },
  { id: 3, nome: "Construtora Horizonte", ultima: "Precisamos agendar 12 funcionários", tag: "Empresa", responsavel: "Carlos", status: "aberta", canal: "Comercial", unread: 5 },
  { id: 4, nome: "Pedro Tavares", ultima: "Como faço o pagamento?", tag: "Financeiro", responsavel: "—", status: "pendente", canal: "Comercial", unread: 1 },
  { id: 5, nome: "Dra. Ana Figueiredo", ultima: "Pode bloquear quinta de manhã?", tag: "Médico", responsavel: "Juliana", status: "aberta", canal: "Operacional", unread: 0 },
];

export const integracoes = [
  { nome: "Feegow", desc: "Prontuário eletrônico", status: "Aguardando configuração", cor: "warning" },
  { nome: "WhatsApp Business API", desc: "Mensageria oficial", status: "Aguardando configuração", cor: "warning" },
  { nome: "Google Meet / Agenda", desc: "Videoconsulta e calendário", status: "Modo manual ativo", cor: "info" },
  { nome: "Pagamentos", desc: "Stripe / Pix", status: "Não conectado", cor: "muted" },
  { nome: "Assinatura digital", desc: "ICP-Brasil para receitas", status: "Não conectado", cor: "muted" },
];

export const empresaFuncionarios = [
  { nome: "Bruno Carvalho", setor: "Obra Centro", consultas: 4, ultima: "10/Abr" },
  { nome: "Patrícia Nunes", setor: "Administrativo", consultas: 2, ultima: "18/Abr" },
  { nome: "Eduardo Lopes", setor: "Obra Sul", consultas: 1, ultima: "22/Abr" },
  { nome: "Larissa Antunes", setor: "Administrativo", consultas: 3, ultima: "25/Abr" },
];
