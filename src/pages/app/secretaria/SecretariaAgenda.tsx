import { useMemo, useState } from "react";
import { Calendar, Filter, Plus, Play, Phone, MessageCircle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { agendamentos, medicos as medicosCat } from "@/lib/mock";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const horarios = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];
const dias = ["Hoje", "28/Abr", "29/Abr"];

export default function SecretariaAgenda() {
  const [medico, setMedico] = useState<string>("Todos");
  const [dia, setDia] = useState<string>("Hoje");

  const filtered = useMemo(
    () => agendamentos.filter(a => (medico === "Todos" || a.medico === medico) && a.data === dia),
    [medico, dia],
  );

  const slotMap = new Map<string, typeof agendamentos[number]>();
  filtered.forEach(a => slotMap.set(a.hora, a));

  const encaixe = (hora: string) => toast(`Encaixe rápido às ${hora}`, { description: "Selecione o paciente para concluir (mock)." });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda operacional"
        description="Visão por médico e por dia, com encaixe rápido e ações diretas."
        actions={
          <Button className="bg-gradient-primary hover:opacity-90"><Plus className="mr-2 h-4 w-4" />Novo agendamento</Button>
        }
      />

      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={medico}
            onChange={e => setMedico(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option>Todos</option>
            {medicosCat.map(m => <option key={m.slug}>{m.nome}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {dias.map(d => (
            <button key={d} onClick={() => setDia(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                dia === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >{d}</button>
          ))}
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          <Calendar className="inline h-3 w-3 mr-1" /> {filtered.length} consultas
        </span>
      </div>

      {/* Grid de horários */}
      <div className="card-elevated overflow-hidden">
        <div className="divide-y divide-border">
          {horarios.map(h => {
            const slot = slotMap.get(h);
            return (
              <div key={h} className={cn("grid grid-cols-[80px_1fr_auto] items-center gap-3 p-3", slot ? "" : "bg-muted/20")}>
                <div className="font-mono text-sm font-bold text-muted-foreground">{h}</div>

                {slot ? (
                  <>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {slot.paciente}
                        <span className="ml-2 text-xs text-muted-foreground">· {slot.medico}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-muted px-2 py-0.5">{slot.canal}</span>
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{slot.modalidade}</span>
                        <StatusBadge status={slot.status} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" asChild title="WhatsApp">
                        <a href={whatsappUrl(`Olá ${slot.paciente}, sobre sua consulta ${h}`)} target="_blank" rel="noreferrer">
                          <MessageCircle className="h-3.5 w-3.5 text-success" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" title="Ligar"><Phone className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" title="Remarcar"><RotateCcw className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" className="bg-gradient-primary hover:opacity-90"><Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground italic">horário livre</p>
                    <Button size="sm" variant="outline" onClick={() => encaixe(h)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Encaixe rápido
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
