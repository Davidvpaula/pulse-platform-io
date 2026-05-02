import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { enviarAvaliacao } from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  consulta: {
    id: string;
    paciente_id: string;
    medico_id: string;
    medico_nome?: string | null;
  };
  onAvaliado?: () => void;
};

export default function AvaliarMedicoDialog({ open, onOpenChange, consulta, onAvaliado }: Props) {
  const [nota, setNota] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState("");
  const [publica, setPublica] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const resetar = () => {
    setNota(0);
    setHover(0);
    setComentario("");
    setPublica(false);
  };

  const enviar = async () => {
    if (nota < 1) {
      toast.error("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    setEnviando(true);
    try {
      await enviarAvaliacao({
        paciente_id: consulta.paciente_id,
        medico_id: consulta.medico_id,
        consulta_id: consulta.id,
        nota,
        comentario: comentario.trim() || undefined,
        avaliacao_publica: publica,
      });
      toast.success("Avaliação enviada com sucesso!");
      resetar();
      onOpenChange(false);
      onAvaliado?.();
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao enviar avaliação";
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetar(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar consulta</DialogTitle>
          <DialogDescription>
            {consulta.medico_nome
              ? `Como foi sua experiência com ${consulta.medico_nome}?`
              : "Como foi sua experiência nesta consulta?"}
          </DialogDescription>
        </DialogHeader>

        {/* Estrelas */}
        <div className="flex justify-center gap-1 py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              className="focus:outline-none transition-transform hover:scale-110"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setNota(i)}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hover || nota) >= i
                    ? "fill-warning text-warning"
                    : "text-muted-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
        {nota > 0 && (
          <p className="text-center text-sm text-muted-foreground">
            {nota === 1 && "Muito ruim"}
            {nota === 2 && "Ruim"}
            {nota === 3 && "Regular"}
            {nota === 4 && "Bom"}
            {nota === 5 && "Excelente"}
          </p>
        )}

        {/* Comentário */}
        <div className="space-y-2">
          <Label htmlFor="comentario">Comentário (opcional)</Label>
          <Textarea
            id="comentario"
            placeholder="Conte como foi sua experiência…"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            rows={3}
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {comentario.length}/500
          </p>
        </div>

        {/* Tornar público */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="publica"
            checked={publica}
            onCheckedChange={(v) => setPublica(!!v)}
          />
          <Label htmlFor="publica" className="text-sm cursor-pointer">
            Tornar minha avaliação pública (visível para outros pacientes)
          </Label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando || nota < 1} className="bg-gradient-primary hover:opacity-90">
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enviar avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
