import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar, Stethoscope, Video, MapPin, MessageCircle, Repeat, XCircle,
  Loader2, Search, Filter,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  listConsultasDoPaciente, formatDataBR, formatHora, toStatusBadge,
  updateConsultaStatus, listRetornosDisponiveis,
  type ConsultaDetalhada, type RetornoComContexto,
} from "@/lib/clinico";
import { proximasConsultasPaciente, type Status } from "@/lib/mock";
import { whatsappUrl } from "@/components/FloatingWhatsApp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AgendarRetornoDialog from "@/components/paciente/AgendarRetornoDialog";
import { Gift } from "lucide-react";

type Filtro = "todas" | "futuras" | "passadas" | "canceladas";

export default function PacienteAgendamentos() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConsultaDetalhada[] | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("futuras");
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<RetornoComContexto[]>([]);
  const [voucherSelecionado, setVoucherSelecionado] = useState<RetornoComContexto | null>(null);

  const carregar = async () => {
    if (!session) { setRows(null); setVouchers([]); return; }
    setLoading(true);
    const [data, vs] = await Promise.all([
      listConsultasDoPaciente(),
      listRetornosDisponiveis(),
    ]);
    setRows(data);
    setVouchers(vs);
    setLoading(false);
  };

  useEffect(() => { void carregar(); /* eslint-disable-next-line */ }, [session]);

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

  const cancelar = async (id: string) => {
    if (!confirm("Cancelar esta consulta? Essa ação não pode ser desfeita.")) return;
    setCancelando(id);
    const ok = await updateConsultaStatus(id, "cancelada");
    setCancelando(null);
    if (!ok) {
      toast.error("Não foi possível cancelar.");
      return;
    }
    toast.success("Consulta cancelada.");
    void carregar();
  };

  // Modo demo (sem sessão): mostra mock para preservar UX da landing
  const demoMode = !session;

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

        {!loading && demoMode && (
          <DemoLista />
        )}

        {!loading && !demoMode && lista.length === 0 && (
          <EmptyState filtro={filtro} />
        )}

        {!loading && !demoMode && lista.length > 0 && (
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
                        <Video className="h-3 w-3" />
                        Telemedicina
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
                          onClick={() => cancelar(c.id)}
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
                  </div>
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
    </div>
  );
}

function EmptyState({ filtro }: { filtro: Filtro }) {
  const msg: Record<Filtro, string> = {
    futuras: "Você não tem consultas futuras.",
    passadas: "Nenhuma consulta passada encontrada.",
    canceladas: "Nenhuma consulta cancelada.",
    todas: "Você ainda não realizou nenhum agendamento.",
  };
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Calendar className="h-6 w-6" />
      </div>
      <p className="text-sm text-muted-foreground">{msg[filtro]}</p>
      <Button asChild className="bg-gradient-primary hover:opacity-90">
        <Link to="/agendar">Agendar agora</Link>
      </Button>
    </div>
  );
}

function DemoLista() {
  return (
    <div className="space-y-2">
      <div className="px-4 pt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        Modo demonstração — entre na sua conta para ver suas consultas reais.
      </div>
      <ul className="divide-y divide-border">
        {proximasConsultasPaciente.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.medico}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c.esp} · {c.data} {c.hora} · {c.modalidade}
              </p>
            </div>
            <StatusBadge status={c.status as Status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
