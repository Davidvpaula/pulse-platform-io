import { CheckCircle2, FileText, Calendar, Stethoscope, MessageSquare, Edit3, Wallet, UserPlus, ArrowDownToLine } from "lucide-react";
import type { TimelineEvent, TimelineKind } from "@/lib/mock";
import { cn } from "@/lib/utils";

const iconMap: Record<TimelineKind, typeof CheckCircle2> = {
  cadastro: UserPlus,
  feegow: ArrowDownToLine,
  agendamento: Calendar,
  atendimento: Stethoscope,
  documento: FileText,
  mensagem: MessageSquare,
  alteracao: Edit3,
  pagamento: Wallet,
};

const toneMap: Record<TimelineKind, string> = {
  cadastro: "bg-info/10 text-info ring-info/20",
  feegow: "bg-accent/15 text-accent ring-accent/30",
  agendamento: "bg-primary/10 text-primary ring-primary/20",
  atendimento: "bg-success/10 text-success ring-success/20",
  documento: "bg-secondary text-secondary-foreground ring-border",
  mensagem: "bg-warning/10 text-warning ring-warning/20",
  alteracao: "bg-muted text-muted-foreground ring-border",
  pagamento: "bg-warning/10 text-warning ring-warning/20",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  }
  return (
    <ol className="relative space-y-5 pl-6">
      <span aria-hidden className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
      {events.map(ev => {
        const Icon = iconMap[ev.kind];
        return (
          <li key={ev.id} className="relative">
            <span className={cn(
              "absolute -left-[18px] top-0.5 grid h-6 w-6 place-items-center rounded-full ring-4 ring-background",
              toneMap[ev.kind],
            )}>
              <Icon className="h-3 w-3" />
            </span>
            <div className="ml-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold">{ev.titulo}</p>
                <span className="text-[11px] text-muted-foreground">{ev.data}</span>
                {ev.ator && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {ev.ator}
                  </span>
                )}
              </div>
              {ev.desc && <p className="mt-0.5 text-xs text-muted-foreground">{ev.desc}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
