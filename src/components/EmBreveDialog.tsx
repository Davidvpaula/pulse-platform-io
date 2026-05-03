import { Clock, Stethoscope } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  especialidade: string;
};

/**
 * Dialog exibido ao clicar em uma especialidade sem médicos disponíveis.
 */
export default function EmBreveDialog({ open, onOpenChange, especialidade }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-2">
            <Clock className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl">Em breve!</DialogTitle>
          <DialogDescription className="text-base mt-2">
            A especialidade <strong className="text-foreground">{especialidade}</strong> ainda não possui médicos disponíveis na plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-foreground">Estamos expandindo!</span>
          </div>
          <p>
            Novos profissionais estão sendo cadastrados constantemente. 
            Em breve teremos especialistas em {especialidade} disponíveis para você.
          </p>
        </div>

        <Button onClick={() => onOpenChange(false)} className="mt-4 w-full">
          Entendi
        </Button>
      </DialogContent>
    </Dialog>
  );
}
