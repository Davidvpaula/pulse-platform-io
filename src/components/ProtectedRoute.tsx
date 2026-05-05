import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/session";

/**
 * Protege rotas /app/*.
 * Exige sessão real; sem sessão → /auth.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando…</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
