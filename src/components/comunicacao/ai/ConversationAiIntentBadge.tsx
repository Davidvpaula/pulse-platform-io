import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConversationAiIntentBadge({
  intent, department, priority, compact,
}: { intent?: string | null; department?: string | null; priority?: string | null; compact?: boolean }) {
  if (!intent) return null;
  return (
    <Badge variant="outline" className={cn("text-[10px] py-0 h-4 flex items-center gap-1 bg-violet-500/10 text-violet-700 border-violet-500/30")}>
      <Sparkles className="h-3 w-3" />
      {compact ? intent : `IA: ${intent}${department ? ` → ${department}` : ""}${priority ? ` (${priority})` : ""}`}
    </Badge>
  );
}
