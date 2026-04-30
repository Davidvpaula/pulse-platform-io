import { useEffect, useState } from "react";
import { useImpersonation } from "@/lib/impersonation";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function ImpersonationBanner() {
  const { active, stop } = useImpersonation();
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!active) return;
    const tick = () => setRestante(active.expira_em - Date.now());
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [active]);

  if (!active) return null;

  async function sair() {
    try {
      await stop();
      toast.success("Modo 'Visualizar como' encerrado");
    } catch (e: any) {
      toast.error("Erro ao encerrar: " + (e?.message ?? e));
    }
  }

  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center gap-3 border-b-2 border-destructive/60 bg-destructive px-4 py-2 text-destructive-foreground shadow-md">
      <Eye className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-bold">Visualizando como </span>
        <span className="font-semibold">{active.target.nome}</span>
        <span className="opacity-90"> ({active.target.role}) — modo somente leitura</span>
      </div>
      <span className="rounded-full bg-destructive-foreground/15 px-2 py-0.5 font-mono text-xs">
        ⏱ {fmt(restante)}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={sair}
        className="h-7 gap-1 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
      >
        <X className="h-3.5 w-3.5" /> Sair
      </Button>
    </div>
  );
}
