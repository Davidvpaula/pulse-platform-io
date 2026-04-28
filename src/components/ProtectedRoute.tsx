import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { canAccessPath } from "@/lib/abilities";
import { profiles } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profileKey } = useAuth();

  if (!canAccessPath(profileKey, pathname)) {
    const home = profiles[profileKey].nav.find(n => n.to)?.to ?? "/app";
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="card-elevated max-w-md p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Acesso não permitido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu perfil atual (<strong>{profiles[profileKey].label}</strong>) não tem permissão
            para acessar esta área. Fale com o administrador para revisar suas permissões.
          </p>
          <Button asChild className="mt-6">
            <Link to={home}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para meu painel</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
