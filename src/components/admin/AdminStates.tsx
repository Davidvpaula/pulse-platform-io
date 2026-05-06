/**
 * Componentes reutilizáveis de estados visuais para páginas Admin.
 * - Loading com skeleton
 * - Error com retry
 * - Empty state
 */
import { Loader2, AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminLoadingProps {
  /** Quantas linhas de skeleton mostrar */
  rows?: number;
  /** Mostrar cards de KPI */
  cards?: number;
}

export function AdminLoading({ rows = 4, cards = 0 }: AdminLoadingProps) {
  return (
    <div className="space-y-6">
      {cards > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={`r-${i}`} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}

interface AdminErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function AdminError({ message, onRetry }: AdminErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

interface AdminEmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function AdminEmpty({
  title = "Nenhum dado encontrado",
  description = "Ainda não há dados para exibir nesta seção.",
  icon,
}: AdminEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon || <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/** Spinner inline para loading parcial */
export function AdminInlineLoading({ text = "Carregando…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <Loader2 className="h-4 w-4 animate-spin" /> {text}
    </div>
  );
}
