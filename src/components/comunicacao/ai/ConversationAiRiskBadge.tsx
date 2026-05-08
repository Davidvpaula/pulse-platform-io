import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE: Record<string, { cls: string; label: string; icon: any }> = {
  baixo:   { cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", label: "Risco baixo", icon: ShieldCheck },
  medio:   { cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", label: "Risco médio", icon: ShieldAlert },
  alto:    { cls: "bg-orange-500/10 text-orange-700 border-orange-500/30", label: "Risco alto", icon: AlertTriangle },
  critico: { cls: "bg-destructive/15 text-destructive border-destructive/40", label: "Risco crítico", icon: AlertTriangle },
};

export function ConversationAiRiskBadge({ level, compact }: { level?: string | null; compact?: boolean }) {
  if (!level) return null;
  const t = TONE[level] || TONE.baixo;
  const Icon = t.icon;
  return (
    <Badge variant="outline" className={cn("text-[10px] py-0 h-4 flex items-center gap-1", t.cls)}>
      <Icon className="h-3 w-3" />
      {compact ? level : t.label}
    </Badge>
  );
}
