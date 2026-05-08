import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onUseTemplate: () => void;
};

export function JanelaExpiradaBanner({ onUseTemplate }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Janela 24h encerrada.</strong> Use um template oficial para reabrir a conversa.
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={onUseTemplate} className="shrink-0">
        Usar template oficial
      </Button>
    </div>
  );
}
