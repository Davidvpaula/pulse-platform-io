/**
 * Validação de CPF — algoritmo oficial dos dígitos verificadores
 * (Receita Federal). Usado em TODOS os formulários do sistema.
 *
 * Regras:
 *  - 11 dígitos numéricos
 *  - Não pode ser sequência repetida (000…000, 111…111, … 999…999)
 *  - Os dois dígitos verificadores (10º e 11º) batem com o cálculo:
 *      DV1 = ((Σ d[i]*(10-i)) * 10) mod 11, normalizando 10 → 0
 *      DV2 = ((Σ d[i]*(11-i)) * 10) mod 11, normalizando 10 → 0
 */
import { z } from "zod";

/** Remove qualquer caractere que não seja dígito. */
export function onlyDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** Aplica a máscara 000.000.000-00 enquanto o usuário digita. */
export function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Formata para exibição. Devolve string original se inválido. */
export function formatCpf(v: string | null | undefined): string {
  const d = onlyDigits(v);
  if (d.length !== 11) return v ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Valida o CPF pelo algoritmo dos dígitos verificadores.
 * Aceita string com ou sem máscara.
 */
export function isValidCpf(v: string | null | undefined): boolean {
  const cpf = onlyDigits(v);
  if (cpf.length !== 11) return false;
  // Rejeita sequências como "00000000000", "11111111111"...
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);

  // 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let dv1 = (sum * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== digits[9]) return false;

  // 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let dv2 = (sum * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  if (dv2 !== digits[10]) return false;

  return true;
}

/**
 * Schema Zod reutilizável.
 * - Aceita CPF com ou sem máscara
 * - Mensagem padrão pode ser sobrescrita
 * - O `.transform` retorna o CPF apenas com dígitos (pronto pra persistir)
 */
export const cpfSchema = (msg = "CPF inválido") =>
  z
    .string({ required_error: "CPF é obrigatório" })
    .trim()
    .refine(isValidCpf, msg)
    .transform(onlyDigits);

/** Versão opcional (campo pode ser vazio). */
export const cpfOptionalSchema = (msg = "CPF inválido") =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ""))
    .refine((v) => v === "" || isValidCpf(v), msg);
