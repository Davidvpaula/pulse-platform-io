import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar, Stethoscope, Video, MapPin, MessageCircle, Repeat, XCircle,
  Loader2, Search, Filter, Star, Receipt, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  formatDataBR, formatHora, toStatusBadge,
  updateConsultaStatus,
  type ConsultaDetalhada, type RetornoComContexto,
} from "@/lib/clinico";

import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import AgendarRetornoDialog from "@/components/paciente/AgendarRetornoDialog";
import AvaliarMedicoDialog from "@/components/paciente/AvaliarMedicoDialog";
import { Gift } from "lucide-react";
import { ConsultaPagamentos } from "@/components/financeiro/ConsultaPagamentos";
import MeusProfissionaisPlano from "@/components/paciente/MeusProfissionaisPlano";
import CancelarConsultaDialog from "@/components/paciente/CancelarConsultaDialog";
import { usePacienteConsultas, usePacienteRetornos, usePacienteAvaliadas, pacienteKeys } from "@/lib/paciente/queries";
import { PacienteLoading, PacienteError } from "@/components/paciente/PacienteStates";

type Filtro = "todas" | "futuras" | "passadas" | "canceladas";

export default function PacienteAgendamentos() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const hasSession = !!session;

  const { data: rows, isLoading: loading, error: queryError, refetch } = usePacienteConsultas(hasSession);
  const { data: vouchers = [] } = usePacienteRetornos(hasSession);

  const concluidasIds = useMemo(
    () => (rows ?? []).filter(c => c.status === "concluida").map(c => c.id),
    [rows],
  );
  const { data: avaliadas = new Set<string>() } = usePacienteAvaliadas(concluidasIds, hasSession);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("futuras");
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [voucherSelecionado, setVoucherSelecionado] = useState<RetornoComContexto | null>(null);
  const [expandedPag, setExpandedPag] = useState<string | null>(null);
  const [avaliarConsulta, setAvaliarConsulta] = useState<ConsultaDetalhada | null>(null);
  const [cancelarConsulta, setCancelarConsulta] = useState<ConsultaDetalhada | null>(null);


  const lista = useMemo(() => {
    const agora = new Date();
    const base = rows ?? [];
    let arr = base.filter((c) => {
      const fim = new Date(c.fim);
      if (filtro === "futuras") return fim >= agora && c.status !== "cancelada";
      if (filtro === "passadas") return fim < agora && c.status !== "cancelada";
      if (filtro === "canceladas") return c.status === "cancelada";
      return true;
    });
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter(
        (c) =>
          (c.medico_nome ?? "").toLowerCase().includes(q) ||
          (c.especialidade_nome ?? "").toLowerCase().includes(q) ||
          (c.motivo ?? "").toLowerCase().includes(q),
      );
    }
    return arr.sort((a, b) =>
      filtro === "passadas"
        ? new Date(b.inicio).getTime() - new Date(a.inicio).getTime()
        : new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );
  }, [rows, filtro, busca]);

  const confirmarCancelamento = async (id: string) => {
    setCancelando(id);
    const result = await updateConsultaStatus(id, "cancelada");
    setCancelando(null);
    if (!result.ok) {
      const msg = result.error?.includes("4 horas")
        ? "Não é possível cancelar com menos de 4h de antecedência. Entre em contato via WhatsApp."
        : "Não foi possível cancelar.";
      toast.error(msg);
      return;
    }
    setCancelarConsulta(null);
    supabase.functions.invoke("audit-log", {
      body: { action: "consulta.cancelada", entity_type: "consulta", entity_id: id },
    }).catch(() => {});
    toast.success("Consulta cancelada.");
    void carregar();
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus agendamentos"
        description="Histórico completo de consultas, com ações rápidas para entrar, remarcar ou cancelar."
        actions={
          <Button asChild className="bg-gradient-primary hover:opacity-90">
            <Link to="/agendar"><Calendar className="mr-2 h-4 w-4" /> Nova consulta</Link>
          </Button>
        }
      />

      {/* Vouchers de retorno gratuito */}
      {session && vouchers.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-2">
            <Gift className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">
              Você tem {vouchers.length} retorno{vouchers.length > 1 ? "s" : ""} gratuito{vouchers.length > 1 ? "s" : ""} disponível{vouchers.length > 1 ? "is" : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {vouchers.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Gift className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    Retorno com {v.medico_nome ?? "seu médico"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.especialidade_nome ?? "—"} · válido até{" "}
                    <strong>{new Date(v.valido_ate).toLocaleDateString("pt-BR")}</strong>
                    {v.observacao && <> · {v.observacao}</>}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setVoucherSelecionado(v)}
                >
                  Agendar gratuitamente
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Profissionais do plano */}
      {session && <MeusProfissionaisPlano userId={session.user.id} />}

      {/* Filtros */}
      <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por médico, especialidade…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="futuras">Futuras</SelectItem>
              <SelectItem value="passadas">Passadas</SelectItem>
              <SelectItem value="canceladas">Canceladas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista */}
      <div className="card-elevated p-2">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando suas consultas…
          </div>
        )}

        {!loading && lista.length === 0 && (
          <EmptyState filtro={filtro} />
        )}

        {!loading && lista.length > 0 && (
          <ul className="divide-y divide-border">
            {lista.map((c) => {
              const isOnline = c.modalidade === "online";
              const fim = new Date(c.fim);
              const agora = new Date();
              const podeCancelar =
                c.status !== "cancelada" &&
                c.status !== "concluida" &&
                fim > agora;
              const podeEntrar = isOnline && !!c.link_sala && c.status !== "cancelada";
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.medico_nome ?? "Médico"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.especialidade_nome ?? "—"} · {formatDataBR(c.inicio)} {formatHora(c.inicio)}
                      {" · "}
                      <span className="inline-flex items-center gap-1">
                        {c.modalidade === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                        {c.modalidade === "online" ? "Telemedicina" : "Presencial"}
                      </span>
                    </p>
                    {c.motivo && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        Motivo: {c.motivo}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={toStatusBadge(c.status)} />
                  <div className="flex flex-wrap gap-2">
                    {podeEntrar ? (
                      <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90">
                        <a href={c.link_sala!} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                        </a>
                      </Button>
                    ) : isOnline && c.status !== "cancelada" && c.status !== "concluida" ? (
                      <Button size="sm" disabled title="Sala em preparação">
                        <Video className="mr-1.5 h-3.5 w-3.5" /> Entrar
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={whatsappUrl(`Olá, sobre minha consulta ${c.id}`)}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5 text-success" /> WhatsApp
                      </a>
                    </Button>
                    {podeCancelar && (
                      <>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/agendar">
                            <Repeat className="mr-1.5 h-3.5 w-3.5" /> Remarcar
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelarConsulta(c)}
                          disabled={cancelando === c.id}
                        >
                          {cancelando === c.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Cancelar
                        </Button>
                      </>
                    )}
                    {c.status === "concluida" && !avaliadas.has(c.id) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-warning hover:text-warning"
                        onClick={() => setAvaliarConsulta(c)}
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5" /> Avaliar
                      </Button>
                    )}
                    {c.status === "concluida" && avaliadas.has(c.id) && (
                      <Badge variant="secondary" className="text-[11px]">
                        <Star className="mr-1 h-3 w-3 fill-warning text-warning" /> Avaliado
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedPag(expandedPag === c.id ? null : c.id)}
                    >
                      <Receipt className="mr-1.5 h-3.5 w-3.5" />
                      Pagamentos
                      <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", expandedPag === c.id && "rotate-180")} />
                    </Button>
                  </div>
                  {expandedPag === c.id && (
                    <div className="w-full px-4 pb-3">
                      <ConsultaPagamentos consultaId={c.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AgendarRetornoDialog
        open={!!voucherSelecionado}
        onOpenChange={(v) => { if (!v) setVoucherSelecionado(null); }}
        voucher={voucherSelecionado}
        onAgendado={() => { setVoucherSelecionado(null); void carregar(); }}
      />

      {avaliarConsulta && (
        <AvaliarMedicoDialog
          open={!!avaliarConsulta}
          onOpenChange={(v) => { if (!v) setAvaliarConsulta(null); }}
          consulta={{
            id: avaliarConsulta.id,
            paciente_id: avaliarConsulta.paciente_id,
            medico_id: avaliarConsulta.medico_id,
            medico_nome: avaliarConsulta.medico_nome,
          }}
          onAvaliado={() => { setAvaliarConsulta(null); void carregar(); }}
        />
      )}

      <CancelarConsultaDialog
        consulta={cancelarConsulta}
        open={!!cancelarConsulta}
        onOpenChange={(v) => { if (!v) setCancelarConsulta(null); }}
        onConfirmar={confirmarCancelamento}
        confirmando={cancelando === cancelarConsulta?.id}
      />
    </div>
  );
}

function EmptyState({ filtro }: { filtro: Filtro }) {
  const msg: Record<Filtro, string> = {
    futuras: "Você não tem consultas futuras agendadas.",
    passadas: "Nenhuma consulta passada encontrada.",
    canceladas: "Nenhuma consulta cancelada.",
    todas: "Você ainda não realizou nenhum agendamento.",
  };
  const isFuturas = filtro === "futuras" || filtro === "todas";
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Calendar className="h-8 w-8" />
      </div>
      <div>
        <p className="text-base font-semibold">{msg[filtro]}</p>
        {isFuturas && (
          <p className="mt-1 text-sm text-muted-foreground">
            Agende sua consulta online agora — rápido, seguro e sem sair de casa.
          </p>
        )}
      </div>
      {isFuturas && (
        <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 mt-2">
          <Link to="/agendar">
            <Calendar className="mr-2 h-4 w-4" /> Agendar nova consulta
          </Link>
        </Button>
      )}
    </div>
  );
}

