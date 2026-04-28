import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMedicoAguardandoAprovacao } from "@/lib/auth";

/**
 * Bloqueia rotas operacionais do médico enquanto o cadastro não for aprovado.
 * Permite acesso à tela de "aguardando aprovação".
 */
export default function MedicoGuard({ children }: { children: ReactNode }) {
  const aguardando = useMedicoAguardandoAprovacao();
  const location = useLocation();
  const isAguardandoRoute = location.pathname.endsWith("/aguardando-aprovacao");
  if (aguardando && !isAguardandoRoute) {
    return <Navigate to="/app/medico/aguardando-aprovacao" replace />;
  }
  return <>{children}</>;
}
