import { ReactNode } from "react";
import { usePermission } from "@/lib/permissions/usePermission";
import { Lock } from "lucide-react";

interface Props {
  perm: string | string[];
  /** se true exige TODAS as permissões; senão basta uma */
  all?: boolean;
  fallback?: ReactNode;
  /** quando false, oculta totalmente; quando true mostra placeholder amigável */
  showFallback?: boolean;
  children: ReactNode;
}

/**
 * Esconde/bloqueia conteúdo conforme permissão. Use em botões críticos:
 * <RequirePermission perm="financeiro.reembolsar"><Button>...</Button></RequirePermission>
 */
export function RequirePermission({ perm, all, fallback, showFallback = false, children }: Props) {
  const { loading, hasAny, hasAll } = usePermission(perm);
  const allowed = all ? hasAll : hasAny;

  if (loading) return null;
  if (!allowed) {
    if (fallback !== undefined) return <>{fallback}</>;
    if (!showFallback) return null;
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> sem permissão
      </span>
    );
  }
  return <>{children}</>;
}
