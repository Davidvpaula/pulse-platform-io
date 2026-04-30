import { useState } from "react";
import { Loader2, Gift } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { criarRetornoGratuito } from "@/lib/clinico";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consultaId: string | null;
  pacienteNome?: string | null;
  /** Chamado depois que tudo terminou (com ou sem voucher), pra fechar e recarregar. */
  onConcluido: () => void;
}

const PRESETS = [7, 15, 30, 45, 60];

export default function RetornoGratuitoDialog({
  open, onOpenChange, consultaId, pacienteNome, onConcluido,
}: Props) {
  const [oferecer, setOferecer] = useState(true);
  const [dias, setDias] = useState(30);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleConfirmar = async () => {
    if (!consultaId) return;
    if (!oferecer) {
      onOpenChange(false);
      onConcluido();
      return;
    }
    if (dias < 1 || dias > 365) {
      toast.error("Período deve estar entre 1 e 365 dias.");
      return;
    }
    setSalvando(true);
    const res = await criarRetornoGratuito({
      consulta_id: consultaId,
      dias_validade: dias,
      observacao,
    });
    setSalvando(false);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível liberar o retorno.");
      return;
    }
    toast.success(`Retorno gratuito liberado por ${dias} dias.`);
    onOpenChange(false);
    onConcluido();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Consulta concluída
          </DialogTitle>
          <DialogDescription>
            {pacienteNome ? <>Paciente: <strong>{pacienteNome}</strong>. </> : null}
            Deseja liberar uma consulta de <strong>retorno gratuito</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Oferecer retorno gratuito</p>
              <p className="text-xs text-muted-foreground">
                O paciente verá o voucher em "Meus agendamentos".
              </p>
            </div>
            <Switch checked={oferecer} onCheckedChange={setOferecer} />
          </div>

          {oferecer && (
            <>
              <div>
                <Label htmlFor="dias">Validade do retorno (dias)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={dias === p ? "default" : "outline"}
                      onClick={() => setDias(p)}
                    >
                      {p}d
                    </Button>
                  ))}
                  <Input
                    id="dias"
                    type="number"
                    min={1}
                    max={365}
                    value={dias}
                    onChange={(e) => setDias(Number(e.target.value) || 0)}
                    className="w-24"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Válido até {new Date(Date.now() + dias * 86400000).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <div>
                <Label htmlFor="obs">Observação (opcional)</Label>
                <Textarea
                  id="obs"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: trazer exame de sangue do dia."
                  rows={2}
                  maxLength={300}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={salvando}>
            {salvando ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…</>
            ) : oferecer ? (
              "Concluir e liberar retorno"
            ) : (
              "Concluir sem retorno"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
