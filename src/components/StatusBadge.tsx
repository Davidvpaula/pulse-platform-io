import { cn } from "@/lib/utils";
import type { Status } from "@/lib/mock";
import { statusLabel, statusTone } from "@/lib/mock";

export const StatusBadge = ({ status, className }: { status: Status; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      statusTone[status],
      className,
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {statusLabel[status]}
  </span>
);
