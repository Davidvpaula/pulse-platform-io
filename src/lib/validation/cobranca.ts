import { z } from "zod";

const hojeISO = () => new Date().toISOString().slice(0, 10);

export const cobrancaSchema = z.object({
  descricao: z.string()
    .trim()
    .min(3, { message: "A descrição deve ter ao menos 3 caracteres." })
    .max(200, { message: "A descrição deve ter no máximo 200 caracteres." }),
  valor: z.string()
    .trim()
    .nonempty({ message: "Informe o valor da cobrança." })
    .refine(v => {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      return !Number.isNaN(n) && n > 0;
    }, { message: "Valor inválido. Use um número maior que zero (ex.: 150,00)." })
    .refine(v => {
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      return n <= 1_000_000;
    }, { message: "Valor acima do limite permitido (R$ 1.000.000,00)." }),
  vencimento: z.string()
    .optional()
    .refine(v => !v || v >= hojeISO(), { message: "Vencimento não pode estar no passado." }),
  observacao: z.string().max(500, { message: "Observação muito longa (máx. 500 caracteres)." }).optional(),
  paciente_id: z.string().uuid().optional().or(z.literal("")),
  empresa_id: z.string().uuid().optional().or(z.literal("")),
});

export type CobrancaInput = z.infer<typeof cobrancaSchema>;

export function parseValorBRL(v: string): number {
  return Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100);
}

export function validarCobranca(input: CobrancaInput): { ok: true; valor_centavos: number } | { ok: false; erro: string } {
  const r = cobrancaSchema.safeParse(input);
  if (!r.success) return { ok: false, erro: r.error.issues[0]?.message || "Dados inválidos." };
  return { ok: true, valor_centavos: parseValorBRL(r.data.valor) };
}
