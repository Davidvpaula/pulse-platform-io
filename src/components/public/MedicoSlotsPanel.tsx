import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

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
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function MedicoSlotsPanel({ medicoId, medicoNome }: Props) {
  const navigate = useNavigate();
  const { session } = useSession();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agenda_slots")
        .select("id, inicio, fim, modalidade")
        .eq("medico_id", medicoId)
        .eq("status", "disponivel")
        .gte("inicio", new Date().toISOString())
        .order("inicio", { ascending: true })
        .limit(30);
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

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Horários de {medicoNome.split(" ")[0]}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((s) => (
          <button
            key={s.id}
            onClick={() => escolher(s.id)}
            className="rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> {dataLabel(s.inicio)}
            </div>
            <p className="mt-1 font-mono text-sm font-bold">{formatHora(s.inicio)}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <Video className="h-3 w-3 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Telemedicina</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
