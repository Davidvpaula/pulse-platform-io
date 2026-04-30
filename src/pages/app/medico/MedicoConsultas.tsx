import { useEffect, useMemo, useState } from "react";
import {
  Calendar, Video, MapPin, MessageCircle, Repeat, XCircle,
  Loader2, Search, Play, User, Stethoscope, History,
} from "lucide-react";
import { ConsultaHistoricoDialog } from "@/components/shared/ConsultaHistoricoDialog";
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

export default function MedicoConsultas() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConsultaDetalhada[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("hoje");
  const [acaoId, setAcaoId] = useState<string | null>(null);
  const [retornoCtx, setRetornoCtx] = useState<{ id: string; nome?: string | null } | null>(null);
  const [historicoCtx, setHistoricoCtx] = useState<{ id: string; resumo?: string } | null>(null);

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
    const inicioHoje = new Date(); inicioHoje.setHours(0,0,0,0);
    const fimHoje = new Date(); fimHoje.setHours(23,59,59,999);
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
    // ordena: futuras asc, passadas desc
    arr = [...arr].sort((a, b) => {
      const da = +new Date(a.inicio); const db = +new Date(b.inicio);
      return filtro === "passadas" ? db - da : da - db;
    });
    return arr;
  }, [rows, busca, filtro]);

  const cancelar = async (id: string) => {
    if (!confirm("Cancelar esta consulta? O paciente será notificado.")) return;
    setAcaoId(id);
    const ok = await updateConsultaStatus(id, "cancelada");
    setAcaoId(null);
    if (ok) {
      toast.success("Consulta cancelada");
      void carregar();
    } else {
      toast.error("Não foi possível cancelar");
    }
  };

  const iniciar = async (c: ConsultaDetalhada) => {
    // Marca como em_andamento e abre a sala
    setAcaoId(c.id);
    const ok = await updateConsultaStatus(c.id, "em_andamento");
    setAcaoId(null);
    if (ok && c.link_sala) {
      window.open(c.link_sala, "_blank", "noopener,noreferrer");
      void carregar();
    } else if (ok) {
      toast.success("Consulta iniciada");
      void carregar();
    } else {
      toast.error("Não foi possível iniciar");
    }
  };

  const concluir = async (c: ConsultaDetalhada) => {
    setAcaoId(c.id);
    const ok = await updateConsultaStatus(c.id, "concluida");
    setAcaoId(null);
    if (!ok) { toast.error("Erro ao concluir"); return; }
    // Abre modal de retorno gratuito
    setRetornoCtx({ id: c.id, nome: c.paciente_nome });
  };

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
        title="Minhas consultas"
        description="Lista completa das consultas atribuídas a você."
        actions={
          <Button asChild variant="outline">
            <Link to="/app/medico/horarios"><Calendar className="mr-2 h-4 w-4" />Gerenciar horários</Link>
          </Button>
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

      <div className="space-y-3">
        {lista.map((c) => {
          const status = toStatusBadge(c.status);
          const ini = new Date(c.inicio);
          const podeIniciar =
            c.status !== "cancelada" &&
            c.status !== "concluida" &&
            ini.getTime() - Date.now() < 30 * 60_000; // 30min antes
          const podeConcluir = c.status === "em_andamento" || c.status === "agendada";
          const podeCancelar = c.status !== "cancelada" && c.status !== "concluida";

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
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {c.especialidade_nome ?? "—"}
                    <span className="mx-1">·</span>
                    {c.modalidade === "online" ? (
                      <><Video className="h-3.5 w-3.5" /> Online</>
                    ) : (
                      <><MapPin className="h-3.5 w-3.5" /> Presencial</>
                    )}
                  </p>
                  {c.motivo && (
                    <p className="mt-1 text-xs text-muted-foreground italic line-clamp-1">
                      “{c.motivo}”
                    </p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                  {podeIniciar && c.modalidade === "online" && c.link_sala && (
                    <Button
                      size="sm"
                      className="bg-gradient-primary hover:opacity-90"
                      onClick={() => iniciar(c)}
                      disabled={acaoId === c.id}
                    >
                      <Play className="mr-1.5 h-3.5 w-3.5" /> Entrar na sala
                    </Button>
                  )}
                  {podeIniciar && c.modalidade === "online" && !c.link_sala && (
                    <Button size="sm" variant="outline" disabled title="Sem link de sala">
                      <Video className="mr-1.5 h-3.5 w-3.5" /> Sem link
                    </Button>
                  )}
                  {podeConcluir && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => concluir(c)}
                      disabled={acaoId === c.id}
                    >
                      Concluir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    title="Mensagem WhatsApp"
                  >
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
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    title="Reagendar (gerenciar horários)"
                  >
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
        })}
      </div>

      <RetornoGratuitoDialog
        open={!!retornoCtx}
        onOpenChange={(v) => { if (!v) setRetornoCtx(null); }}
        consultaId={retornoCtx?.id ?? null}
        pacienteNome={retornoCtx?.nome}
        onConcluido={() => { setRetornoCtx(null); void carregar(); }}
      />
    </div>
  );
}
