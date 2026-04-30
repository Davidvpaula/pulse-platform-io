import { useEffect, useMemo, useState } from "react";
import {
  Play, Filter, Database, Loader2, Video, ExternalLink, CheckCircle2, History, Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { agendamentos } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  listConsultasDoMedico,
  formatHora,
  toStatusBadge,
  type ConsultaDetalhada,
  type ConsultaStatus,
} from "@/lib/clinico";
import type { Status } from "@/lib/mock";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
import { FinalizarAtendimentoDialog } from "@/components/medico/FinalizarAtendimentoDialog";

type Periodo = "hoje" | "semana" | "mes" | "todos";

const periodOptions: { key: Periodo; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "todos", label: "Todos" },
];

const statusOptions: { value: "todos" | ConsultaStatus; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "agendada", label: "Agendada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
  { value: "no_show", label: "Não compareceu" },
];

function rangeFor(periodo: Periodo): { desde?: Date; ate?: Date } {
  const agora = new Date();
  if (periodo === "todos") return {};
  const inicio = new Date(agora);
  const fim = new Date(agora);
  if (periodo === "hoje") {
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(23, 59, 59, 999);
  } else if (periodo === "semana") {
    inicio.setDate(agora.getDate() - agora.getDay());
    inicio.setHours(0, 0, 0, 0);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
  } else {
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    fim.setMonth(agora.getMonth() + 1, 0);
    fim.setHours(23, 59, 59, 999);
  }
  return { desde: inicio, ate: fim };
}

