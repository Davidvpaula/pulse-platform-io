/**
 * Camada de dados mock para o módulo Empresa (B2B).
 * Persiste funcionários em localStorage. Faturas/plano/alertas são derivados.
 * Quando Lovable Cloud for ativado, esta camada vira chamada Supabase.
 */

import { ESPECIALIDADES } from "./medicoRegistro";

export type FuncionarioStatus = "ativo" | "inativo";

export type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  setor: string;
  cargo?: string;
  status: FuncionarioStatus;
  admissao: string; // ISO date
  consultasTotal: number;
  ultimaConsulta?: string; // ISO
  custoMes: number;
};

export type AgendamentoCorporativo = {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  especialidade: string;
  data: string; // ISO
  status: "criado" | "feegow_enviado" | "confirmado" | "concluido" | "cancelado";
  origem: "individual" | "lote";
};

export type Fatura = {
  id: string;
  competencia: string; // YYYY-MM
  vidas: number;
  valor: number;
  status: "paga" | "em_aberto" | "atrasada";
  emitidaEm: string;
};

export type EmpresaPerfil = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  responsavel: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  plano: string;
  vidasContratadas: number;
  precoPorVida: number;
  cicloFechamento: number; // dia
};

const KEY_FUNC = "lasmar.empresa.funcionarios";
const KEY_AGEND = "lasmar.empresa.agendamentos";
const KEY_PERFIL = "lasmar.empresa.perfil";

export const SETORES_PADRAO = [
  "Administrativo", "Obra Centro", "Obra Sul", "Obra Norte",
  "Comercial", "RH", "TI", "Operações",
];

export const PERFIL_PADRAO: EmpresaPerfil = {
  razaoSocial: "Construtora Horizonte LTDA",
  nomeFantasia: "Construtora Horizonte",
  cnpj: "12.345.678/0001-90",
  responsavel: "Patrícia Almeida",
  responsavelEmail: "rh@horizonte.com.br",
  responsavelTelefone: "(11) 4000-1200",
  plano: "Corporativo Premium",
  vidasContratadas: 100,
  precoPorVida: 110,
  cicloFechamento: 25,
};

/* ───────────── helpers ───────────── */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}
function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("lasmar:empresa-changed"));
}

/* ───────────── seed ───────────── */

function seedFuncionarios(): Funcionario[] {
  const base: Omit<Funcionario, "id" | "custoMes">[] = [
    { nome: "Felipe Andrade", cpf: "111.222.333-44", email: "felipe@horizonte.com.br", setor: "Obra Centro", cargo: "Mestre de obras", status: "ativo", admissao: "2022-03-01", consultasTotal: 4, ultimaConsulta: "2026-04-12" },
    { nome: "Camila Souza", cpf: "222.333.444-55", email: "camila@horizonte.com.br", setor: "Administrativo", cargo: "Analista RH", status: "ativo", admissao: "2021-09-15", consultasTotal: 7, ultimaConsulta: "2026-04-22" },
    { nome: "Rodrigo Lima", cpf: "333.444.555-66", email: "rodrigo@horizonte.com.br", setor: "Obra Sul", cargo: "Eletricista", status: "ativo", admissao: "2023-01-20", consultasTotal: 2, ultimaConsulta: "2026-03-08" },
    { nome: "Beatriz Mota", cpf: "444.555.666-77", email: "beatriz@horizonte.com.br", setor: "Administrativo", cargo: "Coordenadora", status: "ativo", admissao: "2020-06-10", consultasTotal: 9, ultimaConsulta: "2026-04-25" },
    { nome: "Lucas Pereira", cpf: "555.666.777-88", email: "lucas@horizonte.com.br", setor: "Obra Centro", cargo: "Pedreiro", status: "ativo", admissao: "2024-02-05", consultasTotal: 1, ultimaConsulta: "2026-02-18" },
    { nome: "Aline Ferreira", cpf: "666.777.888-99", email: "aline@horizonte.com.br", setor: "Comercial", cargo: "Vendedora", status: "ativo", admissao: "2022-11-11", consultasTotal: 3, ultimaConsulta: "2026-04-01" },
    { nome: "Marcos Tavares", cpf: "777.888.999-00", email: "marcos@horizonte.com.br", setor: "Obra Sul", cargo: "Encanador", status: "inativo", admissao: "2019-05-22", consultasTotal: 12 },
    { nome: "Juliana Castro", cpf: "888.999.000-11", email: "juliana@horizonte.com.br", setor: "TI", cargo: "Analista", status: "ativo", admissao: "2023-08-30", consultasTotal: 0 },
  ];
  return base.map((f, i) => ({
    ...f,
    id: `func_${i + 1}`,
    custoMes: PERFIL_PADRAO.precoPorVida,
  }));
}

