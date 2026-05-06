import { Loader2, AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PacienteLoading({ message = "Carregando…" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-20 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {message}
    </div>
  );
}

export function PacienteError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <AlertCircle className="h-10 w-10 text-destructive opacity-60" />
      <p className="text-sm text-muted-foreground">{message ?? "Ocorreu um erro ao carregar os dados."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function PacienteEmpty({ icon: Icon = Inbox, title, description }: {
  icon?: React.ElementType;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-16 text-center text-muted-foreground">
      <Icon className="h-10 w-10 opacity-30" />
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      <p className="text-sm">{description ?? "Nenhum dado encontrado."}</p>
    </div>
  );
}

export function PacienteInlineLoading() {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
