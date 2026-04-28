import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/session";

/**
 * Protege rotas /app/*.
 * - Em produção: exige sessão real Supabase; sem sessão → /auth.
 * - Em desenvolvimento: deixa passar mesmo sem sessão (seletor de demo do AppLayout assume).
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }

  if (!session && !isDev) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
