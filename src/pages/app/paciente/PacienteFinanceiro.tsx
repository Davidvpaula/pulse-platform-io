import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Wallet, Search, Filter, CheckCircle2, Clock, XCircle, AlertTriangle,
  CreditCard, Receipt, ChevronRight, Download, ExternalLink, Loader2,
  Calendar, Stethoscope, Tag, Copy, RefreshCw, FileText, FileDown,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { usePacienteFinanceiro } from "@/lib/paciente/queries";
import { formatBRL, abrirCheckout, criarCheckoutSession, type PagamentoStatus, type PagamentoMetodo } from "@/lib/pagamentos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { gerarReciboPdf, type DadosRecibo } from "@/lib/reciboPdf";

type Linha = {
  id: string;
  consulta_id: string;
  valor_centavos: number;
  status: PagamentoStatus;
  metodo: PagamentoMetodo;
  provider: string;
  checkout_url: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
  consulta?: {
    inicio: string;
    modalidade: string;
    medico_nome?: string;
    especialidade_nome?: string;
    paciente_atendido_nome?: string | null;
  };
};

const statusUI: Record<PagamentoStatus, { label: string; icon: typeof CheckCircle2; cls: string; dot: string }> = {
  pago:                { label: "Pago",        icon: CheckCircle2, cls: "bg-success/10 text-success border-success/20",       dot: "bg-success" },
  aprovado:            { label: "Aprovado",    icon: CheckCircle2, cls: "bg-success/10 text-success border-success/20",       dot: "bg-success" },
  pendente:            { label: "Pendente",    icon: Clock,        cls: "bg-warning/10 text-warning border-warning/20",       dot: "bg-warning" },
  processando:         { label: "Processando", icon: Loader2,      cls: "bg-primary/10 text-primary border-primary/20",       dot: "bg-primary" },
  falhou:              { label: "Falhou",      icon: XCircle,      cls: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  recusado:            { label: "Recusado",    icon: XCircle,      cls: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  expirado:            { label: "Expirado",    icon: XCircle,      cls: "bg-muted text-muted-foreground border-border",       dot: "bg-muted-foreground" },
  reembolsado:         { label: "Reembolsado", icon: RefreshCw,    cls: "bg-muted text-muted-foreground border-border",       dot: "bg-muted-foreground" },
  reembolsado_parcial: { label: "Reemb. parcial", icon: RefreshCw, cls: "bg-muted text-muted-foreground border-border",       dot: "bg-muted-foreground" },
  cancelado:           { label: "Cancelado",   icon: XCircle,      cls: "bg-muted text-muted-foreground border-border",       dot: "bg-muted-foreground" },
};

const metodoLabel: Record<string, string> = {
  cartao: "Cartão",
  pix: "Pix",
  boleto: "Boleto",
  simulado: "Sandbox",
};

function formatData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDataHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function PacienteFinanceiro() {
  const { session } = useSession();
  const navigate = useNavigate();
  const { data: linhas = [], isLoading: loading } = usePacienteFinanceiro(!!session);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | PagamentoStatus>("todos");
  const [busca, setBusca] = useState("");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [pagandoId, setPagandoId] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    return linhas.filter((l) => {
      if (filtroStatus !== "todos" && l.status !== filtroStatus) return false;
      if (busca) {
        const hay = `${l.consulta?.medico_nome ?? ""} ${l.consulta?.especialidade_nome ?? ""} ${l.id}`.toLowerCase();
        if (!hay.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [linhas, filtroStatus, busca]);

  const totais = useMemo(() => {
    const t = { pago: 0, pendente: 0, total: 0 };
    for (const l of linhas) {
      t.total += l.valor_centavos;
      if (l.status === "pago") t.pago += l.valor_centavos;
      if (l.status === "pendente" || l.status === "processando") t.pendente += l.valor_centavos;
    }
    return t;
  }, [linhas]);

  const detalhe = linhas.find((l) => l.id === detalheId) ?? null;

  const pagar = async (l: Linha) => {
    if (l.checkout_url) {
      window.open(l.checkout_url, "_blank", "noopener,noreferrer");
      return;
    }
    setPagandoId(l.id);
    try {
      const sess = await criarCheckoutSession({
        consultaId: l.consulta_id,
        valorCentavos: l.valor_centavos,
      });
      abrirCheckout(sess, (url) => navigate(url));
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível iniciar o pagamento.");
    } finally {
      setPagandoId(null);
    }
  };

  const copiar = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto).then(
      () => toast.success(`${label} copiado.`),
      () => toast.error("Não foi possível copiar."),
    );
  };

  if (!session) {
    return (
      <div className="space-y-6">
        <PageHeader title="Financeiro" description="Faça login para ver suas faturas." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Histórico de pagamentos, faturas pendentes e recibos das suas consultas"
      />

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <CardTotal icon={Wallet}       label="Total acumulado" value={formatBRL(totais.total)}    tone="primary" />
        <CardTotal icon={CheckCircle2} label="Pago"            value={formatBRL(totais.pago)}     tone="success" />
        <CardTotal icon={Clock}        label="Em aberto"       value={formatBRL(totais.pendente)} tone="warning" highlight={totais.pendente > 0} />
      </div>

      {/* Filtros */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por médico, especialidade ou ID..."
              className="pl-9"
            />
          </div>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
            <SelectTrigger className="w-full sm:w-52">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
              <SelectItem value="falhou">Falhou</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="reembolsado">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Lista */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamentos…
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <Receipt className="h-8 w-8 opacity-50" />
            {linhas.length === 0
              ? "Você ainda não tem pagamentos registrados."
              : "Nenhum pagamento encontrado com esses filtros."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtradas.map((l) => {
              const ui = statusUI[l.status];
              const Icon = ui.icon;
              const isPagavel = l.status === "pendente" || l.status === "processando";
              return (
                <li key={l.id}>
                  <div className="flex flex-col gap-3 p-4 transition hover:bg-accent/20 sm:flex-row sm:items-center">
                    <button
                      onClick={() => setDetalheId(l.id)}
                      className="flex flex-1 items-start gap-3 text-left"
                    >
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", ui.cls)}>
                        <Icon className={cn("h-4 w-4", l.status === "processando" && "animate-spin")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium truncate">
                            {l.consulta?.medico_nome ?? "Consulta"}
                          </p>
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", ui.cls)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", ui.dot)} />
                            {ui.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {l.consulta?.especialidade_nome} · {formatData(l.consulta?.inicio ?? l.created_at)} · {metodoLabel[l.metodo] ?? l.metodo}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="text-right">
                        <p className="text-lg font-semibold">{formatBRL(l.valor_centavos)}</p>
                        {l.metadata?.cupom?.codigo && (
                          <p className="text-[10px] text-success flex items-center gap-1 justify-end">
                            <Tag className="h-3 w-3" /> {l.metadata.cupom.codigo}
                          </p>
                        )}
                      </div>
                      {isPagavel ? (
                        <Button
                          size="sm"
                          onClick={() => pagar(l)}
                          disabled={pagandoId === l.id}
                        >
                          {pagandoId === l.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><CreditCard className="mr-1.5 h-3.5 w-3.5" /> Pagar</>}
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setDetalheId(l.id)}>
                          Detalhes <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Drawer de detalhe / recibo */}
      <Sheet open={!!detalheId} onOpenChange={(o) => !o && setDetalheId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {detalhe && (() => {
            const ui = statusUI[detalhe.status];
            const Icon = ui.icon;
            const cupom = detalhe.metadata?.cupom;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Detalhes do pagamento
                  </SheetTitle>
                  <SheetDescription>
                    Recibo · ID {detalhe.id.slice(0, 8)}
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Status hero */}
                  <div className={cn("rounded-xl border p-4", ui.cls)}>
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-6 w-6", detalhe.status === "processando" && "animate-spin")} />
                      <div>
                        <p className="text-xs uppercase tracking-wide opacity-70">Status</p>
                        <p className="text-lg font-semibold">{ui.label}</p>
                      </div>
                    </div>
                    {detalhe.paid_at && (
                      <p className="mt-2 text-xs opacity-80">Pago em {formatDataHora(detalhe.paid_at)}</p>
                    )}
                    {detalhe.cancelled_at && (
                      <p className="mt-2 text-xs opacity-80">Cancelado em {formatDataHora(detalhe.cancelled_at)}</p>
                    )}
                  </div>

                  {/* Consulta */}
                  <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Consulta vinculada</p>
                    <div className="flex items-start gap-2">
                      <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium">{detalhe.consulta?.medico_nome}</p>
                        <p className="text-xs text-muted-foreground">{detalhe.consulta?.especialidade_nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDataHora(detalhe.consulta?.inicio ?? null)} · {detalhe.consulta?.modalidade}
                    </div>
                  </div>

                  {/* Valores */}
                  <dl className="space-y-2 rounded-xl border border-border p-4 text-sm">
                    {cupom && (
                      <>
                        <Linha2 label="Subtotal" value={formatBRL(cupom.valor_original_centavos ?? detalhe.valor_centavos)} />
                        <Linha2
                          label={`Cupom ${cupom.codigo}`}
                          value={`- ${formatBRL(cupom.desconto_centavos ?? 0)}`}
                          tone="success"
                        />
                        <hr className="border-border" />
                      </>
                    )}
                    <Linha2 label="Total" value={formatBRL(detalhe.valor_centavos)} strong />
                    <Linha2 label="Método" value={metodoLabel[detalhe.metodo] ?? detalhe.metodo} />
                    <Linha2 label="Provedor" value={detalhe.provider} />
                    <Linha2 label="Criado em" value={formatDataHora(detalhe.created_at)} />
                  </dl>

                  {/* IDs */}
                  <div className="space-y-2 rounded-xl border border-dashed border-border p-4 text-xs">
                    <p className="text-muted-foreground">Identificadores</p>
                    <button
                      onClick={() => copiar(detalhe.id, "ID do pagamento")}
                      className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 hover:bg-muted"
                    >
                      <span className="font-mono">{detalhe.id}</span>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => copiar(detalhe.consulta_id, "ID da consulta")}
                      className="flex w-full items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 hover:bg-muted"
                    >
                      <span className="font-mono">{detalhe.consulta_id}</span>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col gap-2">
                    {(detalhe.status === "pendente" || detalhe.status === "processando") && (
                      <Button onClick={() => pagar(detalhe)} disabled={pagandoId === detalhe.id}>
                        {pagandoId === detalhe.id
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <CreditCard className="mr-2 h-4 w-4" />}
                        Pagar agora
                      </Button>
                    )}
                    {detalhe.checkout_url && (
                      <Button asChild variant="outline">
                        <a href={detalhe.checkout_url} target="_blank" rel="noreferrer noopener">
                          <ExternalLink className="mr-2 h-4 w-4" /> Abrir checkout
                        </a>
                      </Button>
                    )}
                    {detalhe.status === "pago" && (
                      <Button variant="outline" onClick={() => {
                        const pacNome = session?.user?.user_metadata?.nome ?? session?.user?.email ?? "Paciente";
                        gerarReciboPdf({
                          pagamentoId: detalhe.id,
                          consultaId: detalhe.consulta_id,
                          valorCentavos: detalhe.valor_centavos,
                          metodo: detalhe.metodo,
                          paidAt: detalhe.paid_at,
                          createdAt: detalhe.created_at,
                          medicoNome: detalhe.consulta?.medico_nome ?? "Profissional",
                          especialidadeNome: detalhe.consulta?.especialidade_nome ?? "—",
                          consultaData: detalhe.consulta?.inicio ?? null,
                          modalidade: detalhe.consulta?.modalidade ?? "—",
                          pacienteNome: pacNome,
                          cupom: detalhe.metadata?.cupom ?? null,
                        });
                        toast.success("Recibo PDF gerado com sucesso!");
                      }}>
                        <FileDown className="mr-2 h-4 w-4" /> Baixar recibo PDF
                      </Button>
                    )}
                    <Button asChild variant="ghost">
                      <Link to="/app/paciente/agendamentos">
                        <FileText className="mr-2 h-4 w-4" /> Ver consulta
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CardTotal({
  icon: Icon, label, value, tone, highlight,
}: { icon: typeof Wallet; label: string; value: string; tone: "primary" | "success" | "warning"; highlight?: boolean }) {
  const cls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  }[tone];
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border bg-card p-4",
      highlight ? "border-warning/40 ring-1 ring-warning/20" : "border-border",
    )}>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", cls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold leading-none">{value}</p>
      </div>
    </div>
  );
}

function Linha2({
  label, value, strong, tone,
}: { label: string; value: string; strong?: boolean; tone?: "success" }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(
        strong ? "text-base font-semibold" : "font-medium",
        tone === "success" && "text-success",
      )}>{value}</dd>
    </div>
  );
}
