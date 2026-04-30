import { useEffect, useMemo, useState } from "react";
import {
  Calendar, Filter, Plus, Play, Phone, MessageCircle, RotateCcw, UserCog, Loader2, History,
} from "lucide-react";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { agendamentos, medicos as medicosCat } from "@/lib/mock";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import {
  listConsultasParaSecretaria, formatHora, toStatusBadge,
  type ConsultaDetalhada,
} from "@/lib/clinico";
import TrocarMedicoDialog from "@/components/secretaria/TrocarMedicoDialog";

const horarios = ["08:00","09:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];
const dias = ["Hoje", "Amanhã", "Depois"];

function offsetDate(label: string): { inicio: Date; fim: Date; titulo: string } {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const ofs = label === "Hoje" ? 0 : label === "Amanhã" ? 1 : 2;
  const inicio = new Date(base); inicio.setDate(inicio.getDate() + ofs);
  const fim = new Date(inicio); fim.setHours(23, 59, 59, 999);
  return { inicio, fim, titulo: label };
}

export default function SecretariaAgenda() {
  const { session } = useSession();
  const [medico, setMedico] = useState<string>("Todos");
  const [dia, setDia] = useState<string>("Hoje");

  const [reais, setReais] = useState<ConsultaDetalhada[] | null>(null);
  const [loadingReais, setLoadingReais] = useState(false);
  const [trocando, setTrocando] = useState<ConsultaDetalhada | null>(null);
  const [historicoCtx, setHistoricoCtx] = useState<{ id: string; resumo?: string } | null>(null);

  const carregar = async () => {
    if (!session) { setReais(null); return; }
    setLoadingReais(true);
    const { inicio, fim } = offsetDate(dia);
    const data = await listConsultasParaSecretaria({ desde: inicio, ate: fim });
    setReais(data);
    setLoadingReais(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, dia]);

  /* ─── modo dados REAIS (logado) ─── */
  if (session) {
    const filtradas = (reais ?? []).filter(
      (c) => medico === "Todos" || c.medico_nome === medico,
    );
    const medicosUnicos = Array.from(
      new Set((reais ?? []).map((c) => c.medico_nome).filter(Boolean) as string[]),
    );

    return (
      <div className="space-y-6">
        <PageHeader
          title="Agenda operacional"
          description="Visão por médico e por dia. Reatribua consultas quando um profissional faltar."
          actions={
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" /> Novo agendamento
            </Button>
          }
        />

        <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={medico}
              onChange={(e) => setMedico(e.target.value)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
            >
              <option>Todos</option>
              {medicosUnicos.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {dias.map((d) => (
              <button
                key={d}
                onClick={() => setDia(d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  dia === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >{d}</button>
            ))}
          </div>
          <span className="ml-auto text-xs text-muted-foreground">
            <Calendar className="inline h-3 w-3 mr-1" /> {filtradas.length} consultas
          </span>
        </div>

        <div className="card-elevated overflow-hidden">
          {loadingReais && (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}
          {!loadingReais && filtradas.length === 0 && (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Sem consultas para esse filtro.
            </div>
          )}
          {!loadingReais && filtradas.length > 0 && (
            <div className="divide-y divide-border">
              {filtradas.map((c) => (
                <div key={c.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 p-3">
                  <div className="font-mono text-sm font-bold text-muted-foreground">
                    {formatHora(c.inicio)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {c.paciente_nome ?? "Paciente"}
                      <span className="ml-2 text-xs text-muted-foreground">· {c.medico_nome ?? "—"}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">
                        {c.modalidade}
                      </span>
                      {c.especialidade_nome && (
                        <span className="rounded-full bg-muted px-2 py-0.5">{c.especialidade_nome}</span>
                      )}
                      <StatusBadge status={toStatusBadge(c.status)} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTrocando(c)}
                      disabled={c.status === "cancelada" || c.status === "concluida"}
                      title="Trocar profissional"
                    >
                      <UserCog className="mr-1.5 h-3.5 w-3.5" /> Trocar médico
                    </Button>
                    <Button size="icon" variant="ghost" asChild title="WhatsApp">
                      <a
                        href={whatsappUrl(`Olá ${c.paciente_nome ?? ""}, sobre sua consulta às ${formatHora(c.inicio)}`)}
                        target="_blank" rel="noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-success" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <TrocarMedicoDialog
          open={!!trocando}
          onOpenChange={(v) => { if (!v) setTrocando(null); }}
          consultaId={trocando?.id ?? null}
          consultaInicio={trocando?.inicio}
          medicoAtualNome={trocando?.medico_nome}
          onTrocado={() => { setTrocando(null); void carregar(); }}
        />
      </div>
    );
  }

  /* ─── modo demo (sem sessão) ─── */
  return <SecretariaAgendaDemo medico={medico} setMedico={setMedico} dia={dia} setDia={setDia} />;
}

function SecretariaAgendaDemo({
  medico, setMedico, dia, setDia,
}: { medico: string; setMedico: (s: string) => void; dia: string; setDia: (s: string) => void }) {
  const filtered = useMemo(
    () => agendamentos.filter((a) => (medico === "Todos" || a.medico === medico) && a.data === dia),
    [medico, dia],
  );
  const slotMap = new Map<string, typeof agendamentos[number]>();
  filtered.forEach((a) => slotMap.set(a.hora, a));
  const encaixe = (hora: string) =>
    toast(`Encaixe rápido às ${hora}`, { description: "Selecione o paciente para concluir (mock)." });

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
            onChange={(e) => setMedico(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          >
            <option>Todos</option>
            {medicosCat.map((m) => <option key={m.slug}>{m.nome}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {["Hoje", "28/Abr", "29/Abr"].map((d) => (
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

      <div className="card-elevated overflow-hidden">
        <div className="divide-y divide-border">
          {horarios.map((h) => {
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
