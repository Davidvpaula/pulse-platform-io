import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { estimarReembolso, type EstimativaReembolso } from "@/lib/reembolsoEstimativa";
import { formatDataBR, formatHora, type ConsultaDetalhada } from "@/lib/clinico";

interface Props {
  consulta: ConsultaDetalhada | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmar: (id: string) => void;
  confirmando: boolean;
}

function formatBRL(centavos: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

const tipoConfig = {
  total: { label: "Reembolso total", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2 },
  parcial: { label: "Reembolso parcial", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: AlertTriangle },
  zero: { label: "Sem reembolso", color: "text-destructive bg-red-50 border-red-200", icon: XCircle },
};

export default function CancelarConsultaDialog({ consulta, open, onOpenChange, onConfirmar, confirmando }: Props) {
  const [estimativa, setEstimativa] = useState<EstimativaReembolso | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!consulta || !open) { setEstimativa(null); return; }
    setLoading(true);
    estimarReembolso(consulta.id)
      .then(setEstimativa)
      .finally(() => setLoading(false));
  }, [consulta?.id, open]);

  if (!consulta) return null;

  const cfg = estimativa ? tipoConfig[estimativa.tipo] : null;
  const Icon = cfg?.icon ?? AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar consulta</DialogTitle>
          <DialogDescription>
            Revise os detalhes e a política de reembolso antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo da consulta */}
        <div className="rounded-lg border p-3 space-y-1 text-sm">
          <p className="font-medium">{consulta.medico_nome ?? "Médico"}</p>
          <p className="text-muted-foreground">
            {consulta.especialidade_nome ?? "—"} · {formatDataBR(consulta.inicio)} às {formatHora(consulta.inicio)}
          </p>
        </div>

        {/* Estimativa de reembolso */}
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Calculando reembolso…</span>
          </div>
        ) : estimativa ? (
          <div className={`rounded-lg border p-4 space-y-3 ${cfg?.color}`}>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{cfg?.label}</span>
              {estimativa.percentual > 0 && estimativa.tipo !== "total" && (
                <span className="text-sm">({estimativa.percentual}%)</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs opacity-70">Valor da consulta</p>
                <p className="font-medium">{formatBRL(estimativa.valor_consulta_centavos)}</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Reembolso estimado</p>
                <p className="font-bold text-lg">{formatBRL(estimativa.valor_reembolso_centavos)}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs opacity-80">
              <Clock className="h-3.5 w-3.5" />
              <span>{estimativa.horas_restantes}h até a consulta</span>
            </div>

            {estimativa.descricao && (
              <p className="text-xs italic opacity-70">{estimativa.descricao}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Não foi possível calcular a estimativa de reembolso. O cancelamento ainda pode ser realizado.
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Esta ação não pode ser desfeita. O valor de reembolso é uma estimativa e pode variar conforme análise administrativa.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmando}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirmar(consulta.id)}
            disabled={confirmando}
          >
            {confirmando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-1.5 h-4 w-4" />
            )}
            Confirmar cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