function seedAgendamentos(funcs: Funcionario[]): AgendamentoCorporativo[] {
  const now = Date.now();
  const out: AgendamentoCorporativo[] = [];
  const especs = ["Clínica Geral", "Cardiologia", "Psiquiatria", "Ortopedia"];
  funcs.slice(0, 6).forEach((f, i) => {
    out.push({
      id: `ag_${i + 1}`,
      funcionarioId: f.id,
      funcionarioNome: f.nome,
      especialidade: especs[i % especs.length],
      data: new Date(now + (i - 2) * 86400000).toISOString(),
      status: i < 2 ? "concluido" : i < 4 ? "confirmado" : "feegow_enviado",
      origem: "individual",
    });
  });
  return out;
}

/* ───────────── public api ───────────── */

export function listFuncionarios(): Funcionario[] {
  let list = read<Funcionario[] | null>(KEY_FUNC, null);
  if (!list) { list = seedFuncionarios(); write(KEY_FUNC, list); }
  return list;
}

export function saveFuncionarios(list: Funcionario[]) { write(KEY_FUNC, list); }

export function addFuncionario(input: Omit<Funcionario, "id" | "consultasTotal" | "custoMes">): Funcionario {
  const list = listFuncionarios();
  const novo: Funcionario = {
    ...input,
    id: `func_${Date.now().toString(36)}`,
    consultasTotal: 0,
    custoMes: getPerfil().precoPorVida,
  };
  saveFuncionarios([novo, ...list]);
  return novo;
}

export function setFuncionarioStatus(id: string, status: FuncionarioStatus) {
  const list = listFuncionarios().map(f => f.id === id ? { ...f, status } : f);
  saveFuncionarios(list);
}

export function importFuncionariosCsv(text: string): { ok: number; ignored: number } {
  // Formato esperado: nome,cpf,email,setor,cargo,admissao
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: 0, ignored: 0 };
  const start = /nome/i.test(lines[0]) ? 1 : 0;
  let ok = 0, ignored = 0;
  const list = listFuncionarios();
  for (let i = start; i < lines.length; i++) {
    const [nome, cpf, email, setor, cargo, admissao] = lines[i].split(",").map(s => s?.trim() ?? "");
    if (!nome || !email) { ignored++; continue; }
    list.unshift({
      id: `func_${Date.now().toString(36)}_${i}`,
      nome, cpf: cpf || "", email,
      setor: setor || "Administrativo",
      cargo: cargo || undefined,
      status: "ativo",
      admissao: admissao || new Date().toISOString().slice(0, 10),
      consultasTotal: 0,
      custoMes: getPerfil().precoPorVida,
    });
    ok++;
  }
  saveFuncionarios(list);
  return { ok, ignored };
}

export function listAgendamentos(): AgendamentoCorporativo[] {
  let list = read<AgendamentoCorporativo[] | null>(KEY_AGEND, null);
  if (!list) { list = seedAgendamentos(listFuncionarios()); write(KEY_AGEND, list); }
  return list;
}