function dataLabel(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const amanha = new Date(); amanha.setDate(hoje.getDate() + 1);
  const eq = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (eq(d, hoje)) return "Hoje";
  if (eq(d, amanha)) return "Amanhã";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function MedicoAgenda() {
  const { session } = useSession();
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [statusFiltro, setStatusFiltro] = useState<(typeof statusOptions)[number]["value"]>("todos");

  const [dbConsultas, setDbConsultas] = useState<ConsultaDetalhada[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [finalizar, setFinalizar] = useState<ConsultaDetalhada | null>(null);

  const carregar = async () => {
    if (!session) { setDbConsultas(null); return; }
    setLoading(true);
    const { desde, ate } = rangeFor(periodo);
    const data = await listConsultasDoMedico({ desde, ate });
    setDbConsultas(data);
    setLoading(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session, periodo]);

  // Lista filtrada por status (com sessão = banco / sem = mock para demo)
  const consultasReais: ConsultaDetalhada[] = useMemo(() => {
    if (!session || !dbConsultas) return [];
    if (statusFiltro === "todos") return dbConsultas;
    return dbConsultas.filter((c) => c.status === statusFiltro);
  }, [session, dbConsultas, statusFiltro]);

  // Contadores por status (sobre o período atual)
  const contadores = useMemo(() => {
    const base = dbConsultas ?? [];
    return {
      total: base.length,
      agendada: base.filter((c) => c.status === "agendada").length,
      confirmada: base.filter((c) => c.status === "confirmada").length,
      em_andamento: base.filter((c) => c.status === "em_andamento").length,
      concluida: base.filter((c) => c.status === "concluida").length,
      cancelada: base.filter((c) => c.status === "cancelada" || c.status === "no_show").length,
    };
  }, [dbConsultas]);

  async function iniciarConsulta(c: ConsultaDetalhada) {
    setAcaoId(c.id);
    try {
      const { error } = await supabase
        .from("consultas")
        .update({ status: "em_andamento" })
        .eq("id", c.id);
      if (error) throw error;
      toast.success("Consulta iniciada");
      if (c.modalidade === "online" && c.link_sala) {
        window.open(c.link_sala, "_blank", "noopener,noreferrer");
      }
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar a consulta");
    } finally {
      setAcaoId(null);
    }
  }

  // Concluir abre o diálogo de finalização (prontuário/prescrição/pagamento)
  function abrirFinalizar(c: ConsultaDetalhada) {
    setFinalizar(c);
  }

  // Modo demo (sem sessão) — mantém comportamento anterior com mock
  const itensDemo = useMemo(() => {
    if (session) return [];
    return agendamentos
      .filter((a) => a.medico === "Dr. Rafael Lasmar")
      .map((a) => ({
        id: String(a.id),
        data: a.data,
        hora: a.hora,
        paciente: a.paciente,
        esp: a.esp,
        modalidade: a.modalidade,
        canal: a.canal,
        status: a.status as Status,
      }));
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Sua agenda com filtros por período, status e ações rápidas."
        actions={
          session ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
              <Database className="h-3 w-3" /> Dados em tempo real
            </span>
          ) : undefined
        }
      />

      {/* Contadores */}
      {session && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            { label: "Total", value: contadores.total, tone: "bg-muted text-foreground" },
            { label: "Agendadas", value: contadores.agendada, tone: "bg-info/10 text-info" },
            { label: "Confirmadas", value: contadores.confirmada, tone: "bg-success/10 text-success" },
            { label: "Em andamento", value: contadores.em_andamento, tone: "bg-primary/10 text-primary" },
            { label: "Concluídas", value: contadores.concluida, tone: "bg-muted text-muted-foreground" },
            { label: "Canceladas", value: contadores.cancelada, tone: "bg-destructive/10 text-destructive" },
          ].map((card) => (
            <div key={card.label} className={cn("card-elevated px-4 py-3", "flex items-center justify-between")}>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">{card.label}</p>
                <p className="font-display text-xl font-bold">{card.value}</p>
              </div>
              <span className={cn("h-7 w-7 rounded-full", card.tone)} />
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {periodOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriodo(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                periodo === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as typeof statusFiltro)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-xs text-muted-foreground">
          {session ? `${consultasReais.length} consulta(s)` : `${itensDemo.length} (demo)`}
        </span>
      </div>

      {/* Lista REAL (com sessão) */}
      {session && (
        <div className="card-elevated overflow-hidden">
          <div className="divide-y divide-border">
            {loading && (
              <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando consultas…
              </div>
            )}

            {!loading && consultasReais.length === 0 && (
              <div className="p-10 text-center text-sm text-muted-foreground">
                <Calendar className="mx-auto mb-2 h-6 w-6 opacity-60" />
                Nenhuma consulta encontrada para este período/filtro.
              </div>
            )}

            {!loading && consultasReais.map((c) => {
              const isOnline = c.modalidade === "online";
              const podeIniciar = c.status === "agendada" || c.status === "confirmada";
              const emAndamento = c.status === "em_andamento";
              const finalizada = c.status === "concluida" || c.status === "cancelada" || c.status === "no_show";

              return (
                <div key={c.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 hover:bg-muted/30">
                  <div className="grid h-12 w-16 place-items-center rounded-lg bg-primary-soft text-primary">
                    <div className="text-center">
                      <p className="font-mono text-sm font-bold">{formatHora(c.inicio)}</p>
                      <p className="text-[10px] uppercase">{dataLabel(c.inicio)}</p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.paciente_nome ?? "Paciente"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.especialidade_nome ?? "Consulta"} · Telemedicina
                      {c.valor_centavos ? ` · ${(c.valor_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                    </p>
                    <div className="mt-1.5"><StatusBadge status={toStatusBadge(c.status)} /></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setHistoricoId(c.id)}>
                      <History className="mr-1.5 h-3.5 w-3.5" /> Histórico
                    </Button>

                    {isOnline && c.link_sala && !finalizada && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={c.link_sala} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-1.5 h-3.5 w-3.5" /> Sala
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}

                    {podeIniciar && (
                      <Button
                        size="sm"
                        className="bg-gradient-primary hover:opacity-90"
                        disabled={acaoId === c.id}
                        onClick={() => iniciarConsulta(c)}
                      >
                        {acaoId === c.id
                          ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          : <Play className="mr-1.5 h-3.5 w-3.5" />}
                        Iniciar
                      </Button>
                    )}

                    {emAndamento && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={acaoId === c.id}
                          onClick={() => iniciarConsulta(c)}
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" /> Continuar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success text-success-foreground hover:opacity-90"
                          onClick={() => abrirFinalizar(c)}
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Finalizar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista DEMO (sem sessão) */}
      {!session && (
        <div className="card-elevated overflow-hidden">
          <div className="divide-y divide-border">
            {itensDemo.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            )}
            {itensDemo.map((a) => (
              <div key={a.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4 hover:bg-muted/30">
                <div className="grid h-12 w-16 place-items-center rounded-lg bg-primary-soft text-primary">
                  <div className="text-center">
                    <p className="font-mono text-sm font-bold">{a.hora}</p>
                    <p className="text-[10px] uppercase">{a.data}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.paciente}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.esp} · {a.modalidade} · {a.canal}
                  </p>
                  <div className="mt-1.5"><StatusBadge status={a.status} /></div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Detalhes</Button>
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConsultaHistoricoDialog
        consultaId={historicoId}
        open={!!historicoId}
        onOpenChange={(o) => !o && setHistoricoId(null)}
      />

      <FinalizarAtendimentoDialog
        consulta={finalizar}
        open={!!finalizar}
        onOpenChange={(o) => !o && setFinalizar(null)}
        onFinalizado={() => void carregar()}
      />
    </div>
  );
}
