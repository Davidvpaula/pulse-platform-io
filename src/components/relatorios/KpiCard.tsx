import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number; // percentual
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
};

export function KpiCard({ label, value, hint, delta, icon: Icon, variant = "default" }: Props) {
  const accent = {
    default: "text-primary",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-destructive",
  }[variant];

  const TrendIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta == null ? "text-muted-foreground" : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className={cn("text-2xl font-semibold mt-1", accent)}>{value}</div>
          {(hint || delta != null) && (
            <div className="flex items-center gap-2 mt-1 text-xs">
              {delta != null && (
                <span className={cn("flex items-center gap-0.5", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(delta).toFixed(1)}%
                </span>
              )}
              {hint && <span className="text-muted-foreground truncate">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && <Icon className={cn("h-5 w-5 shrink-0", accent)} />}
      </div>
    </Card>
  );
}