export function addAgendamento(input: Omit<AgendamentoCorporativo, "id" | "status" | "funcionarioNome"> & { status?: AgendamentoCorporativo["status"] }): AgendamentoCorporativo {
  const list = listAgendamentos();
  const f = listFuncionarios().find(x => x.id === input.funcionarioId);
  const novo: AgendamentoCorporativo = {
    id: `ag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    funcionarioId: input.funcionarioId,
    funcionarioNome: f?.nome ?? "—",
    especialidade: input.especialidade,
    data: input.data,
    origem: input.origem,
    status: input.status ?? "feegow_enviado",
  };
  write(KEY_AGEND, [novo, ...list]);
  return novo;
}

export function getPerfil(): EmpresaPerfil {
  return read<EmpresaPerfil>(KEY_PERFIL, PERFIL_PADRAO);
}
export function savePerfil(p: EmpresaPerfil) { write(KEY_PERFIL, p); }

/* ───────────── derivações ───────────── */

export function listFaturas(): Fatura[] {
  const perfil = getPerfil();
  const ativos = listFuncionarios().filter(f => f.status === "ativo").length;
  const meses = ["2025-11","2025-12","2026-01","2026-02","2026-03","2026-04"];
  return meses.map((m, i) => {
    const vidas = Math.max(ativos - (5 - i) * 1, ativos - 4);
    return {
      id: `fat_${m}`,
      competencia: m,
      vidas,
      valor: vidas * perfil.precoPorVida,
      status: i === meses.length - 1 ? "em_aberto" : i === meses.length - 2 ? "paga" : "paga",
      emitidaEm: `${m}-${String(perfil.cicloFechamento).padStart(2,"0")}`,
    };
  });
}

export type DashboardKpis = {
  totalFuncionarios: number;
  ativos: number;
  consultasMes: number;
  taxaUso: number; // %
  custoMensal: number;
  custoMedioColaborador: number;
};

export function getKpis(): DashboardKpis {
  const funcs = listFuncionarios();
  const ativos = funcs.filter(f => f.status === "ativo").length;
  const ags = listAgendamentos();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const consultasMes = ags.filter(a => a.data.startsWith(mesAtual)).length;
  const perfil = getPerfil();
  const custoMensal = ativos * perfil.precoPorVida;
  return {
    totalFuncionarios: funcs.length,
    ativos,
    consultasMes,
    taxaUso: ativos === 0 ? 0 : Math.round((consultasMes / ativos) * 100),
    custoMensal,
    custoMedioColaborador: ativos === 0 ? 0 : Math.round(custoMensal / ativos),
  };
}

export type SetorStats = {
  setor: string;
  funcionarios: number;
  consultas: number;
  custo: number;
  taxaUso: number;
};

export function getStatsPorSetor(): SetorStats[] {
  const funcs = listFuncionarios();
  const ags = listAgendamentos();
  const perfil = getPerfil();
  const map = new Map<string, SetorStats>();
  funcs.forEach(f => {
    const cur = map.get(f.setor) ?? { setor: f.setor, funcionarios: 0, consultas: 0, custo: 0, taxaUso: 0 };
    cur.funcionarios += 1;
    if (f.status === "ativo") cur.custo += perfil.precoPorVida;
    cur.consultas += ags.filter(a => a.funcionarioId === f.id).length;
    map.set(f.setor, cur);
  });
  return Array.from(map.values()).map(s => ({
    ...s, taxaUso: s.funcionarios === 0 ? 0 : Math.round((s.consultas / s.funcionarios) * 100),
  })).sort((a, b) => b.consultas - a.consultas);
}

export type Alerta = {
  id: string;
  tipo: "baixo_uso" | "alta_demanda" | "recorrente";
  titulo: string;
  descricao: string;
  tone: "warning" | "destructive" | "info";
};

export function getAlertas(): Alerta[] {
  const out: Alerta[] = [];
  const kpis = getKpis();
  if (kpis.taxaUso < 30) {
    out.push({
      id: "al_baixo_uso", tipo: "baixo_uso", tone: "warning",
      titulo: "Baixa utilização do plano",
      descricao: `Taxa de uso em ${kpis.taxaUso}% este mês. Avalie campanhas internas de saúde.`,
    });
  }
  const setores = getStatsPorSetor();
  const top = setores[0];
  if (top && top.consultas >= 5) {
    out.push({
      id: "al_alta_demanda", tipo: "alta_demanda", tone: "info",
      titulo: `Alta demanda em ${top.setor}`,
      descricao: `${top.consultas} consultas no setor — ${top.taxaUso}% de uso.`,
    });
  }
  const recorrentes = listFuncionarios().filter(f => f.consultasTotal >= 6);
  recorrentes.slice(0, 2).forEach(f => {
    out.push({
      id: `al_rec_${f.id}`, tipo: "recorrente", tone: "warning",
      titulo: `Funcionário recorrente: ${f.nome}`,
      descricao: `${f.consultasTotal} consultas registradas — sugerimos acompanhamento.`,
    });
  });
  return out;
}

export const ESPECIALIDADES_OPS = ESPECIALIDADES;

export const STATUS_AGEND_LABEL: Record<AgendamentoCorporativo["status"], string> = {
  criado: "Criado",
  feegow_enviado: "Enviado para Feegow",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STATUS_FATURA_LABEL: Record<Fatura["status"], string> = {
  paga: "Paga",
  em_aberto: "Em aberto",
  atrasada: "Atrasada",
};

export { brlReais as brl } from "@/lib/format";
