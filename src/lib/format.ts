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
