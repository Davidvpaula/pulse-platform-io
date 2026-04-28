import { useMemo, useState } from "react";
import { Timeline } from "./Timeline";
import type { TimelineEvent, TimelineKind } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Category = "todos" | "consulta" | "financeiro" | "feegow" | "sistema";

const categoryOf = (k: TimelineKind): Exclude<Category, "todos"> => {
  if (k === "agendamento" || k === "atendimento" || k === "documento") return "consulta";
  if (k === "pagamento") return "financeiro";
  if (k === "feegow") return "feegow";
  return "sistema"; // cadastro, mensagem, alteracao
};

const tabs: { key: Category; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "consulta", label: "Consulta" },
  { key: "financeiro", label: "Financeiro" },
  { key: "feegow", label: "Feegow" },
  { key: "sistema", label: "Sistema" },
];

export function CategorizedTimeline({ events }: { events: TimelineEvent[] }) {
  const [active, setActive] = useState<Category>("todos");

  const filtered = useMemo(
    () => active === "todos" ? events : events.filter(e => categoryOf(e.kind) === active),
    [events, active],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {tabs.map(t => {
          const count = t.key === "todos" ? events.length : events.filter(e => categoryOf(e.kind) === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                active === t.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {t.label}
              <span className="ml-1.5 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5">
        <Timeline events={filtered} />
      </div>
    </div>
  );
}
