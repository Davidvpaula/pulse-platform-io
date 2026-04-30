import { useEffect, useState } from "react";
import { Loader2, Gift, Calendar, Clock, Video, MapPin, Stethoscope } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  agendarRetornoGratuito, formatDataBR, formatHora,
  listSlotsDisponiveisDoMedico, type AgendaSlot, type RetornoComContexto,
} from "@/lib/clinico";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  voucher: RetornoComContexto | null;
  onAgendado: () => void;
}

export default function AgendarRetornoDialog({ open, onOpenChange, voucher, onAgendado }: Props) {
  const [slots, setSlots] = useState<AgendaSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agendando, setAgendando] = useState(false);

  useEffect(() => {
    if (!open || !voucher) { setSlots(null); setSelectedId(null); return; }
    setLoading(true);
    listSlotsDisponiveisDoMedico(voucher.medico_id).then((s) => {
      // Filtra slots dentro da validade do voucher
      const limite = new Date(voucher.valido_ate);
      setSlots(s.filter((x) => new Date(x.inicio) <= limite));
      setLoading(false);
    });
  }, [open, voucher]);

  const handleConfirmar = async () => {
    if (!voucher || !selectedId) return;
    setAgendando(true);
    try {
      await agendarRetornoGratuito({ slot_id: selectedId, voucher_id: voucher.id });
      toast.success("Retorno agendado com sucesso!");
      onAgendado();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível agendar.");
    } finally {
      setAgendando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Agendar retorno gratuito
          </DialogTitle>
          <DialogDescription>
            {voucher && (
              <>
                Escolha um horário disponível com <strong>{voucher.medico_nome ?? "seu médico"}</strong>.
                Válido até <strong>{new Date(voucher.valido_ate).toLocaleDateString("pt-BR")}</strong>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando horários…
            </div>
          )}
          {!loading && slots && slots.length === 0 && (
            <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum horário disponível com este profissional dentro da validade do voucher.
              Entre em contato com a clínica.
            </div>
          )}
          {!loading && slots && slots.length > 0 && (
            <ScrollArea className="h-72 rounded-lg border border-border">
              <div className="divide-y divide-border">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/50",
                      selectedId === s.id && "bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {formatDataBR(s.inicio)}
                        </p>
                        <p className="font-bold">{formatHora(s.inicio)}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        {s.modalidade === "online" ? (
                          <><Video className="h-3 w-3" /> Online</>
                        ) : (
                          <><MapPin className="h-3 w-3" /> Presencial</>
                        )}
                      </span>
                    </div>
                    {selectedId === s.id && (
                      <span className="text-xs font-semibold text-primary">Selecionado</span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={agendando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!selectedId || agendando}>
            {agendando ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Agendando…</>
            ) : (
              <>Agendar gratuitamente</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
