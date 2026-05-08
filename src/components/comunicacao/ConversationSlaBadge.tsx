import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  slaDueAt: string | null | undefined;
  resolvedAt?: string | null;
  compact?: boolean;
};

function fmt(ms: number): string {
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60_000);
  const h = Math.floor(m / 60);
  if (h >= 1) return `${h}h${m % 60 ? ` ${m % 60}m` : ""}`;
  return `${m}m`;
}

export function ConversationSlaBadge({ slaDueAt, resolvedAt, compact }: Props) {
  if (resolvedAt) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")}>
        <CheckCircle2 className="h-3 w-3" /> resolvida
      </span>
    );
  }
  if (!slaDueAt) return null;
  const ms = new Date(slaDueAt).getTime() - Date.now();
  const overdue = ms < 0;
  const warning = !overdue && ms < 15 * 60_000;
  const tone = overdue
    ? "bg-destructive/15 text-destructive"
    : warning
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  const Icon = overdue ? AlertTriangle : Clock;
  const label = overdue ? `SLA vencido há ${fmt(ms)}` : `SLA ${fmt(ms)}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5", tone)}>
      <Icon className="h-3 w-3" />
      {compact ? (overdue ? "vencido" : fmt(ms)) : label}
    </span>
  );
}
