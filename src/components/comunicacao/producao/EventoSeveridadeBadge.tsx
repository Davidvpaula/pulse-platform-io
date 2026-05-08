import { Badge } from "@/components/ui/badge";

const MAP: Record<string, string> = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground",
};

export function EventoSeveridadeBadge({ severity }: { severity: string }) {
  const cls = MAP[severity] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${cls}`}>
      {severity}
    </Badge>
  );
}
