import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
};

export const StatCard = ({ label, value, hint, icon: Icon, trend, className }: Props) => (
  <div className={cn("card-elevated p-5 flex flex-col gap-3", className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
      </div>
      {Icon && (
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
    {(hint || trend) && (
      <div className="flex items-center justify-between text-xs">
        {hint && <span className="text-muted-foreground">{hint}</span>}
        {trend && (
          <span className={cn("font-medium", trend.positive ? "text-success" : "text-destructive")}>
            {trend.value}
          </span>
        )}
      </div>
    )}
  </div>
);
