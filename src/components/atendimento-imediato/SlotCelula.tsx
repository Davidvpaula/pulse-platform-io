import { Check, Lock, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtHora } from "@/lib/format";
import type { PASlot } from "@/lib/pa-types";

export type SlotEstado =
  | "livre"
  | "reservado_por_mim"
  | "reservado_por_outro"
  | "lotado"
  | "em_atendimento"
  | "passado";

type Props = {
  slot: PASlot;
  estado: SlotEstado;
  vagas: number;
  capacidade: number;
  destacar?: boolean;
  onPick: () => void;
};

export default function SlotCelula({
  slot,
  estado,
  vagas,
  capacidade,
  destacar,
  onPick,
}: Props) {
  const desabilitado = estado === "passado" || capacidade === 0;
  const label = `${fmtHora(slot.inicio)}, ${vagas} de ${capacidade} vaga${capacidade === 1 ? "" : "s"}, ${estado.replace(/_/g, " ")}`;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={desabilitado}
      aria-label={label}
      className={cn(
        "group relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
        estado === "livre" && "border-primary/30 bg-card hover:border-primary",
        estado === "reservado_por_mim" && "border-primary bg-accent ring-2 ring-primary",
        estado === "reservado_por_outro" && "border-muted bg-muted/40",
        estado === "lotado" && "border-destructive/40 bg-destructive/5 opacity-70 cursor-not-allowed",
        estado === "em_atendimento" && "border-secondary bg-secondary/20",
        estado === "passado" && "opacity-40 cursor-not-allowed",
        destacar && "animate-pulse ring-2 ring-primary",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-base font-bold tabular-nums">{fmtHora(slot.inicio)}</span>
        {estado === "reservado_por_mim" && <Check className="h-4 w-4 text-primary" />}
        {estado === "lotado" && <X className="h-4 w-4 text-destructive" />}
        {estado === "reservado_por_outro" && <Lock className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {vagas}/{capacidade}
        </span>
        <span>
          {estado === "livre" && "livre"}
          {estado === "reservado_por_mim" && "você reservou"}
          {estado === "reservado_por_outro" && "parcial"}
          {estado === "lotado" && "lotado"}
          {estado === "em_atendimento" && "em atend."}
          {estado === "passado" && "passou"}
        </span>
      </div>
    </button>
  );
}
