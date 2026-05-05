import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck, CheckCircle2, XCircle, Calendar, CreditCard, Users,
  Stethoscope, Video, FileText, Repeat, ChevronRight, Sparkles, Building2,
  AlertTriangle, Download, Wallet, TrendingUp, Receipt, Loader2,
  ArrowUpRight, ArrowDownRight, ShieldCheck, Pill, Heart, Activity,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { brl, formatDataBR } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

/* ─────────── Types & helpers ─────────── */

type StatusPlano = "ativa" | "trial" | "pausada" | "cancelada" | "inadimplente";

const statusStyles: Record<StatusPlano, { label: string; wrap: string; dot: string }> = {
  ativa:         { label: "Ativo",         wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
  trial:         { label: "Trial",         wrap: "bg-primary/10 text-primary border-primary/20",             dot: "bg-primary" },
  pausada:       { label: "Pausado",       wrap: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
  cancelada:     { label: "Cancelado",     wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  inadimplente:  { label: "Inadimplente",  wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

const beneficioIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  especialidade: Stethoscope,
  medico: Heart,
  servico: Activity,
  categoria: Package,
  desconto_geral: BadgeCheck,
};

function diasAteData(iso: string | null | undefined) {
  if (!iso) return null;
  const hoje = new Date();
  const fim = new Date(iso + "T00:00:00");
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─────────── Main Component ─────────── */

export default function PacientePlano() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assinatura, setAssinatura] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [beneficios, setBeneficios] = useState<any[]>([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [acaoPendente, setAcaoPendente] = useState<any>(null);
  const [processando, setProcessando] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Get current user's paciente record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: paciente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!paciente) { setLoading(false); return; }

      // 2. Get active assinatura (most recent, non-cancelada preferred)
      const { data: assinaturas } = await supabase
        .from("assinaturas")
        .select("*, planos(*)")
        .eq("paciente_id", paciente.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const ass = assinaturas?.[0] ?? null;
      setAssinatura(ass);

      if (ass) {
        setPlano(ass.planos);

        // 3. Benefícios do plano
        const { data: bens } = await supabase
          .from("plano_beneficios")
          .select("*")
          .eq("plano_id", ass.plano_id)
          .order("ordem");
        setBeneficios(bens || []);

        // 4. Histórico de auditoria da assinatura
        const { data: audit } = await supabase
          .from("planos_auditoria")
          .select("*")
          .eq("assinatura_id", ass.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setHistorico(audit || []);
      }

      // 5. Pagamentos do paciente (últimos 12 meses)
      const dozeAtras = new Date();
      dozeAtras.setFullYear(dozeAtras.getFullYear() - 1);
      const { data: pags } = await supabase
        .from("pagamentos")
        .select("*")
        .eq("paciente_id", paciente.id)
        .gte("created_at", dozeAtras.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      setPagamentos(pags || []);

      // 6. Planos disponíveis (publicados e ativos)
      const { data: disponiveis } = await supabase
        .from("planos")
        .select("*, plano_beneficios(nome)")
        .eq("publicado_site", true)
        .eq("status", "ativo")
        .order("ordem_exibicao");
      setPlanosDisponiveis(disponiveis || []);

    } catch (err) {
      console.error("Erro ao carregar plano:", err);
    } finally {
      setLoading(false);
    }
  }

  // Resumo financeiro calculado
  const resumoFinanceiro = useMemo(() => {
    const pagos = pagamentos.filter(p => p.status === "aprovado" || p.status === "pago");
    const pendentes = pagamentos.filter(p => p.status === "pendente" || p.status === "processando");
    const falhas = pagamentos.filter(p => p.status === "falhou" || p.status === "recusado");
    const totalPago = pagos.reduce((s, p) => s + (p.valor_centavos || 0), 0);
    const aPagar = pendentes.reduce((s, p) => s + (p.valor_centavos || 0), 0);
    const ultimaPaga = pagos[0] ?? null;
    return { totalPago, aPagar, pendentesCount: pendentes.length, falhasCount: falhas.length, ultimaPaga };
  }, [pagamentos]);

  const dias = assinatura ? diasAteData(assinatura.data_fim_acesso) : null;
  const status: StatusPlano = assinatura?.status || "cancelada";
  const statusUI = statusStyles[status] || statusStyles.cancelada;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu plano" description="Veja sua cobertura, validade e benefícios contratados" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!assinatura || !plano) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu plano" description="Veja sua cobertura, validade e benefícios contratados" />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <ShieldCheck className="mb-4 h-16 w-16 text-muted-foreground/40" />
          <h2 className="text-xl font-semibold">Você ainda não tem um plano ativo</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Conheça nossos planos de saúde e monte o seu, com cobertura personalizada e benefícios exclusivos.
          </p>
          <div className="mt-6 flex gap-3">
            <Button asChild>
              <Link to="/app/paciente/montar-plano">
                <Sparkles className="mr-2 h-4 w-4" /> Montar meu plano
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/planos">Ver planos disponíveis</Link>
            </Button>
          </div>
        </div>

        {/* Planos disponíveis mesmo sem assinatura */}
        {planosDisponiveis.length > 0 && (
          <PlanosDisponiveisSection
            planos={planosDisponiveis}
            planoAtualId={null}
            onSelecionar={(planoId) => {
              toast.info("Redirecionando para contratação...");
              navigate("/app/paciente/montar-plano");
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Meu plano" description="Veja sua cobertura, validade e benefícios contratados" />

      {/* Card principal do plano */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" />
                  {plano.nome}
                </div>
                <h2 className="text-2xl font-semibold">{plano.descricao_comercial || plano.nome}</h2>
              </div>
              <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", statusUI.wrap)}>
                <span className={cn("h-2 w-2 rounded-full", statusUI.dot)} />
                {statusUI.label}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Categoria" value={plano.categoria || "—"} />
              <Info label="Ciclo" value={assinatura.ciclo === "mensal" ? "Mensal" : assinatura.ciclo === "anual" ? "Anual" : "Único"} />
              <Info label="Início" value={formatDataBR(assinatura.data_inicio)} />
              <Info
                label="Fim de acesso"
                value={assinatura.data_fim_acesso ? formatDataBR(assinatura.data_fim_acesso) : "Indeterminado"}
                hint={dias !== null ? (dias > 0 ? `${dias} dias restantes` : "Vencido") : undefined}
                hintTone={dias !== null && dias <= 30 ? "warning" : "default"}
              />
            </div>
          </div>

          <TooltipProvider>
            <div className="flex flex-col gap-2 lg:w-56">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="justify-start" disabled>
                    <Download className="mr-2 h-4 w-4" /> Carteirinha digital
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="justify-start" disabled>
                    <FileText className="mr-2 h-4 w-4" /> Contrato (PDF)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve</TooltipContent>
              </Tooltip>
              <Button variant="outline" className="justify-start" asChild>
                <Link to="/app/paciente/financeiro">
                  <CreditCard className="mr-2 h-4 w-4" /> Histórico financeiro
                </Link>
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </section>

      {/* Aviso de vencimento */}
      {dias !== null && dias <= 30 && dias > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Seu plano termina em {dias} dias</p>
            <p className="text-muted-foreground">
              {!assinatura.renovacao_bloqueada
                ? `Renovação automática ativa. Próxima cobrança em ${formatDataBR(assinatura.proxima_cobranca)}.`
                : "Renovação automática desativada. Renove para evitar interrupção."}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Benefícios + Pagamento */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Benefícios */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Benefícios inclusos</h3>
          {beneficios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum benefício cadastrado para este plano.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {beneficios.map((b) => {
                const Icon = beneficioIcons[b.tipo] || BadgeCheck;
                return (
                  <div key={b.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{b.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.descricao || (b.ilimitado ? "Ilimitado" : `${b.quantidade}x/${b.periodo}`)}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pagamento */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <CreditCard className="h-4 w-4 text-primary" /> Pagamento
            </h3>
            <dl className="space-y-3 text-sm">
              <Row label="Mensalidade" value={brl(assinatura.valor_cobrado_centavos)} strong />
              <Row label="Próxima cobrança" value={formatDataBR(assinatura.proxima_cobranca)} />
              <Row label="Forma" value={assinatura.forma_pagamento || "—"} />
              <Row
                label="Renovação automática"
                value={!assinatura.renovacao_bloqueada ? "Ativada" : "Desativada"}
                tone={!assinatura.renovacao_bloqueada ? "success" : "muted"}
              />
            </dl>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                    Alterar forma de pagamento
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve — integração de pagamento</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </section>
        </div>
      </div>

      {/* Resumo financeiro real */}
      <ResumoFinanceiro resumo={resumoFinanceiro} pagamentos={pagamentos} />

      {/* Histórico de auditoria */}
      {historico.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-4 w-4 text-primary" /> Histórico do plano
          </h3>
          <ol className="relative space-y-4 border-l border-border pl-6">
            {historico.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-primary" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {h.acao}{h.campo ? ` — ${h.campo}` : ""}
                    {h.valor_novo ? `: ${h.valor_novo}` : ""}
                  </p>
                  <span className="text-xs text-muted-foreground">{formatDataBR(h.created_at?.slice(0, 10))}</span>
                </div>
                {h.motivo && <p className="text-xs text-muted-foreground mt-0.5">{h.motivo}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Planos disponíveis */}
      {planosDisponiveis.length > 0 && (
        <PlanosDisponiveisSection
          planos={planosDisponiveis}
          planoAtualId={assinatura.plano_id}
          onSelecionar={(planoId) => {
            if (planoId === assinatura.plano_id) return;
            const novo = planosDisponiveis.find(p => p.id === planoId);
            if (!novo) return;
            const tipo = novo.valor_mensal_centavos > plano.valor_mensal_centavos
              ? "upgrade"
              : novo.valor_mensal_centavos < plano.valor_mensal_centavos
              ? "downgrade"
              : "troca";
            setAcaoPendente({ tipo, planoId, planoNome: novo.nome, planoPreco: novo.valor_mensal_centavos });
          }}
        />
      )}

      {/* Cancelamento */}
      {status !== "cancelada" && (
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium">Cancelar meu plano</p>
                <p className="text-muted-foreground">
                  A solicitação será analisada. Você manterá a cobertura até a próxima data de vencimento.
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled
                  >
                    Solicitar cancelamento
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Em breve — cancelamento online</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </section>
      )}

      {/* Modal de confirmação */}
      <ConfirmacaoDialog
        acao={acaoPendente}
        planoAtual={plano}
        processando={processando}
        onCancelar={() => !processando && setAcaoPendente(null)}
        onConfirmar={async () => {
          if (!acaoPendente) return;
          setProcessando(true);
          // 🔌 Integração futura: edge function de upgrade/downgrade
          toast.info("Em breve — troca de plano online", {
            description: "Esta funcionalidade será ativada com a integração de pagamentos.",
          });
          setProcessando(false);
          setAcaoPendente(null);
        }}
      />
    </div>
  );
}

/* ─────────── Planos Disponíveis Section ─────────── */

function PlanosDisponiveisSection({
  planos, planoAtualId, onSelecionar,
}: {
  planos: any[];
  planoAtualId: string | null;
  onSelecionar: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Planos disponíveis
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/paciente/montar-plano">
            Montar plano personalizado <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {planos.map((p) => {
          const isAtual = p.id === planoAtualId;
          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-xl border p-5 transition",
                isAtual
                  ? "border-success/40 bg-success/5"
                  : p.destacado
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-background/50 hover:border-primary/30",
              )}
            >
              {isAtual ? (
                <span className="absolute -top-2 left-4 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success-foreground">
                  Seu plano
                </span>
              ) : p.destacado ? (
                <span className="absolute -top-2 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Mais escolhido
                </span>
              ) : null}
              <p className="text-sm text-muted-foreground">{p.nome}</p>
              <p className="mt-1 text-2xl font-semibold">
                {brl(p.valor_mensal_centavos)}
                <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </p>
              {p.plano_beneficios && p.plano_beneficios.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {p.plano_beneficios.slice(0, 4).map((b: any, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{b.nome}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                className="mt-5 w-full"
                variant={isAtual ? "outline" : "default"}
                disabled={isAtual}
                onClick={() => onSelecionar(p.id)}
              >
                {isAtual ? "Plano atual" : "Selecionar"}
                {!isAtual && <ArrowUpRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────── Modal de confirmação ─────────── */

function ConfirmacaoDialog({
  acao, planoAtual, processando, onCancelar, onConfirmar,
}: {
  acao: any;
  planoAtual: any;
  processando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  if (!acao) return null;

  const titulo = acao.tipo === "upgrade"
    ? "Confirmar upgrade de plano"
    : acao.tipo === "downgrade"
    ? "Confirmar downgrade de plano"
    : "Confirmar troca de plano";

  return (
    <Dialog open={!!acao} onOpenChange={(o) => { if (!o) onCancelar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Revise os detalhes. A integração de pagamento será ativada em breve.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plano atual</span>
            <span className="font-medium">{planoAtual?.nome} · {brl(planoAtual?.valor_mensal_centavos)}/mês</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Novo plano</span>
            <span className="font-semibold">{acao.planoNome} · {brl(acao.planoPreco)}/mês</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancelar} disabled={processando}>
            Voltar
          </Button>
          <Button onClick={onConfirmar} disabled={processando}>
            {processando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────── Resumo financeiro real ─────────── */

function ResumoFinanceiro({ resumo, pagamentos }: { resumo: any; pagamentos: any[] }) {
  const ultimas = pagamentos.slice(0, 5);
  if (pagamentos.length === 0) return null;

  const statusLabel: Record<string, { label: string; wrap: string; dot: string }> = {
    aprovado:     { label: "Pago",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
    pago:         { label: "Pago",        wrap: "bg-success/10 text-success border-success/20",             dot: "bg-success" },
    pendente:     { label: "Pendente",    wrap: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
    processando:  { label: "Processando", wrap: "bg-primary/10 text-primary border-primary/20",             dot: "bg-primary" },
    falhou:       { label: "Falhou",      wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
    recusado:     { label: "Recusado",    wrap: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
    reembolsado:  { label: "Reembolsado", wrap: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
    cancelado:    { label: "Cancelado",   wrap: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground" },
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="h-4 w-4 text-primary" /> Resumo financeiro
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/paciente/financeiro">
            Ver tudo <ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={TrendingUp} label="Pago nos últimos 12 meses" value={brl(resumo.totalPago)} tone="success" />
        <KpiCard
          icon={AlertTriangle}
          label="A pagar"
          value={brl(resumo.aPagar)}
          hint={`${resumo.pendentesCount} cobrança${resumo.pendentesCount === 1 ? "" : "s"} pendente${resumo.pendentesCount === 1 ? "" : "s"}`}
          tone={resumo.pendentesCount > 0 ? "warning" : "muted"}
        />
        <KpiCard
          icon={Receipt}
          label="Última paga"
          value={resumo.ultimaPaga ? brl(resumo.ultimaPaga.valor_centavos) : "—"}
          hint={resumo.ultimaPaga ? formatDataBR(resumo.ultimaPaga.paid_at?.slice(0, 10) || resumo.ultimaPaga.created_at?.slice(0, 10)) : "Sem registros"}
          tone="default"
        />
      </div>

      {ultimas.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <ul className="divide-y divide-border">
            {ultimas.map((c) => {
              const ui = statusLabel[c.status] || statusLabel.pendente;
              return (
                <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.metodo || "Pagamento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDataBR(c.created_at?.slice(0, 10))}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold">{brl(c.valor_centavos)}</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", ui.wrap)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", ui.dot)} />
                    {ui.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ─────────── Subcomponentes ─────────── */

function Info({ label, value, hint, hintTone = "default" }: {
  label: string; value: string; hint?: string; hintTone?: "default" | "warning";
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
      {hint && (
        <p className={cn("mt-0.5 text-xs", hintTone === "warning" ? "text-warning" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, strong, tone }: {
  label: string; value: string; strong?: boolean; tone?: "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(
        strong ? "text-base font-semibold" : "font-medium",
        tone === "success" && "text-success",
        tone === "muted" && "text-muted-foreground",
      )}>{value}</dd>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; hint?: string;
  tone?: "default" | "success" | "warning" | "muted";
}) {
  const toneCls =
    tone === "success" ? "text-success bg-success/10"
    : tone === "warning" ? "text-warning bg-warning/10"
    : tone === "muted" ? "text-muted-foreground bg-muted"
    : "text-primary bg-primary/10";

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneCls)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
