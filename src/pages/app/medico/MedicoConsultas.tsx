import { useEffect, useMemo, useState } from "react";
import {
  Calendar, Video, MessageCircle, Repeat, XCircle,
  Loader2, Search, Play, User, Stethoscope, History, Building2,
  CheckCircle2, Clock, AlertCircle, ListChecks,
} from "lucide-react";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
import { FinalizarAtendimentoDialog } from "@/components/medico/FinalizarAtendimentoDialog";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  listConsultasDoMedico, formatDataBR, formatHora, toStatusBadge,
  updateConsultaStatus, type ConsultaDetalhada,
} from "@/lib/clinico";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import RetornoGratuitoDialog from "@/components/medico/RetornoGratuitoDialog";

type Filtro = "todas" | "hoje" | "futuras" | "passadas" | "canceladas";

function formatBRL(centavos: number | null | undefined) {
  if (!centavos) return "—";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Status groups for "hoje" view
type StatusGroup = "em_andamento" | "prontas" | "aguardando" | "concluidas";
const groupOrder: StatusGroup[] = ["em_andamento", "prontas", "aguardando", "concluidas"];
const groupMeta: Record<StatusGroup, { label: string; icon: typeof Play; tone: string }> = {
  em_andamento: { label: "Em andamento", icon: Play, tone: "border-l-primary bg-primary/5" },
  prontas: { label: "Prontas para iniciar", icon: Clock, tone: "border-l-success bg-success/5" },
  aguardando: { label: "Aguardando", icon: AlertCircle, tone: "border-l-warning bg-warning/5" },
  concluidas: { label: "Concluídas", icon: CheckCircle2, tone: "border-l-muted-foreground bg-muted/30" },
};

function getGroup(c: ConsultaDetalhada): StatusGroup {
  if (c.status === "em_andamento") return "em_andamento";
  if (c.status === "concluida" || c.status === "no_show") return "concluidas";
  if (c.status === "confirmada" || c.status === "agendada") return "prontas";
  return "aguardando"; // aguardando_pagamento etc
}

export default function MedicoConsultas() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConsultaDetalhada[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("hoje");
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [retornoCtx, setRetornoCtx] = useState<{ id: string; nome?: string | null } | null>(null);
  const [historicoCtx, setHistoricoCtx] = useState<{ id: string; resumo?: string } | null>(null);
  const [finalizarConsulta, setFinalizarConsulta] = useState<ConsultaDetalhada | null>(null);

  const carregar = async () => {
    if (!session) { setRows(null); return; }
    setLoading(true);
    const data = await listConsultasDoMedico();
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session]);

  const lista = useMemo(() => {
    const agora = new Date();
    const inicioHoje = new Date(); inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(); fimHoje.setHours(23, 59, 59, 999);
    const base = rows ?? [];
    let arr = base.filter((c) => {
      const ini = new Date(c.inicio);
      const fim = new Date(c.fim);
      if (filtro === "hoje") return ini >= inicioHoje && ini <= fimHoje && c.status !== "cancelada";
      if (filtro === "futuras") return fim >= agora && c.status !== "cancelada";
      if (filtro === "passadas") return fim < agora && c.status !== "cancelada";
      if (filtro === "canceladas") return c.status === "cancelada";
      return true;
    });
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(
        (c) =>
          (c.paciente_nome ?? "").toLowerCase().includes(q) ||
          (c.especialidade_nome ?? "").toLowerCase().includes(q) ||
          (c.motivo ?? "").toLowerCase().includes(q),
      );
    }
    arr = [...arr].sort((a, b) => {
      const da = +new Date(a.inicio); const db = +new Date(b.inicio);
      return filtro === "passadas" ? db - da : da - db;
    });
    return arr;
  }, [rows, busca, filtro]);

  // Grouped view for "hoje"
  const grouped = useMemo(() => {
    if (filtro !== "hoje") return null;
    const map: Record<StatusGroup, ConsultaDetalhada[]> = {
      em_andamento: [], prontas: [], aguardando: [], concluidas: [],
    };
    for (const c of lista) map[getGroup(c)].push(c);
    return map;
  }, [lista, filtro]);

  const cancelar = async (id: string) => {
    if (!confirm("Cancelar esta consulta? O paciente será notificado.")) return;
    setAcaoId(id);
    const result = await updateConsultaStatus(id, "cancelada");
    setAcaoId(null);
    if (result.ok) {
      toast.success("Consulta cancelada");
      void carregar();
    } else {
      toast.error(result.error ?? "Não foi possível cancelar");
    }
  };

  const iniciar = async (c: ConsultaDetalhada) => {
    if (c.status === "em_andamento") {
      if (c.link_sala) window.open(c.link_sala, "_blank", "noopener,noreferrer");
      return;
    }
    if (c.status !== "agendada" && c.status !== "confirmada") {
      toast.error("Esta consulta não pode ser iniciada no status atual.");
      return;
    }
    setAcaoId(c.id);
    try {
      if (c.status === "agendada") {
        const r1 = await updateConsultaStatus(c.id, "confirmada");
        if (!r1.ok) throw new Error(r1.error);
      }
      const result = await updateConsultaStatus(c.id, "em_andamento");
      if (!result.ok) throw new Error(result.error);
      toast.success("Consulta iniciada");
      if (c.link_sala) window.open(c.link_sala, "_blank", "noopener,noreferrer");
      void carregar();
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar");
    } finally {
      setAcaoId(null);
    }
  };

  function renderCard(c: ConsultaDetalhada) {
    const status = toStatusBadge(c.status);
    const ini = new Date(c.inicio);
    const podeIniciar =
      (c.status === "agendada" || c.status === "confirmada");
    const podeConcluir = c.status === "em_andamento";
    const podeCancelar = c.status !== "cancelada" && c.status !== "concluida" && c.status !== "no_show";
    const valor = (c as any).valor_snapshot_centavos ?? (c as any).valor_centavos;

    return (
      <div key={c.id} className="card-elevated p-4">
        <div className="flex flex-wrap items-start gap-4">
          {/* Data */}
          <div className="text-center min-w-[68px]">
            <p className="text-xs uppercase text-muted-foreground">{formatDataBR(c.inicio)}</p>
            <p className="text-lg font-bold">{formatHora(c.inicio)}</p>
            <p className="text-[10px] text-muted-foreground">→ {formatHora(c.fim)}</p>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-[200px]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                {c.paciente_nome ?? "Paciente"}
              </p>
              <StatusBadge status={status} />
              {c.empresa_id && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Building2 className="h-3 w-3" /> Corporativo
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" />
              {c.especialidade_nome ?? "—"}
              <span className="mx-1">·</span>
              <Video className="h-3.5 w-3.5" /> Telemedicina
              {valor ? (
                <>
                  <span className="mx-1">·</span>
                  <span className="font-medium text-foreground">{formatBRL(valor)}</span>
                </>
              ) : null}
            </p>
            {c.motivo && (
              <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
                "{c.motivo}"
              </p>
            )}
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {/* Em andamento: Continuar + Finalizar */}
            {podeConcluir && c.modalidade === "online" && c.link_sala && (
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => iniciar(c)}
                disabled={acaoId === c.id}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" /> Continuar
              </Button>
            )}
            {podeConcluir && (
              <Button
                size="sm"
                className="bg-success text-success-foreground hover:opacity-90"
                onClick={() => setFinalizarConsulta(c)}
                disabled={acaoId === c.id}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Finalizar
              </Button>
            )}

            {/* Pronta para iniciar */}
            {podeIniciar && c.modalidade === "online" && c.link_sala && (
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => iniciar(c)}
                disabled={acaoId === c.id}
              >
                <Play className="mr-1.5 h-3.5 w-3.5" /> Iniciar
              </Button>
            )}
            {podeIniciar && c.modalidade === "online" && !c.link_sala && (
              <Button size="sm" variant="outline" disabled title="Configure seu link de sala padrão no perfil">
                <Video className="mr-1.5 h-3.5 w-3.5" /> Sem link
              </Button>
            )}

            <Button size="sm" variant="ghost" asChild title="Mensagem WhatsApp">
              <a
                href={whatsappUrl(`Olá ${c.paciente_nome ?? ""}, sobre sua consulta`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="h-4 w-4 text-success" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setHistoricoCtx({
                  id: c.id,
                  resumo: `${c.paciente_nome ?? "Paciente"} • ${formatDataBR(c.inicio)} ${formatHora(c.inicio)}`,
                })
              }
              title="Histórico de mudanças"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" asChild title="Reagendar (gerenciar horários)">
              <Link to="/app/medico/agenda">
                <Repeat className="h-4 w-4" />
              </Link>
            </Button>
            {podeCancelar && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelar(c.id)}
                disabled={acaoId === c.id}
                title="Cancelar"
              >
                <XCircle className={cn("h-4 w-4", "text-destructive")} />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Consultas" description="Faça login para ver as suas consultas reais." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fila de atendimento"
        description="Sua fila operacional — consultas do dia, ações rápidas e acompanhamento."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/medico/agenda"><Calendar className="mr-2 h-4 w-4" />Ver agenda</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/medico/horarios"><ListChecks className="mr-2 h-4 w-4" />Horários</Link>
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, especialidade, motivo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hoje">Hoje</SelectItem>
            <SelectItem value="futuras">Futuras</SelectItem>
            <SelectItem value="passadas">Passadas</SelectItem>
            <SelectItem value="canceladas">Canceladas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {lista.length} {lista.length === 1 ? "consulta" : "consultas"}
        </span>
      </div>

      {/* Lista */}
      {loading && (
        <div className="card-elevated flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {!loading && lista.length === 0 && (
        <div className="card-elevated p-10 text-center text-sm text-muted-foreground">
          Nenhuma consulta encontrada para esse filtro.
        </div>
      )}

      {/* Grouped view for "hoje" */}
      {!loading && grouped && (
        <div className="space-y-5">
          {groupOrder.map((gKey) => {
            const items = grouped[gKey];
            if (items.length === 0) return null;
            const meta = groupMeta[gKey];
            const Icon = meta.icon;
            return (
              <div key={gKey} className={cn("rounded-lg border-l-4 p-4", meta.tone)}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">{meta.label}</h3>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map(renderCard)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flat list for other filters */}
      {!loading && !grouped && (
        <div className="space-y-3">
          {lista.map(renderCard)}
        </div>
      )}

      <FinalizarAtendimentoDialog
        consulta={finalizarConsulta}
        open={!!finalizarConsulta}
        onOpenChange={(v) => { if (!v) setFinalizarConsulta(null); }}
        onFinalizado={() => {
          setFinalizarConsulta(null);
          setRetornoCtx(finalizarConsulta ? { id: finalizarConsulta.id, nome: finalizarConsulta.paciente_nome } : null);
          void carregar();
        }}
      />

      <RetornoGratuitoDialog
        open={!!retornoCtx}
        onOpenChange={(v) => { if (!v) setRetornoCtx(null); }}
        consultaId={retornoCtx?.id ?? null}
        pacienteNome={retornoCtx?.nome}
        onConcluido={() => { setRetornoCtx(null); void carregar(); }}
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
