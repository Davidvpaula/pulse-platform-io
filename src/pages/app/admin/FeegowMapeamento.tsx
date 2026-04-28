import { PageHeader } from "@/components/PageHeader";
import {
  statusInternoLabel, statusFeegowLabel, statusMap,
  type StatusInterno, type StatusFeegow,
} from "@/lib/feegow";
import { ArrowRight } from "lucide-react";

export default function FeegowMapeamento() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapeamento de status · Feegow"
        description="Como cada status interno será traduzido para os status oficiais da Feegow no momento da sincronização."
      />

      <div className="card-elevated overflow-hidden">
        <div className="grid grid-cols-[1.2fr_auto_1.2fr] items-center gap-3 border-b border-border bg-muted/40 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span>Status interno (Lasmar)</span>
          <span>→</span>
          <span>Status Feegow</span>
        </div>

        <div className="divide-y divide-border">
          {statusMap.map(({ interno, feegow }) => (
            <div key={interno} className="grid grid-cols-[1.2fr_auto_1.2fr] items-center gap-3 px-5 py-3">
              <span className="text-sm font-medium">{statusInternoLabel[interno as StatusInterno]}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {feegow ? (
                  <span className="rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
                    {statusFeegowLabel[feegow as StatusFeegow]}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">não enviado à Feegow</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-elevated p-5">
        <h3 className="font-semibold">Status oficiais reconhecidos pela Feegow</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(statusFeegowLabel).map(([k, v]) => (
            <span key={k} className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs">{v}</span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O mapeamento poderá ser editado por Admin no momento em que a integração real for ativada.
        </p>
      </div>
    </div>
  );
}
