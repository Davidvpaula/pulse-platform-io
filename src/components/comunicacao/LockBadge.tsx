import { Lock, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  lockedBy: string | null;
  lockedAt: string | null;
  lockedByName?: string | null;
  isMe: boolean;
  className?: string;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function LockBadge({ lockedBy, lockedAt, lockedByName, isMe, className }: Props) {
  if (!lockedBy) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1 text-[10px]",
        isMe
          ? "bg-green-500/10 text-green-700 border-green-500/30"
          : "bg-amber-500/10 text-amber-700 border-amber-500/30",
        className,
      )}
    >
      {isMe ? <UserCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {isMe ? "Você está atendendo" : `${lockedByName || "Outro atendente"} atendendo`}
      {lockedAt && <span className="opacity-70 ml-1">{timeAgo(lockedAt)}</span>}
    </Badge>
  );
}
