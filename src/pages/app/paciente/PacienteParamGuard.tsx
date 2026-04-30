import { useParams } from "react-router-dom";
import PacienteRotaNaoEncontrada from "@/pages/app/paciente/PacienteRotaNaoEncontrada";

/**
 * Valida um parâmetro dinâmico de rota do paciente.
 * Se o param estiver ausente/vazio ou não bater com o padrão esperado,
 * renderiza a tela "rota não encontrada" no lugar do componente.
 */
export function PacienteParamGuard({
  param,
  pattern,
  children,
}: {
  param: string;
  pattern?: RegExp;
  children: React.ReactNode;
}) {
  const params = useParams();
  const value = params[param];

  const valid =
    typeof value === "string" &&
    value.trim().length > 0 &&
    (!pattern || pattern.test(value));

  if (!valid) return <PacienteRotaNaoEncontrada />;
  return <>{children}</>;
}

// Padrões usados pelas rotas do paciente
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// sessionId do Stripe (cs_test_... / cs_live_...) ou um id interno seguro
export const CHECKOUT_SESSION_RE = /^[A-Za-z0-9_\-]{8,}$/;
