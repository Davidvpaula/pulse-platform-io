import { ShieldAlert } from "lucide-react";

type Props = {
  hasConfirmedLink: boolean;
  hasAnyLink: boolean;
  children: React.ReactNode;
};

/**
 * LGPDGate — esconde dados clínicos (filhos) até que ao menos
 * 1 vínculo paciente-conversa esteja confirmado.
 *
 * Defesa em profundidade no frontend; o backend já protege via RLS de pacientes.
 */
export function LGPDGate({ hasConfirmedLink, hasAnyLink, children }: Props) {
  if (hasConfirmedLink) return <>{children}</>;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-3.5 w-3.5" /> Dados clínicos ocultos
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {hasAnyLink
          ? "Confirme o vínculo do paciente acima para liberar prontuário, consulta vinculada e médico responsável."
          : "Vincule um paciente a esta conversa e confirme o vínculo para acessar o prontuário."}
      </p>
    </div>
  );
}
