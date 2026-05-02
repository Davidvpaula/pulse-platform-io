import { Sun, Sunset, Moon } from "lucide-react";
import SlotCelula, { type SlotEstado } from "./SlotCelula";
import { turnoDoSlot, type PASlot } from "@/lib/pa-types";

type Props = {
  slots: PASlot[];
  estadoPorSlot: Map<string, { estado: SlotEstado; vagas: number; capacidade: number }>;
  destacar: string | null;
  onPick: (slot: PASlot) => void;
};

const TURNOS = [
  { key: "manha" as const, titulo: "Manhã", Icon: Sun },
  { key: "tarde" as const, titulo: "Tarde", Icon: Sunset },
  { key: "noite" as const, titulo: "Noite", Icon: Moon },
];

export default function CalendarioFila({ slots, estadoPorSlot, destacar, onPick }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {TURNOS.map(({ key, titulo, Icon }) => {
        const doTurno = slots.filter((s) => turnoDoSlot(s) === key);
        return (
          <section key={key} className="card-elevated p-4">
            <header className="mb-3 flex items-center gap-2 border-b pb-2">
              <Icon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">{titulo}</h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {doTurno.length} horários
              </span>
            </header>
            <div className="grid grid-cols-2 gap-2">
              {doTurno.map((s) => {
                const info = estadoPorSlot.get(s.key) ?? {
                  estado: "livre" as SlotEstado,
                  vagas: s.total_vagas ?? 0,
                  capacidade: s.total_vagas ?? 0,
                };
                return (
                  <SlotCelula
                    key={s.key}
                    slot={s}
                    estado={info.estado}
                    vagas={info.vagas}
                    capacidade={info.capacidade}
                    destacar={destacar === s.key}
                    onPick={() => onPick(s)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
