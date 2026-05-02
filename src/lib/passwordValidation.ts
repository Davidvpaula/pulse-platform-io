/**
 * Validação de senha baseada na tabela password_policy.
 * Consulta as regras configuradas pelo admin e aplica no frontend
 * antes de enviar para o auth (que também valida server-side via HIBP).
 */
import { supabase } from "@/integrations/supabase/client";

export interface PasswordPolicy {
  min_length: number;
  require_complexity: boolean;
  hibp_enabled: boolean;
  expiration_days: number;
}

let cachedPolicy: PasswordPolicy | null = null;
let cacheTs = 0;
const CACHE_TTL = 5 * 60_000; // 5 min

export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  if (cachedPolicy && Date.now() - cacheTs < CACHE_TTL) return cachedPolicy;
  const { data } = await supabase
    .from("password_policy")
    .select("min_length,require_complexity,hibp_enabled,expiration_days")
    .eq("id", 1)
    .maybeSingle();
  cachedPolicy = (data as PasswordPolicy) ?? {
    min_length: 8,
    require_complexity: false,
    hibp_enabled: false,
    expiration_days: 90,
  };
  cacheTs = Date.now();
  return cachedPolicy;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida a senha contra as regras da password_policy.
 * Retorna lista de erros legíveis (vazia = tudo OK).
 */
export async function validatePassword(password: string): Promise<ValidationResult> {
  const policy = await getPasswordPolicy();
  const errors: string[] = [];

  if (password.length < policy.min_length) {
    errors.push(`Mínimo ${policy.min_length} caracteres`);
  }

  if (policy.require_complexity) {
    if (!/[A-Z]/.test(password)) errors.push("Pelo menos uma letra maiúscula");
    if (!/[a-z]/.test(password)) errors.push("Pelo menos uma letra minúscula");
    if (!/[0-9]/.test(password)) errors.push("Pelo menos um número");
    if (!/[^A-Za-z0-9]/.test(password)) errors.push("Pelo menos um caractere especial (!@#$...)");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Gera a dica de requisitos da senha para exibir ao usuário.
 */
export function policyHint(policy: PasswordPolicy): string {
  const parts: string[] = [`Mínimo ${policy.min_length} caracteres`];
  if (policy.require_complexity) {
    parts.push("maiúscula, minúscula, número e símbolo");
  }
  if (policy.hibp_enabled) {
    parts.push("não pode ser uma senha vazada conhecida");
  }
  return parts.join(" · ");
}
