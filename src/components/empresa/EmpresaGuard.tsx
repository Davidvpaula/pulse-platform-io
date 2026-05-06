/**
 * EmpresaGuard — protege rotas /empresa/*.
 * Exige autenticação + vínculo real com empresa.
 * Sem vínculo → tela amigável.
 */
import { useEmpresaAtual } from "@/lib/useEmpresaAtual";
import { Loader2, Building2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmpresaGuardProps {
  children: React.ReactNode;
}

export function EmpresaGuard({ children }: EmpresaGuardProps) {
  const { empresa, loading, error } = useEmpresaAtual();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando vínculo empresarial…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h2 className="font-display text-xl font-bold">Erro ao verificar empresa</h2>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <Button asChild variant="outline">
          <Link to="/app">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">Sem empresa vinculada</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Sua conta não está associada a nenhuma empresa. Se você é gestor ou RH de uma empresa,
          entre em contato com o administrador para vincular sua conta.
        </p>
        <Button asChild variant="outline">
          <Link to="/app">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
