import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Loader2, Video, ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { fmtHora } from "@/lib/format";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Slot = {
  id: string;
  inicio: string;
  fim: string;
  modalidade: string;
};

type Props = {
  medicoId: string;
  medicoNome: string;
  especialidadeId?: string;
  precoCentavos?: number;
  especialidadeNome?: string;
};

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function MedicoSlotsPanel({
  medicoId,
  medicoNome,
  especialidadeId,
  precoCentavos,
  especialidadeNome,
}: Props) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthCursor, setMonthCursor] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agenda_slots")
        .select("id, inicio, fim, modalidade")
        .eq("medico_id", medicoId)
        .is("servico_id", null)
        .eq("status", "disponivel")
        .gte("inicio", new Date().toISOString())
        .order("inicio", { ascending: true })
        .limit(500);
      const list = (data ?? []) as Slot[];
      setSlots(list);
      // pré-seleciona o primeiro dia disponível
      if (list.length > 0) {
        const first = startOfDay(new Date(list[0].inicio));
        setSelectedDate(first);
        setMonthCursor(startOfMonth(first));
      }
      setLoading(false);
    })();
  }, [medicoId]);

  // Conjunto de datas disponíveis (chave YYYY-MM-DD)
  const availableDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) set.add(format(new Date(s.inicio), "yyyy-MM-dd"));
    return set;
  }, [slots]);

  // Slots do dia selecionado
  const slotsOfDay = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => isSameDay(new Date(s.inicio), selectedDate));
  }, [slots, selectedDate]);

  // Geração das células do mês (matriz semana)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }
    return days;
  }, [monthCursor]);

  const escolher = () => {
    if (!selectedSlot) return;
    const qs = especialidadeId
      ? `?tipo=especialidade&ref=${especialidadeId}`
      : "?tipo=especialidade";
    const url = `/app/agendamento/confirmar/${selectedSlot.id}${qs}`;
    if (!session) {
      navigate(`/auth?redirect=${encodeURIComponent(url)}`);
      return;
    }
    navigate(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando horários…
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <CalendarIcon className="mx-auto mb-2 h-6 w-6 opacity-50" />
        Nenhum horário disponível no momento.
      </div>
    );
  }

  const today = startOfDay(new Date());
  const visibleSlots = showAll ? slotsOfDay : slotsOfDay.slice(0, 8);

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[0.95fr_1fr_0.85fr]">
      {/* ─── Calendário ─── */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMonthCursor((m) => addMonths(m, -1))}
            disabled={monthCursor <= startOfMonth(new Date())}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <p className="text-xs font-semibold capitalize">
            {format(monthCursor, "MMM 'de' yyyy", { locale: ptBR })}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMonthCursor((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {["d", "s", "t", "q", "q", "s", "s"].map((d, i) => (
            <span key={i} className="text-[9px] uppercase tracking-wider text-muted-foreground py-0.5">
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((d, i) => {
            const key = format(d, "yyyy-MM-dd");
            const inMonth = isSameMonth(d, monthCursor);
            const isPast = d < today;
            const isAvailable = availableDateKeys.has(key) && !isPast;
            const isSelected = selectedDate && isSameDay(d, selectedDate);
            return (
              <button
                key={i}
                disabled={!isAvailable}
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                  setShowAll(false);
                }}
                className={cn(
                  "h-7 flex items-center justify-center rounded-md text-xs transition relative",
                  !inMonth && "text-muted-foreground/30",
                  inMonth && !isAvailable && "text-muted-foreground/40 cursor-not-allowed",
                  isAvailable && !isSelected && "hover:bg-primary/10 text-foreground font-medium",
                  isSelected && "bg-primary text-primary-foreground font-semibold shadow-sm",
                )}
              >
                {format(d, "d")}
                {isAvailable && !isSelected && (
                  <span className="absolute bottom-0.5 h-[3px] w-[3px] rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Horários ─── */}
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold leading-tight">
          {selectedDate
            ? format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR })
            : "Selecione um dia"}
        </p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Horário de Brasília (GMT-3)
        </p>

        {slotsOfDay.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">
            Nenhum horário neste dia.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleSlots.map((s) => {
                const isSel = selectedSlot?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSlot(s)}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-center transition font-mono text-xs font-semibold",
                      isSel
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    {fmtHora(s.inicio)}
                  </button>
                );
              })}
            </div>

            {slotsOfDay.length > 8 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 w-full text-center text-[11px] text-primary hover:underline font-medium"
              >
                {showAll ? "Mostrar menos" : `Mostrar todos (${slotsOfDay.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {/* ─── Detalhes da consulta ─── */}
      <div className="rounded-lg bg-gradient-to-br from-primary to-primary/85 text-primary-foreground p-3.5 flex flex-col">
        <p className="text-xs font-semibold mb-2.5">Detalhes da consulta</p>

        <div className="space-y-2 text-xs flex-1">
          <div>
            <p className="text-[9px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Profissional</p>
            <p className="font-medium leading-tight">{medicoNome}</p>
          </div>

          {especialidadeNome && (
            <div>
              <p className="text-[9px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Especialidade</p>
              <p className="font-medium leading-tight">{especialidadeNome}</p>
            </div>
          )}

          <div>
            <p className="text-[9px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Modalidade</p>
            <p className="font-medium inline-flex items-center gap-1 leading-tight">
              <Video className="h-3 w-3" /> Telemedicina
            </p>
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Data e horário</p>
            {selectedSlot ? (
              <p className="font-semibold inline-flex items-center gap-1 leading-tight">
                <Clock className="h-3 w-3" />
                {format(new Date(selectedSlot.inicio), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
              </p>
            ) : (
              <p className="text-[11px] opacity-70 italic">Selecione um horário</p>
            )}
          </div>

          {precoCentavos && precoCentavos > 0 && (
            <div className="pt-1.5 border-t border-primary-foreground/20">
              <p className="text-[9px] uppercase tracking-wider opacity-70 leading-none mb-0.5">Valor</p>
              <p className="text-base font-extrabold leading-tight">{brl(precoCentavos)}</p>
            </div>
          )}
        </div>

        <Button
          onClick={escolher}
          disabled={!selectedSlot}
          size="sm"
          className="mt-3 w-full bg-background text-foreground hover:bg-background/90 font-semibold h-8 text-xs"
        >
          {selectedSlot ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5" /> Agendar
            </>
          ) : (
            "Selecione um horário"
          )}
        </Button>
      </div>
    </div>
  );
}
