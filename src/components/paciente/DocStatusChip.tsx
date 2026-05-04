import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocStatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
      ok ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}
