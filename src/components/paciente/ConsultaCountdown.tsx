import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function calcDiff(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, totalMs: diff };
}

export default function ConsultaCountdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso);
  const [remaining, setRemaining] = useState(() => calcDiff(target));

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcDiff(target)), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (!remaining) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success border border-success/20">
        <Clock className="h-3 w-3" /> Agora!
      </span>
    );
  }

  const parts: string[] = [];
  if (remaining.d > 0) parts.push(`${remaining.d}d`);
  if (remaining.h > 0 || remaining.d > 0) parts.push(`${remaining.h}h`);
  parts.push(`${remaining.m}m`);
  if (remaining.d === 0) parts.push(`${remaining.s}s`);

  const isUrgent = remaining.totalMs < 3600000; // < 1 hour

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
      isUrgent
        ? "bg-warning/10 text-warning border-warning/20 animate-pulse"
        : "bg-primary/10 text-primary border-primary/20"
    }`}>
      <Clock className="h-3 w-3" /> {parts.join(" ")}
    </span>
  );
}
