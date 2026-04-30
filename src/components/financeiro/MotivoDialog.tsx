import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MotivoDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  motivoRequired?: boolean;
  defaultMotivo?: string;
  onCancel: () => void;
  onConfirm: (motivo: string) => Promise<void> | void;
};

/**
 * Diálogo simples de confirmação com campo de motivo (opcional ou obrigatório).
 * Usado para registrar histórico de mudanças de repasse financeiro.
 */
export function MotivoDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  destructive = false,
  motivoRequired = false,
  defaultMotivo = "",
  onCancel,
  onConfirm,
}: MotivoDialogProps) {
  const [motivo, setMotivo] = useState(defaultMotivo);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMotivo(defaultMotivo);
      setBusy(false);
    }
  }, [open, defaultMotivo]);

  if (!open) return null;

  const canConfirm = !motivoRequired || motivo.trim().length > 0;

  const handle = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try {
      await onConfirm(motivo.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="card-elevated w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Motivo {motivoRequired ? "" : "(opcional)"}
          </label>
          <textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={busy}
            rows={3}
            placeholder="Ex.: ajuste contratual, promoção interna…"
            className="mt-1.5 w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Será registrado no histórico de auditoria com seu nome e data/hora.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handle}
            disabled={!canConfirm || busy}
            className={cn(
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-gradient-primary hover:opacity-90",
            )}
          >
            {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
