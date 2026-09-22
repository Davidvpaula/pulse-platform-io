import { previewProfile } from "@/lib/local-preview";
import { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/session";

/**
 * Protege rotas /app/*.
 * Exige sessão real; sem sessão → /auth.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, error, retry } = useSession();
  const location = useLocation();

  if (previewProfile()) return <>{children}</>;

  if (error) {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Não foi possível abrir sua conta</h1>
      <p role="alert" className="text-muted-foreground">{error}</p>
      <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={retry}>Tentar novamente</button>
      <Link className="underline" to="/auth">Voltar ao login</Link>
    </main>;
  }

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
