import { useEffect, useMemo, useState } from "react";
import {
  Calendar, Filter, Plus, Play, Phone, MessageCircle, RotateCcw, UserCog, Loader2, History, LogIn,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import {
  listConsultasParaSecretaria, formatHora, toStatusBadge,
  type ConsultaDetalhada,
} from "@/lib/clinico";
import TrocarMedicoDialog from "@/components/secretaria/TrocarMedicoDialog";
import NovoAgendamentoDialog from "@/components/secretaria/NovoAgendamentoDialog";

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
  const [novoOpen, setNovoOpen] = useState(false);

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
            <Button className="bg-gradient-primary hover:opacity-90" onClick={() => setNovoOpen(true)}>
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
                        Telemedicina
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setHistoricoCtx({
                          id: c.id,
                          resumo: `${c.paciente_nome ?? "Paciente"} • ${formatHora(c.inicio)} • ${c.medico_nome ?? "—"}`,
                        })
                      }
                      title="Histórico de mudanças"
                    >
                      <History className="h-3.5 w-3.5" />
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

        <ConsultaHistoricoDialog
          open={!!historicoCtx}
          onOpenChange={(v) => { if (!v) setHistoricoCtx(null); }}
          consultaId={historicoCtx?.id ?? null}
          consultaResumo={historicoCtx?.resumo}
        />
      </div>
    );
  }

  /* ─── sem sessão ─── */
  return (
    <div className="space-y-6">
      <PageHeader title="Agenda operacional" description="Faça login para acessar a agenda." />
      <div className="card-elevated flex flex-col items-center gap-4 py-16">
        <LogIn className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Você precisa estar logado para ver a agenda.</p>
        <Button asChild className="bg-gradient-primary hover:opacity-90">
          <Link to="/auth">Fazer login</Link>
        </Button>
      </div>
    </div>
  );
}
