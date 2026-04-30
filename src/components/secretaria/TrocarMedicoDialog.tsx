import { useEffect, useState } from "react";
import { Loader2, UserCog, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listMedicosCompativeis, listSlotsDisponiveisDoMedico, trocarMedicoConsulta,
  formatDataBR, formatHora,
  type MedicoCompativel, type AgendaSlot,
} from "@/lib/clinico";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consultaId: string | null;
  consultaInicio?: string;
  medicoAtualNome?: string | null;
  onTrocado: () => void;
}

const formatBRL = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function TrocarMedicoDialog({
  open, onOpenChange, consultaId, consultaInicio, medicoAtualNome, onTrocado,
}: Props) {
  const [medicos, setMedicos] = useState<MedicoCompativel[] | null>(null);
  const [medicoSel, setMedicoSel] = useState<MedicoCompativel | null>(null);
  const [slots, setSlots] = useState<AgendaSlot[] | null>(null);
  const [slotSel, setSlotSel] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("Médico ausente");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !consultaId) {
      setMedicos(null); setMedicoSel(null); setSlots(null); setSlotSel(null);
      return;
    }
    setLoading(true);
    listMedicosCompativeis(consultaId).then((ms) => {
      setMedicos(ms);
      setLoading(false);
    });
  }, [open, consultaId]);

  useEffect(() => {
    if (!medicoSel) { setSlots(null); setSlotSel(null); return; }
    setSlots(null);
    listSlotsDisponiveisDoMedico(medicoSel.id).then(setSlots);
  }, [medicoSel]);

  const handleConfirmar = async () => {
    if (!consultaId || !slotSel) return;
    setSalvando(true);
    try {
      const r = await trocarMedicoConsulta({
        consulta_id: consultaId,
        novo_slot_id: slotSel,
        motivo,
      });
      toast.success(
        `Consulta reatribuída · novo valor ${formatBRL(r.novo_valor_centavos)}`,
      );

      // Notificação WhatsApp ao paciente (best-effort, não bloqueia)
      void supabase.functions
        .invoke("notificar-troca-medico", { body: { consulta_id: consultaId } })
        .then(({ data, error }) => {
          if (error) {
            console.warn("[notificar-troca-medico]", error);
            toast.warning("Troca feita, mas WhatsApp não foi enviado.");
          } else if (data?.skipped) {
            toast.info("Paciente sem WhatsApp cadastrado — notificação não enviada.");
          } else if (data?.ok) {
            toast.success("Paciente notificado por WhatsApp.");
          }
        });

      onTrocado();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível trocar o médico.");
    } finally {
      setSalvando(false);
    }
  };

  // Sugere primeiro slot próximo do horário original
  const sugerirProximoDoOriginal = () => {
    if (!slots || !consultaInicio) return;
    const alvo = new Date(consultaInicio).getTime();
    const ordenado = [...slots].sort(
      (a, b) => Math.abs(+new Date(a.inicio) - alvo) - Math.abs(+new Date(b.inicio) - alvo),
    );
    if (ordenado[0]) setSlotSel(ordenado[0].id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Trocar médico da consulta
          </DialogTitle>
          <DialogDescription>
            Reatribua a consulta para outro profissional da mesma especialidade.
            O paciente será notificado e o valor/link da sala serão atualizados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          {/* Coluna 1: profissional */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">
              Novo profissional
            </Label>
            {medicoAtualNome && (
              <p className="text-xs text-muted-foreground">
                Substituindo: <strong>{medicoAtualNome}</strong>
              </p>
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}
            {!loading && medicos && medicos.length === 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                Nenhum outro profissional ativo atende essa especialidade.
              </div>
            )}
            {!loading && medicos && medicos.length > 0 && (
              <ScrollArea className="h-64 rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {medicos.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMedicoSel(m)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left transition hover:bg-muted/50",
                        medicoSel?.id === m.id && "bg-primary/5",
                      )}
                    >
                      <p className="font-medium text-sm">{m.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.preco_centavos != null ? formatBRL(m.preco_centavos) : "—"}
                        {!m.link_sala_padrao && " · sem link de sala"}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Coluna 2: slot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase text-muted-foreground">
                Novo horário
              </Label>
              {slots && slots.length > 0 && consultaInicio && (
                <Button
                  type="button" size="sm" variant="ghost"
                  className="h-6 text-[11px]"
                  onClick={sugerirProximoDoOriginal}
                >
                  Próximo ao original
                </Button>
              )}
            </div>
            {!medicoSel && (
              <p className="text-xs text-muted-foreground">
                Selecione um profissional para listar horários.
              </p>
            )}
            {medicoSel && !slots && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}
            {medicoSel && slots && slots.length === 0 && (
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Esse profissional não tem horários disponíveis.
              </div>
            )}
            {slots && slots.length > 0 && (
              <ScrollArea className="h-64 rounded-lg border border-border">
                <div className="divide-y divide-border">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSlotSel(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-muted/50",
                        slotSel === s.id && "bg-primary/5",
                      )}
                    >
                      <span className="text-sm">
                        {formatDataBR(s.inicio)} · <strong>{formatHora(s.inicio)}</strong>
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        Telemedicina
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="motivo">Motivo da troca</Label>
          <Textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Ex.: médico ausente por motivo de saúde"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!slotSel || salvando}>
            {salvando ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Trocando…</>
            ) : (
              "Confirmar troca"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
