import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Loader2, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { fmtHora, dataLabel } from "@/lib/format";

type Slot = {
  id: string;
  inicio: string;
  fim: string;
  modalidade: string;
};

type Props = {
  medicoId: string;
  medicoNome: string;
};

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function dataLabel(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  const eq = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (eq(d, hoje)) return "Hoje";
  if (eq(d, amanha)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function groupByDate(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = new Date(s.inicio).toLocaleDateString("pt-BR");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return map;
}

export default function MedicoSlotsPanel({ medicoId, medicoNome }: Props) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const DAYS_PER_PAGE = 5;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPage(0);
      const { data } = await supabase
        .from("agenda_slots")
        .select("id, inicio, fim, modalidade")
        .eq("medico_id", medicoId)
        .is("servico_id", null)
        .eq("status", "disponivel")
        .gte("inicio", new Date().toISOString())
        .order("inicio", { ascending: true })
        .limit(100);
      setSlots((data ?? []) as Slot[]);
      setLoading(false);
    })();
  }, [medicoId]);

  const escolher = (slotId: string) => {
    if (!session) {
      navigate(`/auth?redirect=/app/paciente/agendar/confirmar/${slotId}`);
      return;
    }
    navigate(`/app/paciente/agendar/confirmar/${slotId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando horários…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        <Calendar className="mx-auto mb-2 h-6 w-6 opacity-50" />
        Nenhum horário disponível no momento.
      </div>
    );
  }

  const grouped = groupByDate(slots);
  const days = Array.from(grouped.entries());
  const totalPages = Math.ceil(days.length / DAYS_PER_PAGE);
  const visibleDays = days.slice(page * DAYS_PER_PAGE, (page + 1) * DAYS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Horários de {medicoNome.split(" ")[0]}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground min-w-[3rem] text-center">
              {page + 1}/{totalPages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {visibleDays.map(([dateKey, daySlots]) => (
          <div key={dateKey} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-semibold text-center text-foreground mb-2 pb-2 border-b border-border">
              <Calendar className="inline h-3 w-3 mr-1 -mt-0.5" />
              {dataLabel(daySlots[0].inicio)}
            </p>
            <div className="space-y-1.5">
              {daySlots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => escolher(s.id)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center transition hover:border-primary hover:bg-primary/5 hover:shadow-sm group"
                >
                  <p className="font-mono text-sm font-bold group-hover:text-primary transition-colors">
                    {formatHora(s.inicio)}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Video className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Online</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
