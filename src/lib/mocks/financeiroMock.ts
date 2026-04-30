/**
 * Histórico financeiro MOCKADO do paciente.
 * Compartilhado entre /app/paciente/financeiro (futuro fallback) e
 * /app/paciente/plano (resumo "últimas cobranças").
 *
 * Quando o backend real estiver pronto, basta substituir por uma chamada
 * a `listPagamentos()` mantendo o mesmo shape.
 */

export type StatusCobranca =
  | "pago"
  | "pendente"
  | "processando"
  | "falhou"
  | "reembolsado"
  | "cancelado";

export type CobrancaMock = {
  id: string;
  data: string; // ISO (YYYY-MM-DD)
  descricao: string;
  categoria: "mensalidade" | "consulta" | "exame" | "ajuste";
  valor: number;
  metodo: "Cartão final 4421" | "Pix" | "Boleto";
  status: StatusCobranca;
  recibo_url?: string;
};

export const cobrancasMock: CobrancaMock[] = [
  {
    id: "cob_2026_05",
    data: "2026-05-15",
    descricao: "Mensalidade Saúde Plus Família — Maio/2026",
    categoria: "mensalidade",
    valor: 489.9,
    metodo: "Cartão final 4421",
    status: "pendente",
  },
  {
    id: "cob_2026_04",
    data: "2026-04-15",
    descricao: "Mensalidade Saúde Plus Família — Abril/2026",
    categoria: "mensalidade",
    valor: 489.9,
    metodo: "Cartão final 4421",
    status: "pago",
    recibo_url: "#",
  },
  {
    id: "cob_consulta_03",
    data: "2026-03-22",
    descricao: "Consulta avulsa · Dra. Helena Costa (Cardiologia)",
    categoria: "consulta",
    valor: 320.0,
    metodo: "Pix",
    status: "pago",
    recibo_url: "#",
  },
  {
    id: "cob_2026_03",
    data: "2026-03-15",
    descricao: "Mensalidade Saúde Plus Família — Março/2026",
    categoria: "mensalidade",
    valor: 489.9,
    metodo: "Cartão final 4421",
    status: "pago",
    recibo_url: "#",
  },
  {
    id: "cob_2026_02",
    data: "2026-02-15",
    descricao: "Mensalidade Saúde Plus Família — Fevereiro/2026",
    categoria: "mensalidade",
    valor: 489.9,
    metodo: "Cartão final 4421",
    status: "falhou",
  },
  {
    id: "cob_2026_02_retry",
    data: "2026-02-17",
    descricao: "Mensalidade Saúde Plus Família — Fevereiro/2026 (recobrança)",
    categoria: "mensalidade",
    valor: 489.9,
    metodo: "Cartão final 4421",
    status: "pago",
    recibo_url: "#",
  },
];

export const statusCobrancaUI: Record<
  StatusCobranca,
  { label: string; wrap: string; dot: string }
> = {
  pago:        { label: "Pago",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
  pendente:    { label: "Pendente",    wrap: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
  processando: { label: "Processando", wrap: "bg-primary/10 text-primary border-primary/20",             dot: "bg-primary" },
  falhou:      { label: "Falhou",      wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  reembolsado: { label: "Reembolsado", wrap: "bg-muted text-muted-foreground border-border",             dot: "bg-muted-foreground" },
  cancelado:   { label: "Cancelado",   wrap: "bg-muted text-muted-foreground border-border",             dot: "bg-muted-foreground" },
};

export function resumoFinanceiroMock(cobrancas: CobrancaMock[] = cobrancasMock) {
  const pagas = cobrancas.filter((c) => c.status === "pago");
  const pendentes = cobrancas.filter(
    (c) => c.status === "pendente" || c.status === "processando",
  );
  const falhas = cobrancas.filter((c) => c.status === "falhou");

  const totalPagoUlt12m = pagas.reduce((s, c) => s + c.valor, 0);
  const aPagar = pendentes.reduce((s, c) => s + c.valor, 0);
  const ultimaPaga = [...pagas].sort((a, b) => b.data.localeCompare(a.data))[0];

  return {
    totalPagoUlt12m,
    aPagar,
    pendentesCount: pendentes.length,
    falhasCount: falhas.length,
    ultimaPaga,
  };
}
