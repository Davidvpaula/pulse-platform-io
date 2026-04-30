import { Check, Stethoscope, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtHora, type MockMedico, type MockSlot } from "@/lib/mocks/atendimentoImediatoMock";

type Props = {
  slot: MockSlot;
  medico: MockMedico;
  msRestantes: number;
  onConfirmar: () => void;
  onCancelar: () => void;
};

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m${String(r).padStart(2, "0")}s`;
}

export default function RodapeReserva({ slot, medico, msRestantes, onConfirmar, onCancelar }: Props) {
  return (
    <div className="sticky bottom-4 z-30 mx-auto mt-6 max-w-4xl">
      <div className="card-elevated border-primary/40 bg-card/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold">
            {medico.nome.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">
                {fmtHora(slot.inicio)} · Dr(a). {medico.nome}
              </p>
              <Badge variant="secondary" className="text-[10px]">
                <Stethoscope className="mr-1 h-3 w-3" />
                {medico.especialidade}
              </Badge>
              <Badge className="bg-primary/10 text-primary text-[10px] hover:bg-primary/10">
                atribuído por tempo de casa
              </Badge>
            </div>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="h-3 w-3" /> Reserva expira em {formatMs(msRestantes)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancelar}>
              <X className="mr-1 h-4 w-4" /> Liberar
            </Button>
            <Button size="sm" onClick={onConfirmar} className="bg-gradient-primary">
              <Check className="mr-1 h-4 w-4" /> Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
