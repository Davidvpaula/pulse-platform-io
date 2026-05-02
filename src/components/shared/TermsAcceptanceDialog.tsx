import { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buscarTermoAtivo, registrarAceite, type TermoTipo, type TermoRow } from "@/lib/termos";

interface Props {
  tipo: TermoTipo;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Chamado após aceite bem-sucedido */
  onAccepted: () => void;
  /** Se true, impede fechar sem aceitar */
  obrigatorio?: boolean;
}

export function TermsAcceptanceDialog({ tipo, open, onOpenChange, onAccepted, obrigatorio = true }: Props) {
  const [termo, setTermo] = useState<TermoRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setAccepted(false);
    setLoading(true);
    buscarTermoAtivo(tipo)
      .then(t => setTermo(t))
      .catch(() => toast.error("Erro ao carregar termos"))
      .finally(() => setLoading(false));
  }, [open, tipo]);

  const handleConfirm = async () => {
    if (!termo) return;
    setSaving(true);
    try {
      await registrarAceite(termo.id);
      toast.success("Termos aceitos com sucesso!");
      onAccepted();
    } catch (e: any) {
      toast.error("Erro ao registrar aceite: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (obrigatorio && !v) return; // impede fechar
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{loading ? "Carregando termos…" : (termo?.titulo ?? "Termos")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !termo ? (
          <p className="text-muted-foreground py-4">Nenhum termo encontrado para este tipo.</p>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto border rounded-md p-4 prose prose-sm dark:prose-invert max-w-none"
              style={{ maxHeight: "50vh" }}
              dangerouslySetInnerHTML={{ __html: termo.conteudo }}
            />

            <div className="flex items-center gap-2 mt-4">
              <Checkbox
                id="aceite-check"
                checked={accepted}
                onCheckedChange={v => setAccepted(!!v)}
              />
              <label htmlFor="aceite-check" className="text-sm cursor-pointer select-none">
                Li e aceito os termos e condições
              </label>
            </div>

            <DialogFooter className="mt-2">
              {!obrigatorio && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              )}
              <Button onClick={handleConfirm} disabled={!accepted || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar aceite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
