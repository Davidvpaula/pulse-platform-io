/**
 * Formata centavos para moeda BRL.
 * Ex.: brl(15000) => "R$ 150,00"
 */
export function brl(centavos: number | null | undefined): string {
  return ((centavos || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Alias para compatibilidade — idêntico a brl() */
export const formatBRL = brl;

/**
 * Formata valor em reais (não centavos) para moeda BRL.
 */
export function brlReais(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

/**
 * Formata string ISO ou Date para hora "HH:mm".
 */
export function fmtHora(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Retorna label amigável para uma data ISO (yyyy-MM-dd ou ISO completo).
 * Ex.: "Hoje", "Amanhã", "seg., 12 de mai."
 */
export function dataLabel(iso: string): string {
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const eq = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (eq(d, hoje)) return "Hoje";
  if (eq(d, amanha)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
