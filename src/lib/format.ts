/**
 * Formata centavos para moeda BRL.
 * Ex.: brl(15000) => "R$ 150,00"
 */
export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Formata string ISO ou Date para hora "HH:mm".
 */
export function fmtHora(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
